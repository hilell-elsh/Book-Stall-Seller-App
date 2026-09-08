import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { CatalogItem } from '../../types/catalog'

export function ItemManager() {
  const {
    categories,
    items,
    labels,
    addItem,
    updateItem,
    deleteItem,
    moveItem,
    changeItemCategory,
    toggleItemLabel,
  } = useAppData()
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null)

  const activeCategoryId = selectedCategoryId || categories[0]?.id || ''

  function handleAdd() {
    const trimmedName = newName.trim()
    const price = Number(newPrice)
    if (!activeCategoryId || !trimmedName || !Number.isFinite(price) || price < 0) {
      return
    }
    addItem(activeCategoryId, trimmedName, price)
    setNewName('')
    setNewPrice('')
  }

  if (categories.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold">פריטים</h2>
        <p className="mt-2 text-sm text-gray-400">
          יש להוסיף קודם קטגוריה אחת לפחות.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">פריטים</h2>

      {categories.map((category) => {
        const categoryItems = items.filter((item) => item.categoryId === category.id)
        return (
          <div key={category.id} className="mt-3">
            <h3 className="text-sm font-medium text-gray-600">{category.name}</h3>
            <ul className="mt-1 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {categoryItems.map((item, index) => (
                <li key={item.id} className="p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={item.name}
                      onBlur={(e) => {
                        const trimmed = e.target.value.trim()
                        if (trimmed && trimmed !== item.name) {
                          updateItem(item.id, { name: trimmed })
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      defaultValue={item.price}
                      onBlur={(e) => {
                        const price = Number(e.target.value)
                        if (Number.isFinite(price) && price >= 0 && price !== item.price) {
                          updateItem(item.id, { price })
                        }
                      }}
                      className="w-20 shrink-0 rounded border border-gray-300 px-2 py-2 text-sm"
                    />
                    <select
                      value={item.categoryId}
                      onChange={(e) => changeItemCategory(item.id, e.target.value)}
                      className="shrink-0 rounded border border-gray-300 px-2 py-2 text-sm"
                    >
                      {categories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={index === 0}
                      className="h-9 w-9 shrink-0 rounded border border-gray-300 text-sm disabled:opacity-30"
                      aria-label="הזז למעלה"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={index === categoryItems.length - 1}
                      className="h-9 w-9 shrink-0 rounded border border-gray-300 text-sm disabled:opacity-30"
                      aria-label="הזז למטה"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      className="h-9 w-9 shrink-0 rounded border border-red-300 text-sm text-red-600"
                      aria-label="מחק"
                    >
                      ✕
                    </button>
                  </div>
                  {labels.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {labels.map((label) => {
                        const active = item.labelIds.includes(label.id)
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => toggleItemLabel(item.id, label.id)}
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              active
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 text-gray-500'
                            }`}
                          >
                            {label.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              ))}
              {categoryItems.length === 0 && (
                <li className="p-3 text-sm text-gray-400">אין עדיין פריטים בקטגוריה זו.</li>
              )}
            </ul>
          </div>
        )
      })}

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={activeCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="שם פריט"
          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.5"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="מחיר"
          className="w-20 shrink-0 rounded border border-gray-300 px-2 py-2 text-sm"
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
        title="מחיקת פריט"
        message={pendingDelete ? `למחוק את "${pendingDelete.name}"?` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteItem(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
