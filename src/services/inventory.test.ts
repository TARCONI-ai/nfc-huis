import { describe, expect, it } from 'vitest';
import { InventoryError, firstRow } from './inventory';

describe('respuesta de un UPDATE', () => {
  it('devuelve la fila guardada', () => {
    expect(firstRow([{ id: 'a' }])).toEqual({ id: 'a' });
  });

  it('sin filas (otro móvil ya lo borró) lanza un InventoryError en vez de devolver undefined', () => {
    expect(() => firstRow([])).toThrow(InventoryError);
  });
});
