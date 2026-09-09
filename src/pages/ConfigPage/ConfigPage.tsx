import { useState } from 'react'
import { CategoryManager } from './CategoryManager'
import { CreatorManager } from './CreatorManager'
import { DiscountRuleManager } from './DiscountRuleManager'
import { ItemManager } from './ItemManager'
import { LabelManager } from './LabelManager'
import { PaymentMethodManager } from './PaymentMethodManager'

type Section = 'items' | 'discounts' | 'categories' | 'labels' | 'payments' | 'creators'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'items', label: 'פריטים' },
  { id: 'discounts', label: 'מבצעים' },
  { id: 'categories', label: 'קטגוריות' },
  { id: 'labels', label: 'תוויות' },
  { id: 'payments', label: 'אמצעי תשלום' },
  { id: 'creators', label: 'יוצרים' },
]

export function ConfigPage() {
  const [section, setSection] = useState<Section>('items')

  return (
    <div className="mx-auto max-w-2xl p-4 pb-8">
      <h1 className="text-lg font-semibold">הגדרות</h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`flex min-h-9 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors ${
              section === s.id
                ? 'border-accent-600 bg-accent-600 text-white'
                : 'border-line-strong text-ink hover:bg-subtle'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {section === 'items' && <ItemManager />}
        {section === 'discounts' && <DiscountRuleManager />}
        {section === 'categories' && <CategoryManager />}
        {section === 'labels' && <LabelManager />}
        {section === 'payments' && <PaymentMethodManager />}
        {section === 'creators' && <CreatorManager />}
      </div>
    </div>
  )
}
