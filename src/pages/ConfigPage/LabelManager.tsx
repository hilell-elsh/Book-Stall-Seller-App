import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { Label } from '../../types/label'

export function LabelManager() {
  const { labels, addLabel, renameLabel, deleteLabel } = useAppData()
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Label | null>(null)

  function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addLabel(trimmed)
    setNewName('')
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">תוויות</h2>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="שם תווית חדשה"
          className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          הוספה
        </button>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {labels.map((label) => (
          <li key={label.id} className="flex items-center gap-2 p-2">
            <input
              type="text"
              defaultValue={label.name}
              onBlur={(e) => {
                const trimmed = e.target.value.trim()
                if (trimmed && trimmed !== label.name) {
                  renameLabel(label.id, trimmed)
                }
              }}
              className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPendingDelete(label)}
              className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
              aria-label="מחק"
            >
              ✕
            </button>
          </li>
        ))}
        {labels.length === 0 && (
          <li className="p-3 text-sm text-faint">אין עדיין תוויות.</li>
        )}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="מחיקת תווית"
        message={
          pendingDelete
            ? `למחוק את התווית "${pendingDelete.name}"? התווית תוסר מכל הפריטים.`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteLabel(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
