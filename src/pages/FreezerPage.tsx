import { Link } from 'react-router-dom';
import ExportButton from '../components/ExportButton';
import InventoryPage from '../components/InventoryPage';
import { useFreezer } from '../hooks/useInventory';
import { freezerApi } from '../services/freezer';

export default function FreezerPage() {
  const state = useFreezer();

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
          <ExportButton api={freezerApi} prefix="vriezer" />
        </>
      }
    />
  );
}
