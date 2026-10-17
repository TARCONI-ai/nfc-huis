/** Una balda o cajón de la despensa del garaje. */
export interface PantryLocation {
  id: string;
  /** La etiqueta pegada en el garaje, p. ej. "G-KAST2 P3". */
  code: string;
  /** "Kast 2 (rechts)" */
  zone: string;
  /** "Plank 3" */
  name: string;
  sort_order: number;
  active: boolean;
}

export interface PantryItem {
  id: string;
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  /** null = no caduca (sal, azúcar, fruta del huerto…). */
  best_before: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItemDraft {
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  best_before: string | null;
}

/** "Kast 2 (rechts) · Plank 3" */
export function pantryLocationLabel(location: Pick<PantryLocation, 'zone' | 'name'>): string {
  return `${location.zone} · ${location.name}`;
}
