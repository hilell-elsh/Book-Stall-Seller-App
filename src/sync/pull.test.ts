import { beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeRef {
  kind: 'collection' | 'doc'
  path: string
}

interface Listener {
  ref: FakeRef
  callback: (snapshot: unknown) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

let listeners: Listener[] = []
let syncConfigured = true

const collection = vi.fn((_db: unknown, path: string): FakeRef => ({ kind: 'collection', path }))
const doc = vi.fn((_db: unknown, ...segments: string[]): FakeRef => ({ kind: 'doc', path: segments.join('/') }))
const onSnapshot = vi.fn((ref: FakeRef, callback: (snapshot: unknown) => void) => {
  const unsubscribe = vi.fn()
  listeners.push({ ref, callback, unsubscribe })
  return unsubscribe
})

vi.mock('./firebaseConfig', () => ({
  getDb: () => ({}),
  get isSyncConfigured() {
    return syncConfigured
  },
}))

vi.mock('firebase/firestore', () => ({
  collection: (db: unknown, path: string) => collection(db, path),
  doc: (db: unknown, ...segments: string[]) => doc(db, ...segments),
  onSnapshot: (ref: FakeRef, callback: (snapshot: unknown) => void) => onSnapshot(ref, callback),
}))

const { startSyncPull } = await import('./pull')

function collectionSnapshot(rows: unknown[]) {
  return { docs: rows.map((row) => ({ data: () => row })) }
}

function docSnapshot(exists: boolean, data?: unknown) {
  return { exists: () => exists, data: () => data }
}

function makeHandlers() {
  return {
    categories: vi.fn(),
    items: vi.fn(),
    discountRules: vi.fn(),
    labels: vi.fn(),
    saleRecords: vi.fn(),
    paymentMethods: vi.fn(),
    creators: vi.fn(),
    eventName: vi.fn(),
  }
}

describe('startSyncPull', () => {
  beforeEach(() => {
    listeners = []
    syncConfigured = true
    collection.mockClear()
    doc.mockClear()
    onSnapshot.mockClear()
  })

  it('is a no-op when sync is not configured', () => {
    syncConfigured = false
    const cleanup = startSyncPull(makeHandlers())
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(() => cleanup()).not.toThrow()
  })

  it('subscribes to all 7 row collections plus the eventName singleton doc', () => {
    startSyncPull(makeHandlers())
    expect(onSnapshot).toHaveBeenCalledTimes(8)
    const collectionPaths = listeners.filter((l) => l.ref.kind === 'collection').map((l) => l.ref.path)
    expect(collectionPaths.sort()).toEqual(
      ['categories', 'items', 'discountRules', 'labels', 'saleRecords', 'paymentMethods', 'creators'].sort(),
    )
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'eventName', 'main')
  })

  it('calls the matching handler with mapped rows when a collection snapshot fires', () => {
    const handlers = makeHandlers()
    startSyncPull(handlers)
    const categoriesListener = listeners.find((l) => l.ref.path === 'categories')!
    categoriesListener.callback(collectionSnapshot([{ id: 'c1', name: 'Fiction' }]))
    expect(handlers.categories).toHaveBeenCalledWith([{ id: 'c1', name: 'Fiction' }])
    expect(handlers.items).not.toHaveBeenCalled()
  })

  it('calls the eventName handler when the singleton doc exists', () => {
    const handlers = makeHandlers()
    startSyncPull(handlers)
    const eventNameListener = listeners.find((l) => l.ref.kind === 'doc')!
    eventNameListener.callback(docSnapshot(true, { name: 'יריד', updatedAt: 't1' }))
    expect(handlers.eventName).toHaveBeenCalledWith({ name: 'יריד', updatedAt: 't1' })
  })

  it('does not call the eventName handler when the singleton doc does not exist yet', () => {
    const handlers = makeHandlers()
    startSyncPull(handlers)
    const eventNameListener = listeners.find((l) => l.ref.kind === 'doc')!
    eventNameListener.callback(docSnapshot(false))
    expect(handlers.eventName).not.toHaveBeenCalled()
  })

  it('unsubscribes every listener on cleanup', () => {
    const cleanup = startSyncPull(makeHandlers())
    cleanup()
    for (const listener of listeners) {
      expect(listener.unsubscribe).toHaveBeenCalledTimes(1)
    }
  })
})
