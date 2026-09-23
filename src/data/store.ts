import type { Category, CatalogItem } from '../types/catalog'
import type { Creator } from '../types/creator'
import type { DiscountRule } from '../types/discount'
import type { Label } from '../types/label'
import type { PaymentMethod } from '../types/paymentMethod'
import type { SaleRecord } from '../types/sale'
import type { ItemSelector } from '../types/selector'
import type { ShiftSeller } from '../domain/shiftSeller'
import type { OutboxOp } from '../sync/outbox'
import { readJSON, writeJSON } from './localStorageDriver'

const CATEGORIES_KEY = 'categories'
const ITEMS_KEY = 'items'
const DISCOUNT_RULES_KEY = 'discountRules'
const LABELS_KEY = 'labels'
const SALE_RECORDS_KEY = 'saleRecords'
const PAYMENT_METHODS_KEY = 'paymentMethods'
const CREATORS_KEY = 'creators'
const EVENT_NAME_KEY = 'eventName'
const SYNC_OUTBOX_KEY = 'syncOutbox'
const SHIFT_SELLER_KEY = 'shiftSeller'

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
  // stackable was added after some rules may have already been saved; default
  // to true so existing rules keep behaving exactly as they did before.
  rule.stackable = rule.stackable ?? true
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
  // eventName/lineDiscount/creatorShares were added after some records may have already been saved; default them.
  return readJSON<SaleRecord[]>(SALE_RECORDS_KEY, []).map((record) => ({
    ...record,
    eventName: record.eventName ?? '',
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

export interface EventNameRecord {
  name: string
  updatedAt: string
}

// Pre-Phase-2 data stored a bare string with no updatedAt; normalize it into
// the timestamped shape LWW sync needs, same "default on read" convention as
// every other field added to a persisted type. The epoch timestamp means any
// real remote value will always be treated as newer.
export function getEventName(): EventNameRecord {
  const raw = readJSON<string | EventNameRecord>(EVENT_NAME_KEY, { name: '', updatedAt: new Date(0).toISOString() })
  if (typeof raw === 'string') {
    return { name: raw, updatedAt: new Date(0).toISOString() }
  }
  return raw
}

export function saveEventName(record: EventNameRecord): void {
  writeJSON(EVENT_NAME_KEY, record)
}

// Sync bookkeeping only — private/device-local, never itself synced (same
// bucket as deviceId and the stall PIN session).
export function getSyncOutbox(): OutboxOp[] {
  return readJSON<OutboxOp[]>(SYNC_OUTBOX_KEY, [])
}

export function saveSyncOutbox(ops: OutboxOp[]): void {
  writeJSON(SYNC_OUTBOX_KEY, ops)
}

// Private, device-local "who's on shift here" setting (see
// domain/shiftSeller.ts) — same bucket as deviceId/syncOutbox: never wired
// into AppDataContext's persistX/outbox path, so it never syncs.
export function getShiftSeller(): ShiftSeller | null {
  const raw = readJSON<ShiftSeller | null>(SHIFT_SELLER_KEY, null)
  // ShiftSeller briefly shipped as { creatorId, setAt } before switching to
  // plain free text ({ name, setAt }); a device that set it under the old
  // shape would otherwise read back a name-less object. Never migrated (it's
  // private/local-only, low stakes) — just degrade to unset.
  return raw && typeof raw.name === 'string' ? raw : null
}

export function saveShiftSeller(shiftSeller: ShiftSeller | null): void {
  writeJSON(SHIFT_SELLER_KEY, shiftSeller)
}
