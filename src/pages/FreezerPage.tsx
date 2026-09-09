import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import ItemForm from '../components/ItemForm';
import { useFreezer } from '../hooks/useFreezer';
import { isSupabaseConfigured } from '../lib/supabase';
import { matchesQuery } from '../lib/text';
import { exportInventory } from '../services/export';
import type { FreezerItem } from '../types/freezer';

export default function FreezerPage() {
  const {
    locations,
    items,
    loading,
    loadError,
    actionError,
    busyIds,
    reload,
    dismissActionError,
    changeQuantity,
    addItem,
    editItem,
    removeItem,
  } = useFreezer();

  const [manage, setManage] = useState(false);
  const [query, setQuery] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<FreezerItem | null>(null);
  const [emptied, setEmptied] = useState<FreezerItem | null>(null);
  const [exporting, setExporting] = useState(false);

  const grouped = useMemo(
    () =>
      locations.map((location) => ({
        location,
        items: items.filter(
          (item) => item.location_id === location.id && matchesQuery(item.name, query),
        ),
      })),
    [locations, items, query],
  );

  if (!isSupabaseConfigured) {
    return (
      <main className="app">
        <h1>❄️ Vriezer</h1>
        <section className="notice">
          <p>De vriezerlijst is nog niet ingesteld.</p>
        </section>
        <Link className="back-link" to="/">
          ← Terug naar huis
        </Link>
      </main>
    );
  }

  async function handleDecrease(item: FreezerItem) {
    if (item.quantity === 1) {
      // Llega a 0: preguntamos si se quita de la lista en vez de decidir por el usuario.
      setEmptied(item);
      return;
    }
    await changeQuantity(item, -1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportInventory();
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="app">
      <div className="page-head">
        <h1>❄️ Vriezer</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label={manage ? 'Beheer sluiten' : 'Beheer openen'}
          aria-pressed={manage}
          onClick={() => setManage((current) => !current)}
        >
          ⚙︎
        </button>
      </div>

      {manage && (
        <section className="manage">
          <input
            className="form__input"
            type="search"
            placeholder="Zoek een product…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="manage__actions">
            <Link className="btn" to="/vriezer/geschiedenis">
              Geschiedenis
            </Link>
            <button type="button" className="btn" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Bezig…' : 'Exporteren'}
            </button>
          </div>
          <p className="manage__hint">Tik op een product om het te wijzigen.</p>
        </section>
      )}

      {actionError && (
        <div className="banner" role="alert">
          <p>Er ging iets mis. De lijst is opnieuw geladen.</p>
          <button type="button" className="btn" onClick={dismissActionError}>
            Oké
          </button>
        </div>
      )}

      {loading && <p className="notice">Laden…</p>}

      {loadError && (
        <section className="notice" role="alert">
          <p>De vriezerlijst is nu niet bereikbaar.</p>
          <button type="button" className="btn btn--primary" onClick={() => void reload()}>
            Opnieuw proberen
          </button>
          {loadError.kind === 'offline' && (
            <p className="footnote">
              Voor Jasper: staat het gratis Supabase-project misschien op pauze? Druk daar op
              “Resume project”.
            </p>
          )}
        </section>
      )}

      {!loading && !loadError &&
        grouped.map(({ location, items: locationItems }) => (
          <section className="drawer" key={location.id}>
            <h2 className="drawer__title">{location.name}</h2>

            {locationItems.length === 0 ? (
              <p className="drawer__empty">{query ? 'Niets gevonden' : 'Leeg'}</p>
            ) : (
              <ul className="drawer__list">
                {locationItems.map((item) => {
                  const busy = busyIds.has(item.id);
                  return (
                    <li className="item" key={item.id}>
                      <div className="item__info">
                        {manage ? (
                          <button
                            type="button"
                            className="item__name item__name--button"
                            onClick={() => setEditing(item)}
                          >
                            {item.name}
                          </button>
                        ) : (
                          <span className="item__name">{item.name}</span>
                        )}
                        {item.notes && <span className="item__notes">{item.notes}</span>}
                      </div>

                      <div className="stepper">
                        <button
                          type="button"
                          className="stepper__btn"
                          onClick={() => void handleDecrease(item)}
                          disabled={busy || item.quantity === 0}
                          aria-label={`Eén ${item.name} minder`}
                        >
                          −
                        </button>
                        <span className="stepper__value">
                          {item.quantity}
                          <span className="stepper__unit">{item.unit}</span>
                        </span>
                        <button
                          type="button"
                          className="stepper__btn"
                          onClick={() => void changeQuantity(item, 1)}
                          disabled={busy}
                          aria-label={`Eén ${item.name} meer`}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              className="drawer__add"
              onClick={() => setAddingTo(location.id)}
            >
              + Product toevoegen
            </button>
          </section>
        ))}

      <Link className="back-link" to="/">
        ← Terug naar huis
      </Link>

      {addingTo && (
        <Modal title="Product toevoegen" onClose={() => setAddingTo(null)}>
          <ItemForm
            locations={locations}
            defaultLocationId={addingTo}
            submitLabel="Toevoegen"
            onCancel={() => setAddingTo(null)}
            onSubmit={async (draft) => {
              await addItem(draft);
              setAddingTo(null);
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title={editing.name} onClose={() => setEditing(null)}>
          <ItemForm
            locations={locations}
            item={editing}
            submitLabel="Opslaan"
            onCancel={() => setEditing(null)}
            onSubmit={async (draft) => {
              await editItem(editing.id, draft);
              setEditing(null);
            }}
            onDelete={async () => {
              await removeItem(editing.id);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {emptied && (
        <Modal title={emptied.name} onClose={() => setEmptied(null)}>
          <p className="confirm__text">Dit was de laatste. Uit de lijst halen?</p>
          <div className="form__actions">
            <button
              type="button"
              className="btn btn--danger"
              onClick={async () => {
                await removeItem(emptied.id);
                setEmptied(null);
              }}
            >
              Ja, verwijderen
            </button>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                await changeQuantity(emptied, -1);
                setEmptied(null);
              }}
            >
              Nee, op 0 zetten
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
