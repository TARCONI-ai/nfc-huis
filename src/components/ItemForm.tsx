import { useState, type FormEvent } from 'react';
import type { FreezerItem, FreezerItemDraft, FreezerLocation } from '../types/freezer';
import { todayInAmsterdam } from '../lib/dates';
import { clampQuantity, isValidName } from '../lib/freezer-rules';

interface ItemFormProps {
  locations: FreezerLocation[];
  /** Si viene, el formulario edita; si no, crea. */
  item?: FreezerItem;
  defaultLocationId?: string;
  submitLabel: string;
  onSubmit: (draft: FreezerItemDraft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function ItemForm({
  locations,
  item,
  defaultLocationId,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: ItemFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [unit, setUnit] = useState(item?.unit ?? 'st');
  const [locationId, setLocationId] = useState(
    item?.location_id ?? defaultLocationId ?? locations[0]?.id ?? '',
  );
  const [frozenOn, setFrozenOn] = useState(
    item ? (item.frozen_on ?? '') : todayInAmsterdam(),
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
      setProblem('Kies een lade.');
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
        <span className="form__label">Lade</span>
        <select
          className="form__input"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>

      {/* Los campos de fecha van uno por línea: dos date inputs no caben a 375 px. */}
      <label className="form__field">
        <span className="form__label">Ingevroren op</span>
        <input
          className="form__input"
          type="date"
          value={frozenOn}
          onChange={(event) => setFrozenOn(event.target.value)}
        />
      </label>

      <label className="form__field">
        <span className="form__label">Houdbaar tot</span>
        <input
          className="form__input"
          type="date"
          value={bestBefore}
          onChange={(event) => setBestBefore(event.target.value)}
        />
      </label>

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
