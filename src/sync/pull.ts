import { collection, doc, onSnapshot } from 'firebase/firestore'
import type { EventNameRecord } from '../data/store'
import { getDb, isSyncConfigured } from './firebaseConfig'
import type { Category, CatalogItem } from '../types/catalog'
import type { Creator } from '../types/creator'
import type { DiscountRule } from '../types/discount'
import type { Label } from '../types/label'
import type { PaymentMethod } from '../types/paymentMethod'
import type { SaleRecord } from '../types/sale'

export interface PullHandlers {
  categories: (rows: Category[]) => void
  items: (rows: CatalogItem[]) => void
  discountRules: (rows: DiscountRule[]) => void
  labels: (rows: Label[]) => void
  saleRecords: (rows: SaleRecord[]) => void
  paymentMethods: (rows: PaymentMethod[]) => void
  creators: (rows: Creator[]) => void
  eventName: (record: EventNameRecord) => void
}

const ROW_ENTITIES = [
  'categories',
  'items',
  'discountRules',
  'labels',
  'saleRecords',
  'paymentMethods',
  'creators',
] as const satisfies readonly (keyof Omit<PullHandlers, 'eventName'>)[]

// Live-updates local state whenever another device's push lands in
// Firestore. Firestore's own SDK does the heavy lifting (snapshot listeners,
// offline cache, reconnection) — this just wires each collection's snapshot
// into the matching AppDataContext merge handler. Purely inbound: never
// touches the outbox, so it can't loop back into a push.
export function startSyncPull(handlers: PullHandlers): () => void {
  if (!isSyncConfigured) return () => {}
  const db = getDb()

  const unsubscribers = ROW_ENTITIES.map((entity) =>
    onSnapshot(collection(db, entity), (snapshot) => {
      const rows = snapshot.docs.map((docSnapshot) => docSnapshot.data())
      ;(handlers[entity] as (rows: unknown[]) => void)(rows)
    }),
  )

  unsubscribers.push(
    onSnapshot(doc(db, 'eventName', 'main'), (snapshot) => {
      if (snapshot.exists()) handlers.eventName(snapshot.data() as EventNameRecord)
    }),
  )

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe()
  }
}
