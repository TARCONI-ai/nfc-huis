import { isWasteBin } from '../lib/freezer-rules';
import { PRIORITY_INFO, formatTht, priorityOf } from '../lib/priority';

interface RowItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  best_before: string | null;
}

interface ItemRowProps {
  item: RowItem;
  today: string;
  busy: boolean;
  /** En modo beheer el nombre es un botón que abre el formulario. */
  manage: boolean;
  /** "📍 Kast 2 (rechts) · Plank 3", para cuando el producto sale fuera de su balda. */
  where?: { label: string; code?: string };
  /** En la vista de prioridad el aviso ya va en el encabezado del grupo. */
  hideBadge?: boolean;
  onEdit: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
}

/** Una fila de producto con su fecha, su aviso de prioridad y los botones − / +. */
export default function ItemRow({
  item,
  today,
  busy,
  manage,
  where,
  hideBadge = false,
  onEdit,
  onDecrease,
  onIncrease,
}: ItemRowProps) {
  // A 0 ya no hay nada que caduque: sólo falta reponerlo.
  const priority = item.quantity > 0 ? priorityOf(item.best_before, today) : 'geen';
  const info = PRIORITY_INFO[priority];
  const showBadge = !hideBadge && priority !== 'geen' && priority !== 'bewaren';

  return (
    <li
      className={`item${where ? ' item--with-where' : ''}${
        priority === 'weggooien' ? ' item--weggooien' : ''
      }`}
    >
      <div className="item__info">
        {manage ? (
          <button type="button" className="item__name item__name--button" onClick={onEdit}>
            {item.name}
          </button>
        ) : (
          <span className="item__name">{item.name}</span>
        )}
        {showBadge && (
          <span className={`badge badge--${priority}`}>
            <span aria-hidden="true">{info.icon}</span> {info.label}
          </span>
        )}
        {showBadge && priority === 'weggooien' && <span className="item__warning">{info.hint}</span>}
        {item.best_before && item.quantity > 0 && (
          <span className="item__notes">THT {formatTht(item.best_before)}</span>
        )}
        {item.quantity === 0 && !isWasteBin(item) && (
          <span className="item__notes">Op · staat op de boodschappenlijst</span>
        )}
        {item.notes && <span className="item__notes">{item.notes}</span>}
      </div>

      <div className="stepper">
        <button
          type="button"
          className="stepper__btn"
          onClick={onDecrease}
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
          onClick={onIncrease}
          disabled={busy}
          aria-label={`Eén ${item.name} meer`}
        >
          +
        </button>
      </div>

      {where && (
        <p className="item__where">
          📍 {where.label}
          {where.code && <span className="item__where-code">{where.code}</span>}
        </p>
      )}
    </li>
  );
}
