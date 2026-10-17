import { useState, type FormEvent } from 'react';
import type { FreezerItemDraft } from '../types/freezer';
import { todayInAmsterdam } from '../lib/dates';
import { clampQuantity, isValidName } from '../lib/freezer-rules';

/** Lo que el formulario necesita de un producto, sea del vriezer o de la voorraad. */
interface EditableItem {
  location_id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  frozen_on?: string | null;
  best_before: string | null;
}

interface ItemFormProps<L extends { id: string }> {
  locations: L[];
  /** Texto de cada opción del desplegable de sitio. */
  locationLabel: (location: L) => string;
  /** "Lade" en el congelador, "Plek" en la despensa. */
  locationFieldLabel?: string;
  /** La fecha de congelación sólo tiene sentido en el vriezer. */
  showFrozenOn?: boolean;
  /** Si viene, el formulario edita; si no, crea. */
  item?: EditableItem;
  defaultLocationId?: string;
  submitLabel: string;
  onSubmit: (draft: FreezerItemDraft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function ItemForm<L extends { id: string }>({
  locations,
  locationLabel,
  locationFieldLabel = 'Lade',
  showFrozenOn = false,
  item,
  defaultLocationId,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: ItemFormProps<L>) {
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [unit, setUnit] = useState(item?.unit ?? 'st');
  const [locationId, setLocationId] = useState(
    item?.location_id ?? defaultLocationId ?? locations[0]?.id ?? '',
  );
  const [frozenOn, setFrozenOn] = useState(
    item ? (item.frozen_on ?? '') : showFrozenOn ? todayInAmsterdam() : '',
  );
  const [bestBefore, setBestBefore] = useState(item?.best_before ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!isValidName(name)) {
      setProblem('Vul een naam in.');
      return;
    }
    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setProblem('Het aantal moet 0 of hoger zijn.');
      return;
    }
    if (locationId === '') {
      setProblem(`Kies een ${locationFieldLabel.toLowerCase()}.`);
      return;
    }

    setProblem(null);
    setSaving(true);
    try {
      await onSubmit({
        location_id: locationId,
        name: name.trim(),
        quantity: clampQuantity(parsedQuantity),
        unit: unit.trim() || 'st',
        notes: notes.trim() || null,
        frozen_on: frozenOn || null,
        best_before: bestBefore || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <span className="form__label">Naam</span>
        <input
          className="form__input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus={!item}
          enterKeyHint="done"
        />
      </label>

      <div className="form__row">
        <label className="form__field">
          <span className="form__label">Aantal</span>
          <input
            className="form__input"
            type="number"
            inputMode="numeric"
            min={0}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>

        <label className="form__field">
          <span className="form__label">Eenheid</span>
          <input
            className="form__input"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          />
        </label>
      </div>

      <label className="form__field">
        <span className="form__label">{locationFieldLabel}</span>
        <select
          className="form__input"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {locationLabel(location)}
            </option>
          ))}
        </select>
      </label>

      {/* Los campos de fecha van uno por línea: dos date inputs no caben a 375 px. */}
      {showFrozenOn && (
        <label className="form__field">
          <span className="form__label">Ingevroren op</span>
          <input
            className="form__input"
            type="date"
            value={frozenOn}
            onChange={(event) => setFrozenOn(event.target.value)}
          />
        </label>
      )}

      <div className="form__field">
        <label>
          <span className="form__label">Houdbaar tot (THT)</span>
          <input
            className="form__input"
            type="date"
            value={bestBefore}
            onChange={(event) => setBestBefore(event.target.value)}
          />
        </label>
        {bestBefore ? (
          <button type="button" className="form__link" onClick={() => setBestBefore('')}>
            Geen datum (niet bederfelijk)
          </button>
        ) : (
          <span className="form__hint">Leeg laten als het niet bederft.</span>
        )}
      </div>

      <label className="form__field">
        <span className="form__label">Notitie</span>
        <input
          className="form__input"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {problem && <p className="form__problem">{problem}</p>}

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Bezig…' : submitLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Annuleren
        </button>
      </div>

      {onDelete && (
        <button type="button" className="btn btn--danger" onClick={onDelete} disabled={saving}>
          Verwijderen
        </button>
      )}
    </form>
  );
}
