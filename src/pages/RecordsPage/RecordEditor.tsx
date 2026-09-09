import { useRef, useState } from 'react'
import { CartLinesList } from '../../components/cart/CartLinesList'
import { ItemBrowser } from '../../components/cart/ItemBrowser'
import { MobileCartBar } from '../../components/cart/MobileCartBar'
import { PaymentSelector } from '../../components/cart/PaymentSelector'
import { SaleSummary } from '../../components/cart/SaleSummary'
import { useAppData } from '../../context/AppDataContext'
import { useCartState } from '../../hooks/useCartState'
import type { SaleRecord } from '../../types/sale'

interface RecordEditorProps {
  record: SaleRecord
  onDone: () => void
}

export function RecordEditor({ record, onDone }: RecordEditorProps) {
  const { categories, items, labels, creators, paymentMethods, eventName, updateSaleRecord } =
    useAppData()
  const cart = useCartState(record.lines.map((line) => ({ itemId: line.itemId, qty: line.qty })))
  const [paymentMethodId, setPaymentMethodId] = useState(record.paymentMethodId ?? '')
  const [receiver, setReceiver] = useState(record.receiver ?? '')
  const cartSectionRef = useRef<HTMLDivElement>(null)

  const canSave = cart.lines.length > 0 && paymentMethodId !== '' && receiver.trim() !== ''
  const hasItems = cart.lines.length > 0

  function handleSave() {
    if (!canSave) return
    updateSaleRecord(record.id, {
      ...cart.evaluated,
      eventName,
      paymentMethodId,
      receiver: receiver.trim(),
    })
    onDone()
  }

  function scrollToCart() {
    cartSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`flex flex-col sm:flex-row ${hasItems ? 'pb-14 sm:pb-0' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between p-3">
          <button
            type="button"
            onClick={onDone}
            className="flex min-h-11 items-center rounded px-2 text-sm text-muted transition-colors hover:bg-subtle"
          >
            ביטול
          </button>
        </div>
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
        <PaymentSelector
          paymentMethods={paymentMethods}
          paymentMethodId={paymentMethodId}
          receiver={receiver}
          onPaymentMethodChange={setPaymentMethodId}
          onReceiverChange={setReceiver}
        />
        <SaleSummary
          evaluated={cart.evaluated}
          actionLabel="שמור שינויים"
          onAction={handleSave}
          disabled={!canSave}
        />
      </div>

      {hasItems && <MobileCartBar evaluated={cart.evaluated} onJump={scrollToCart} />}
    </div>
  )
}
