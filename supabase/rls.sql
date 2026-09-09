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
