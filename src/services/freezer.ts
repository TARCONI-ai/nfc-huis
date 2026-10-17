import { client, createInventoryApi, run } from './inventory';
import type {
  FreezerEvent,
  FreezerItem,
  FreezerItemDraft,
  FreezerLocation,
} from '../types/freezer';

const HISTORY_LIMIT = 100;

export const freezerApi = createInventoryApi<FreezerLocation, FreezerItem, FreezerItemDraft>({
  locations: 'freezer_locations',
  locationColumns: 'id, name, sort_order, active',
  items: 'freezer_items',
});

export const { fetchLocations, fetchItems } = freezerApi;

export async function fetchEvents(): Promise<FreezerEvent[]> {
  return run<FreezerEvent[]>(
    client()
      .from('freezer_events')
      .select('id, item_id, item_name_snapshot, action, quantity_delta, from_location_id, to_location_id, created_at')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  );
}
