import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents, fetchLocations, type FreezerError } from '../services/freezer';
import type { FreezerEvent, FreezerLocation } from '../types/freezer';

const ACTION_LABELS: Record<FreezerEvent['action'], string> = {
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

export default function FreezerHistoryPage() {
  const [events, setEvents] = useState<FreezerEvent[] | null>(null);
  const [locations, setLocations] = useState<FreezerLocation[]>([]);
  const [error, setError] = useState<FreezerError | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchEvents(), fetchLocations()])
      .then(([nextEvents, nextLocations]) => {
        if (cancelled) return;
        setEvents(nextEvents);
        setLocations(nextLocations);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught as FreezerError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const locationName = useMemo(() => {
    const byId = new Map(locations.map((location) => [location.id, location.name]));
    return (id: string | null) => (id ? (byId.get(id) ?? '') : '');
  }, [locations]);

  return (
    <main className="app">
      <h1>Geschiedenis</h1>

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

      <Link className="back-link" to="/vriezer">
        ← Terug naar de vriezer
      </Link>
    </main>
  );
}
