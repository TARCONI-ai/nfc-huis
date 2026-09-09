export const TIME_ZONE = 'Europe/Amsterdam';

/**
 * Fecha civil de hoy en Europe/Amsterdam, en formato ISO `YYYY-MM-DD`.
 * Usamos `en-CA` porque su formato numérico corto ya es `YYYY-MM-DD`.
 */
export function todayInAmsterdam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Convierte `YYYY-MM-DD` a un instante UTC de mediodía, inmune a DST. */
function isoToUtcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Días civiles entre dos fechas ISO. No usa milisegundos locales, así que
 * los cambios de horario de verano no desplazan el resultado.
 */
export function daysBetween(fromIso: string, toIso: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((isoToUtcDate(toIso).getTime() - isoToUtcDate(fromIso).getTime()) / MS_PER_DAY);
}

/** "vrijdag 18 september" */
export function formatDutchDate(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(isoToUtcDate(iso));
}

/** "vr 18 sep" — versión corta para la lista de próximas recogidas. */
export function formatDutchDateShort(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(isoToUtcDate(iso));
}

/** "Vandaag" / "Morgen" / "Overmorgen" / "Over 9 dagen" */
export function relativeDayLabel(days: number): string {
  if (days <= 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  if (days === 2) return 'Overmorgen';
  return `Over ${days} dagen`;
}

/** "9 september 2026, 14:32" — para el pie de página. */
export function formatDutchTimestamp(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
}
