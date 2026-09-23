import type { ItemSelector } from './selector'

export type DiscountValue =
  | { kind: 'flat'; amount: number }
  | { kind: 'percent'; percent: number }

export interface TriggerCondition {
  selector: ItemSelector
  minQty?: number
}

interface DiscountRuleBase {
  id: string
  name: string
  enabled: boolean
  order: number
  trigger?: TriggerCondition
  // true (default): this discount can combine with other discounts on the
  // same items. false: items it discounts cannot also receive any other
  // discount — see evaluateSale in domain/pricing.ts for how conflicts
  // between exclusive rules are resolved.
  stackable: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface StepDiscountRule extends DiscountRuleBase {
  kind: 'stepDiscount'
  target: ItemSelector
  startFromNth: number
  discount: DiscountValue
}

export interface BundlePriceRule extends DiscountRuleBase {
  kind: 'bundlePrice'
  target: ItemSelector
  bundleSize: number
  bundlePrice: number
}

export interface ComboComponent {
  target: ItemSelector
  qty: number
}

export interface ComboBundleRule extends DiscountRuleBase {
  kind: 'comboBundle'
  components: ComboComponent[]
  bundlePrice: number
}

export type DiscountRule = StepDiscountRule | BundlePriceRule | ComboBundleRule

export type DiscountRuleDraft =
  | Omit<StepDiscountRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
  | Omit<BundlePriceRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
  | Omit<ComboBundleRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
