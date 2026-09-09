import { useState } from 'react'
import type { ManualDiscount } from '../../types/sale'

interface ManualAdjustmentsProps {
  manualDiscount: ManualDiscount | null
  comment: string
  onManualDiscountChange: (discount: ManualDiscount | null) => void
  onCommentChange: (comment: string) => void
}

export function ManualAdjustments({
  manualDiscount,
  comment,
  onManualDiscountChange,
  onCommentChange,
}: ManualAdjustmentsProps) {
  const [expanded, setExpanded] = useState(manualDiscount !== null || comment !== '')

  if (!expanded) {
    return (
      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-11 items-center text-sm text-accent-600 transition-colors hover:underline"
        >
          + הנחה ידנית / הערה
        </button>
      </div>
    )
  }

  return (
    <div className="mx-3 mt-2 space-y-2 rounded-lg border border-line bg-subtle p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">הנחה ידנית והערה</span>
        <button
          type="button"
          onClick={() => {
            onManualDiscountChange(null)
            onCommentChange('')
            setExpanded(false)
          }}
          className="flex min-h-11 items-center text-xs text-muted transition-colors hover:underline"
        >
          ביטול
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={manualDiscount?.kind ?? ''}
          onChange={(e) => {
            const kind = e.target.value
            if (kind !== 'flat' && kind !== 'percent') {
              onManualDiscountChange(null)
              return
            }
            onManualDiscountChange({ kind, amount: manualDiscount?.amount ?? 0 })
          }}
          className="w-40 shrink-0 rounded border border-line-strong px-2 py-2 text-sm"
        >
          <option value="">ללא הנחה ידנית</option>
          <option value="flat">סכום קבוע (₪)</option>
          <option value="percent">אחוז (%)</option>
        </select>
        {manualDiscount && (
          <input
            type="number"
            min="0"
            max={manualDiscount.kind === 'percent' ? 100 : undefined}
            step="0.5"
            value={manualDiscount.amount || ''}
            onChange={(e) =>
              onManualDiscountChange({ ...manualDiscount, amount: Number(e.target.value) || 0 })
            }
            placeholder={manualDiscount.kind === 'flat' ? 'סכום ב-₪' : 'אחוז %'}
            className="w-full min-w-0 rounded border border-line-strong px-2 py-2 text-sm"
          />
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="הערה למכירה (אופציונלי)"
        rows={2}
        className="w-full rounded border border-line-strong px-2 py-2 text-sm"
      />
    </div>
  )
}
