import { useRef, useState } from 'react'
import { CartLinesList } from '../components/cart/CartLinesList'
import { ItemBrowser } from '../components/cart/ItemBrowser'
import { ManualAdjustments } from '../components/cart/ManualAdjustments'
import { MobileCartBar } from '../components/cart/MobileCartBar'
import { OTHER_RECEIVER, PaymentSelector } from '../components/cart/PaymentSelector'
import { SaleSummary } from '../components/cart/SaleSummary'
import { useAppData } from '../context/AppDataContext'
import type { CartState } from '../hooks/useCartState'

interface SalePageProps {
  cart: CartState
}

export function SalePage({ cart }: SalePageProps) {
  const { categories, items, labels, creators, paymentMethods, eventName, addSaleRecord } =
    useAppData()
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [receiverSelection, setReceiverSelection] = useState('')
  const [receiverOther, setReceiverOther] = useState('')
  const cartSectionRef = useRef<HTMLDivElement>(null)

  const receiver = receiverSelection === OTHER_RECEIVER ? receiverOther.trim() : receiverSelection
  const canSave = cart.lines.length > 0 && paymentMethodId !== '' && receiver !== ''
  const hasItems = cart.lines.length > 0

  function handleSave() {
    if (!canSave) return
    addSaleRecord({
      ...cart.evaluated,
      eventName,
      paymentMethodId,
      receiver,
      manualDiscount: cart.manualDiscount ?? undefined,
      comment: cart.comment.trim() || undefined,
    })
    cart.clear()
    setPaymentMethodId('')
    setReceiverSelection('')
    setReceiverOther('')
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
          receiverSelection={receiverSelection}
          receiverOther={receiverOther}
          onPaymentMethodChange={setPaymentMethodId}
          onReceiverSelectionChange={setReceiverSelection}
          onReceiverOtherChange={setReceiverOther}
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
