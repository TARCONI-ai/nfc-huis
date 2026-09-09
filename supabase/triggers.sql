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
