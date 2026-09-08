import { CartLinesList } from '../components/cart/CartLinesList'
import { ItemBrowser } from '../components/cart/ItemBrowser'
import { SaleSummary } from '../components/cart/SaleSummary'
import { useAppData } from '../context/AppDataContext'
import type { CartState } from '../hooks/useCartState'

interface SalePageProps {
  cart: CartState
}

export function SalePage({ cart }: SalePageProps) {
  const { categories, items, labels, sellerName, addSaleRecord } = useAppData()

  function handleSave() {
    if (cart.lines.length === 0) return
    addSaleRecord({ ...cart.evaluated, recordedBy: sellerName || undefined })
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
        <ItemBrowser categories={categories} items={items} labels={labels} onAdd={cart.addItem} />
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
