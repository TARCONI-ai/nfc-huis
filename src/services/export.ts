import { fetchEvents, fetchItems, fetchLocations } from './freezer';

/**
 * Copia de seguridad manual: el plan Free de Supabase no incluye backups
 * automáticos, así que el fichero se descarga al móvil y no sale de ahí.
 */
export async function exportInventory(): Promise<void> {
  const [locations, items, events] = await Promise.all([
    fetchLocations(),
    fetchItems(),
    fetchEvents(),
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
  link.download = `vriezer-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
