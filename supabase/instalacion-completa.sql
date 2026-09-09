-- ============================================================
-- nfc-huis · INSTALACIÓN COMPLETA
--
-- Pega TODO este fichero en el SQL Editor de Supabase y pulsa Run.
-- Contiene, en orden: schema + triggers + rls + seed.
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

