import { Link } from 'react-router-dom';
import ExportButton from '../components/ExportButton';
import InventoryPage from '../components/InventoryPage';
import { usePantry } from '../hooks/useInventory';
import { pantryApi } from '../services/pantry';
import { pantryLocationLabel } from '../types/pantry';

/** La despensa del garaje: el Excel VOORRADEN del abuelo, balda por balda. */
export default function PantryPage() {
  const state = usePantry();

  return (
    <InventoryPage
      title="📦 Voorraden"
      listName="De voorradenlijst"
      state={state}
      locationLabel={pantryLocationLabel}
      locationCode={(location) => location.code}
      locationZone={(location) => location.zone}
      locationFieldLabel="Plek"
      manageActions={
        <>
          <Link className="btn" to="/voorraden/geschiedenis">
            Geschiedenis
          </Link>
          <ExportButton api={pantryApi} prefix="voorraden" />
        </>
      }
      // La fecha de congelación no existe en la despensa.
      toDraft={({ frozen_on, ...draft }) => draft}
    />
  );
}
