import { createInventoryApi } from './inventory';
import type { FreezerItem, FreezerItemDraft, FreezerLocation } from '../types/freezer';

export const freezerApi = createInventoryApi<FreezerLocation, FreezerItem, FreezerItemDraft>({
  locations: 'freezer_locations',
  locationColumns: 'id, name, sort_order, active',
  items: 'freezer_items',
  events: 'freezer_events',
});

export const { fetchLocations, fetchItems, fetchEvents } = freezerApi;
