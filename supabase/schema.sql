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
