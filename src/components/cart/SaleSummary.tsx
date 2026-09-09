import { Money } from '../Money'
import type { EvaluatedSale } from '../../domain/pricing'

interface SaleSummaryProps {
  evaluated: EvaluatedSale
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}

export function SaleSummary({ evaluated, actionLabel, onAction, disabled }: SaleSummaryProps) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-surface p-3">
      {evaluated.discounts.length > 0 && (
        <ul className="mb-2 space-y-1">
          {evaluated.discounts.map((discount) => (
            <li key={discount.ruleId} className="flex justify-between text-sm text-success-600">
              <span>{discount.description}</span>
              <span>
                −<Money amount={discount.amount} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between text-sm text-muted">
        <span>סכום ביניים</span>
        <Money amount={evaluated.subtotal} />
      </div>
      {evaluated.totalDiscount > 0 && (
        <div className="flex justify-between text-sm text-muted">
          <span>סה"כ הנחה</span>
          <span>
            −<Money amount={evaluated.totalDiscount} />
          </span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-lg font-semibold">
        <span>סה"כ לתשלום</span>
        <Money amount={evaluated.total} />
      </div>

      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="mt-3 w-full rounded-lg bg-accent-600 py-3 text-base font-medium text-white transition-colors enabled:hover:bg-accent-700 disabled:opacity-40"
      >
        {actionLabel}
      </button>
    </div>
  )
}
