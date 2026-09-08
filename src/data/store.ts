import type { Category, CatalogItem } from '../types/catalog'
import type { DiscountRule } from '../types/discount'
import type { Label } from '../types/label'
import type { SaleRecord } from '../types/sale'
import { readJSON, writeJSON } from './localStorageDriver'

const CATEGORIES_KEY = 'categories'
const ITEMS_KEY = 'items'
const DISCOUNT_RULES_KEY = 'discountRules'
const LABELS_KEY = 'labels'
const SALE_RECORDS_KEY = 'saleRecords'

export function getCategories(): Category[] {
  return readJSON<Category[]>(CATEGORIES_KEY, [])
}

export function saveCategories(categories: Category[]): void {
  writeJSON(CATEGORIES_KEY, categories)
}

export function getItems(): CatalogItem[] {
  // labelIds was added after some items may have already been saved; default it.
  return readJSON<CatalogItem[]>(ITEMS_KEY, []).map((item) => ({
    ...item,
    labelIds: item.labelIds ?? [],
  }))
}

export function saveItems(items: CatalogItem[]): void {
  writeJSON(ITEMS_KEY, items)
}

export function getDiscountRules(): DiscountRule[] {
  return readJSON<DiscountRule[]>(DISCOUNT_RULES_KEY, [])
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
  return readJSON<SaleRecord[]>(SALE_RECORDS_KEY, [])
}

export function saveSaleRecords(records: SaleRecord[]): void {
  writeJSON(SALE_RECORDS_KEY, records)
}
