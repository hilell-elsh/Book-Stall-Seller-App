import { CategoryManager } from './CategoryManager'
import { DiscountRuleManager } from './DiscountRuleManager'
import { ItemManager } from './ItemManager'
import { LabelManager } from './LabelManager'
import { PaymentMethodManager } from './PaymentMethodManager'

export function ConfigPage() {
  return (
    <div className="mx-auto max-w-2xl p-4 pb-8">
      <h1 className="text-lg font-semibold">הגדרות</h1>
      <div className="mt-3 space-y-6">
        <CategoryManager />
        <LabelManager />
        <ItemManager />
        <DiscountRuleManager />
        <PaymentMethodManager />
      </div>
    </div>
  )
}
