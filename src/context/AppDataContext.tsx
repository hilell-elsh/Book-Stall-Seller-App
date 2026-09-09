import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { newId } from '../domain/ids'
import * as store from '../data/store'
import type { Category, CatalogItem } from '../types/catalog'
import type { DiscountRule, DiscountRuleDraft } from '../types/discount'
import type { Label } from '../types/label'
import type { PaymentMethod } from '../types/paymentMethod'
import type { SaleRecord } from '../types/sale'

interface AppDataContextValue {
  categories: Category[]
  items: CatalogItem[]
  addCategory: (name: string) => void
  renameCategory: (id: string, name: string) => void
  deleteCategory: (id: string) => void
  moveCategory: (id: string, direction: 'up' | 'down') => void
  addItem: (categoryId: string, name: string, price: number) => void
  updateItem: (
    id: string,
    changes: Partial<Pick<CatalogItem, 'name' | 'price' | 'categoryId' | 'labelIds'>>,
  ) => void
  deleteItem: (id: string) => void
  moveItem: (id: string, direction: 'up' | 'down') => void
  changeItemCategory: (id: string, categoryId: string) => void
  discountRules: DiscountRule[]
  addDiscountRule: (draft: DiscountRuleDraft) => void
  updateDiscountRule: (id: string, draft: DiscountRuleDraft) => void
  deleteDiscountRule: (id: string) => void
  toggleDiscountRule: (id: string) => void
  moveDiscountRule: (id: string, direction: 'up' | 'down') => void
  labels: Label[]
  addLabel: (name: string) => void
  renameLabel: (id: string, name: string) => void
  deleteLabel: (id: string) => void
  toggleItemLabel: (itemId: string, labelId: string) => void
  saleRecords: SaleRecord[]
  addSaleRecord: (record: Omit<SaleRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSaleRecord: (
    id: string,
    record: Omit<SaleRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void
  deleteSaleRecord: (id: string) => void
  paymentMethods: PaymentMethod[]
  addPaymentMethod: (name: string) => void
  renamePaymentMethod: (id: string, name: string) => void
  deletePaymentMethod: (id: string) => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function now(): string {
  return new Date().toISOString()
}

function sortByOrder<T extends { order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.order - b.order)
}

function reorder<T extends { id: string; order: number }>(
  list: T[],
  id: string,
  direction: 'up' | 'down',
): T[] {
  const sorted = sortByOrder(list)
  const index = sorted.findIndex((entry) => entry.id === id)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapWith < 0 || swapWith >= sorted.length) return list

  const result = [...sorted]
  const indexOrder = result[index].order
  const swapWithOrder = result[swapWith].order
  result[index] = { ...result[index], order: swapWithOrder }
  result[swapWith] = { ...result[swapWith], order: indexOrder }
  return result
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(() =>
    sortByOrder(store.getCategories()),
  )
  const [items, setItems] = useState<CatalogItem[]>(() =>
    sortByOrder(store.getItems()),
  )
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() =>
    sortByOrder(store.getDiscountRules()),
  )
  const [labels, setLabels] = useState<Label[]>(() => store.getLabels())
  const [saleRecords, setSaleRecords] = useState<SaleRecord[]>(() => store.getSaleRecords())
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() =>
    store.getPaymentMethods(),
  )

  function persistCategories(next: Category[]) {
    setCategories(next)
    store.saveCategories(next)
  }

  function persistItems(next: CatalogItem[]) {
    setItems(next)
    store.saveItems(next)
  }

  function persistDiscountRules(next: DiscountRule[]) {
    setDiscountRules(next)
    store.saveDiscountRules(next)
  }

  function persistLabels(next: Label[]) {
    setLabels(next)
    store.saveLabels(next)
  }

  function persistSaleRecords(next: SaleRecord[]) {
    setSaleRecords(next)
    store.saveSaleRecords(next)
  }

  function persistPaymentMethods(next: PaymentMethod[]) {
    setPaymentMethods(next)
    store.savePaymentMethods(next)
  }

  function addCategory(name: string) {
    const nextOrder = categories.length
      ? Math.max(...categories.map((c) => c.order)) + 1
      : 0
    const category: Category = {
      id: newId(),
      name,
      order: nextOrder,
      createdAt: now(),
      updatedAt: now(),
    }
    persistCategories([...categories, category])
  }

  function renameCategory(id: string, name: string) {
    persistCategories(
      categories.map((c) => (c.id === id ? { ...c, name, updatedAt: now() } : c)),
    )
  }

  function deleteCategory(id: string) {
    persistCategories(categories.filter((c) => c.id !== id))
    persistItems(items.filter((item) => item.categoryId !== id))
  }

  function moveCategory(id: string, direction: 'up' | 'down') {
    persistCategories(reorder(categories, id, direction))
  }

  function addItem(categoryId: string, name: string, price: number) {
    const siblings = items.filter((item) => item.categoryId === categoryId)
    const nextOrder = siblings.length
      ? Math.max(...siblings.map((item) => item.order)) + 1
      : 0
    const item: CatalogItem = {
      id: newId(),
      categoryId,
      name,
      price,
      order: nextOrder,
      active: true,
      labelIds: [],
      createdAt: now(),
      updatedAt: now(),
    }
    persistItems([...items, item])
  }

  function updateItem(
    id: string,
    changes: Partial<Pick<CatalogItem, 'name' | 'price' | 'categoryId' | 'labelIds'>>,
  ) {
    persistItems(
      items.map((item) =>
        item.id === id ? { ...item, ...changes, updatedAt: now() } : item,
      ),
    )
  }

  function deleteItem(id: string) {
    persistItems(items.filter((item) => item.id !== id))
  }

  function changeItemCategory(id: string, categoryId: string) {
    const item = items.find((entry) => entry.id === id)
    if (!item || item.categoryId === categoryId) return
    const siblings = items.filter((entry) => entry.categoryId === categoryId)
    const nextOrder = siblings.length
      ? Math.max(...siblings.map((entry) => entry.order)) + 1
      : 0
    persistItems(
      items.map((entry) =>
        entry.id === id
          ? { ...entry, categoryId, order: nextOrder, updatedAt: now() }
          : entry,
      ),
    )
  }

  function moveItem(id: string, direction: 'up' | 'down') {
    const item = items.find((entry) => entry.id === id)
    if (!item) return
    const siblings = items.filter((entry) => entry.categoryId === item.categoryId)
    const others = items.filter((entry) => entry.categoryId !== item.categoryId)
    persistItems([...others, ...reorder(siblings, id, direction)])
  }

  function addDiscountRule(draft: DiscountRuleDraft) {
    const nextOrder = discountRules.length
      ? Math.max(...discountRules.map((rule) => rule.order)) + 1
      : 0
    const rule = {
      ...draft,
      id: newId(),
      order: nextOrder,
      createdAt: now(),
      updatedAt: now(),
    } as DiscountRule
    persistDiscountRules([...discountRules, rule])
  }

  function updateDiscountRule(id: string, draft: DiscountRuleDraft) {
    persistDiscountRules(
      discountRules.map((rule) =>
        rule.id === id
          ? ({
              ...draft,
              id: rule.id,
              order: rule.order,
              createdAt: rule.createdAt,
              updatedAt: now(),
            } as DiscountRule)
          : rule,
      ),
    )
  }

  function deleteDiscountRule(id: string) {
    persistDiscountRules(discountRules.filter((rule) => rule.id !== id))
  }

  function toggleDiscountRule(id: string) {
    persistDiscountRules(
      discountRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled, updatedAt: now() } : rule,
      ),
    )
  }

  function moveDiscountRule(id: string, direction: 'up' | 'down') {
    persistDiscountRules(reorder(discountRules, id, direction))
  }

  function addLabel(name: string) {
    const label: Label = { id: newId(), name, createdAt: now(), updatedAt: now() }
    persistLabels([...labels, label])
  }

  function renameLabel(id: string, name: string) {
    persistLabels(
      labels.map((label) => (label.id === id ? { ...label, name, updatedAt: now() } : label)),
    )
  }

  function deleteLabel(id: string) {
    persistLabels(labels.filter((label) => label.id !== id))
    // Unlink rather than cascade-delete: removing a label shouldn't remove the items wearing it.
    persistItems(
      items.map((item) =>
        item.labelIds.includes(id)
          ? { ...item, labelIds: item.labelIds.filter((labelId) => labelId !== id), updatedAt: now() }
          : item,
      ),
    )
  }

  function toggleItemLabel(itemId: string, labelId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const nextLabelIds = item.labelIds.includes(labelId)
      ? item.labelIds.filter((id) => id !== labelId)
      : [...item.labelIds, labelId]
    updateItem(itemId, { labelIds: nextLabelIds })
  }

  function addSaleRecord(record: Omit<SaleRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const saleRecord: SaleRecord = {
      ...record,
      id: newId(),
      createdAt: now(),
      updatedAt: now(),
    }
    persistSaleRecords([...saleRecords, saleRecord])
  }

  function updateSaleRecord(
    id: string,
    record: Omit<SaleRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    persistSaleRecords(
      saleRecords.map((entry) =>
        entry.id === id ? { ...entry, ...record, updatedAt: now() } : entry,
      ),
    )
  }

  function deleteSaleRecord(id: string) {
    persistSaleRecords(saleRecords.filter((record) => record.id !== id))
  }

  function addPaymentMethod(name: string) {
    const method: PaymentMethod = { id: newId(), name, createdAt: now(), updatedAt: now() }
    persistPaymentMethods([...paymentMethods, method])
  }

  function renamePaymentMethod(id: string, name: string) {
    persistPaymentMethods(
      paymentMethods.map((method) =>
        method.id === id ? { ...method, name, updatedAt: now() } : method,
      ),
    )
  }

  function deletePaymentMethod(id: string) {
    persistPaymentMethods(paymentMethods.filter((method) => method.id !== id))
  }

  const value = useMemo<AppDataContextValue>(
    () => ({
      categories: sortByOrder(categories),
      items: sortByOrder(items),
      addCategory,
      renameCategory,
      deleteCategory,
      moveCategory,
      addItem,
      updateItem,
      deleteItem,
      moveItem,
      changeItemCategory,
      discountRules: sortByOrder(discountRules),
      addDiscountRule,
      updateDiscountRule,
      deleteDiscountRule,
      toggleDiscountRule,
      moveDiscountRule,
      labels,
      addLabel,
      renameLabel,
      deleteLabel,
      toggleItemLabel,
      saleRecords,
      addSaleRecord,
      updateSaleRecord,
      deleteSaleRecord,
      paymentMethods,
      addPaymentMethod,
      renamePaymentMethod,
      deletePaymentMethod,
    }),
    [categories, items, discountRules, labels, saleRecords, paymentMethods],
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
