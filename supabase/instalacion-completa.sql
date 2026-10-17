-- ============================================================
-- nfc-huis · INSTALACIÓN COMPLETA
--
-- Pega TODO este fichero en el SQL Editor de Supabase y pulsa Run.
-- Contiene, en orden: schema + triggers + rls + seed + voorraden.
-- Se puede reejecutar sin duplicar datos.
-- ============================================================



-- ############################################################
-- ##  schema.sql
-- ############################################################

-- ============================================================
-- nfc-huis · esquema del congelador
-- Ejecutar en el SQL Editor de Supabase, en este orden:
--   1. schema.sql   ← estás aquí
--   2. triggers.sql
--   3. rls.sql
--   4. seed.sql
-- Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Baldas / cajones -------------------------------

create table if not exists public.freezer_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(btrim(name)) > 0),
  sort_order  integer not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Productos --------------------------------------

create table if not exists public.freezer_items (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.freezer_locations (id) on delete restrict,
  name         text not null check (length(btrim(name)) > 0),
  quantity     integer not null default 1 check (quantity >= 0),
  unit         text not null default 'st',
  notes        text,
  frozen_on    date,
  best_before  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists freezer_items_location_idx
  on public.freezer_items (location_id);

-- ---------- Historial de movimientos -----------------------
-- Se rellena exclusivamente mediante triggers (ver triggers.sql).

create table if not exists public.freezer_events (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid,
  item_name_snapshot  text not null,
  action              text not null
                        check (action in ('create', 'increase', 'decrease', 'move', 'edit', 'delete')),
  quantity_delta      integer,
  from_location_id    uuid,
  to_location_id      uuid,
  snapshot            jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists freezer_events_created_at_idx
  on public.freezer_events (created_at desc);


-- ############################################################
-- ##  triggers.sql
-- ############################################################

-- ============================================================
-- nfc-huis · triggers (ejecutar DESPUÉS de schema.sql)
--
-- El historial se escribe aquí, en la base de datos, y no desde
-- el navegador: así ningún cambio puede quedarse sin registrar
-- aunque el frontend falle a mitad.
-- ============================================================

-- ---------- updated_at automático --------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists freezer_items_set_updated_at on public.freezer_items;
create trigger freezer_items_set_updated_at
  before update on public.freezer_items
  for each row execute function public.set_updated_at();

-- ---------- Registro en freezer_events ---------------------
-- SECURITY DEFINER a propósito: freezer_events es de sólo lectura
-- para el cliente (ver rls.sql), así que el INSERT lo hace la función
-- con los permisos de su propietario, nunca el navegador.

create or replace function public.log_freezer_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_delta  integer;
begin
  if tg_op = 'INSERT' then
    insert into public.freezer_events (
      item_id, item_name_snapshot, action, quantity_delta, to_location_id, snapshot
    )
    values (new.id, new.name, 'create', new.quantity, new.location_id, to_jsonb(new));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.freezer_events (
      item_id, item_name_snapshot, action, quantity_delta, from_location_id, snapshot
    )
    values (old.id, old.name, 'delete', -old.quantity, old.location_id, to_jsonb(old));
    return old;
  end if;

  -- tg_op = 'UPDATE'
  if new.location_id is distinct from old.location_id then
    v_action := 'move';
  elsif new.quantity is distinct from old.quantity
        and new.name is not distinct from old.name
        and new.unit is not distinct from old.unit
        and new.notes is not distinct from old.notes
        and new.frozen_on is not distinct from old.frozen_on
        and new.best_before is not distinct from old.best_before then
    v_action := case when new.quantity > old.quantity then 'increase' else 'decrease' end;
  else
    v_action := 'edit';
  end if;

  -- Nada relevante ha cambiado: no ensuciamos el historial.
  if v_action = 'edit' and to_jsonb(new) - 'updated_at' = to_jsonb(old) - 'updated_at' then
    return new;
  end if;

  v_delta := nullif(new.quantity - old.quantity, 0);

  insert into public.freezer_events (
    item_id, item_name_snapshot, action, quantity_delta,
    from_location_id, to_location_id, snapshot
  )
  values (
    new.id, new.name, v_action, v_delta,
    old.location_id, new.location_id, to_jsonb(new)
  );

  return new;
end;
$$;

drop trigger if exists freezer_items_log_event on public.freezer_items;
create trigger freezer_items_log_event
  after insert or update or delete on public.freezer_items
  for each row execute function public.log_freezer_event();


-- ############################################################
-- ##  rls.sql
-- ############################################################

-- ============================================================
-- nfc-huis · Row Level Security (ejecutar DESPUÉS de triggers.sql)
--
-- DECISIÓN CONSCIENTE DEL PROPIETARIO (2026-09-09):
-- la aplicación NO tiene login. Cualquiera que abra la URL pública
-- puede leer y modificar el inventario del congelador. Se ha aceptado
-- ese riesgo a cambio de que los abuelos no vean nunca una pantalla
-- de inicio de sesión.
--
-- Aun así RLS sigue activo y acotamos el daño posible:
--   · las baldas sólo se pueden LEER desde la web (se crean por SQL);
--   · el historial sólo se puede LEER (lo escribe el trigger);
--   · nada más del proyecto Supabase queda expuesto.
--
-- Si algún día quieres cerrarlo, basta con sustituir `anon` por
-- `authenticated` en las políticas de abajo y añadir un login.
-- ============================================================

alter table public.freezer_locations enable row level security;
alter table public.freezer_items     enable row level security;
alter table public.freezer_events    enable row level security;

-- ---------- Baldas: sólo lectura ---------------------------

drop policy if exists locations_read on public.freezer_locations;
create policy locations_read
  on public.freezer_locations
  for select
  to anon, authenticated
  using (active);

-- ---------- Productos: lectura y escritura -----------------

drop policy if exists items_read on public.freezer_items;
create policy items_read
  on public.freezer_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists items_insert on public.freezer_items;
create policy items_insert
  on public.freezer_items
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists items_update on public.freezer_items;
create policy items_update
  on public.freezer_items
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists items_delete on public.freezer_items;
create policy items_delete
  on public.freezer_items
  for delete
  to anon, authenticated
  using (true);

-- ---------- Historial: sólo lectura ------------------------
-- Sin políticas de insert/update/delete: el cliente no puede tocarlo.
-- Los INSERT llegan del trigger log_freezer_event (SECURITY DEFINER).

drop policy if exists events_read on public.freezer_events;
create policy events_read
  on public.freezer_events
  for select
  to anon, authenticated
  using (true);


-- ############################################################
-- ##  seed.sql
-- ############################################################

-- ============================================================
-- nfc-huis · datos iniciales (ejecutar DESPUÉS de rls.sql)
--
-- Contenido transcrito de la hoja "INHOUD VRIEZER" que hay pegada
-- en casa. Los productos sólo se insertan si la tabla está vacía,
-- así que puedes reejecutar el fichero sin duplicar nada.
-- ============================================================

-- ---------- Baldas -----------------------------------------

insert into public.freezer_locations (name, sort_order) values
  ('Lade 1 · Groente',                   1),
  ('Lade 2 · Vis',                       2),
  ('Lade 3 · Frituur',                   3),
  ('Lade 4 · Vlees',                     4),
  ('Lade 5 · Kazen, maalt & vriespacks', 5),
  ('Lade 6',                             6)
on conflict (name) do nothing;

-- ---------- Productos --------------------------------------

do $$
declare
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid; l6 uuid;
begin
  if exists (select 1 from public.freezer_items) then
    raise notice 'freezer_items ya tiene datos: no se inserta el seed.';
    return;
  end if;

  select id into l1 from public.freezer_locations where sort_order = 1;
  select id into l2 from public.freezer_locations where sort_order = 2;
  select id into l3 from public.freezer_locations where sort_order = 3;
  select id into l4 from public.freezer_locations where sort_order = 4;
  select id into l5 from public.freezer_locations where sort_order = 5;
  select id into l6 from public.freezer_locations where sort_order = 6;

  insert into public.freezer_items (location_id, name, quantity, notes) values
    -- Lade 1 · Groente
    (l1, 'Pepertjes',              1,  null),
    (l1, 'Edamame',                1,  null),
    (l1, 'Wokgroente',             2,  null),
    (l1, 'Rösti',                  1,  null),

    -- Lade 2 · Vis
    (l2, 'Tempura garnalen',       1,  'Doos plus los'),
    (l2, 'Rauwe garnalen groot',   2,  null),
    (l2, 'Rauwe garnalen klein',   1,  null),
    (l2, 'Rose garnalen',          1,  null),
    (l2, 'Koolvis filets',         1,  null),
    (l2, 'Sardines',               2,  null),
    (l2, 'Gyoza',                  1,  null),
    (l2, 'Spinazie à la crème',    1,  null),
    (l2, 'Chorizo worstjes',       2,  'Spanje'),

    -- Lade 3 · Frituur
    (l3, 'Kroketten',              25, 'Mora classic'),
    (l3, 'Bitterballen',           10, null),
    (l3, 'Kaassoufflés',           6,  null),
    (l3, 'Fruit',                  1,  null),
    (l3, 'Brood',                  1,  null),

    -- Lade 4 · Vlees
    (l4, 'Kippendijen',            8,  null),
    (l4, 'Kalkoenplakjes',         1,  null),
    (l4, 'Spekjes',                1,  null),
    (l4, 'Hamblokjes',             2,  null),
    (l4, 'Hamlappen rauw',         1,  null),
    (l4, 'Pizza',                  2,  null),

    -- Lade 5 · Kazen, maalt & vriespacks
    (l5, 'Parmezaan',              1,  null),
    (l5, 'Mozzarella',             1,  null),
    (l5, 'Burrata',                1,  null),
    (l5, 'Boeuf Orleans',          1,  null),
    (l5, 'IJspacks',               10, null),

    -- Lade 6
    (l6, 'IJsjes',                 1,  null),
    (l6, 'Stammetje',              1,  null),
    (l6, 'Limoenblokjes',          1,  null);
end $$;




-- ############################################################
-- ##  voorraden.sql
-- ############################################################

-- ============================================================
-- nfc-huis · VOORRADEN (despensa del garaje)
--
-- Pega TODO este fichero en el SQL Editor de Supabase y pulsa Run.
-- Contiene: tablas + updated_at + RLS + datos del Excel VOORRADEN.xlsx
-- (hoja "OP KAST"). Se puede reejecutar sin duplicar datos.
-- Necesita que instalacion-completa.sql ya esté ejecutado (usa set_updated_at).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Plekken (baldas / cajones) ---------------------
-- code = la etiqueta que hay pegada en el garaje (G-KAST2 P3).

create table if not exists public.pantry_locations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (length(btrim(code)) > 0),
  zone        text not null,
  name        text not null,
  sort_order  integer not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Producten --------------------------------------
-- best_before null = no caduca (sal, azúcar, fruta del huerto…).

create table if not exists public.pantry_items (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.pantry_locations (id) on delete restrict,
  name         text not null check (length(btrim(name)) > 0),
  quantity     integer not null default 1 check (quantity >= 0),
  unit         text not null default 'st',
  notes        text,
  best_before  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists pantry_items_location_idx
  on public.pantry_items (location_id);

drop trigger if exists pantry_items_set_updated_at on public.pantry_items;
create trigger pantry_items_set_updated_at
  before update on public.pantry_items
  for each row execute function public.set_updated_at();

-- ---------- RLS: mismo modelo que el congelador ------------
-- Sin login (decisión consciente, ver rls.sql). Las plekken sólo se
-- leen; los productos se leen y se escriben desde la web.

alter table public.pantry_locations enable row level security;
alter table public.pantry_items     enable row level security;

drop policy if exists pantry_locations_read on public.pantry_locations;
create policy pantry_locations_read on public.pantry_locations
  for select to anon, authenticated using (active);

drop policy if exists pantry_items_read on public.pantry_items;
create policy pantry_items_read on public.pantry_items
  for select to anon, authenticated using (true);

drop policy if exists pantry_items_insert on public.pantry_items;
create policy pantry_items_insert on public.pantry_items
  for insert to anon, authenticated with check (true);

drop policy if exists pantry_items_update on public.pantry_items;
create policy pantry_items_update on public.pantry_items
  for update to anon, authenticated using (true) with check (true);

drop policy if exists pantry_items_delete on public.pantry_items;
create policy pantry_items_delete on public.pantry_items
  for delete to anon, authenticated using (true);

-- ---------- Plekken ----------------------------------------

insert into public.pantry_locations (code, zone, name, sort_order) values
  ('G-DEUR P1', 'Bij de garagedeur', 'Plank 1 (boven)', 1),
  ('G-DEUR P2', 'Bij de garagedeur', 'Plank 2', 2),
  ('G-DEUR P3', 'Bij de garagedeur', 'Plank 3', 3),
  ('G-DEUR P4', 'Bij de garagedeur', 'Plank 4', 4),
  ('G-DEUR SL1', 'Bij de garagedeur', 'Lade 1 (boven)', 5),
  ('G-DEUR SL2', 'Bij de garagedeur', 'Lade 2', 6),
  ('G-DEUR SL3', 'Bij de garagedeur', 'Lade 3', 7),
  ('G-FLWND P1', 'Flessenrek', 'Op de kist', 8),
  ('G-FLWND R1', 'Flessenrek', 'In het rek', 9),
  ('G-FLWND V1', 'Flessenrek', 'Op de vloer', 10),
  ('G-KAST1 P1', 'Kast 1 (links)', 'Plank 1 (boven)', 11),
  ('G-KAST1 P2', 'Kast 1 (links)', 'Plank 2', 12),
  ('G-KAST1 P3', 'Kast 1 (links)', 'Plank 3', 13),
  ('G-KAST1 P4', 'Kast 1 (links)', 'Plank 4 (onder)', 14),
  ('G-KAST2 P1', 'Kast 2 (rechts)', 'Plank 1 (boven)', 15),
  ('G-KAST2 P2', 'Kast 2 (rechts)', 'Plank 2', 16),
  ('G-KAST2 P3', 'Kast 2 (rechts)', 'Plank 3', 17),
  ('G-KAST2 P4', 'Kast 2 (rechts)', 'Plank 4', 18),
  ('G-KAST2 P5', 'Kast 2 (rechts)', 'Plank 5 (onder)', 19),
  ('G-KASTBV P1', 'Kast 3 (boven de vriezer)', 'Plank 1 (boven)', 20),
  ('G-KASTBV P2', 'Kast 3 (boven de vriezer)', 'Plank 2 (midden)', 21),
  ('G-KASTBV P3', 'Kast 3 (boven de vriezer)', 'Plank 3 (onder)', 22)
on conflict (code) do update
  set zone = excluded.zone, name = excluded.name, sort_order = excluded.sort_order;

-- ---------- Producten (sólo si la tabla está vacía) --------

do $$
begin
  if exists (select 1 from public.pantry_items) then
    raise notice 'pantry_items ya tiene datos: no se inserta el seed.';
    return;
  end if;

  insert into public.pantry_items (location_id, name, quantity, unit, best_before)
  select l.id, v.name, v.quantity, v.unit, v.best_before::date
  from (values
    ('G-DEUR P1', 'Soep champignon', 2, 'ZAK', '2027-08-30'),
    ('G-DEUR P1', 'Soep franse uien', 3, 'ZAK', '2026-12-31'),
    ('G-DEUR P1', 'Soep hongaarse goulash', 1, 'ZAK', '2027-06-30'),
    ('G-DEUR P1', 'Soep klassieke tomaat', 1, 'ZAK', '2027-04-30'),
    ('G-DEUR P1', 'Soep mosterd', 3, 'ZAK', '2026-12-31'),
    ('G-DEUR P1', 'Soep pinda', 1, 'ZAK', '2026-11-30'),
    ('G-DEUR P1', 'Soep rode curry', 1, 'ZAK', '2026-10-31'),
    ('G-DEUR P1', 'Soep romige tomaat', 1, 'ZAK', '2027-08-30'),
    ('G-DEUR P1', 'Soep tom kha kai', 3, 'ZAK', '2027-07-30'),
    ('G-DEUR P2', 'Soep erwten', 6, 'ZAK', '2027-09-30'),
    ('G-DEUR P2', 'Water 2 l', 3, 'PAK', '2026-04-30'),
    ('G-DEUR P2', 'Zuivel chocomel', 1, 'PAK', '2027-02-28'),
    ('G-DEUR P2', 'Zuivel drinkyoghurt aardbei', 1, 'PAK', '2027-03-15'),
    ('G-DEUR P2', 'Zuivel melk halfvol', 1, 'PAK', '2027-04-11'),
    ('G-DEUR P2', 'Zuivel melk vol', 6, 'PAK', '2026-11-20'),
    ('G-DEUR P3', 'Bier heineken 0.0', 18, 'BLIK', '2027-04-30'),
    ('G-DEUR P3', 'Bier liefmans 0.0', 4, 'FLES', '2027-03-31'),
    ('G-DEUR P3', 'Bier speciaal blik 5%', 5, 'BLIK', '2027-01-01'),
    ('G-DEUR P3', 'Bier speciaal fles 5%', 3, 'FLES', '2027-01-01'),
    ('G-DEUR P3', 'Drinks coca cola zero blik 33cc', 8, 'BLIK', '2026-11-30'),
    ('G-DEUR P3', 'Drinks pimento flesjes', 20, 'FLES', '2028-06-29'),
    ('G-DEUR P3', 'Koffie bonen cafe riche 1kg', 1, 'ZAK', '2027-08-01'),
    ('G-DEUR P4', 'Afval lege batterijen', 0, 'AFVAL', null),
    ('G-DEUR P4', 'Afval oud papier', 0, 'AFVAL', null),
    ('G-DEUR SL1', 'Brood afbak kaiser br 4pk', 1, 'ZAK', '2026-12-06'),
    ('G-DEUR SL1', 'Brood afbak stokbrood 2pk', 0, 'ZAK', '2026-10-06'),
    ('G-DEUR SL1', 'Brood afbak stokbrood 2pk', 1, 'ZAK', '2026-10-18'),
    ('G-DEUR SL1', 'Snacks chips', 1, 'ZAK', '2026-11-23'),
    ('G-DEUR SL1', 'Snacks peanuts', 1, 'ZAK', '2027-05-31'),
    ('G-DEUR SL1', 'Snoep choco paaseiren & konijn', 1, 'ZAK', '2027-10-30'),
    ('G-DEUR SL1', 'Snoep winegums', 1, 'ZAK', '2028-02-27'),
    ('G-DEUR SL2', 'GF aardappels', 1, 'LOS', null),
    ('G-DEUR SL2', 'GF appels uit eigen tuin', 1, 'LOS', null),
    ('G-DEUR SL3', 'GF gele uien', 1, 'LOS', null),
    ('G-DEUR SL3', 'GF rode uien', 1, 'LOS', null),
    ('G-DEUR SL3', 'GF sjalotten', 0, 'NET', null),
    ('G-FLWND P1', 'Bier grols 0.0', 0, 'BLIK', '2027-03-30'),
    ('G-FLWND P1', 'Bier kordaat wit 0.0 33cc', 0, 'BLIK', '2027-03-30'),
    ('G-FLWND P1', 'Drinks aperitivo lemon 20cc', 5, 'FLES', '2027-02-27'),
    ('G-FLWND P1', 'Drinks aperitivo rood 20cc', 6, 'FLES', '2027-02-27'),
    ('G-FLWND P1', 'Drinks coca cola zero blik 33cc', 30, 'BLIK', '2027-02-27'),
    ('G-FLWND R1', 'Drinks coca cola zero fles 1 l', 2, 'FLES', '2027-03-31'),
    ('G-FLWND R1', 'Drinks kir royal 4% 0,7 l', 1, 'FLES', '2027-01-01'),
    ('G-FLWND R1', 'Drinks santa alicia 12% 0,7 l', 1, 'FLES', '2030-01-01'),
    ('G-FLWND R1', 'Natuur azijn 1,5 liter', 1, 'FLES', '2099-12-31'),
    ('G-FLWND R1', 'Olie zonnebloem olie 1 l', 1, 'FLES', '2026-01-01'),
    ('G-FLWND R1', 'Olie zonnebloem olie 1 l', 3, 'FLES', '2027-02-27'),
    ('G-FLWND R1', 'Smaakmaker bango 1 l', 1, 'FLES', '2028-11-10'),
    ('G-FLWND R1', 'Water spa blauw 1,5 l', 2, 'FLES', '2026-12-31'),
    ('G-FLWND V1', 'Olie frituur olie 3 l', 0, 'FLES', null),
    ('G-FLWND V1', 'Olie frituur olie bezig', 1, 'FLES', null),
    ('G-FLWND V1', 'Olie olijfolie ital 5l', 1, 'BLIK', '2027-03-30'),
    ('G-FLWND V1', 'Olie olijfolie ital 5l bezig', 1, 'BLIK', '2026-10-28'),
    ('G-FLWND V1', 'Olie olijfolie spanje 1/2 l', 1, 'FLES', '2027-06-30'),
    ('G-KAST1 P1', 'Bloem 2 kg lidl', 1, 'ZAK', '2027-09-15'),
    ('G-KAST1 P1', 'Broodmeel spelt volkoren 500 gr', 1, 'ZAK', '2026-09-11'),
    ('G-KAST1 P1', 'Broodmeel wit 500 gr', 1, 'ZAK', '2026-02-06'),
    ('G-KAST1 P1', 'Broodmeel wit 500 gr', 1, 'ZAK', '2026-06-11'),
    ('G-KAST1 P1', 'Maismeel gofio de milo la piña 1kg', 1, 'ZAK', '2026-10-07'),
    ('G-KAST1 P1', 'Melkpoeder nestlé', 1, 'ZAK', '2026-06-20'),
    ('G-KAST1 P1', 'Suiker gelei 1 kg', 1, 'PAK', null),
    ('G-KAST1 P1', 'Suiker gelei 1/2 kg', 2, 'PAK', null),
    ('G-KAST1 P1', 'Suiker kristal 1 kg', 2, 'PAK', null),
    ('G-KAST1 P1', 'Suiker wittte basterd 500 gr', 1, 'ZAK', null),
    ('G-KAST1 P2', 'Deegwaar primi dallo sardegna 500 gr', 1, 'DOOS', '2027-11-28'),
    ('G-KAST1 P2', 'Deegwaar spätzle 500 gr', 1, 'ZAK', '2028-07-16'),
    ('G-KAST1 P2', 'Pasta fusilli middel 1 kg', 1, 'ZAK', '2029-05-01'),
    ('G-KAST1 P2', 'Pasta macaroni grof 500 gr', 1, 'ZAK', '2029-05-27'),
    ('G-KAST1 P2', 'Pasta macaroni grof 500 gr BIO', 1, 'ZAK', '2029-08-19'),
    ('G-KAST1 P2', 'Pasta macaroni klein 1kg', 1, 'ZAK', '2029-06-01'),
    ('G-KAST1 P2', 'Pasta macaroni klein 250 gr bakje', 1, 'BAK', null),
    ('G-KAST1 P2', 'Pasta pappardelle 19 rummo -restje-', 1, 'ZAK', '2028-09-17'),
    ('G-KAST1 P3', 'Bakmix appelbeignets koopmans', 1, 'DOOS', '2027-03-03'),
    ('G-KAST1 P3', 'Bakmix appelbeignets koopmans', 1, 'DOOS', '2026-07-05'),
    ('G-KAST1 P3', 'Bakmix oliebollen gourmet 500 gr', 1, 'ZAK', '2026-11-27'),
    ('G-KAST1 P3', 'Bakmix oliebollen koopmans 500 gr', 1, 'DOOS', '2023-03-07'),
    ('G-KAST1 P3', 'Bakmix wafels AH 400 gr', 1, 'ZAK', '2027-04-01'),
    ('G-KAST1 P3', 'Bakmix wafels AH excellent 225 gr', 1, 'ZAK', '2027-03-03'),
    ('G-KAST1 P3', 'Deegwaar mie nestjes 500 gr', 1, 'DOOS', '2029-09-01'),
    ('G-KAST1 P3', 'Deegwaar ramen 300 gr', 1, 'ZAK', '2027-06-20'),
    ('G-KAST1 P3', 'Havermout 1 kg', 1, 'ZAK', '2027-08-07'),
    ('G-KAST1 P3', 'Kloppudding aardbei', 0, 'PAK', '2027-07-01'),
    ('G-KAST1 P3', 'Kloppudding banaan', 1, 'PAK', '2027-07-01'),
    ('G-KAST1 P3', 'Smaakmaker sinaasappel rasp', 1, 'PAKJE', '2024-05-01'),
    ('G-KAST1 P3', 'Zout kristallen 1 kg', 1, 'PAK', '2031-01-01'),
    ('G-KAST1 P3', 'Zout maldon vlokken 250 gr', 1, 'DOOS', '2031-01-01'),
    ('G-KAST1 P4', 'Aardappelpuree z melk zakjes 4st', 1, 'DOOS', '2027-12-30'),
    ('G-KAST1 P4', 'Aardappelpuree m melk zakjes 4st', 1, 'DOOS', '2026-12-31'),
    ('G-KAST1 P4', 'Rijst basmati 1 kg', 1, 'PAK', '2027-03-01'),
    ('G-KAST1 P4', 'Rijst paella shagaï 1 kg', 1, 'PAK', '2027-04-07'),
    ('G-KAST1 P4', 'Rijst sawi (vomar) 4,5 kg', 1, 'CONT', '2028-08-18'),
    ('G-KAST2 P1', 'Bouillon groente 1 kg', 1, 'POT', '2028-06-10'),
    ('G-KAST2 P1', 'Bouillon vlees 1 kg', 1, 'POT', '2028-02-03'),
    ('G-KAST2 P1', 'Broodbeleg calve pindakaas 1 kg', 1, 'PAK', '2027-04-10'),
    ('G-KAST2 P1', 'Kruiden asia green garden nasi bami', 2, 'ZAK', '2026-09-16'),
    ('G-KAST2 P1', 'Kruiden fish taco santa maria', 1, 'ZAK', '2021-02-04'),
    ('G-KAST2 P1', 'Kruiden garam masala', 1, 'ZAK', '2027-07-30'),
    ('G-KAST2 P1', 'Kruiden gehaktkruiden 160', 1, 'POT', '2029-07-30'),
    ('G-KAST2 P1', 'Kruiden korianderzaad gemalen', 1, 'ZAK', '2027-03-18'),
    ('G-KAST2 P1', 'Kruiden original taco santa maria', 2, 'ZAK', '2027-09-15'),
    ('G-KAST2 P1', 'Pastasaus tomatensaus 510 pot', 1, 'POT', '2028-06-30'),
    ('G-KAST2 P1', 'Potgroenten boerenkool hak 340/245', 1, 'POT', '2026-12-31'),
    ('G-KAST2 P1', 'Potgroenten kikkererwten 540/400', 1, 'POT', '2028-07-31'),
    ('G-KAST2 P1', 'Potgroenten paprika geel 465/350 pot', 1, 'POT', '2027-12-31'),
    ('G-KAST2 P1', 'Potgroenten paprika rood 295/185', 1, 'POT', '2027-10-31'),
    ('G-KAST2 P1', 'Potgroenten tuinbonen pot 660/420', 1, 'POT', '2027-07-01'),
    ('G-KAST2 P1', 'Potgroenten tuinbonen pot 660/420', 1, 'POT', '2028-06-30'),
    ('G-KAST2 P1', 'Potgroenten veldertjes 685/450', 1, 'POT', '2028-08-31'),
    ('G-KAST2 P1', 'Potvruchten kersen z pit op sap 700/350', 1, 'POT', '2029-09-01'),
    ('G-KAST2 P1', 'Smaakmaker tabasco rood', 1, 'FLES', '2029-05-01'),
    ('G-KAST2 P1', 'Woksaus kerrie aldi 490 gr', 1, 'POT', '2026-08-31'),
    ('G-KAST2 P2', 'Maaltijd kip madras 2-3 pers', 1, 'PAK', '2027-04-01'),
    ('G-KAST2 P2', 'Maaltijd kip tandoori 2-3 pers', 3, 'PAK', '2028-01-01'),
    ('G-KAST2 P2', 'Maaltijd lasagnette 2-3 pers', 3, 'PAK', '2028-01-01'),
    ('G-KAST2 P2', 'Maaltijd taquitos 2-3 personen', 2, 'PAK', '2025-08-19'),
    ('G-KAST2 P2', 'Olijven kalamata kaliston m pit 380/220', 2, 'POT', '2028-03-13'),
    ('G-KAST2 P2', 'Smaakmaker mosterd grof zaanse 335', 1, 'POT', '2027-05-31'),
    ('G-KAST2 P2', 'Tafelsaus honey barbecue', 1, 'FLAK', '2027-11-30'),
    ('G-KAST2 P2', 'Tafelsaus ketchup', 1, 'FLAK', '2027-03-06'),
    ('G-KAST2 P2', 'Tafelsaus mayomix', 1, 'FLAK', '2027-07-31'),
    ('G-KAST2 P2', 'Tafelsaus sriracha mayo', 1, 'FLAK', '2027-07-31'),
    ('G-KAST2 P2', 'Vlees rookworst unox 285', 4, 'VACU', '2027-01-13'),
    ('G-KAST2 P2', 'Vlees salland ham', 1, 'BLIK', '2029-05-07'),
    ('G-KAST2 P2', 'Vlees salland ham', 2, 'BLIK', '2029-06-29'),
    ('G-KAST2 P2', 'Zuur a''damse augurk en ui kesbeke 370', 1, 'POT', '2028-07-01'),
    ('G-KAST2 P2', 'Zuur augurken freshbona 720/360', 1, 'POT', '2025-12-31'),
    ('G-KAST2 P2', 'Zuur picalilly kuhne 690', 1, 'POT', '2028-12-15'),
    ('G-KAST2 P3', 'Cocosmelk mae ploy 250 ml', 1, 'PAK', '2027-07-01'),
    ('G-KAST2 P3', 'Boemboe bami koningsvogel', 2, 'BKJE', '2028-04-21'),
    ('G-KAST2 P3', 'Boemboe groene curry sum sam', 1, 'BKJE', '2026-07-15'),
    ('G-KAST2 P3', 'Boemboe nasi koningsvogel', 1, 'BKJE', '2028-04-21'),
    ('G-KAST2 P3', 'Boemboe sajoer boontjes koningsvogel', 0, 'BKJE', null),
    ('G-KAST2 P3', 'Room culinair ampina 200 ml', 1, 'PAK', '2026-12-24'),
    ('G-KAST2 P3', 'Room slagroom milsani 200 ml', 1, 'PAK', '2026-10-31'),
    ('G-KAST2 P3', 'Sambal peteh 170 ml', 1, 'POT', '2026-12-31'),
    ('G-KAST2 P3', 'Vis haring in tomatensaus statesman 190', 1, 'BLIK', '2029-03-31'),
    ('G-KAST2 P3', 'Vis makreelfilets grand gerard 125/85', 8, 'BLIK', '2028-10-16'),
    ('G-KAST2 P3', 'Vis pulpo abrasado olijfolie 160/90', 1, 'BLIK', '2028-03-31'),
    ('G-KAST2 P3', 'Vis rose zalm great ocean 160/1xx', 4, 'BLIK', '2025-07-31'),
    ('G-KAST2 P3', 'Vis sardines grand gerard 125/90', 5, 'BLIK', '2029-12-31'),
    ('G-KAST2 P3', 'Vis tonijn in olijfolie grand gerard 160/112', 1, 'BLIK', '2028-06-12'),
    ('G-KAST2 P3', 'Vis tonijn in water 145/102', 5, 'BLIK', '2028-11-30'),
    ('G-KAST2 P3', 'Vis tonijn in water ouwehand 160/112', 4, 'BLIK', '2027-02-28'),
    ('G-KAST2 P4', 'Kappertjes grand gerard 350/200', 1, 'POT', '2027-07-15'),
    ('G-KAST2 P4', 'Pastasaus pastasaus', 1, 'POT', '2028-07-05'),
    ('G-KAST2 P4', 'Pastasaus tomato frito AH 400', 2, 'PAK', '2028-03-12'),
    ('G-KAST2 P4', 'Pastasaus tomato frito aldi 400', 2, 'PAK', '2028-02-14'),
    ('G-KAST2 P4', 'Pastasaus tomato frito basil heinz 350', 1, 'PAK', '2027-09-30'),
    ('G-KAST2 P4', 'Pesto goen barese 190', 1, 'POT', '2029-05-01'),
    ('G-KAST2 P4', 'Pesto rood cucina 190', 1, 'POT', '2028-11-01'),
    ('G-KAST2 P4', 'Tomaten blokjes all seasons 400/240', 4, 'BLIK', '2028-12-31'),
    ('G-KAST2 P4', 'Tomaten heel in blik all seasons', 0, 'BLIK', null),
    ('G-KAST2 P4', 'Tomaten puree 70gr', 3, 'BLIK', '2028-04-22'),
    ('G-KAST2 P4', 'Tomaten zongedroogd droog', 2, 'ZAK', '2026-07-01'),
    ('G-KAST2 P4', 'Tomaten zongedroogd in olie', 1, 'POT', '2028-02-12'),
    ('G-KAST2 P4', 'Tomaten zongedroogd in olie', 1, 'POT', '2028-04-15'),
    ('G-KAST2 P5', 'Allesbinder koopmans 200 gr', 1, 'DOOS', '2029-02-12'),
    ('G-KAST2 P5', 'Jus met uitjes 5pak', 5, 'DOOS', '2027-09-09'),
    ('G-KAST2 P5', 'Jus pikant 5pak', 5, 'DOOS', '2027-04-30'),
    ('G-KAST2 P5', 'Jus rundvlees 3pak', 3, 'DOOS', '2027-05-10'),
    ('G-KAST2 P5', 'Knorr groentesoep 2pak', 2, 'DOOS', '2025-12-31'),
    ('G-KAST2 P5', 'Paneermeel', 1, 'DOOS', '2027-01-31'),
    ('G-KAST2 P5', 'Paneermeel', 1, 'DOOS', '2028-01-31'),
    ('G-KAST2 P5', 'Paneermeel panko misako 200 gr', 2, 'ZAK', '2027-06-26'),
    ('G-KAST2 P5', 'Sausmix beciamella 2pk', 1, 'DOOS', '2027-07-31'),
    ('G-KAST2 P5', 'Sausmix champignons', 1, 'PAK', '2028-02-14'),
    ('G-KAST2 P5', 'Sausmix ham kaas', 1, 'ZAK', '2025-05-31'),
    ('G-KAST2 P5', 'Soepmix bruine bonen honig droog', 1, 'PAK', '2023-12-31'),
    ('G-KASTBV P1', 'Blikfruit perzikken', 1, 'st', '2027-06-30'),
    ('G-KASTBV P1', 'Eiwit poeder', 1, 'st', '2027-05-31'),
    ('G-KASTBV P2', 'Blikgroenten bonen lima', 1, 'BLIK', '2030-01-01'),
    ('G-KASTBV P2', 'Blikgroenten borlotti bonen', 1, 'st', '2026-01-01'),
    ('G-KASTBV P2', 'Blikgroenten kidney', 2, 'st', '2030-01-01'),
    ('G-KASTBV P2', 'Blikgroenten linzen', 2, 'st', '2025-05-05'),
    ('G-KASTBV P2', 'Blikgroenten linzen BIO', 1, 'st', '2027-11-30'),
    ('G-KASTBV P2', 'Blikgroenten witte bonen', 0, 'st', null),
    ('G-KASTBV P2', 'Blikgroenten witte bonen in tomatensaus', 2, 'st', '2025-01-25'),
    ('G-KASTBV P3', 'Alubia granja droog 500 gr', 1, 'st', '2026-03-31'),
    ('G-KASTBV P3', 'Ragout champignon 400', 1, 'BLIK', '2028-08-01'),
    ('G-KASTBV P3', 'Ragout champignon 400', 1, 'BLIK', '2029-10-01'),
    ('G-KASTBV P3', 'Ragout kalfs 400', 1, 'BLIK', '2028-08-01'),
    ('G-KASTBV P3', 'Soep erwtensoep in blik', 2, 'st', '2028-06-01'),
    ('G-KASTBV P3', 'Spliterwten droog 500 gr', 2, 'st', '2022-11-01')
  ) as v (code, name, quantity, unit, best_before)
  join public.pantry_locations l on l.code = v.code;
end $$;
