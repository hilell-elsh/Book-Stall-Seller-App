import { Money } from '../Money'
import type { CatalogItem } from '../../types/catalog'

interface ItemGridProps {
  items: CatalogItem[]
  onAdd: (itemId: string) => void
}

export function ItemGrid({ items, onAdd }: ItemGridProps) {
  if (items.length === 0) {
    return <p className="px-3 text-sm text-gray-400">אין פריטים בקטגוריה זו.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onAdd(item.id)}
          className="flex min-h-[44px] flex-col items-center justify-center rounded-lg border border-gray-300 bg-white p-3 text-center active:bg-gray-100"
        >
          <span className="text-sm font-medium">{item.name}</span>
          <span className="mt-1 text-xs text-gray-500">
            <Money amount={item.price} />
          </span>
        </button>
      ))}
    </div>
  )
}
