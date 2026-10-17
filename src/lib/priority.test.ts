import { describe, expect, it } from 'vitest';
import { formatTht, priorityGroups, priorityOf } from './priority';

const TODAY = '2026-10-17';

describe('prioridad según el THT (mismas reglas que el Excel)', () => {
  it('sin fecha no tiene prioridad (no perecedero)', () => {
    expect(priorityOf(null, TODAY)).toBe('geen');
  });

  it('más de 60 días: bewaren', () => {
    expect(priorityOf('2026-12-17', TODAY)).toBe('bewaren');
  });

  it('60 días o menos: binnenkort gebruiken', () => {
    expect(priorityOf('2026-12-16', TODAY)).toBe('binnenkort');
    expect(priorityOf('2026-11-08', TODAY)).toBe('binnenkort');
  });

  it('21 días o menos, hoy incluido: nu gebruiken', () => {
    expect(priorityOf('2026-11-07', TODAY)).toBe('nu');
    expect(priorityOf(TODAY, TODAY)).toBe('nu');
  });

  it('caducado hace poco: over datum', () => {
    expect(priorityOf('2026-10-16', TODAY)).toBe('verlopen');
    expect(priorityOf('2026-07-19', TODAY)).toBe('verlopen');
  });

  it('caducado hace más de 3 meses: weggooien (calavera)', () => {
    expect(priorityOf('2026-07-18', TODAY)).toBe('weggooien');
    expect(priorityOf('2021-02-04', TODAY)).toBe('weggooien');
  });
});

describe('vista de prioridad', () => {
  const item = (name: string, best_before: string | null, quantity = 1) => ({
    name,
    best_before,
    quantity,
  });

  it('agrupa de más a menos urgente y ordena por fecha', () => {
    const groups = priorityGroups(
      [
        item('Room', '2026-10-31'),
        item('Fish taco', '2021-02-04'),
        item('Melk', '2026-11-20'),
        item('Soep', '2026-10-30'),
        item('Zout', null),
        item('Ham', '2029-05-07'),
      ],
      TODAY,
    );
    expect(groups.map((g) => [g.priority, g.items.map((it) => it.name)])).toEqual([
      ['weggooien', ['Fish taco']],
      ['nu', ['Soep', 'Room']],
      ['binnenkort', ['Melk']],
    ]);
  });

  it('ignora lo que está a 0: ya no queda nada que caduque', () => {
    expect(priorityGroups([item('Room', '2026-10-31', 0)], TODAY)).toEqual([]);
  });
});

describe('formato de fecha', () => {
  it('escribe el THT como en la hoja de papel', () => {
    expect(formatTht('2027-08-30')).toBe('30-08-2027');
  });
});
