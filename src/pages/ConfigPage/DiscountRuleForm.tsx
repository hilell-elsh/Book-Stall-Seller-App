import { useState } from 'react'
import type { Category } from '../../types/catalog'
import type { DiscountRule, DiscountRuleDraft } from '../../types/discount'

type Kind = 'categoryStep' | 'bundlePrice'

interface DiscountRuleFormProps {
  categories: Category[]
  initial?: DiscountRule
  onSave: (draft: DiscountRuleDraft) => void
  onCancel: () => void
}

function toggleInArray(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]
}

export function DiscountRuleForm({
  categories,
  initial,
  onSave,
  onCancel,
}: DiscountRuleFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'categoryStep')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [error, setError] = useState('')

  const [stepCategoryId, setStepCategoryId] = useState(
    initial?.kind === 'categoryStep' ? initial.categoryId : (categories[0]?.id ?? ''),
  )
  const [startFromNth, setStartFromNth] = useState(
    initial?.kind === 'categoryStep' ? String(initial.startFromNth) : '2',
  )
  const [discountKind, setDiscountKind] = useState<'flat' | 'percent'>(
    initial?.kind === 'categoryStep' ? initial.discount.kind : 'flat',
  )
  const [discountValue, setDiscountValue] = useState(
    initial?.kind === 'categoryStep'
      ? String(
          initial.discount.kind === 'flat'
            ? initial.discount.amount
            : initial.discount.percent,
        )
      : '',
  )

  const [bundleCategoryIds, setBundleCategoryIds] = useState<string[]>(
    initial?.kind === 'bundlePrice' ? initial.categoryIds : [],
  )
  const [bundleSize, setBundleSize] = useState(
    initial?.kind === 'bundlePrice' ? String(initial.bundleSize) : '3',
  )
  const [bundlePrice, setBundlePrice] = useState(
    initial?.kind === 'bundlePrice' ? String(initial.bundlePrice) : '',
  )

  const [triggerEnabled, setTriggerEnabled] = useState(Boolean(initial?.trigger))
  const [triggerCategoryIds, setTriggerCategoryIds] = useState<string[]>(
    initial?.trigger?.categoryIds ?? [],
  )
  const [triggerMinQty, setTriggerMinQty] = useState(
    initial?.trigger?.minQty ? String(initial.trigger.minQty) : '1',
  )

  function handleSubmit() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('יש להזין שם למבצע')
      return
    }

    const trigger =
      triggerEnabled && triggerCategoryIds.length > 0
        ? {
            categoryIds: triggerCategoryIds,
            minQty: Math.max(1, Number(triggerMinQty) || 1),
          }
        : undefined

    if (kind === 'categoryStep') {
      const startNum = Number(startFromNth)
      const valueNum = Number(discountValue)
      if (!stepCategoryId) {
        setError('יש לבחור קטגוריה')
        return
      }
      if (!Number.isInteger(startNum) || startNum < 1) {
        setError('"החל מפריט מספר" חייב להיות מספר שלם 1 ומעלה')
        return
      }
      if (!Number.isFinite(valueNum) || valueNum <= 0) {
        setError('ערך ההנחה חייב להיות גדול מ-0')
        return
      }
      if (discountKind === 'percent' && valueNum > 100) {
        setError('אחוז הנחה לא יכול לעלות על 100')
        return
      }
      setError('')
      onSave({
        kind: 'categoryStep',
        name: trimmedName,
        enabled,
        trigger,
        categoryId: stepCategoryId,
        startFromNth: startNum,
        discount:
          discountKind === 'flat'
            ? { kind: 'flat', amount: valueNum }
            : { kind: 'percent', percent: valueNum },
      })
      return
    }

    const sizeNum = Number(bundleSize)
    const priceNum = Number(bundlePrice)
    if (bundleCategoryIds.length === 0) {
      setError('יש לבחור לפחות קטגוריה אחת')
      return
    }
    if (!Number.isInteger(sizeNum) || sizeNum < 2) {
      setError('גודל החבילה חייב להיות מספר שלם 2 ומעלה')
      return
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('מחיר החבילה לא יכול להיות שלילי')
      return
    }
    setError('')
    onSave({
      kind: 'bundlePrice',
      name: trimmedName,
      enabled,
      trigger,
      categoryIds: bundleCategoryIds,
      bundleSize: sizeNum,
      bundlePrice: priceNum,
    })
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <div>
        <label className="block text-sm text-gray-600">שם המבצע</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600">סוג המבצע</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="categoryStep">הנחה מדורגת לפי קטגוריה</option>
          <option value="bundlePrice">מחיר חבילה</option>
        </select>
      </div>

      {kind === 'categoryStep' && (
        <div className="space-y-3 rounded border border-gray-100 bg-gray-50 p-2">
          <div>
            <label className="block text-sm text-gray-600">קטגוריה</label>
            <select
              value={stepCategoryId}
              onChange={(e) => setStepCategoryId(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">החל מפריט מספר</label>
            <input
              type="number"
              min="1"
              step="1"
              value={startFromNth}
              onChange={(e) => setStartFromNth(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm text-gray-600">סוג הנחה</label>
              <select
                value={discountKind}
                onChange={(e) => setDiscountKind(e.target.value as 'flat' | 'percent')}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
              >
                <option value="flat">סכום קבוע (₪)</option>
                <option value="percent">אחוז (%)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600">
                {discountKind === 'flat' ? 'סכום ההנחה (₪)' : 'אחוז ההנחה (%)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {kind === 'bundlePrice' && (
        <div className="space-y-3 rounded border border-gray-100 bg-gray-50 p-2">
          <div>
            <span className="block text-sm text-gray-600">קטגוריות בחבילה</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={bundleCategoryIds.includes(category.id)}
                    onChange={() =>
                      setBundleCategoryIds((prev) => toggleInArray(prev, category.id))
                    }
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm text-gray-600">גודל חבילה (יחידות)</label>
              <input
                type="number"
                min="2"
                step="1"
                value={bundleSize}
                onChange={(e) => setBundleSize(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600">מחיר חבילה (₪)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={bundlePrice}
                onChange={(e) => setBundlePrice(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded border border-gray-100 bg-gray-50 p-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={triggerEnabled}
            onChange={(e) => setTriggerEnabled(e.target.checked)}
          />
          המבצע פעיל רק אם נקנה גם פריט מקטגוריה מסוימת
        </label>
        {triggerEnabled && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={triggerCategoryIds.includes(category.id)}
                    onChange={() =>
                      setTriggerCategoryIds((prev) => toggleInArray(prev, category.id))
                    }
                  />
                  {category.name}
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm text-gray-600">כמות מינימלית להפעלה</label>
              <input
                type="number"
                min="1"
                step="1"
                value={triggerMinQty}
                onChange={(e) => setTriggerMinQty(e.target.value)}
                className="mt-1 w-24 rounded border border-gray-300 px-2 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        המבצע פעיל
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-2 text-sm text-gray-600"
        >
          ביטול
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          שמירה
        </button>
      </div>
    </div>
  )
}
