import { useState } from 'react'
import { CartLinesList } from '../../components/cart/CartLinesList'
import { ItemBrowser } from '../../components/cart/ItemBrowser'
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

  const canSave = cart.lines.length > 0 && paymentMethodId !== '' && receiver.trim() !== ''

  function handleSave() {
    if (!canSave) return
    updateSaleRecord(record.id, { ...cart.evaluated, paymentMethodId, receiver: receiver.trim() })
    onClose()
  }

  function handleDelete() {
    deleteSaleRecord(record.id)
    onClose()
  }

  return (
    <div className="flex min-h-[calc(100vh-49px)] flex-col sm:flex-row">
      <div className="flex-1">
        <div className="flex items-center justify-between p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 items-center text-sm text-accent-600"
          >
            → חזרה לרשימה
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex min-h-11 items-center rounded border border-danger-300 px-3 text-sm text-danger-600"
          >
            מחיקת מכירה
          </button>
        </div>
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
          actionLabel="שמור שינויים"
          onAction={handleSave}
          disabled={!canSave}
        />
      </div>

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
