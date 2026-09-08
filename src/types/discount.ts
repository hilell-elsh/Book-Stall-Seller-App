export type DiscountValue =
  | { kind: 'flat'; amount: number }
  | { kind: 'percent'; percent: number }

export interface TriggerCondition {
  categoryIds: string[]
  minQty?: number
}

interface DiscountRuleBase {
  id: string
  name: string
  enabled: boolean
  order: number
  trigger?: TriggerCondition
  createdAt: string
  updatedAt: string
}

export interface CategoryStepRule extends DiscountRuleBase {
  kind: 'categoryStep'
  categoryId: string
  startFromNth: number
  discount: DiscountValue
}

export interface BundlePriceRule extends DiscountRuleBase {
  kind: 'bundlePrice'
  categoryIds: string[]
  bundleSize: number
  bundlePrice: number
}

export type DiscountRule = CategoryStepRule | BundlePriceRule

export type DiscountRuleDraft =
  | Omit<CategoryStepRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
  | Omit<BundlePriceRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
