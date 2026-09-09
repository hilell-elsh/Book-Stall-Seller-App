import { Money } from '../Money'
import type { CatalogItem } from '../../types/catalog'

interface ItemGridProps {
  items: CatalogItem[]
  onAdd: (itemId: string) => void
}

export function ItemGrid({ items, onAdd }: ItemGridProps) {
  if (items.length === 0) {
    return <p className="px-3 text-sm text-faint">אין פריטים בקטגוריה זו.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onAdd(item.id)}
          className="flex min-h-[44px] flex-col items-center justify-center rounded-lg border border-line-strong bg-surface p-3 text-center transition-colors hover:bg-subtle active:bg-subtle"
        >
          <span className="text-sm font-medium">{item.name}</span>
          <span className="mt-1 text-xs text-muted">
            <Money amount={item.price} />
          </span>
        </button>
      ))}
    </div>
  )
}
