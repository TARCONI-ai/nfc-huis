import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import schedule from '../data/waste-schedule.json';
import { WASTE_TYPES } from '../data/waste-types';
import {
  formatDutchDate,
  formatDutchDateShort,
  formatDutchTimestamp,
  relativeDayLabel,
  todayInAmsterdam,
} from '../lib/dates';
import { getUpcomingCollections } from '../lib/waste';
import type { WasteScheduleEntry } from '../types/waste';

const UPCOMING_COUNT = 4;

export default function WastePage() {
  // Se calcula una vez al abrir la página: al tocar la NFC siempre es un montaje nuevo.
  const { next, upcoming, consultedAt } = useMemo(() => {
    const today = todayInAmsterdam();
    const collections = getUpcomingCollections(schedule as WasteScheduleEntry[], today);
    return {
      next: collections[0],
      upcoming: collections.slice(1, 1 + UPCOMING_COUNT),
      consultedAt: formatDutchTimestamp(),
    };
  }, []);

  return (
    <main className="app">
      <h1>🗑 Volgende ophaling</h1>

      {next ? (
        <>
          <section className="next-card">
            {next.types.map((typeId) => {
              const type = WASTE_TYPES[typeId];
              return (
                <div className="next-card__fraction" key={typeId}>
                  <span className="next-card__icon" aria-hidden="true">
                    {type.icon}
                  </span>
                  <p className="next-card__label">{type.label}</p>
                  <p className="next-card__description">{type.description}</p>
                </div>
              );
            })}

            <p className="next-card__date">{formatDutchDate(next.date)}</p>
            <p className="next-card__countdown">{relativeDayLabel(next.daysUntil)}</p>
          </section>

          {upcoming.length > 0 && (
            <section className="upcoming">
              <h2 className="upcoming__title">Daarna</h2>
              <ul className="upcoming__list">
                {upcoming.map((collection) => (
                  <li className="upcoming__item" key={collection.date}>
                    <span className="upcoming__date">
                      {formatDutchDateShort(collection.date)}
                    </span>
                    <span className="upcoming__types">
                      {collection.types
                        .map((id) => `${WASTE_TYPES[id].icon} ${WASTE_TYPES[id].label}`)
                        .join(' + ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <section className="notice">
          <p>Er staan geen ophalingen meer in de kalender.</p>
          <p>Vraag Jasper om de nieuwe kalender toe te voegen.</p>
        </section>
      )}

      <p className="footnote">Bijgewerkt: {consultedAt}</p>

      <Link className="back-link" to="/">
        ← Terug naar huis
      </Link>
    </main>
  );
}
