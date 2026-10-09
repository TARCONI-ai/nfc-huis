/** Reglas puras del inventario, sin React ni red, para poder testearlas solas. */

/** La cantidad nunca baja de 0 (el CHECK de SQL es la segunda barrera). */
export function clampQuantity(value: number): number {
  return Math.max(0, Math.trunc(value));
}

export function isValidName(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Clasifica el fallo para elegir el mensaje: un proyecto Supabase pausado
 * o el móvil sin cobertura fallan al hacer fetch, no con un error HTTP.
 */
export function classifyError(message: string): 'offline' | 'server' {
  return /fetch|network|failed to fetch|timeout/i.test(message) ? 'offline' : 'server';
}

/**
 * Lista de la compra: los productos a 0. Los abuelos no los borran porque así
 * el sitio en la balda queda "reservado", y eso nos sirve de lista.
 * Se ordena por cajón (como en el congelador) y luego por nombre.
 */
export function shoppingList<T extends { location_id: string; name: string; quantity: number }>(
  items: readonly T[],
  locationOrder: readonly string[],
): T[] {
  const rank = (id: string) => {
    const index = locationOrder.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return items
    .filter((item) => item.quantity === 0)
    .sort(
      (a, b) => rank(a.location_id) - rank(b.location_id) || a.name.localeCompare(b.name, 'nl'),
    );
}
