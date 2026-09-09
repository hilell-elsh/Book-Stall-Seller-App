import { useState } from 'react'
import { CartLinesList } from '../components/cart/CartLinesList'
import { ItemBrowser } from '../components/cart/ItemBrowser'
import { PaymentSelector } from '../components/cart/PaymentSelector'
import { SaleSummary } from '../components/cart/SaleSummary'
import { useAppData } from '../context/AppDataContext'
import type { CartState } from '../hooks/useCartState'

interface SalePageProps {
  cart: CartState
}

export function SalePage({ cart }: SalePageProps) {
  const { categories, items, labels, paymentMethods, addSaleRecord } = useAppData()
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [receiver, setReceiver] = useState('')

  const canSave = cart.lines.length > 0 && paymentMethodId !== '' && receiver.trim() !== ''

  function handleSave() {
    if (!canSave) return
    addSaleRecord({ ...cart.evaluated, paymentMethodId, receiver: receiver.trim() })
    cart.clear()
    setPaymentMethodId('')
    setReceiver('')
  }

  if (categories.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold">מכירה</h1>
        <p className="mt-2 text-sm text-faint">
          יש להוסיף קודם קטגוריות ופריטים במסך ההגדרות.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col sm:flex-row">
      <div className="flex-1">
        <ItemBrowser categories={categories} items={items} labels={labels} onAdd={cart.addItem} />
      </div>

      <div className="flex flex-col sm:w-80 sm:shrink-0 sm:border-s sm:border-line">
        <div className="mt-3 flex-1 sm:mt-0 sm:pt-3">
          <CartLinesList
            lines={cart.evaluated.lines}
            onSetQty={cart.setQty}
            onRemove={cart.removeItem}
          />
        </div>
        <PaymentSelector
          paymentMethods={paymentMethods}
          paymentMethodId={paymentMethodId}
          receiver={receiver}
          onPaymentMethodChange={setPaymentMethodId}
          onReceiverChange={setReceiver}
        />
        <SaleSummary
          evaluated={cart.evaluated}
          actionLabel="שמור מכירה"
          onAction={handleSave}
          disabled={!canSave}
        />
      </div>
    </div>
  )
}
