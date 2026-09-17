// Genera public/afval.ics para la suscripción webcal del calendario de basura.
// Se ejecuta antes de `dev` y `build` (ver package.json) para que el fichero
// publicado siempre refleje src/data/waste-schedule.json.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WASTE_TYPES, isWasteTypeId } from '../src/data/waste-types';
import schedule from '../src/data/waste-schedule.json';
import type { WasteScheduleEntry } from '../src/types/waste';

// Iconos pensados para distinguirse en una lista de calendario pequeña:
// el color real del cubo, no necesariamente el icono que usa la web.
const CALENDAR_ICONS: Record<string, string> = {
  gft: '🟢',
  pmd: '🟠',
  papier: '🔵',
  grofTuinafval: '🌿',
  kerstboom: '🎄',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function amsterdamOffsetMinutes(utcGuessMs: number): number {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date(utcGuessMs))
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = part?.match(/GMT([+-]\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 60;
}

/** Instante UTC de las 20:00 hora de Ámsterdam del día `iso`. */
function amsterdam20hToUtc(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  const guessMs = Date.UTC(year, month - 1, day, 20, 0, 0);
  return new Date(guessMs - amsterdamOffsetMinutes(guessMs) * 60_000);
}

function toIcsUtc(date: Date): string {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const dtstamp = toIcsUtc(new Date());

const events = (schedule as WasteScheduleEntry[])
  .filter((entry) => isWasteTypeId(entry.type))
  .map((entry) => {
    const type = WASTE_TYPES[entry.type];
    const icon = CALENDAR_ICONS[entry.type];
    const reminderDay = addDays(entry.date, -1);
    const alarmTrigger = toIcsUtc(amsterdam20hToUtc(reminderDay));
    const uid = `afval-${entry.date}-${entry.type}@nfc-huis`;
    const summary = `${icon} Morgen: ${type.label} ophalen`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${reminderDay.replaceAll('-', '')}`,
      `DTEND;VALUE=DATE:${entry.date.replaceAll('-', '')}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${type.description}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      `TRIGGER;VALUE=DATE-TIME:${alarmTrigger}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//NFC Huis//Afval kalender//NL',
  'CALSCALE:GREGORIAN',
  'X-WR-CALNAME:Afval',
  ...events,
  'END:VCALENDAR',
  '',
].join('\r\n');

const outFile = resolve(dirname(fileURLToPath(import.meta.url)), '../public/afval.ics');
writeFileSync(outFile, ics);
console.log(`afval.ics generado con ${events.length} eventos → ${outFile}`);
