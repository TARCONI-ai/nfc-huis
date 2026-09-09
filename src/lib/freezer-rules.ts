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
