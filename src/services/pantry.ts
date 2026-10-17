import { createInventoryApi } from './inventory';
import type { PantryItem, PantryItemDraft, PantryLocation } from '../types/pantry';

export const pantryApi = createInventoryApi<PantryLocation, PantryItem, PantryItemDraft>({
  locations: 'pantry_locations',
  locationColumns: 'id, code, zone, name, sort_order, active',
  items: 'pantry_items',
});
