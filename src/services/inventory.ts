import { supabase } from '../lib/supabase';
import { clampQuantity, classifyError } from '../lib/freezer-rules';
import type { InventoryEvent } from '../types/inventory';

const HISTORY_LIMIT = 100;

/**
 * Acceso común a los dos inventarios (vriezer y voorraden): mismas columnas
 * básicas, mismas reglas y mismos errores; sólo cambian las tablas.
 */

export type InventoryErrorKind = 'not-configured' | 'offline' | 'server';

/** Error con una causa clasificada, para que la UI elija el texto adecuado. */
export class InventoryError extends Error {
  constructor(
    readonly kind: InventoryErrorKind,
    message: string = kind,
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

export function client() {
  if (!supabase) throw new InventoryError('not-configured');
  return supabase;
}

/**
 * Un proyecto Supabase pausado o sin red produce un fallo de fetch, no un
 * error HTTP. Los distinguimos para poder dar una pista útil a Jasper.
 */
function toInventoryError(error: unknown): InventoryError {
  if (error instanceof InventoryError) return error;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return new InventoryError(classifyError(message), message);
}

export async function run<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  try {
    const { data, error } = await query;
    if (error) throw toInventoryError(error);
    return data as T;
  } catch (error) {
    throw toInventoryError(error);
  }
}

/**
 * Si otro móvil ya borró el producto, el UPDATE no falla: devuelve cero filas.
 * Lo convertimos en error para que la lista se recargue en vez de romperse.
 */
export function firstRow<T>(rows: readonly T[]): T {
  if (rows.length === 0) throw new InventoryError('server', 'el producto ya no existe');
  return rows[0];
}

export interface InventoryApi<TLocation, TItem, TDraft> {
  fetchLocations: () => Promise<TLocation[]>;
  fetchItems: () => Promise<TItem[]>;
  createItem: (draft: TDraft) => Promise<TItem>;
  updateItem: (id: string, patch: Partial<TDraft>) => Promise<TItem>;
  setQuantity: (id: string, quantity: number) => Promise<TItem>;
  deleteItem: (id: string) => Promise<void>;
  /** Últimos movimientos, el más reciente primero. */
  fetchEvents: () => Promise<InventoryEvent[]>;
}

export function createInventoryApi<TLocation, TItem, TDraft extends object>(tables: {
  locations: string;
  locationColumns: string;
  items: string;
  events: string;
}): InventoryApi<TLocation, TItem, TDraft> {
  const updateItem = async (id: string, patch: Partial<TDraft>) => {
    const rows = await run<TItem[]>(
      client().from(tables.items).update(patch as Record<string, unknown>).eq('id', id).select(),
    );
    return firstRow(rows);
  };

  return {
    fetchLocations: () =>
      run<TLocation[]>(
        client()
          .from(tables.locations)
          .select(tables.locationColumns)
          .eq('active', true)
          .order('sort_order'),
      ),
    fetchItems: () => run<TItem[]>(client().from(tables.items).select('*').order('name')),
    createItem: async (draft) => {
      const rows = await run<TItem[]>(
        client().from(tables.items).insert(draft as Record<string, unknown>).select(),
      );
      return firstRow(rows);
    },
    updateItem,
    /** Nunca baja de 0: la restricción también existe en SQL, pero mejor no llegar. */
    setQuantity: (id, quantity) =>
      updateItem(id, { quantity: clampQuantity(quantity) } as unknown as Partial<TDraft>),
    deleteItem: async (id) => {
      await run(client().from(tables.items).delete().eq('id', id).select());
    },
    fetchEvents: () =>
      run<InventoryEvent[]>(
        client()
          .from(tables.events)
          .select(
            'id, item_id, item_name_snapshot, action, quantity_delta, from_location_id, to_location_id, created_at',
          )
          .order('created_at', { ascending: false })
          .limit(HISTORY_LIMIT),
      ),
  };
}
