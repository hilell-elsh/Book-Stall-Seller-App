import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { Category } from '../../types/catalog'

export function CategoryManager() {
  const { categories, addCategory, renameCategory, deleteCategory, moveCategory } =
    useAppData()
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addCategory(trimmed)
    setNewName('')
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">קטגוריות</h2>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="שם קטגוריה חדשה"
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
        {categories.map((category, index) => (
          <li key={category.id} className="flex flex-wrap items-center gap-2 p-2">
            <input
              type="text"
              defaultValue={category.name}
              onBlur={(e) => {
                const trimmed = e.target.value.trim()
                if (trimmed && trimmed !== category.name) {
                  renameCategory(category.id, trimmed)
                }
              }}
              className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
            />
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => moveCategory(category.id, 'up')}
                disabled={index === 0}
                className="h-11 w-11 shrink-0 rounded border border-line-strong text-sm transition-colors hover:bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="הזז למעלה"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveCategory(category.id, 'down')}
                disabled={index === categories.length - 1}
                className="h-11 w-11 shrink-0 rounded border border-line-strong text-sm transition-colors hover:bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="הזז למטה"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(category)}
                className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
                aria-label="מחק"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="p-3 text-sm text-faint">אין עדיין קטגוריות.</li>
        )}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="מחיקת קטגוריה"
        message={
          pendingDelete
            ? `למחוק את הקטגוריה "${pendingDelete.name}"? כל הפריטים בקטגוריה זו יימחקו גם הם.`
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteCategory(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
