import { useRef, useState } from 'react'
import { CartLinesList } from '../../components/cart/CartLinesList'
import { ItemBrowser } from '../../components/cart/ItemBrowser'
import { MobileCartBar } from '../../components/cart/MobileCartBar'
import { PaymentSelector } from '../../components/cart/PaymentSelector'
import { SaleSummary } from '../../components/cart/SaleSummary'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import { useCartState } from '../../hooks/useCartState'
import type { SaleRecord } from '../../types/sale'

interface RecordEditorProps {
  record: SaleRecord
  onClose: () => void
}

export function RecordEditor({ record, onClose }: RecordEditorProps) {
  const { categories, items, labels, paymentMethods, updateSaleRecord, deleteSaleRecord } =
    useAppData()
  const cart = useCartState(record.lines.map((line) => ({ itemId: line.itemId, qty: line.qty })))
  const [paymentMethodId, setPaymentMethodId] = useState(record.paymentMethodId ?? '')
  const [receiver, setReceiver] = useState(record.receiver ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const cartSectionRef = useRef<HTMLDivElement>(null)

  const canSave = cart.lines.length > 0 && paymentMethodId !== '' && receiver.trim() !== ''
  const hasItems = cart.lines.length > 0

  function handleSave() {
    if (!canSave) return
    updateSaleRecord(record.id, { ...cart.evaluated, paymentMethodId, receiver: receiver.trim() })
    onClose()
  }

  function handleDelete() {
    deleteSaleRecord(record.id)
    onClose()
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
            onClick={() => setConfirmingDelete(true)}
            className="flex min-h-11 items-center rounded border border-danger-300 px-3 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
          >
            מחיקת מכירה
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-lg transition-colors hover:bg-subtle"
          >
            ✕
          </button>
        </div>
        <ItemBrowser categories={categories} items={items} labels={labels} onAdd={cart.addItem} />
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

      <ConfirmDialog
        open={confirmingDelete}
        title="מחיקת מכירה"
        message="למחוק את המכירה הזו לצמיתות?"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
