import { Money } from '../Money'
import type { EvaluatedSale } from '../../domain/pricing'

interface MobileCartBarProps {
  evaluated: EvaluatedSale
  onJump: () => void
}

export function MobileCartBar({ evaluated, onJump }: MobileCartBarProps) {
  const itemCount = evaluated.lines.reduce((sum, line) => sum + line.qty, 0)

  return (
    <button
      type="button"
      onClick={onJump}
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between bg-accent-600 px-4 py-3 text-white sm:hidden"
    >
      <span className="text-sm">{itemCount} פריטים</span>
      <span className="flex items-center gap-2 text-base font-semibold">
        <Money amount={evaluated.total} />
        <span className="text-sm font-normal">לתשלום</span>
      </span>
    </button>
  )
}
