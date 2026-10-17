import { useState } from 'react';
import { exportInventory, type ExportableApi } from '../services/export';

/** Botón "Exporteren" del panel ⚙︎: descarga una copia del inventario en .json. */
export default function ExportButton({ api, prefix }: { api: ExportableApi; prefix: string }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'failed'>('idle');

  async function handleExport() {
    setStatus('busy');
    try {
      await exportInventory(api, prefix);
      setStatus('idle');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <button type="button" className="btn" onClick={handleExport} disabled={status === 'busy'}>
      {status === 'busy' ? 'Bezig…' : status === 'failed' ? 'Mislukt, opnieuw proberen' : 'Exporteren'}
    </button>
  );
}
