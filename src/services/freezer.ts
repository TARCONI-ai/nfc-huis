import { supabase } from '../lib/supabase';
import { clampQuantity, classifyError } from '../lib/freezer-rules';
import type {
  FreezerEvent,
  FreezerItem,
  FreezerItemDraft,
  FreezerLocation,
} from '../types/freezer';

const HISTORY_LIMIT = 100;

function client() {
  if (!supabase) throw new FreezerError('not-configured');
  return supabase;
}

export type FreezerErrorKind = 'not-configured' | 'offline' | 'server';

/** Error con una causa clasificada, para que la UI elija el texto adecuado. */
export class FreezerError extends Error {
  constructor(
    readonly kind: FreezerErrorKind,
    message: string = kind,
  ) {
    super(message);
    this.name = 'FreezerError';
  }
}

/**
 * Un proyecto Supabase pausado o sin red produce un fallo de fetch, no un
 * error HTTP. Los distinguimos para poder dar una pista útil a Jasper.
 */
function toFreezerError(error: unknown): FreezerError {
  if (error instanceof FreezerError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new FreezerError(classifyError(message), message);
}

async function run<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  try {
    const { data, error } = await query;
    if (error) throw toFreezerError(error);
    return data as T;
  } catch (error) {
    throw toFreezerError(error);
  }
}

export async function fetchLocations(): Promise<FreezerLocation[]> {
  return run<FreezerLocation[]>(
    client()
      .from('freezer_locations')
      .select('id, name, sort_order, active')
      .eq('active', true)
      .order('sort_order'),
  );
}

export async function fetchItems(): Promise<FreezerItem[]> {
  return run<FreezerItem[]>(
    client().from('freezer_items').select('*').order('name'),
  );
}

export async function fetchEvents(): Promise<FreezerEvent[]> {
  return run<FreezerEvent[]>(
    client()
      .from('freezer_events')
      .select('id, item_id, item_name_snapshot, action, quantity_delta, from_location_id, to_location_id, created_at')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  );
}

export async function createItem(draft: FreezerItemDraft): Promise<FreezerItem> {
  const rows = await run<FreezerItem[]>(
    client().from('freezer_items').insert(draft).select(),
  );
  return rows[0];
}

export async function updateItem(
  id: string,
  patch: Partial<FreezerItemDraft>,
): Promise<FreezerItem> {
  const rows = await run<FreezerItem[]>(
    client().from('freezer_items').update(patch).eq('id', id).select(),
  );
  return rows[0];
}

/** Nunca baja de 0: la restricción también existe en SQL, pero mejor no llegar. */
export async function setQuantity(id: string, quantity: number): Promise<FreezerItem> {
  return updateItem(id, { quantity: clampQuantity(quantity) });
}

export async function deleteItem(id: string): Promise<void> {
  await run(client().from('freezer_items').delete().eq('id', id).select());
}
