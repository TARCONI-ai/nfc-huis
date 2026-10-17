import { daysBetween } from './dates';

/**
 * Prioridad según la fecha de caducidad (THT). Los umbrales de 60 y 21 días
 * son los mismos que usan las fórmulas del Excel VOORRADEN del abuelo.
 */
export type Priority = 'weggooien' | 'verlopen' | 'nu' | 'binnenkort' | 'bewaren' | 'geen';

/** Más de 60 días: se puede guardar tranquilamente (BEWAREN en el Excel). */
export const KEEP_AFTER_DAYS = 60;
/** 21 días o menos: hay que gastarlo ya (THT DATUM en el Excel). */
export const USE_NOW_DAYS = 21;
/** Caducado hace más de 3 meses: a la basura. */
export const THROW_AWAY_AFTER_DAYS = 90;

export function priorityOf(bestBefore: string | null, today: string): Priority {
  if (!bestBefore) return 'geen';
  const days = daysBetween(today, bestBefore);
  if (days < -THROW_AWAY_AFTER_DAYS) return 'weggooien';
  if (days < 0) return 'verlopen';
  if (days <= USE_NOW_DAYS) return 'nu';
  if (days <= KEEP_AFTER_DAYS) return 'binnenkort';
  return 'bewaren';
}

export interface PriorityInfo {
  icon: string;
  label: string;
  hint: string;
}

export const PRIORITY_INFO: Record<Priority, PriorityInfo> = {
  weggooien: { icon: '☠️', label: 'Weggooien', hint: 'Al lang over de datum. Weggooien!' },
  verlopen: { icon: '⚠️', label: 'Over datum', hint: 'Over de datum. Eerst goed bekijken.' },
  nu: { icon: '🔴', label: 'Nu gebruiken', hint: `Nog ${USE_NOW_DAYS} dagen of minder.` },
  binnenkort: { icon: '🟠', label: 'Binnenkort gebruiken', hint: `Nog ${KEEP_AFTER_DAYS} dagen of minder.` },
  bewaren: { icon: '🟢', label: 'Bewaren', hint: 'Nog lang goed.' },
  geen: { icon: '', label: '', hint: '' },
};

/** Orden de la pestaña "Prioriteit": lo más urgente arriba. */
export const URGENT_PRIORITIES: readonly Priority[] = ['weggooien', 'verlopen', 'nu', 'binnenkort'];

/**
 * Productos que piden atención, agrupados por prioridad y dentro de cada grupo
 * por fecha (el que antes caduca, primero). Lo que está a 0 no cuenta: ya no hay.
 */
export function priorityGroups<T extends { best_before: string | null; quantity: number; name: string }>(
  items: readonly T[],
  today: string,
): { priority: Priority; items: T[] }[] {
  return URGENT_PRIORITIES.map((priority) => ({
    priority,
    items: items
      .filter((item) => item.quantity > 0 && priorityOf(item.best_before, today) === priority)
      .sort(
        (a, b) =>
          (a.best_before ?? '').localeCompare(b.best_before ?? '') ||
          a.name.localeCompare(b.name, 'nl'),
      ),
  })).filter((group) => group.items.length > 0);
}

/** "30-08-2027", como en la hoja de papel. */
export function formatTht(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}
