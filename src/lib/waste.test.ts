import { describe, expect, it } from 'vitest';
import { getUpcomingCollections } from './waste';
import { daysBetween, formatDutchDate, relativeDayLabel, todayInAmsterdam } from './dates';
import type { WasteScheduleEntry } from '../types/waste';
import schedule from '../data/waste-schedule.json';

const entries = (...items: [string, string][]): WasteScheduleEntry[] =>
  items.map(([date, type]) => ({ date, type }) as WasteScheduleEntry);

describe('getUpcomingCollections', () => {
  it('ignora las fechas anteriores a hoy', () => {
    const result = getUpcomingCollections(
      entries(['2026-09-01', 'gft'], ['2026-09-11', 'pmd']),
      '2026-09-09',
    );
    expect(result.map((c) => c.date)).toEqual(['2026-09-11']);
  });

  it('considera la recogida de hoy como la próxima', () => {
    const result = getUpcomingCollections(
      entries(['2026-09-09', 'gft'], ['2026-09-11', 'pmd']),
      '2026-09-09',
    );
    expect(result[0]).toMatchObject({ date: '2026-09-09', daysUntil: 0 });
  });

  it('ordena un JSON desordenado', () => {
    const result = getUpcomingCollections(
      entries(['2026-12-04', 'pmd'], ['2026-09-11', 'pmd'], ['2026-10-19', 'papier']),
      '2026-09-09',
    );
    expect(result.map((c) => c.date)).toEqual(['2026-09-11', '2026-10-19', '2026-12-04']);
  });

  it('agrupa varias fracciones el mismo día', () => {
    const result = getUpcomingCollections(
      entries(['2026-10-22', 'grofTuinafval'], ['2026-10-22', 'gft']),
      '2026-09-09',
    );
    expect(result).toHaveLength(1);
    expect(result[0].types).toEqual(['grofTuinafval', 'gft']);
  });

  it('no duplica una fracción repetida el mismo día', () => {
    const result = getUpcomingCollections(
      entries(['2026-10-22', 'gft'], ['2026-10-22', 'gft']),
      '2026-09-09',
    );
    expect(result[0].types).toEqual(['gft']);
  });

  it('descarta tipos desconocidos en vez de romper', () => {
    const result = getUpcomingCollections(
      entries(['2026-09-11', 'restafval'], ['2026-09-15', 'gft']),
      '2026-09-09',
    );
    expect(result.map((c) => c.date)).toEqual(['2026-09-15']);
  });

  it('devuelve lista vacía cuando se acaba el calendario', () => {
    const result = getUpcomingCollections(entries(['2026-09-11', 'pmd']), '2027-01-01');
    expect(result).toEqual([]);
  });
});

describe('cálculo de días', () => {
  it('no se desvía en el cambio de horario de invierno (25 oct 2026)', () => {
    // El 25 de octubre de 2026 Europe/Amsterdam pasa de CEST a CET.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-10-19', '2026-11-16')).toBe(28);
  });

  it('no se desvía en el cambio de horario de verano (29 mar 2026)', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('detecta la fecha civil de Ámsterdam, no la UTC', () => {
    // 22:30 UTC del 8 de septiembre ya es el día 9 en Ámsterdam (UTC+2).
    expect(todayInAmsterdam(new Date('2026-09-08T22:30:00Z'))).toBe('2026-09-09');
  });
});

describe('textos en holandés', () => {
  it('usa Vandaag / Morgen / Overmorgen', () => {
    expect(relativeDayLabel(0)).toBe('Vandaag');
    expect(relativeDayLabel(1)).toBe('Morgen');
    expect(relativeDayLabel(2)).toBe('Overmorgen');
    expect(relativeDayLabel(9)).toBe('Over 9 dagen');
  });

  it('formatea la fecha completa en holandés', () => {
    expect(formatDutchDate('2026-09-11')).toBe('vrijdag 11 september');
  });
});

describe('waste-schedule.json real', () => {
  it('tiene fechas ISO válidas y tipos conocidos', () => {
    const parsed = getUpcomingCollections(schedule as WasteScheduleEntry[], '2000-01-01');
    expect(parsed).toHaveLength(schedule.length);
    for (const entry of schedule) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
