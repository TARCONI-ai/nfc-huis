/**
 * Normaliza para buscar: sin mayúsculas y sin acentos, de modo que
 * "spinazie a la creme" encuentre "Spinazie à la crème".
 */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalize(query);
  return q === '' || normalize(haystack).includes(q);
}
