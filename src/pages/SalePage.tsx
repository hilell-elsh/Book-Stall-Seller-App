import { useState } from 'react'
import { CartLinesList } from '../components/cart/CartLinesList'
import { CategoryPicker } from '../components/cart/CategoryPicker'
import { ItemGrid } from '../components/cart/ItemGrid'
import { LabelFilter } from '../components/cart/LabelFilter'
import { SaleSummary } from '../components/cart/SaleSummary'
import { useAppData } from '../context/AppDataContext'
import type { CartState } from '../hooks/useCartState'
import type { CatalogItem } from '../types/catalog'

interface SalePageProps {
  cart: CartState
}

export function SalePage({ cart }: SalePageProps) {
  const { categories, items, labels, addSaleRecord } = useAppData()
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

  function handleSave() {
    if (cart.lines.length === 0) return
    addSaleRecord(cart.evaluated)
    cart.clear()
  }

  if (categories.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">מכירה</h1>
        <p className="mt-2 text-sm text-gray-400">
          יש להוסיף קודם קטגוריות ופריטים במסך ההגדרות.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-49px)] flex-col sm:flex-row">
      <div className="flex-1">
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
                    <ItemGrid items={itemsInCategory} onAdd={cart.addItem} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <ItemGrid items={categoryItems} onAdd={cart.addItem} />
        )}
      </div>

      <div className="flex flex-col sm:w-80 sm:shrink-0 sm:border-s sm:border-gray-200">
        <div className="mt-3 flex-1 sm:mt-0 sm:pt-3">
          <CartLinesList
            lines={cart.evaluated.lines}
            onSetQty={cart.setQty}
            onRemove={cart.removeItem}
          />
        </div>
        <SaleSummary
          evaluated={cart.evaluated}
          actionLabel="שמור מכירה"
          onAction={handleSave}
          disabled={cart.lines.length === 0}
        />
      </div>
    </div>
  )
}
