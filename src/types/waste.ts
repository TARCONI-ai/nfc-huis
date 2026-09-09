import type { WasteTypeId } from '../data/waste-types';

/** Una entrada suelta del JSON del calendario. */
export interface WasteScheduleEntry {
  date: string; // ISO YYYY-MM-DD
  type: WasteTypeId;
}

/** Todas las fracciones que se recogen un mismo día. */
export interface WasteCollection {
  date: string; // ISO YYYY-MM-DD
  types: WasteTypeId[];
  daysUntil: number;
}
