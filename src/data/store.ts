import type { Category, CatalogItem } from '../types/catalog'
import type { Creator } from '../types/creator'
import type { DiscountRule } from '../types/discount'
import type { Label } from '../types/label'
import type { PaymentMethod } from '../types/paymentMethod'
import type { SaleRecord } from '../types/sale'
import type { ItemSelector } from '../types/selector'
import { readJSON, writeJSON } from './localStorageDriver'

const CATEGORIES_KEY = 'categories'
const ITEMS_KEY = 'items'
const DISCOUNT_RULES_KEY = 'discountRules'
const LABELS_KEY = 'labels'
const SALE_RECORDS_KEY = 'saleRecords'
const PAYMENT_METHODS_KEY = 'paymentMethods'
const CREATORS_KEY = 'creators'

export function getCategories(): Category[] {
  return readJSON<Category[]>(CATEGORIES_KEY, [])
}

export function saveCategories(categories: Category[]): void {
  writeJSON(CATEGORIES_KEY, categories)
}

export function getItems(): CatalogItem[] {
  // labelIds/creatorShares were added after some items may have already been saved; default them.
  return readJSON<CatalogItem[]>(ITEMS_KEY, []).map((item) => ({
    ...item,
    labelIds: item.labelIds ?? [],
    creatorShares: item.creatorShares ?? [],
  }))
}

export function saveItems(items: CatalogItem[]): void {
  writeJSON(ITEMS_KEY, items)
}

// The old category/label selector shapes were merged into one 'filter' shape;
// normalize any rules saved before that change so they don't crash on load.
// creatorIds was added to 'filter' later, so default it too.
function normalizeSelector(raw: unknown): ItemSelector {
  const selector = raw as
    | { type?: string; categoryIds?: string[]; labelIds?: string[]; creatorIds?: string[] }
    | undefined
  if (selector?.type === 'category') {
    return { type: 'filter', categoryIds: selector.categoryIds ?? [], labelIds: [], creatorIds: [] }
  }
  if (selector?.type === 'label') {
    return { type: 'filter', categoryIds: [], labelIds: selector.labelIds ?? [], creatorIds: [] }
  }
  if (selector?.type === 'filter') {
    return {
      type: 'filter',
      categoryIds: selector.categoryIds ?? [],
      labelIds: selector.labelIds ?? [],
      creatorIds: selector.creatorIds ?? [],
    }
  }
  return selector as ItemSelector
}

function normalizeDiscountRule(raw: DiscountRule): DiscountRule {
  const rule = { ...raw } as DiscountRule & { target?: ItemSelector }
  if (rule.trigger) {
    rule.trigger = { ...rule.trigger, selector: normalizeSelector(rule.trigger.selector) }
  }
  if (rule.kind === 'stepDiscount' || rule.kind === 'bundlePrice') {
    rule.target = normalizeSelector(rule.target)
  }
  return rule
}

export function getDiscountRules(): DiscountRule[] {
  return readJSON<DiscountRule[]>(DISCOUNT_RULES_KEY, []).map(normalizeDiscountRule)
}

export function saveDiscountRules(rules: DiscountRule[]): void {
  writeJSON(DISCOUNT_RULES_KEY, rules)
}

export function getLabels(): Label[] {
  return readJSON<Label[]>(LABELS_KEY, [])
}

export function saveLabels(labels: Label[]): void {
  writeJSON(LABELS_KEY, labels)
}

export function getSaleRecords(): SaleRecord[] {
  // lineDiscount/creatorShares were added after some records may have already been saved; default them.
  return readJSON<SaleRecord[]>(SALE_RECORDS_KEY, []).map((record) => ({
    ...record,
    lines: record.lines.map((line) => ({
      ...line,
      lineDiscount: line.lineDiscount ?? 0,
      creatorShares: line.creatorShares ?? [],
    })),
  }))
}

export function saveSaleRecords(records: SaleRecord[]): void {
  writeJSON(SALE_RECORDS_KEY, records)
}

export function getPaymentMethods(): PaymentMethod[] {
  return readJSON<PaymentMethod[]>(PAYMENT_METHODS_KEY, [])
}

export function savePaymentMethods(methods: PaymentMethod[]): void {
  writeJSON(PAYMENT_METHODS_KEY, methods)
}

export function getCreators(): Creator[] {
  return readJSON<Creator[]>(CREATORS_KEY, [])
}

export function saveCreators(creators: Creator[]): void {
  writeJSON(CREATORS_KEY, creators)
}
