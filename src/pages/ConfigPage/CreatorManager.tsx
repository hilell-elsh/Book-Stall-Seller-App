import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { Creator } from '../../types/creator'

export function CreatorManager() {
  const { creators, addCreator, renameCreator, deleteCreator } = useAppData()
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Creator | null>(null)

  function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addCreator(trimmed)
    setNewName('')
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">יוצרים</h2>
      <p className="mt-1 text-sm text-faint">
        לכל פריט אפשר לשייך יוצר אחד או יותר עם אחוז מהתקבול, בעריכת הפריט.
      </p>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="שם יוצר חדש"
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
        {creators.map((creator) => (
          <li key={creator.id} className="flex items-center gap-2 p-2">
            <input
              type="text"
              defaultValue={creator.name}
              onBlur={(e) => {
                const trimmed = e.target.value.trim()
                if (trimmed && trimmed !== creator.name) {
                  renameCreator(creator.id, trimmed)
                }
              }}
              className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPendingDelete(creator)}
              className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
              aria-label="מחק"
            >
              ✕
            </button>
          </li>
        ))}
        {creators.length === 0 && (
          <li className="p-3 text-sm text-faint">אין עדיין יוצרים.</li>
        )}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="מחיקת יוצר"
        message={
          pendingDelete
            ? `למחוק את "${pendingDelete.name}"? היוצר יוסר מכל הפריטים המשויכים אליו.`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteCreator(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
