import { daysBetween } from './dates';
import { isWasteTypeId } from '../data/waste-types';
import type { WasteCollection, WasteScheduleEntry } from '../types/waste';

/**
 * Ordena, descarta fechas pasadas y agrupa las fracciones que caen el mismo día.
 * El JSON puede venir desordenado y con tipos desconocidos: ambos se toleran.
 */
export function getUpcomingCollections(
  entries: readonly WasteScheduleEntry[],
  todayIso: string,
): WasteCollection[] {
  const byDate = new Map<string, WasteCollection>();

  for (const entry of entries) {
    if (!isWasteTypeId(entry.type)) continue;

    const daysUntil = daysBetween(todayIso, entry.date);
    if (daysUntil < 0) continue; // recogida ya pasada

    const existing = byDate.get(entry.date);
    if (existing) {
      if (!existing.types.includes(entry.type)) existing.types.push(entry.type);
    } else {
      byDate.set(entry.date, { date: entry.date, types: [entry.type], daysUntil });
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Con cuántos días de margen avisamos de que el calendario se acaba. */
export const SCHEDULE_WARN_DAYS = 45;

/** Última fecha del calendario (o null si está vacío), para avisar antes de quedarnos sin fechas. */
export function lastCollectionDate(entries: readonly WasteScheduleEntry[]): string | null {
  let last: string | null = null;
  for (const entry of entries) {
    if (isWasteTypeId(entry.type) && (last === null || entry.date > last)) last = entry.date;
  }
  return last;
}
