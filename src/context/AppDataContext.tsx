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
    changes: Partial<Pick<CatalogItem, 'name' | 'price' | 'categoryId'>>,
  ) => void
  deleteItem: (id: string) => void
  moveItem: (id: string, direction: 'up' | 'down') => void
  discountRules: DiscountRule[]
  addDiscountRule: (draft: DiscountRuleDraft) => void
  updateDiscountRule: (id: string, draft: DiscountRuleDraft) => void
  deleteDiscountRule: (id: string) => void
  toggleDiscountRule: (id: string) => void
  moveDiscountRule: (id: string, direction: 'up' | 'down') => void
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
      createdAt: now(),
      updatedAt: now(),
    }
    persistItems([...items, item])
  }

  function updateItem(
    id: string,
    changes: Partial<Pick<CatalogItem, 'name' | 'price' | 'categoryId'>>,
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
      discountRules: sortByOrder(discountRules),
      addDiscountRule,
      updateDiscountRule,
      deleteDiscountRule,
      toggleDiscountRule,
      moveDiscountRule,
    }),
    [categories, items, discountRules],
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
