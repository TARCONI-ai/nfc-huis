import { describe, expect, it } from 'vitest';
import { clampQuantity, classifyError, isValidName, shoppingList } from './freezer-rules';
import { matchesQuery, normalize } from './text';

describe('cantidades', () => {
  it('nunca permite valores negativos', () => {
    expect(clampQuantity(-1)).toBe(0);
    expect(clampQuantity(-99)).toBe(0);
  });

  it('deja pasar las cantidades válidas', () => {
    expect(clampQuantity(0)).toBe(0);
    expect(clampQuantity(25)).toBe(25);
  });

  it('descarta decimales', () => {
    expect(clampQuantity(2.7)).toBe(2);
  });
});

describe('nombre de producto', () => {
  it('rechaza el nombre vacío o sólo espacios', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
  });

  it('acepta un nombre normal', () => {
    expect(isValidName('Kroketten')).toBe(true);
  });
});

describe('búsqueda', () => {
  it('ignora mayúsculas y minúsculas', () => {
    expect(matchesQuery('Kroketten', 'krok')).toBe(true);
    expect(matchesQuery('kroketten', 'KROK')).toBe(true);
  });

  it('ignora los acentos en ambos sentidos', () => {
    expect(matchesQuery('Spinazie à la crème', 'creme')).toBe(true);
    expect(matchesQuery('Rosti', 'rösti')).toBe(true);
  });

  it('una búsqueda vacía no filtra nada', () => {
    expect(matchesQuery('Pizza', '')).toBe(true);
    expect(matchesQuery('Pizza', '   ')).toBe(true);
  });

  it('no encuentra lo que no está', () => {
    expect(matchesQuery('Pizza', 'garnalen')).toBe(false);
  });

  it('normaliza acentos', () => {
    expect(normalize('Kaassoufflés')).toBe('kaassouffles');
  });
});

describe('clasificación de errores', () => {
  it('trata el fallo de fetch como problema de conexión (o proyecto pausado)', () => {
    expect(classifyError('TypeError: Failed to fetch')).toBe('offline');
    expect(classifyError('network timeout')).toBe('offline');
  });

  it('el resto son errores de servidor', () => {
    expect(classifyError('duplicate key value violates unique constraint')).toBe('server');
  });
});

describe('lista de la compra', () => {
  const item = (name: string, location_id: string, quantity: number) => ({ name, location_id, quantity });

  it('sólo incluye los productos a 0', () => {
    const lista = shoppingList([item('Brood', 'a', 0), item('Erwten', 'a', 2)], ['a']);
    expect(lista.map((it) => it.name)).toEqual(['Brood']);
  });

  it('ordena por cajón y después por nombre', () => {
    const lista = shoppingList(
      [item('Vis', 'b', 0), item('IJs', 'a', 0), item('Brood', 'b', 0)],
      ['a', 'b'],
    );
    expect(lista.map((it) => it.name)).toEqual(['IJs', 'Brood', 'Vis']);
  });
});
