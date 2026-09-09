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
