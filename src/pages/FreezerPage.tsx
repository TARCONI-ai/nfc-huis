import { useState } from 'react';
import { Link } from 'react-router-dom';
import InventoryPage from '../components/InventoryPage';
import { useFreezer } from '../hooks/useInventory';
import { exportInventory } from '../services/export';

export default function FreezerPage() {
  const state = useFreezer();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportInventory();
    } finally {
      setExporting(false);
    }
  }

  return (
    <InventoryPage
      title="❄️ Vriezer"
      listName="De vriezerlijst"
      state={state}
      locationLabel={(location) => location.name}
      locationFieldLabel="Lade"
      showFrozenOn
      toDraft={(draft) => draft}
      manageActions={
        <>
          <Link className="btn" to="/vriezer/geschiedenis">
            Geschiedenis
          </Link>
          <button type="button" className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Bezig…' : 'Exporteren'}
          </button>
        </>
      }
    />
  );
}
