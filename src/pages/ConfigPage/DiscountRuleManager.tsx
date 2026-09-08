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
      <section>
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
    <section>
      <h2 className="text-base font-semibold">מבצעי הנחה</h2>

      {categories.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">יש להוסיף קודם קטגוריה אחת לפחות.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {discountRules.map((rule, index) => (
              <li key={rule.id} className="flex items-center gap-2 p-2">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleDiscountRule(rule.id)}
                  aria-label="פעיל"
                />
                <span className="min-w-0 flex-1 truncate text-sm">{rule.name}</span>
                <button
                  type="button"
                  onClick={() => moveDiscountRule(rule.id, 'up')}
                  disabled={index === 0}
                  className="h-11 w-11 shrink-0 rounded border border-gray-300 text-sm disabled:opacity-30"
                  aria-label="הזז למעלה"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDiscountRule(rule.id, 'down')}
                  disabled={index === discountRules.length - 1}
                  className="h-11 w-11 shrink-0 rounded border border-gray-300 text-sm disabled:opacity-30"
                  aria-label="הזז למטה"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(rule)}
                  className="h-9 shrink-0 rounded border border-gray-300 px-3 text-sm"
                >
                  עריכה
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(rule)}
                  className="h-11 w-11 shrink-0 rounded border border-red-300 text-sm text-red-600"
                  aria-label="מחק"
                >
                  ✕
                </button>
              </li>
            ))}
            {discountRules.length === 0 && (
              <li className="p-3 text-sm text-gray-400">אין עדיין מבצעי הנחה.</li>
            )}
          </ul>

          <button
            type="button"
            onClick={() => setEditing('new')}
            className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            מבצע חדש
          </button>
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
