import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { newId } from '../domain/ids'
import * as store from '../data/store'
import type { EventNameRecord } from '../data/store'
import { applyCategoryTombstone, applyCreatorTombstone, applyLabelTombstone, isLive } from '../domain/cascade'
import { enqueue, enqueueSingleton } from '../sync/outbox'
import { findLocalWins, mergeRows, resolveLastWriteWins } from '../sync/merge'
import { startSyncPull } from '../sync/pull'
import type { Category, CatalogItem, CreatorShare } from '../types/catalog'
import type { Creator } from '../types/creator'
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
    changes: Partial<
      Pick<CatalogItem, 'name' | 'price' | 'categoryId' | 'labelIds' | 'active' | 'creatorShares'>
    >,
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
  toggleItemActive: (itemId: string) => void
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
  creators: Creator[]
  addCreator: (name: string) => void
  renameCreator: (id: string, name: string) => void
  deleteCreator: (id: string) => void
  setItemCreatorShares: (itemId: string, shares: CreatorShare[]) => void
  eventName: string
  setEventName: (name: string) => void
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
  const [creators, setCreators] = useState<Creator[]>(() => store.getCreators())
  const [eventNameRecord, setEventNameRecord] = useState<EventNameRecord>(() => store.getEventName())

  // Mirrors the latest state outside React's setState updaters. The pull
  // handlers below need it: they can't use the functional setState form
  // (`setX(current => ...)`) to read "current", because they also need to
  // call enqueue() as a side effect when local wins a merge (see below), and
  // StrictMode intentionally double-invokes updater functions in dev to
  // catch impure ones — that would double-push the same correction. Reading
  // from a ref keeps the side effect in a plain function body instead.
  const latestRef = useRef({
    categories,
    items,
    discountRules,
    labels,
    saleRecords,
    paymentMethods,
    creators,
    eventNameRecord,
  })
  useEffect(() => {
    latestRef.current = {
      categories,
      items,
      discountRules,
      labels,
      saleRecords,
      paymentMethods,
      creators,
      eventNameRecord,
    }
  })

  // Inbound path: another device's push arrives here via Firestore's own
  // snapshot listeners (see sync/pull.ts). Firestore's stored document is
  // just whatever setDoc() last overwrote it with — decided by network
  // arrival order, not by updatedAt — so a real LWW guarantee only holds if,
  // whenever this merge picks the local row over a stale/racing remote one,
  // that winning row gets pushed back to correct Firestore too. Without
  // this, two devices that raced offline could disagree forever, surviving
  // refreshes, since neither's "locally correct" view ever overwrites the
  // other's stale server copy.
  useEffect(() => {
    function applyRemoteRows<T extends { id: string; updatedAt: string }>(
      entity: string,
      current: T[],
      remoteRows: T[],
      setState: (rows: T[]) => void,
      saveState: (rows: T[]) => void,
    ): void {
      const merged = mergeRows(current, remoteRows)
      saveState(merged)
      setState(merged)
      const corrections = findLocalWins(remoteRows, merged)
      if (corrections.length > 0) enqueue(entity, remoteRows, corrections)
    }

    return startSyncPull({
      categories: (rows) =>
        applyRemoteRows('categories', latestRef.current.categories, rows, setCategories, store.saveCategories),
      items: (rows) => applyRemoteRows('items', latestRef.current.items, rows, setItems, store.saveItems),
      discountRules: (rows) =>
        applyRemoteRows(
          'discountRules',
          latestRef.current.discountRules,
          rows,
          setDiscountRules,
          store.saveDiscountRules,
        ),
      labels: (rows) => applyRemoteRows('labels', latestRef.current.labels, rows, setLabels, store.saveLabels),
      saleRecords: (rows) =>
        applyRemoteRows('saleRecords', latestRef.current.saleRecords, rows, setSaleRecords, store.saveSaleRecords),
      paymentMethods: (rows) =>
        applyRemoteRows(
          'paymentMethods',
          latestRef.current.paymentMethods,
          rows,
          setPaymentMethods,
          store.savePaymentMethods,
        ),
      creators: (rows) =>
        applyRemoteRows('creators', latestRef.current.creators, rows, setCreators, store.saveCreators),
      eventName: (record) => {
        const merged = resolveLastWriteWins(latestRef.current.eventNameRecord, record)
        store.saveEventName(merged)
        setEventNameRecord(merged)
        if (merged !== record) enqueueSingleton('eventName', 'main', record, merged)
      },
    })
  }, [])

  function persistCategories(next: Category[]) {
    enqueue('categories', categories, next)
    setCategories(next)
    store.saveCategories(next)
  }

  function persistItems(next: CatalogItem[]) {
    enqueue('items', items, next)
    setItems(next)
    store.saveItems(next)
  }

  function persistDiscountRules(next: DiscountRule[]) {
    enqueue('discountRules', discountRules, next)
    setDiscountRules(next)
    store.saveDiscountRules(next)
  }

  function persistLabels(next: Label[]) {
    enqueue('labels', labels, next)
    setLabels(next)
    store.saveLabels(next)
  }

  function persistSaleRecords(next: SaleRecord[]) {
    enqueue('saleRecords', saleRecords, next)
    setSaleRecords(next)
    store.saveSaleRecords(next)
  }

  function persistPaymentMethods(next: PaymentMethod[]) {
    enqueue('paymentMethods', paymentMethods, next)
    setPaymentMethods(next)
    store.savePaymentMethods(next)
  }

  function persistCreators(next: Creator[]) {
    enqueue('creators', creators, next)
    setCreators(next)
    store.saveCreators(next)
  }

  function addCategory(name: string) {
    const liveCategories = categories.filter(isLive)
    const nextOrder = liveCategories.length
      ? Math.max(...liveCategories.map((c) => c.order)) + 1
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

  // Soft-delete: the category row and its items stay, tombstoned via
  // deletedAt, so a pulled delete never leaves another device's concurrent
  // edit pointing at a vanished id (see cascade.ts).
  function deleteCategory(id: string) {
    const deletedAt = now()
    persistCategories(
      categories.map((c) => (c.id === id ? { ...c, deletedAt } : c)),
    )
    const cascaded = applyCategoryTombstone(items, id, deletedAt)
    persistItems(cascaded.map((item, i) => (item !== items[i] ? { ...item, updatedAt: deletedAt } : item)))
  }

  function moveCategory(id: string, direction: 'up' | 'down') {
    const tombstoned = categories.filter((c) => !isLive(c))
    persistCategories([...reorder(categories.filter(isLive), id, direction), ...tombstoned])
  }

  function addItem(categoryId: string, name: string, price: number) {
    const liveSiblings = items.filter((item) => item.categoryId === categoryId && isLive(item))
    const nextOrder = liveSiblings.length
      ? Math.max(...liveSiblings.map((item) => item.order)) + 1
      : 0
    const item: CatalogItem = {
      id: newId(),
      categoryId,
      name,
      price,
      order: nextOrder,
      active: true,
      labelIds: [],
      creatorShares: [],
      createdAt: now(),
      updatedAt: now(),
    }
    persistItems([...items, item])
  }

  function updateItem(
    id: string,
    changes: Partial<
      Pick<CatalogItem, 'name' | 'price' | 'categoryId' | 'labelIds' | 'active' | 'creatorShares'>
    >,
  ) {
    persistItems(
      items.map((item) =>
        item.id === id ? { ...item, ...changes, updatedAt: now() } : item,
      ),
    )
  }

  function deleteItem(id: string) {
    persistItems(items.map((item) => (item.id === id ? { ...item, deletedAt: now() } : item)))
  }

  function changeItemCategory(id: string, categoryId: string) {
    const item = items.find((entry) => entry.id === id)
    if (!item || item.categoryId === categoryId) return
    const liveSiblings = items.filter((entry) => entry.categoryId === categoryId && isLive(entry))
    const nextOrder = liveSiblings.length
      ? Math.max(...liveSiblings.map((entry) => entry.order)) + 1
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
    const liveSiblings = items.filter((entry) => entry.categoryId === item.categoryId && isLive(entry))
    const others = items.filter((entry) => entry.categoryId !== item.categoryId || !isLive(entry))
    persistItems([...others, ...reorder(liveSiblings, id, direction)])
  }

  function addDiscountRule(draft: DiscountRuleDraft) {
    const liveRules = discountRules.filter(isLive)
    const nextOrder = liveRules.length
      ? Math.max(...liveRules.map((rule) => rule.order)) + 1
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
    persistDiscountRules(
      discountRules.map((rule) => (rule.id === id ? { ...rule, deletedAt: now() } : rule)),
    )
  }

  function toggleDiscountRule(id: string) {
    persistDiscountRules(
      discountRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled, updatedAt: now() } : rule,
      ),
    )
  }

  function moveDiscountRule(id: string, direction: 'up' | 'down') {
    const tombstoned = discountRules.filter((rule) => !isLive(rule))
    persistDiscountRules([...reorder(discountRules.filter(isLive), id, direction), ...tombstoned])
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
    const deletedAt = now()
    persistLabels(labels.map((label) => (label.id === id ? { ...label, deletedAt } : label)))
    // Unlink rather than cascade-delete: removing a label shouldn't remove the items wearing it.
    const unlinked = applyLabelTombstone(items, id)
    persistItems(unlinked.map((item, i) => (item !== items[i] ? { ...item, updatedAt: deletedAt } : item)))
  }

  function toggleItemLabel(itemId: string, labelId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const nextLabelIds = item.labelIds.includes(labelId)
      ? item.labelIds.filter((id) => id !== labelId)
      : [...item.labelIds, labelId]
    updateItem(itemId, { labelIds: nextLabelIds })
  }

  function toggleItemActive(itemId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    updateItem(itemId, { active: !item.active })
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
    persistSaleRecords(
      saleRecords.map((record) => (record.id === id ? { ...record, deletedAt: now() } : record)),
    )
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
    persistPaymentMethods(
      paymentMethods.map((method) => (method.id === id ? { ...method, deletedAt: now() } : method)),
    )
  }

  function addCreator(name: string) {
    const creator: Creator = { id: newId(), name, createdAt: now(), updatedAt: now() }
    persistCreators([...creators, creator])
  }

  function renameCreator(id: string, name: string) {
    persistCreators(
      creators.map((creator) => (creator.id === id ? { ...creator, name, updatedAt: now() } : creator)),
    )
  }

  function deleteCreator(id: string) {
    const deletedAt = now()
    persistCreators(creators.map((creator) => (creator.id === id ? { ...creator, deletedAt } : creator)))
    // Unlink rather than block: removing a creator shouldn't strand an item's remaining shares.
    const unlinked = applyCreatorTombstone(items, id)
    persistItems(unlinked.map((item, i) => (item !== items[i] ? { ...item, updatedAt: deletedAt } : item)))
  }

  function setItemCreatorShares(itemId: string, shares: CreatorShare[]) {
    updateItem(itemId, { creatorShares: shares })
  }

  function setEventName(name: string) {
    const next: EventNameRecord = { name, updatedAt: now() }
    enqueueSingleton('eventName', 'main', eventNameRecord, next)
    setEventNameRecord(next)
    store.saveEventName(next)
  }

  const value = useMemo<AppDataContextValue>(
    () => ({
      categories: sortByOrder(categories.filter(isLive)),
      items: sortByOrder(items.filter(isLive)),
      addCategory,
      renameCategory,
      deleteCategory,
      moveCategory,
      addItem,
      updateItem,
      deleteItem,
      moveItem,
      changeItemCategory,
      discountRules: sortByOrder(discountRules.filter(isLive)),
      addDiscountRule,
      updateDiscountRule,
      deleteDiscountRule,
      toggleDiscountRule,
      moveDiscountRule,
      labels: labels.filter(isLive),
      addLabel,
      renameLabel,
      deleteLabel,
      toggleItemLabel,
      toggleItemActive,
      saleRecords: saleRecords.filter(isLive),
      addSaleRecord,
      updateSaleRecord,
      deleteSaleRecord,
      paymentMethods: paymentMethods.filter(isLive),
      addPaymentMethod,
      renamePaymentMethod,
      deletePaymentMethod,
      creators: creators.filter(isLive),
      addCreator,
      renameCreator,
      deleteCreator,
      setItemCreatorShares,
      eventName: eventNameRecord.name,
      setEventName,
    }),
    [categories, items, discountRules, labels, saleRecords, paymentMethods, creators, eventNameRecord],
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
