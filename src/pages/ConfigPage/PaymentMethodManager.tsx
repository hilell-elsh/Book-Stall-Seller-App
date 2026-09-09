import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { PaymentMethod } from '../../types/paymentMethod'

export function PaymentMethodManager() {
  const { paymentMethods, addPaymentMethod, renamePaymentMethod, deletePaymentMethod } =
    useAppData()
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PaymentMethod | null>(null)

  function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addPaymentMethod(trimmed)
    setNewName('')
  }

  return (
    <section>
      <h2 className="text-base font-semibold">אמצעי תשלום</h2>

      <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
        {paymentMethods.map((method) => (
          <li key={method.id} className="flex items-center gap-2 p-2">
            <input
              type="text"
              defaultValue={method.name}
              onBlur={(e) => {
                const trimmed = e.target.value.trim()
                if (trimmed && trimmed !== method.name) {
                  renamePaymentMethod(method.id, trimmed)
                }
              }}
              className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPendingDelete(method)}
              className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600"
              aria-label="מחק"
            >
              ✕
            </button>
          </li>
        ))}
        {paymentMethods.length === 0 && (
          <li className="p-3 text-sm text-faint">אין עדיין אמצעי תשלום.</li>
        )}
      </ul>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="לדוגמה: מזומן, ביט, פייבוקס"
          className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded bg-accent-600 px-4 py-2 text-sm font-medium text-white"
        >
          הוספה
        </button>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="מחיקת אמצעי תשלום"
        message={pendingDelete ? `למחוק את "${pendingDelete.name}"?` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deletePaymentMethod(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
