import { useRef, useState } from 'react'
import { CartLinesList } from '../components/cart/CartLinesList'
import { ItemBrowser } from '../components/cart/ItemBrowser'
import { ManualAdjustments } from '../components/cart/ManualAdjustments'
import { MobileCartBar } from '../components/cart/MobileCartBar'
import { PaymentSelector } from '../components/cart/PaymentSelector'
import { SaleSummary } from '../components/cart/SaleSummary'
import { useAppData } from '../context/AppDataContext'
import { defaultReceiverForShiftSeller } from '../domain/shiftSeller'
import type { CartState } from '../hooks/useCartState'
import { useShiftSeller } from '../hooks/useShiftSeller'

interface SalePageProps {
  cart: CartState
}

export function SalePage({ cart }: SalePageProps) {
  const { categories, items, labels, creators, paymentMethods, eventName, addSaleRecord } =
    useAppData()
  // Read-only here — set from the Settings page (ShiftSellerSettings) so
  // picking it happens once per shift, before selling starts, rather than
  // via a control living in the middle of an in-progress sale.
  const { shiftSeller } = useShiftSeller()
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [receiver, setReceiver] = useState(() => defaultReceiverForShiftSeller(shiftSeller, creators))
  const [isCustomReceiver, setIsCustomReceiver] = useState(false)
  const cartSectionRef = useRef<HTMLDivElement>(null)

  const canSave = cart.lines.length > 0 && paymentMethodId !== '' && receiver.trim() !== ''
  const hasItems = cart.lines.length > 0

  function handleReceiverChange(name: string, isCustom: boolean) {
    setReceiver(name)
    setIsCustomReceiver(isCustom)
  }

  function handleSave() {
    if (!canSave) return
    addSaleRecord({
      ...cart.evaluated,
      eventName,
      paymentMethodId,
      paymentMethodName: paymentMethods.find((method) => method.id === paymentMethodId)?.name,
      receiver: receiver.trim(),
      manualDiscount: cart.manualDiscount ?? undefined,
      comment: cart.comment.trim() || undefined,
    })
    cart.clear()
    setPaymentMethodId('')
    setReceiver(defaultReceiverForShiftSeller(shiftSeller, creators))
    setIsCustomReceiver(false)
  }

  function scrollToCart() {
    cartSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    <div
      className={`mx-auto flex min-h-full max-w-[1400px] flex-col sm:flex-row ${hasItems ? 'pb-14 sm:pb-0' : ''}`}
    >
      <div className="flex-1">
        <ItemBrowser
          categories={categories}
          items={items}
          labels={labels}
          creators={creators}
          onAdd={cart.addItem}
        />
      </div>

      <div
        ref={cartSectionRef}
        className="flex flex-col sm:w-80 sm:shrink-0 sm:border-s sm:border-line"
      >
        <div className="mt-3 flex-1 sm:mt-0 sm:pt-3">
          <CartLinesList
            lines={cart.evaluated.lines}
            onSetQty={cart.setQty}
            onRemove={cart.removeItem}
          />
        </div>
        <ManualAdjustments
          manualDiscount={cart.manualDiscount}
          comment={cart.comment}
          onManualDiscountChange={cart.setManualDiscount}
          onCommentChange={cart.setComment}
        />
        <PaymentSelector
          paymentMethods={paymentMethods}
          paymentMethodId={paymentMethodId}
          creators={creators}
          receiver={receiver}
          isCustomReceiver={isCustomReceiver}
          onPaymentMethodChange={setPaymentMethodId}
          onReceiverChange={handleReceiverChange}
          onSubmit={handleSave}
        />
        <SaleSummary
          evaluated={cart.evaluated}
          actionLabel="שמור מכירה"
          onAction={handleSave}
          disabled={!canSave}
        />
      </div>

      {hasItems && <MobileCartBar evaluated={cart.evaluated} onJump={scrollToCart} />}
    </div>
  )
}
