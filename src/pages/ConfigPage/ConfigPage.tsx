import { CategoryManager } from './CategoryManager'
import { DiscountRuleManager } from './DiscountRuleManager'
import { ItemManager } from './ItemManager'
import { LabelManager } from './LabelManager'

export function ConfigPage() {
  return (
    <div className="p-4 pb-8">
      <h1 className="text-lg font-semibold">הגדרות</h1>
      <div className="mt-3">
        <CategoryManager />
        <LabelManager />
        <ItemManager />
        <DiscountRuleManager />
      </div>
    </div>
  )
}
