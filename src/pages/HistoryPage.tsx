import { useEffect, useMemo, useState } from 'react';
import BackLink from '../components/BackLink';
import PageTitle from '../components/PageTitle';
import type { InventoryApi, InventoryError } from '../services/inventory';
import type { InventoryEvent } from '../types/inventory';

const ACTION_LABELS: Record<InventoryEvent['action'], string> = {
  create: 'Toegevoegd',
  increase: 'Erbij',
  decrease: 'Eruit',
  move: 'Verplaatst',
  edit: 'Gewijzigd',
  delete: 'Verwijderd',
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface HistoryPageProps<L extends { id: string }> {
  /** "❄️ Geschiedenis" */
  title: string;
  api: Pick<InventoryApi<L, unknown, unknown>, 'fetchEvents' | 'fetchLocations'>;
  locationLabel: (location: L) => string;
  backTo: string;
  backLabel: string;
}

/** Historial de movimientos, igual para el vriezer y para la voorraad. */
export default function HistoryPage<L extends { id: string }>({
  title,
  api,
  locationLabel,
  backTo,
  backLabel,
}: HistoryPageProps<L>) {
  const [events, setEvents] = useState<InventoryEvent[] | null>(null);
  const [locations, setLocations] = useState<L[]>([]);
  const [error, setError] = useState<InventoryError | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.fetchEvents(), api.fetchLocations()])
      .then(([nextEvents, nextLocations]) => {
        if (cancelled) return;
        setEvents(nextEvents);
        setLocations(nextLocations);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught as InventoryError);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const locationName = useMemo(() => {
    const byId = new Map(locations.map((location) => [location.id, locationLabel(location)]));
    return (id: string | null) => (id ? (byId.get(id) ?? '') : '');
  }, [locations, locationLabel]);

  return (
    <main className="app">
      <BackLink to={backTo} label={backLabel} top />
      <PageTitle>{title}</PageTitle>

      {error && <p className="notice">De geschiedenis is nu niet bereikbaar.</p>}
      {!error && events === null && <p className="notice">Laden…</p>}
      {events?.length === 0 && <p className="notice">Nog niets gebeurd.</p>}

      {events && events.length > 0 && (
        <ul className="history">
          {events.map((event) => (
            <li className="history__row" key={event.id}>
              <span className="history__when">{formatWhen(event.created_at)}</span>
              <span className="history__what">
                <strong>{event.item_name_snapshot}</strong>
                <span className="history__action">
                  {ACTION_LABELS[event.action]}
                  {event.quantity_delta ? ` ${event.quantity_delta > 0 ? '+' : ''}${event.quantity_delta}` : ''}
                  {event.action === 'move' &&
                    ` · ${locationName(event.from_location_id)} → ${locationName(event.to_location_id)}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <BackLink to={backTo} label={backLabel} />
    </main>
  );
}
