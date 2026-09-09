/**
 * Fracciones de residuos que aparecen en el calendario municipal.
 * Los textos visibles están en holandés a propósito.
 */
export const WASTE_TYPES = {
  gft: {
    label: 'GFT',
    description: 'Groente, fruit en tuinafval',
    icon: '🟢',
    color: '#2f7a3d',
  },
  pmd: {
    label: 'PMD',
    description: 'Plastic, metaal en drankenkartons',
    icon: '🔵',
    color: '#1c5fa8',
  },
  papier: {
    label: 'Papier',
    description: 'Oud papier en karton',
    icon: '📦',
    color: '#8a5a2b',
  },
  grofTuinafval: {
    label: 'Grof tuinafval',
    description: 'Takken en snoeiafval',
    icon: '🌿',
    color: '#4a6b2a',
  },
  kerstboom: {
    label: 'Kerstboom',
    description: 'Ophalen van kerstbomen',
    icon: '🎄',
    color: '#1f5c34',
  },
} as const;

export type WasteTypeId = keyof typeof WASTE_TYPES;

export function isWasteTypeId(value: string): value is WasteTypeId {
  return Object.prototype.hasOwnProperty.call(WASTE_TYPES, value);
}
