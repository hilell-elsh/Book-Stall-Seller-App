import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { DiscountRule } from '../../types/discount'
import { DiscountRuleForm } from './DiscountRuleForm'

export function DiscountRuleManager() {
  const {
    categories,
    labels,
    items,
    discountRules,
    addDiscountRule,
    updateDiscountRule,
    deleteDiscountRule,
    toggleDiscountRule,
    moveDiscountRule,
  } = useAppData()
  const [editing, setEditing] = useState<DiscountRule | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DiscountRule | null>(null)

  if (editing) {
    return (
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-base font-semibold">
          {editing === 'new' ? 'מבצע הנחה חדש' : 'עריכת מבצע הנחה'}
        </h2>
        <DiscountRuleForm
          categories={categories}
          labels={labels}
          items={items}
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(draft) => {
            if (editing === 'new') {
              addDiscountRule(draft)
            } else {
              updateDiscountRule(editing.id, draft)
            }
            setEditing(null)
          }}
        />
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">מבצעי הנחה</h2>

      {categories.length === 0 ? (
        <p className="mt-2 text-sm text-faint">יש להוסיף קודם קטגוריה אחת לפחות.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="mt-2 rounded bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
          >
            מבצע חדש
          </button>

          <ul className="mt-3 divide-y divide-line">
            {discountRules.map((rule, index) => (
              <li key={rule.id} className="flex flex-wrap items-center gap-2 p-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleDiscountRule(rule.id)}
                    aria-label="פעיל"
                    className="h-5 w-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{rule.name}</span>
                </div>
                <div className="flex w-full justify-end gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => moveDiscountRule(rule.id, 'up')}
                    disabled={index === 0}
                    className="h-11 w-11 shrink-0 rounded border border-line-strong text-sm transition-colors hover:bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="הזז למעלה"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDiscountRule(rule.id, 'down')}
                    disabled={index === discountRules.length - 1}
                    className="h-11 w-11 shrink-0 rounded border border-line-strong text-sm transition-colors hover:bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="הזז למטה"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(rule)}
                    className="h-11 shrink-0 rounded border border-line-strong px-3 text-sm transition-colors hover:bg-subtle"
                  >
                    עריכה
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(rule)}
                    className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
                    aria-label="מחק"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {discountRules.length === 0 && (
              <li className="p-3 text-sm text-faint">אין עדיין מבצעי הנחה.</li>
            )}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="מחיקת מבצע"
        message={pendingDelete ? `למחוק את המבצע "${pendingDelete.name}"?` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteDiscountRule(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
