import type { InventoryApi } from './inventory';

export type ExportableApi = Pick<
  InventoryApi<unknown, unknown, unknown>,
  'fetchLocations' | 'fetchItems' | 'fetchEvents'
>;

/**
 * Copia de seguridad manual: el plan Free de Supabase no incluye backups
 * automáticos, así que el fichero se descarga al móvil y no sale de ahí.
 * `prefix` da nombre al fichero: "vriezer-2026-10-17.json".
 */
export async function exportInventory(api: ExportableApi, prefix: string): Promise<void> {
  const [locations, items, events] = await Promise.all([
    api.fetchLocations(),
    api.fetchItems(),
    api.fetchEvents(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    locations,
    items,
    events,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
