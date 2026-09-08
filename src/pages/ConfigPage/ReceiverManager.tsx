import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { Receiver } from '../../types/receiver'

export function ReceiverManager() {
  const { receivers, addReceiver, renameReceiver, deleteReceiver } = useAppData()
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Receiver | null>(null)

  function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addReceiver(trimmed)
    setNewName('')
  }

  return (
    <section>
      <h2 className="text-base font-semibold">מקבלי תשלום</h2>
      <p className="mt-1 text-xs text-gray-500">מי שיכול לקבל תשלום עבור מכירה.</p>

      <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {receivers.map((receiver) => (
          <li key={receiver.id} className="flex items-center gap-2 p-2">
            <input
              type="text"
              defaultValue={receiver.name}
              onBlur={(e) => {
                const trimmed = e.target.value.trim()
                if (trimmed && trimmed !== receiver.name) {
                  renameReceiver(receiver.id, trimmed)
                }
              }}
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPendingDelete(receiver)}
              className="h-11 w-11 shrink-0 rounded border border-red-300 text-sm text-red-600"
              aria-label="מחק"
            >
              ✕
            </button>
          </li>
        ))}
        {receivers.length === 0 && (
          <li className="p-3 text-sm text-gray-400">אין עדיין מקבלי תשלום.</li>
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
          placeholder="שם מקבל/ת תשלום חדש/ה"
          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          הוספה
        </button>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="מחיקת מקבל/ת תשלום"
        message={pendingDelete ? `למחוק את "${pendingDelete.name}"?` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteReceiver(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
