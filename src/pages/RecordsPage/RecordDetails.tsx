import { useState } from 'react'
import { Money } from '../../components/Money'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import { computeCreatorPayouts } from '../../domain/payouts'
import type { SaleRecord } from '../../types/sale'

interface RecordDetailsProps {
  record: SaleRecord
  onEdit: () => void
  onClose: () => void
}

export function RecordDetails({ record, onEdit, onClose }: RecordDetailsProps) {
  const { paymentMethods, deleteSaleRecord } = useAppData()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const payouts = computeCreatorPayouts(record)

  const paymentMethodName = record.paymentMethodId
    ? paymentMethods.find((method) => method.id === record.paymentMethodId)?.name
    : undefined

  function handleDelete() {
    deleteSaleRecord(record.id)
    onClose()
  }

  return (
    <div className="p-3">
      {record.eventName && (
        <p className="mb-2 text-sm text-muted">אירוע: {record.eventName}</p>
      )}
      <ul className="divide-y divide-line rounded-lg border border-line">
        {record.lines.map((line) => (
          <li key={line.itemId} className="flex items-center justify-between gap-2 p-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{line.itemName}</p>
              <p className="text-xs text-muted">
                {line.qty} × <Money amount={line.unitPrice} />
              </p>
            </div>
            <span className="shrink-0 font-medium">
              <Money amount={line.lineSubtotal} />
            </span>
          </li>
        ))}
      </ul>

      {record.discounts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {record.discounts.map((discount) => (
            <li key={discount.ruleId} className="flex justify-between text-sm text-success-600">
              <span>{discount.description}</span>
              <span>
                −<Money amount={discount.amount} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-sm text-muted">
          <span>סכום ביניים</span>
          <Money amount={record.subtotal} />
        </div>
        {record.totalDiscount > 0 && (
          <div className="flex justify-between text-sm text-muted">
            <span>סה"כ הנחה</span>
            <span>
              −<Money amount={record.totalDiscount} />
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold">
          <span>סה"כ</span>
          <Money amount={record.total} />
        </div>
      </div>

      {(paymentMethodName || record.receiver) && (
        <div className="mt-2 space-y-0.5 text-sm text-muted">
          {paymentMethodName && <p>אמצעי תשלום: {paymentMethodName}</p>}
          {record.receiver && <p>מקבל/ת: {record.receiver}</p>}
        </div>
      )}

      {payouts.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-line pt-2">
          <p className="text-sm text-muted">פיצול ליוצרים</p>
          {payouts.map((payout) => (
            <div key={payout.creatorId} className="flex justify-between text-sm">
              <span>{payout.creatorName}</span>
              <Money amount={payout.amount} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex min-h-11 items-center rounded border border-danger-300 px-3 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
        >
          מחיקת מכירה
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 items-center rounded bg-accent-600 px-4 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          עריכה
        </button>
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
