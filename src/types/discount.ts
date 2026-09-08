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
  createdAt: string
  updatedAt: string
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

export type DiscountRule = StepDiscountRule | BundlePriceRule

export type DiscountRuleDraft =
  | Omit<StepDiscountRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
  | Omit<BundlePriceRule, 'id' | 'order' | 'createdAt' | 'updatedAt'>
