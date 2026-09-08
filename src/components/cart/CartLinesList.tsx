import { Money } from '../Money'
import type { SaleLineItem } from '../../types/sale'

interface CartLinesListProps {
  lines: SaleLineItem[]
  onSetQty: (itemId: string, qty: number) => void
  onRemove: (itemId: string) => void
}

export function CartLinesList({ lines, onSetQty, onRemove }: CartLinesListProps) {
  if (lines.length === 0) {
    return <p className="px-3 text-sm text-gray-400">העגלה ריקה. הוסיפו פריטים מלמעלה.</p>
  }

  return (
    <ul className="mx-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {lines.map((line) => (
        <li key={line.itemId} className="flex items-center gap-2 p-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{line.itemName}</p>
            <p className="text-xs text-gray-500">
              <Money amount={line.unitPrice} /> ליחידה
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSetQty(line.itemId, line.qty - 1)}
            className="h-11 w-11 shrink-0 rounded border border-gray-300 text-lg"
            aria-label="הפחת כמות"
          >
            −
          </button>
          <span className="w-6 shrink-0 text-center text-sm">{line.qty}</span>
          <button
            type="button"
            onClick={() => onSetQty(line.itemId, line.qty + 1)}
            className="h-11 w-11 shrink-0 rounded border border-gray-300 text-lg"
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
            className="h-11 w-11 shrink-0 rounded border border-red-300 text-sm text-red-600"
            aria-label="הסר"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
