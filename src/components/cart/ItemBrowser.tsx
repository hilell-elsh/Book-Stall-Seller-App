import { useState } from 'react'
import type { Category, CatalogItem } from '../../types/catalog'
import type { Creator } from '../../types/creator'
import type { Label } from '../../types/label'
import { CategoryPicker } from './CategoryPicker'
import { CreatorFilter } from './CreatorFilter'
import { ItemGrid } from './ItemGrid'
import { LabelFilter } from './LabelFilter'

interface ItemBrowserProps {
  categories: Category[]
  items: CatalogItem[]
  labels: Label[]
  creators: Creator[]
  onAdd: (itemId: string) => void
}

export function ItemBrowser({ categories, items, labels, creators, onAdd }: ItemBrowserProps) {
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([])
  const [activeCreatorIds, setActiveCreatorIds] = useState<string[]>([])

  const isShowingAll = activeCategoryId === ''
  const sellableItems = items.filter((item) => item.active)

  function matchesLabelFilter(item: CatalogItem): boolean {
    return (
      activeLabelIds.length === 0 ||
      activeLabelIds.some((labelId) => item.labelIds.includes(labelId))
    )
  }

  function matchesCreatorFilter(item: CatalogItem): boolean {
    return (
      activeCreatorIds.length === 0 ||
      activeCreatorIds.some((creatorId) =>
        item.creatorShares.some((share) => share.creatorId === creatorId),
      )
    )
  }

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    )
  }

  function toggleCreatorFilter(creatorId: string) {
    setActiveCreatorIds((prev) =>
      prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId],
    )
  }

  const categoryItems = sellableItems
    .filter((item) => item.categoryId === activeCategoryId)
    .filter(matchesLabelFilter)
    .filter(matchesCreatorFilter)

  return (
    <div>
      <CategoryPicker
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />
      <LabelFilter labels={labels} activeLabelIds={activeLabelIds} onToggle={toggleLabelFilter} />
      <CreatorFilter
        creators={creators}
        activeCreatorIds={activeCreatorIds}
        onToggle={toggleCreatorFilter}
      />
      {isShowingAll ? (
        <div className="space-y-3">
          {categories.map((category) => {
            const itemsInCategory = sellableItems
              .filter((item) => item.categoryId === category.id)
              .filter(matchesLabelFilter)
              .filter(matchesCreatorFilter)
            if (itemsInCategory.length === 0) return null
            return (
              <div key={category.id}>
                <h2 className="px-3 text-sm font-medium text-muted">{category.name}</h2>
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
