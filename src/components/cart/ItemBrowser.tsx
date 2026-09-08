import { useState } from 'react'
import type { Category, CatalogItem } from '../../types/catalog'
import type { Label } from '../../types/label'
import { CategoryPicker } from './CategoryPicker'
import { ItemGrid } from './ItemGrid'
import { LabelFilter } from './LabelFilter'

interface ItemBrowserProps {
  categories: Category[]
  items: CatalogItem[]
  labels: Label[]
  onAdd: (itemId: string) => void
}

export function ItemBrowser({ categories, items, labels, onAdd }: ItemBrowserProps) {
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([])

  const isShowingAll = activeCategoryId === ''

  function matchesLabelFilter(item: CatalogItem): boolean {
    return (
      activeLabelIds.length === 0 ||
      activeLabelIds.some((labelId) => item.labelIds.includes(labelId))
    )
  }

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    )
  }

  const categoryItems = items
    .filter((item) => item.categoryId === activeCategoryId)
    .filter(matchesLabelFilter)

  return (
    <div>
      <CategoryPicker
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />
      <LabelFilter labels={labels} activeLabelIds={activeLabelIds} onToggle={toggleLabelFilter} />
      {isShowingAll ? (
        <div className="space-y-3">
          {categories.map((category) => {
            const itemsInCategory = items
              .filter((item) => item.categoryId === category.id)
              .filter(matchesLabelFilter)
            if (itemsInCategory.length === 0) return null
            return (
              <div key={category.id}>
                <h2 className="px-3 text-sm font-medium text-gray-600">{category.name}</h2>
                <div className="mt-1">
                  <ItemGrid items={itemsInCategory} onAdd={onAdd} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <ItemGrid items={categoryItems} onAdd={onAdd} />
      )}
    </div>
  )
}
