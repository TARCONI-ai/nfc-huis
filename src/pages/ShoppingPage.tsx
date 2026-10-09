import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFreezer } from '../hooks/useFreezer';
import { shoppingList } from '../lib/freezer-rules';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Lista de la compra sacada del congelador: todo lo que está a 0.
 * No se edita aquí; en cuanto suben la cantidad en el congelador, desaparece.
 */
export default function ShoppingPage() {
  const { locations, items, loading, loadError, reload } = useFreezer();

  const list = useMemo(
    () =>
      shoppingList(
        items,
        locations.map((location) => location.id),
      ),
    [items, locations],
  );

  const locationName = useMemo(() => {
    const byId = new Map(locations.map((location) => [location.id, location.name]));
    return (id: string) => byId.get(id) ?? '';
  }, [locations]);

  return (
    <main className="app">
      <h1>🛒 Boodschappen</h1>

      {!isSupabaseConfigured && (
        <section className="notice">
          <p>De vriezerlijst is nog niet ingesteld.</p>
        </section>
      )}

      {isSupabaseConfigured && loading && <p className="notice">Laden…</p>}

      {loadError && (
        <section className="notice" role="alert">
          <p>De lijst is nu niet bereikbaar.</p>
          <button type="button" className="btn btn--primary" onClick={() => void reload()}>
            Opnieuw proberen
          </button>
        </section>
      )}

      {isSupabaseConfigured && !loading && !loadError && list.length === 0 && (
        <p className="notice">Alles is er nog. Niets te kopen! 👍</p>
      )}

      {list.length > 0 && (
        <>
          <p className="footnote footnote--top">Deze producten zijn op in de vriezer.</p>
          <ul className="shopping">
            {list.map((item) => (
              <li className="shopping__item" key={item.id}>
                <span className="shopping__name">{item.name}</span>
                {locationName(item.location_id) && (
                  <span className="shopping__where">Vriezer: {locationName(item.location_id)}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <Link className="back-link" to="/">
        ← Terug naar huis
      </Link>
    </main>
  );
}
