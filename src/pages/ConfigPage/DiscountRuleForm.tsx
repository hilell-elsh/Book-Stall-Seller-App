import { useState } from 'react'
import type { Category, CatalogItem } from '../../types/catalog'
import type { ComboComponent, DiscountRule, DiscountRuleDraft } from '../../types/discount'
import type { Label } from '../../types/label'
import type { ItemSelector } from '../../types/selector'
import { TargetPicker } from './TargetPicker'

type Kind = 'stepDiscount' | 'bundlePrice' | 'comboBundle'

interface DiscountRuleFormProps {
  categories: Category[]
  labels: Label[]
  items: CatalogItem[]
  initial?: DiscountRule
  onSave: (draft: DiscountRuleDraft) => void
  onCancel: () => void
}

interface ComponentDraft {
  target: ItemSelector
  qtyText: string
}

function selectorIsEmpty(selector: ItemSelector): boolean {
  switch (selector.type) {
    case 'filter':
      return selector.categoryIds.length === 0 && selector.labelIds.length === 0
    case 'item':
      return selector.itemIds.length === 0
  }
}

const emptySelector: ItemSelector = { type: 'filter', categoryIds: [], labelIds: [] }

export function DiscountRuleForm({
  categories,
  labels,
  items,
  initial,
  onSave,
  onCancel,
}: DiscountRuleFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'stepDiscount')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [error, setError] = useState('')

  const [target, setTarget] = useState<ItemSelector>(
    initial?.kind === 'stepDiscount' || initial?.kind === 'bundlePrice'
      ? initial.target
      : emptySelector,
  )

  const [startFromNth, setStartFromNth] = useState(
    initial?.kind === 'stepDiscount' ? String(initial.startFromNth) : '2',
  )
  const [discountKind, setDiscountKind] = useState<'flat' | 'percent'>(
    initial?.kind === 'stepDiscount' ? initial.discount.kind : 'flat',
  )
  const [discountValue, setDiscountValue] = useState(
    initial?.kind === 'stepDiscount'
      ? String(
          initial.discount.kind === 'flat'
            ? initial.discount.amount
            : initial.discount.percent,
        )
      : '',
  )

  const [bundleSize, setBundleSize] = useState(
    initial?.kind === 'bundlePrice' ? String(initial.bundleSize) : '3',
  )
  const [bundlePrice, setBundlePrice] = useState(
    initial?.kind === 'bundlePrice' || initial?.kind === 'comboBundle'
      ? String(initial.bundlePrice)
      : '',
  )

  const [components, setComponents] = useState<ComponentDraft[]>(
    initial?.kind === 'comboBundle'
      ? initial.components.map((component) => ({
          target: component.target,
          qtyText: String(component.qty),
        }))
      : [
          { target: emptySelector, qtyText: '1' },
          { target: emptySelector, qtyText: '1' },
        ],
  )

  const [triggerEnabled, setTriggerEnabled] = useState(Boolean(initial?.trigger))
  const [triggerSelector, setTriggerSelector] = useState<ItemSelector>(
    initial?.trigger?.selector ?? emptySelector,
  )
  const [triggerMinQty, setTriggerMinQty] = useState(
    initial?.trigger?.minQty ? String(initial.trigger.minQty) : '1',
  )

  function updateComponentTarget(index: number, nextTarget: ItemSelector) {
    setComponents((prev) =>
      prev.map((component, i) => (i === index ? { ...component, target: nextTarget } : component)),
    )
  }

  function updateComponentQty(index: number, qtyText: string) {
    setComponents((prev) =>
      prev.map((component, i) => (i === index ? { ...component, qtyText } : component)),
    )
  }

  function addComponent() {
    setComponents((prev) => [...prev, { target: emptySelector, qtyText: '1' }])
  }

  function removeComponent(index: number) {
    setComponents((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)))
  }

  function handleSubmit() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('יש להזין שם למבצע')
      return
    }

    const trigger =
      triggerEnabled && !selectorIsEmpty(triggerSelector)
        ? {
            selector: triggerSelector,
            minQty: Math.max(1, Number(triggerMinQty) || 1),
          }
        : undefined

    if (kind === 'stepDiscount') {
      if (selectorIsEmpty(target)) {
        setError('יש לבחור לפחות קטגוריה, תווית או פריט עבור ההנחה')
        return
      }
      const startNum = Number(startFromNth)
      const valueNum = Number(discountValue)
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
        kind: 'stepDiscount',
        name: trimmedName,
        enabled,
        trigger,
        target,
        startFromNth: startNum,
        discount:
          discountKind === 'flat'
            ? { kind: 'flat', amount: valueNum }
            : { kind: 'percent', percent: valueNum },
      })
      return
    }

    if (kind === 'bundlePrice') {
      if (selectorIsEmpty(target)) {
        setError('יש לבחור לפחות קטגוריה, תווית או פריט עבור ההנחה')
        return
      }
      const sizeNum = Number(bundleSize)
      const priceNum = Number(bundlePrice)
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
        target,
        bundleSize: sizeNum,
        bundlePrice: priceNum,
      })
      return
    }

    // kind === 'comboBundle'
    const priceNum = Number(bundlePrice)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('מחיר הקומבו לא יכול להיות שלילי')
      return
    }
    if (components.length < 2) {
      setError('יש להוסיף לפחות שני רכיבים לקומבו')
      return
    }
    const parsedComponents: ComboComponent[] = []
    for (const component of components) {
      if (selectorIsEmpty(component.target)) {
        setError('יש לבחור יעד לכל רכיב בקומבו')
        return
      }
      const qtyNum = Number(component.qtyText)
      if (!Number.isInteger(qtyNum) || qtyNum < 1) {
        setError('כמות הרכיב חייבת להיות מספר שלם 1 ומעלה')
        return
      }
      parsedComponents.push({ target: component.target, qty: qtyNum })
    }
    setError('')
    onSave({
      kind: 'comboBundle',
      name: trimmedName,
      enabled,
      trigger,
      components: parsedComponents,
      bundlePrice: priceNum,
    })
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="block text-sm text-muted">שם המבצע</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-muted">סוג המבצע</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
        >
          <option value="stepDiscount">הנחה מדורגת</option>
          <option value="bundlePrice">מחיר חבילה</option>
          <option value="comboBundle">קומבו (כמה דברים שונים יחד)</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          {kind === 'stepDiscount' &&
            'הנחה על כל פריט החל ממספר מסוים באותה קבוצה. לדוגמה: "מפריט מס\' 2 ואילך בקטגוריית אוסף — 5₪ הנחה" (הפריט הראשון במחיר מלא, מהשני והלאה בהנחה).'}
          {kind === 'bundlePrice' &&
            'מחיר קבוע לכמות פריטים יחד מאותה קבוצה. לדוגמה: "3 פריטים מקטגוריית אוסף ב-25₪" — כל שלשה שלמה מהקבוצה תחויב ב-25₪ בסך הכול במקום המחיר המקורי.'}
          {kind === 'comboBundle' &&
            'מחיר קבוע לשילוב של דברים שונים יחד, כל אחד בכמות משלו. לדוגמה: "פריט אחד עם תווית \'שעטנז\' + פריט אחד מקטגוריית אוסף ב-30₪".'}
        </p>
      </div>

      {kind !== 'comboBundle' && (
        <div className="space-y-3 rounded border border-line bg-subtle p-2">
          <div>
            <span className="block text-sm text-muted">על מה חלה ההנחה</span>
            <div className="mt-1">
              <TargetPicker
                categories={categories}
                labels={labels}
                items={items}
                value={target}
                onChange={setTarget}
              />
            </div>
          </div>

          {kind === 'stepDiscount' && (
            <>
              <div>
                <label className="block text-sm text-muted">החל מפריט מספר</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={startFromNth}
                  onChange={(e) => setStartFromNth(e.target.value)}
                  className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-muted">סוג הנחה</label>
                  <select
                    value={discountKind}
                    onChange={(e) => setDiscountKind(e.target.value as 'flat' | 'percent')}
                    className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
                  >
                    <option value="flat">סכום קבוע (₪)</option>
                    <option value="percent">אחוז (%)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-muted">
                    {discountKind === 'flat' ? 'סכום ההנחה (₪)' : 'אחוז ההנחה (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {kind === 'bundlePrice' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm text-muted">גודל חבילה (יחידות)</label>
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={bundleSize}
                  onChange={(e) => setBundleSize(e.target.value)}
                  className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-muted">מחיר חבילה (₪)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {kind === 'comboBundle' && (
        <div className="space-y-3 rounded border border-line bg-subtle p-2">
          {components.map((component, index) => (
            <div key={index} className="space-y-2 rounded border border-line-strong p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">רכיב {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeComponent(index)}
                  disabled={components.length <= 2}
                  className="h-9 w-9 shrink-0 rounded border border-danger-300 text-sm text-danger-600 transition-colors hover:bg-danger-300/30 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="הסרת רכיב"
                >
                  ✕
                </button>
              </div>
              <TargetPicker
                categories={categories}
                labels={labels}
                items={items}
                value={component.target}
                onChange={(nextTarget) => updateComponentTarget(index, nextTarget)}
              />
              <div>
                <label className="block text-sm text-muted">כמות נדרשת</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={component.qtyText}
                  onChange={(e) => updateComponentQty(index, e.target.value)}
                  className="mt-1 w-24 rounded border border-line-strong px-2 py-2 text-sm"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addComponent}
            className="rounded border border-line-strong px-3 py-2 text-sm transition-colors hover:bg-subtle"
          >
            + הוספת רכיב
          </button>

          <div>
            <label className="block text-sm text-muted">מחיר קומבו (₪)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={bundlePrice}
              onChange={(e) => setBundlePrice(e.target.value)}
              className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <div className="rounded border border-line bg-subtle p-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={triggerEnabled}
            onChange={(e) => setTriggerEnabled(e.target.checked)}
          />
          המבצע פעיל רק אם נקנה גם פריט מסוים
        </label>
        {triggerEnabled && (
          <div className="mt-2 space-y-2">
            <TargetPicker
              categories={categories}
              labels={labels}
              items={items}
              value={triggerSelector}
              onChange={setTriggerSelector}
            />
            <div>
              <label className="block text-sm text-muted">כמות מינימלית להפעלה</label>
              <input
                type="number"
                min="1"
                step="1"
                value={triggerMinQty}
                onChange={(e) => setTriggerMinQty(e.target.value)}
                className="mt-1 w-24 rounded border border-line-strong px-2 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        המבצע פעיל
      </label>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-2 text-sm text-muted"
        >
          ביטול
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          שמירה
        </button>
      </div>
    </div>
  )
}
