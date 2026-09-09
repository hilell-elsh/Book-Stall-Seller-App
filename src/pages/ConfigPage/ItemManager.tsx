import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useAppData } from '../../context/AppDataContext'
import type { CatalogItem } from '../../types/catalog'

export function ItemManager() {
  const {
    categories,
    items,
    labels,
    creators,
    addItem,
    updateItem,
    deleteItem,
    moveItem,
    changeItemCategory,
    toggleItemLabel,
    toggleItemActive,
    setItemCreatorShares,
  } = useAppData()
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null)

  const activeCategoryId = selectedCategoryId || categories[0]?.id || ''

  function addCreatorShare(itemId: string, creatorId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item || item.creatorShares.some((share) => share.creatorId === creatorId)) return
    const usedPercent = item.creatorShares.reduce((sum, share) => sum + share.percentage, 0)
    const remaining = Math.max(0, 100 - usedPercent)
    setItemCreatorShares(itemId, [...item.creatorShares, { creatorId, percentage: remaining }])
  }

  function updateCreatorSharePercentage(itemId: string, creatorId: string, percentage: number) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    setItemCreatorShares(
      itemId,
      item.creatorShares.map((share) =>
        share.creatorId === creatorId ? { ...share, percentage } : share,
      ),
    )
  }

  function removeCreatorShare(itemId: string, creatorId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const remaining = item.creatorShares.filter((share) => share.creatorId !== creatorId)
    // A single remaining creator gets the whole thing — no percentage left to split.
    setItemCreatorShares(
      itemId,
      remaining.length === 1 ? [{ ...remaining[0], percentage: 100 }] : remaining,
    )
  }

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
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-base font-semibold">פריטים</h2>
        <p className="mt-2 text-sm text-faint">
          יש להוסיף קודם קטגוריה אחת לפחות.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">פריטים</h2>

      <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={activeCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="rounded border border-line-strong px-2 py-2 text-sm"
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
          className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.5"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          placeholder="מחיר"
          className="w-20 shrink-0 rounded border border-line-strong px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          הוספה
        </button>
      </div>

      {categories.map((category) => {
        const categoryItems = items.filter((item) => item.categoryId === category.id)
        return (
          <div key={category.id} className="mt-3">
            <h3 className="text-sm font-medium text-muted">{category.name}</h3>
            <ul className="mt-1 divide-y divide-line">
              {categoryItems.map((item, index) => (
                <li key={item.id} className={`p-2 ${item.active ? '' : 'opacity-50'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleItemActive(item.id)}
                        aria-label="פעיל"
                        className="h-5 w-5 shrink-0"
                      />
                      <input
                        type="text"
                        defaultValue={item.name}
                        onBlur={(e) => {
                          const trimmed = e.target.value.trim()
                          if (trimmed && trimmed !== item.name) {
                            updateItem(item.id, { name: trimmed })
                          }
                        }}
                        className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm"
                      />
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
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
                        className="w-20 shrink-0 rounded border border-line-strong px-2 py-2 text-sm"
                      />
                      <select
                        value={item.categoryId}
                        onChange={(e) => changeItemCategory(item.id, e.target.value)}
                        className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm sm:flex-none"
                      >
                        {categories.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex w-full justify-end gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => moveItem(item.id, 'up')}
                        disabled={index === 0}
                        className="h-11 w-11 shrink-0 rounded border border-line-strong text-sm transition-colors hover:bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="הזז למעלה"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item.id, 'down')}
                        disabled={index === categoryItems.length - 1}
                        className="h-11 w-11 shrink-0 rounded border border-line-strong text-sm transition-colors hover:bg-subtle disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="הזז למטה"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        className="h-11 w-11 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30"
                        aria-label="מחק"
                      >
                        ✕
                      </button>
                    </div>
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
                                ? 'border-accent-600 bg-accent-600 text-white'
                                : 'border-line-strong text-muted'
                            }`}
                          >
                            {label.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {creators.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-muted">יוצרים:</span>
                      {item.creatorShares.map((share) => {
                        const creator = creators.find((c) => c.id === share.creatorId)
                        if (!creator) return null
                        const soleCreator = item.creatorShares.length === 1
                        return (
                          <span
                            key={share.creatorId}
                            className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-xs"
                          >
                            {creator.name}
                            {!soleCreator && (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  defaultValue={share.percentage}
                                  onBlur={(e) => {
                                    const percentage = Number(e.target.value)
                                    if (Number.isFinite(percentage) && percentage >= 0) {
                                      updateCreatorSharePercentage(item.id, share.creatorId, percentage)
                                    }
                                  }}
                                  className="w-10 rounded border border-line-strong bg-paper px-1 py-0.5 text-center text-xs"
                                />
                                %
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => removeCreatorShare(item.id, share.creatorId)}
                              aria-label="הסר יוצר"
                              className="text-danger-600"
                            >
                              ✕
                            </button>
                          </span>
                        )
                      })}
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) addCreatorShare(item.id, e.target.value)
                        }}
                        className="rounded-full border border-line-strong px-2 py-0.5 text-xs text-muted"
                      >
                        <option value="">+ הוספת יוצר</option>
                        {creators
                          .filter((creator) => !item.creatorShares.some((share) => share.creatorId === creator.id))
                          .map((creator) => (
                            <option key={creator.id} value={creator.id}>
                              {creator.name}
                            </option>
                          ))}
                      </select>
                      {item.creatorShares.length > 0 &&
                        item.creatorShares.reduce((sum, share) => sum + share.percentage, 0) !== 100 && (
                          <span className="text-xs text-danger-600">
                            (סה"כ{' '}
                            {item.creatorShares.reduce((sum, share) => sum + share.percentage, 0)}%,
                            צריך 100%)
                          </span>
                        )}
                    </div>
                  )}
                </li>
              ))}
              {categoryItems.length === 0 && (
                <li className="p-3 text-sm text-faint">אין עדיין פריטים בקטגוריה זו.</li>
              )}
            </ul>
          </div>
        )
      })}

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
