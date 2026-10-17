-- ============================================================
-- nfc-huis · GESCHIEDENIS de la despensa (Voorraden)
--
-- Pega TODO este fichero en el SQL Editor de Supabase y pulsa Run,
-- DESPUÉS de voorraden.sql. Se puede reejecutar sin romper nada.
--
-- Igual que en el congelador: el historial lo escribe un trigger en la
-- base de datos, nunca el navegador, así que no se puede falsear ni borrar.
-- ============================================================

create table if not exists public.pantry_events (
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

create index if not exists pantry_events_created_at_idx
  on public.pantry_events (created_at desc);

-- ---------- Registro automático ----------------------------
-- SECURITY DEFINER a propósito: pantry_events es de sólo lectura para el
-- cliente, así que el INSERT lo hace la función con permisos de su dueño.

create or replace function public.log_pantry_event()
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
    insert into public.pantry_events (
      item_id, item_name_snapshot, action, quantity_delta, to_location_id, snapshot
    )
    values (new.id, new.name, 'create', new.quantity, new.location_id, to_jsonb(new));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.pantry_events (
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

  insert into public.pantry_events (
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

drop trigger if exists pantry_items_log_event on public.pantry_items;
create trigger pantry_items_log_event
  after insert or update or delete on public.pantry_items
  for each row execute function public.log_pantry_event();

-- ---------- RLS: sólo lectura ------------------------------

alter table public.pantry_events enable row level security;

drop policy if exists pantry_events_read on public.pantry_events;
create policy pantry_events_read on public.pantry_events
  for select to anon, authenticated using (true);
