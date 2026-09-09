export interface FreezerLocation {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface FreezerItem {
  id: string;
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  frozen_on: string | null;
  best_before: string | null;
  created_at: string;
  updated_at: string;
}

export type FreezerAction = 'create' | 'increase' | 'decrease' | 'move' | 'edit' | 'delete';

export interface FreezerEvent {
  id: string;
  item_id: string | null;
  item_name_snapshot: string;
  action: FreezerAction;
  quantity_delta: number | null;
  from_location_id: string | null;
  to_location_id: string | null;
  created_at: string;
}

/** Campos que el formulario puede escribir. */
export interface FreezerItemDraft {
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  frozen_on: string | null;
  best_before: string | null;
}
