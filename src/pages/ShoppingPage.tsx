import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFreezer, usePantry } from '../hooks/useInventory';
import { shoppingList } from '../lib/freezer-rules';
import { isSupabaseConfigured } from '../lib/supabase';
import { pantryLocationLabel } from '../types/pantry';

interface ShoppingRow {
  id: string;
  name: string;
  where: string;
  code?: string;
}

/**
 * Lista de la compra sacada del congelador y de la despensa: todo lo que está a 0.
 * No se edita aquí; en cuanto suben la cantidad en su sitio, desaparece.
 */
export default function ShoppingPage() {
  const freezer = useFreezer();
  const pantry = usePantry();

  const freezerRows = useMemo<ShoppingRow[]>(() => {
    const names = new Map(freezer.locations.map((location) => [location.id, location.name]));
    return shoppingList(
      freezer.items,
      freezer.locations.map((location) => location.id),
    ).map((item) => ({ id: item.id, name: item.name, where: names.get(item.location_id) ?? '' }));
  }, [freezer.items, freezer.locations]);

  const pantryRows = useMemo<ShoppingRow[]>(() => {
    const byId = new Map(pantry.locations.map((location) => [location.id, location]));
    return shoppingList(
      pantry.items,
      pantry.locations.map((location) => location.id),
    ).map((item) => {
      const location = byId.get(item.location_id);
      return {
        id: item.id,
        name: item.name,
        where: location ? pantryLocationLabel(location) : '',
        code: location?.code,
      };
    });
  }, [pantry.items, pantry.locations]);

  const loading = freezer.loading || pantry.loading;
  const failed = freezer.loadError || pantry.loadError;
  const nothing = !loading && freezerRows.length === 0 && pantryRows.length === 0;

  return (
    <main className="app">
      <h1>🛒 Boodschappen</h1>

      {!isSupabaseConfigured && (
        <section className="notice">
          <p>De lijsten zijn nog niet ingesteld.</p>
        </section>
      )}

      {isSupabaseConfigured && loading && <p className="notice">Laden…</p>}

      {failed && (
        <section className="notice" role="alert">
          <p>
            {freezer.loadError && pantry.loadError
              ? 'De lijst is nu niet bereikbaar.'
              : freezer.loadError
                ? 'De vriezerlijst is nu niet bereikbaar.'
                : 'De voorradenlijst is nu niet bereikbaar.'}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void Promise.all([freezer.reload(), pantry.reload()])}
          >
            Opnieuw proberen
          </button>
        </section>
      )}

      {isSupabaseConfigured && !failed && nothing && (
        <p className="notice">Alles is er nog. Niets te kopen! 👍</p>
      )}

      {!loading && (
        <>
          <ShoppingSection
            title="❄️ Uit de vriezer"
            empty="Niets op in de vriezer."
            rows={freezerRows}
            hidden={nothing || Boolean(freezer.loadError)}
          />
          <ShoppingSection
            title="📦 Uit de voorraad"
            empty="Niets op in de voorraad."
            rows={pantryRows}
            hidden={nothing || Boolean(pantry.loadError)}
          />
        </>
      )}

      <Link className="back-link" to="/">
        ← Terug naar huis
      </Link>
    </main>
  );
}

function ShoppingSection({
  title,
  empty,
  rows,
  hidden,
}: {
  title: string;
  empty: string;
  rows: ShoppingRow[];
  hidden: boolean;
}) {
  if (hidden) return null;
  return (
    <section className="drawer">
      <h2 className="drawer__title">{title}</h2>
      {rows.length === 0 ? (
        <p className="drawer__empty">{empty}</p>
      ) : (
        <ul className="shopping">
          {rows.map((row) => (
            <li className="shopping__item" key={row.id}>
              <span className="shopping__name">{row.name}</span>
              {row.where && (
                <span className="shopping__where">
                  📍 {row.where}
                  {row.code && <span className="item__where-code">{row.code}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
