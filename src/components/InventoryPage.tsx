import { Fragment, useMemo, useState, type ReactNode } from 'react';
import Modal from './Modal';
import BackLink from './BackLink';
import PageTitle from './PageTitle';
import ItemForm from './ItemForm';
import ItemRow from './ItemRow';
import type { InventoryState } from '../hooks/useInventory';
import { todayInAmsterdam } from '../lib/dates';
import { PRIORITY_INFO, priorityGroups } from '../lib/priority';
import { isSupabaseConfigured } from '../lib/supabase';
import { matchesQuery } from '../lib/text';
import type { FreezerItemDraft } from '../types/freezer';

interface BaseLocation {
  id: string;
  name: string;
}

interface BaseItem {
  id: string;
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  best_before: string | null;
}

interface InventoryPageProps<L extends BaseLocation, I extends BaseItem, D> {
  /** "❄️ Vriezer" */
  title: string;
  /** "De vriezerlijst" — sujeto de los mensajes de error. */
  listName: string;
  state: InventoryState<L, I, D>;
  /** Nombre completo del sitio, para el formulario y la vista de prioridad. */
  locationLabel: (location: L) => string;
  /** Etiqueta pegada en el mueble ("G-KAST2 P3"), si la hay. */
  locationCode?: (location: L) => string;
  /** Agrupa las baldas bajo un encabezado común ("Kast 2 (rechts)"). */
  locationZone?: (location: L) => string;
  locationFieldLabel?: string;
  showFrozenOn?: boolean;
  /** Botones extra del panel ⚙︎ (historial, exportar…). */
  manageActions?: ReactNode;
  /** Convierte lo que devuelve el formulario en lo que acepta la tabla. */
  toDraft: (draft: FreezerItemDraft) => D;
}

type View = 'plek' | 'prioriteit';

export default function InventoryPage<L extends BaseLocation, I extends BaseItem, D>({
  title,
  listName,
  state,
  locationLabel,
  locationCode,
  locationZone,
  locationFieldLabel,
  showFrozenOn,
  manageActions,
  toDraft,
}: InventoryPageProps<L, I, D>) {
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
  } = state;

  const [view, setView] = useState<View>('plek');
  const [manage, setManage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<I | null>(null);
  const [emptied, setEmptied] = useState<I | null>(null);

  const today = todayInAmsterdam();

  const locationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );

  const visibleItems = useMemo(
    () => items.filter((item) => matchesQuery(item.name, query)),
    [items, query],
  );

  const grouped = useMemo(() => {
    const all = locations.map((location) => ({
      location,
      items: visibleItems.filter((item) => item.location_id === location.id),
    }));
    // Buscando, sólo enseñamos las baldas donde está el producto: así no hay que hacer scroll.
    return query.trim() ? all.filter((group) => group.items.length > 0) : all;
  }, [locations, visibleItems, query]);

  const urgent = useMemo(() => priorityGroups(visibleItems, today), [visibleItems, today]);
  const urgentCount = useMemo(
    () => priorityGroups(items, today).reduce((sum, group) => sum + group.items.length, 0),
    [items, today],
  );

  function toggleSearch() {
    if (searching) setQuery('');
    setSearching((current) => !current);
  }

  function where(item: I) {
    const location = locationById.get(item.location_id);
    if (!location) return undefined;
    return { label: locationLabel(location), code: locationCode?.(location) };
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="app">
        <BackLink to="/" label="Terug naar huis" top />
        <PageTitle>{title}</PageTitle>
        <section className="notice">
          <p>{listName} is nog niet ingesteld.</p>
        </section>
        <BackLink to="/" label="Terug naar huis" />
      </main>
    );
  }

  async function handleDecrease(item: I) {
    if (item.quantity === 1) {
      // Llega a 0: preguntamos si se quita de la lista en vez de decidir por el usuario.
      setEmptied(item);
      return;
    }
    await changeQuantity(item, -1);
  }

  /** En la vista de prioridad se enseña dónde está y no se repite el aviso del grupo. */
  function renderRow(item: I, inPriorityView: boolean) {
    return (
      <ItemRow
        key={item.id}
        item={item}
        today={today}
        busy={busyIds.has(item.id)}
        manage={manage}
        where={inPriorityView ? where(item) : undefined}
        hideBadge={inPriorityView}
        onEdit={() => setEditing(item)}
        onDecrease={() => void handleDecrease(item)}
        onIncrease={() => void changeQuantity(item, 1)}
      />
    );
  }

  const ready = !loading && !loadError;
  const searchingNothing = ready && query.trim() !== '' && visibleItems.length === 0;

  return (
    <main className="app">
      <BackLink to="/" label="Terug naar huis" top />
      <div className="page-head">
        <PageTitle>{title}</PageTitle>
        <div className="page-head__buttons">
          <button
            type="button"
            className="icon-btn"
            aria-label={searching ? 'Zoeken sluiten' : 'Zoeken'}
            aria-pressed={searching}
            onClick={toggleSearch}
          >
            🔍
          </button>
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
      </div>

      {searching && (
        <div className="search">
          <input
            className="form__input search__input"
            type="search"
            placeholder="Wat zoekt u?"
            aria-label="Zoek een product"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="search__clear"
              aria-label="Zoekwoord wissen"
              onClick={() => setQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {manage && (
        <section className="manage">
          {manageActions && (
            <div className="manage__actions manage__actions--first">{manageActions}</div>
          )}
          <p className="manage__hint">Tik op een product om het te wijzigen.</p>
        </section>
      )}

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="tabs__tab"
          aria-selected={view === 'plek'}
          onClick={() => setView('plek')}
        >
          Per plek
        </button>
        <button
          type="button"
          role="tab"
          className="tabs__tab"
          aria-selected={view === 'prioriteit'}
          onClick={() => setView('prioriteit')}
        >
          Prioriteit
          {urgentCount > 0 && <span className="tabs__count">{urgentCount}</span>}
        </button>
      </div>

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
          <p>{listName} is nu niet bereikbaar.</p>
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

      {searchingNothing && <p className="notice">Niets gevonden voor “{query.trim()}”.</p>}

      {ready && view === 'prioriteit' && !searchingNothing && (
        <>
          {urgent.length === 0 ? (
            <p className="notice">Niets dringends. Alles is nog lang goed! 👍</p>
          ) : (
            urgent.map(({ priority, items: groupItems }) => (
              <section className="drawer" key={priority}>
                <h2 className={`drawer__title priority-title priority-title--${priority}`}>
                  <span aria-hidden="true">{PRIORITY_INFO[priority].icon}</span>{' '}
                  {PRIORITY_INFO[priority].label}
                </h2>
                <p className="drawer__hint">{PRIORITY_INFO[priority].hint}</p>
                <ul className="drawer__list">{groupItems.map((item) => renderRow(item, true))}</ul>
              </section>
            ))
          )}
        </>
      )}

      {ready &&
        view === 'plek' &&
        grouped.map(({ location, items: locationItems }, index) => {
          const zone = locationZone?.(location);
          const previousZone = index > 0 ? locationZone?.(grouped[index - 1].location) : undefined;
          const code = locationCode?.(location);
          // Con zonas, la balda cuelga del encabezado de zona; sin ellas es el nivel principal.
          const Heading = locationZone ? 'h3' : 'h2';
          return (
            <Fragment key={location.id}>
              {zone && zone !== previousZone && <h2 className="zone-title">{zone}</h2>}
              <section className="drawer">
                <Heading className="drawer__title">
                  {location.name}
                  {code && <span className="drawer__code">{code}</span>}
                </Heading>

                {locationItems.length === 0 ? (
                  <p className="drawer__empty">Leeg</p>
                ) : (
                  <ul className="drawer__list">
                    {locationItems.map((item) => renderRow(item, false))}
                  </ul>
                )}

                {!query.trim() && (
                  <button
                    type="button"
                    className="drawer__add"
                    onClick={() => setAddingTo(location.id)}
                  >
                    + Product toevoegen
                  </button>
                )}
              </section>
            </Fragment>
          );
        })}

      <BackLink to="/" label="Terug naar huis" />

      {addingTo && (
        <Modal title="Product toevoegen" onClose={() => setAddingTo(null)}>
          <ItemForm
            locations={locations}
            locationLabel={locationLabel}
            locationFieldLabel={locationFieldLabel}
            showFrozenOn={showFrozenOn}
            defaultLocationId={addingTo}
            submitLabel="Toevoegen"
            onCancel={() => setAddingTo(null)}
            onSubmit={async (draft) => {
              await addItem(toDraft(draft));
              setAddingTo(null);
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title={editing.name} onClose={() => setEditing(null)}>
          <ItemForm
            locations={locations}
            locationLabel={locationLabel}
            locationFieldLabel={locationFieldLabel}
            showFrozenOn={showFrozenOn}
            item={editing}
            submitLabel="Opslaan"
            onCancel={() => setEditing(null)}
            onSubmit={async (draft) => {
              await editItem(editing.id, toDraft(draft));
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
