/** Un movimiento del historial; lo escribe un trigger en Supabase, nunca la web. */
export type InventoryAction = 'create' | 'increase' | 'decrease' | 'move' | 'edit' | 'delete';

export interface InventoryEvent {
  id: string;
  item_id: string | null;
  item_name_snapshot: string;
  action: InventoryAction;
  quantity_delta: number | null;
  from_location_id: string | null;
  to_location_id: string | null;
  created_at: string;
}
