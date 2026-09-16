import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OutboxOp } from './outbox'

let fakeOutbox: OutboxOp[] = []
let syncConfigured = true
const getSyncOutbox = vi.fn(() => fakeOutbox)
const saveSyncOutbox = vi.fn((ops: OutboxOp[]) => {
  fakeOutbox = ops
})
const setDoc = vi.fn((_ref: unknown, _payload: unknown) => Promise.resolve())
const deleteDoc = vi.fn((_ref: unknown) => Promise.resolve())

vi.mock('../data/store', () => ({
  getSyncOutbox: () => getSyncOutbox(),
  saveSyncOutbox: (ops: OutboxOp[]) => saveSyncOutbox(ops),
}))

vi.mock('./firebaseConfig', () => ({
  getDb: () => ({}),
  get isSyncConfigured() {
    return syncConfigured
  },
}))

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, entity: string, id: string) => ({ entity, id }),
  setDoc: (ref: unknown, payload: unknown) => setDoc(ref, payload),
  deleteDoc: (ref: unknown) => deleteDoc(ref),
}))

const { drainOutbox } = await import('./drain')

function makeOp(overrides: Partial<OutboxOp> = {}): OutboxOp {
  return {
    opId: 'categories:c1:t1',
    entity: 'categories',
    entityId: 'c1',
    op: 'upsert',
    payload: { id: 'c1', name: 'Fiction' },
    deviceId: 'device-1',
    clientTimestamp: 't1',
    attempts: 0,
    ...overrides,
  }
}

describe('drainOutbox', () => {
  beforeEach(() => {
    fakeOutbox = []
    syncConfigured = true
    getSyncOutbox.mockClear()
    saveSyncOutbox.mockClear()
    setDoc.mockClear()
    deleteDoc.mockClear()
    setDoc.mockImplementation(() => Promise.resolve())
    deleteDoc.mockImplementation(() => Promise.resolve())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is a no-op when sync is not configured', async () => {
    syncConfigured = false
    fakeOutbox = [makeOp()]
    await drainOutbox()
    expect(setDoc).not.toHaveBeenCalled()
    expect(saveSyncOutbox).not.toHaveBeenCalled()
  })

  it('is a no-op with an empty outbox', async () => {
    await drainOutbox()
    expect(setDoc).not.toHaveBeenCalled()
    expect(saveSyncOutbox).not.toHaveBeenCalled()
  })

  it('pushes an upsert op via setDoc and clears it from the outbox on success', async () => {
    fakeOutbox = [makeOp()]
    await drainOutbox()
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(fakeOutbox).toHaveLength(0)
  })

  it('pushes a delete op via deleteDoc and clears it from the outbox on success', async () => {
    fakeOutbox = [makeOp({ op: 'delete', payload: null })]
    await drainOutbox()
    expect(deleteDoc).toHaveBeenCalledTimes(1)
    expect(setDoc).not.toHaveBeenCalled()
    expect(fakeOutbox).toHaveLength(0)
  })

  it('keeps a failed op in the outbox with attempts incremented and lastError set', async () => {
    setDoc.mockImplementationOnce(() => Promise.reject(new Error('permission-denied')))
    fakeOutbox = [makeOp()]
    await drainOutbox()
    expect(fakeOutbox).toHaveLength(1)
    expect(fakeOutbox[0].attempts).toBe(1)
    expect(fakeOutbox[0].lastError).toBe('permission-denied')
  })

  it('drains successful ops and keeps only the failed one', async () => {
    setDoc.mockImplementationOnce(() => Promise.resolve()).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    fakeOutbox = [makeOp({ opId: 'a', entityId: 'c1' }), makeOp({ opId: 'b', entityId: 'c2' })]
    await drainOutbox()
    expect(fakeOutbox).toHaveLength(1)
    expect(fakeOutbox[0].entityId).toBe('c2')
  })

  it('times out an op stuck with no network instead of hanging forever', async () => {
    vi.useFakeTimers()
    setDoc.mockImplementationOnce(() => new Promise(() => {}))
    fakeOutbox = [makeOp()]
    const drainPromise = drainOutbox()
    await vi.advanceTimersByTimeAsync(10_000)
    await drainPromise
    expect(fakeOutbox).toHaveLength(1)
    expect(fakeOutbox[0].attempts).toBe(1)
    expect(fakeOutbox[0].lastError).toMatch(/timed out/)
  })

  it('does not run two drains concurrently', async () => {
    let resolveFirst: () => void = () => {}
    setDoc.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve
        }),
    )
    fakeOutbox = [makeOp()]
    const first = drainOutbox()
    const second = drainOutbox()
    resolveFirst()
    await Promise.all([first, second])
    expect(setDoc).toHaveBeenCalledTimes(1)
  })
})
