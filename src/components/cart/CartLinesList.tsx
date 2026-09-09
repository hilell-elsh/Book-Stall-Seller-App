import { Money } from '../Money'
import type { SaleLineItem } from '../../types/sale'

interface CartLinesListProps {
  lines: SaleLineItem[]
  onSetQty: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
}

export function CartLinesList({ lines, onSetQty, onRemove }: CartLinesListProps) {
  if (lines.length === 0) {
    return <p className="px-3 text-sm text-faint">העגלה ריקה. הוסיפו פריטים מלמעלה.</p>
  }

  return (
    <ul className="mx-3 divide-y divide-line rounded-lg border border-line bg-surface">
      {lines.map((line) => (
        <li key={line.itemId} className="flex items-center gap-2 p-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{line.itemName}</p>
            <p className="text-xs text-muted">
              <Money amount={line.unitPrice} /> ליחידה
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSetQty(line.itemId, line.qty - 1)}
            className="h-11 w-11 shrink-0 rounded border border-line-strong text-lg transition-colors hover:bg-subtle"
            aria-label="הפחת כמות"
          >
            −
          </button>
          <span className="w-6 shrink-0 text-center text-sm">{line.qty}</span>
          <button
            type="button"
            onClick={() => onSetQty(line.itemId, line.qty + 1)}
            className="h-11 w-11 shrink-0 rounded border border-line-strong text-lg transition-colors hover:bg-subtle"
            aria-label="הוסף כמות"
          >
            +
          </button>
          <span className="w-16 shrink-0 text-end text-sm font-medium">
            <Money amount={line.lineSubtotal} />
          </span>
          <button
            type="button"
            onClick={() => onRemove(line.itemId)}
            className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
            aria-label="הסר"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
