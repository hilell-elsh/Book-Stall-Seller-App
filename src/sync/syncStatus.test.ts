import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OutboxOp } from './outbox'

let fakeOutbox: OutboxOp[] = []
const getSyncOutbox = vi.fn(() => fakeOutbox)

vi.mock('../data/store', () => ({
  getSyncOutbox: () => getSyncOutbox(),
}))

const {
  getSyncStatusSnapshot,
  notifySyncOutboxChanged,
  recordSyncSuccess,
  setDraining,
  subscribeSyncStatus,
} = await import('./syncStatus')

function makeOp(overrides: Partial<OutboxOp> = {}): OutboxOp {
  return {
    opId: 'categories:c1:t1',
    entity: 'categories',
    entityId: 'c1',
    op: 'upsert',
    payload: { id: 'c1' },
    deviceId: 'device-1',
    clientTimestamp: 't1',
    attempts: 0,
    ...overrides,
  }
}

describe('syncStatus', () => {
  beforeEach(() => {
    fakeOutbox = []
    getSyncOutbox.mockClear()
    // Drain any state left over from a previous test via the real API,
    // rather than reaching into module internals.
    setDraining(false)
  })

  it('reports zero pending changes and no stuck ops for an empty outbox', () => {
    notifySyncOutboxChanged()
    const status = getSyncStatusSnapshot()
    expect(status.pendingCount).toBe(0)
    expect(status.stuckOps).toEqual([])
  })

  it('reflects the current outbox length as pendingCount after a change notification', () => {
    fakeOutbox = [makeOp(), makeOp({ opId: 'c2', entityId: 'c2' })]
    notifySyncOutboxChanged()
    expect(getSyncStatusSnapshot().pendingCount).toBe(2)
  })

  it('flags ops with 3 or more attempts as stuck', () => {
    fakeOutbox = [makeOp({ attempts: 1 }), makeOp({ opId: 'c2', entityId: 'c2', attempts: 3 })]
    notifySyncOutboxChanged()
    const status = getSyncStatusSnapshot()
    expect(status.stuckOps).toHaveLength(1)
    expect(status.stuckOps[0].entityId).toBe('c2')
  })

  it('records lastSyncedAt on a successful sync', () => {
    expect(getSyncStatusSnapshot().lastSyncedAt).toBeNull()
    recordSyncSuccess('2026-09-16T10:00:00.000Z')
    expect(getSyncStatusSnapshot().lastSyncedAt).toBe('2026-09-16T10:00:00.000Z')
  })

  it('tracks the draining flag', () => {
    setDraining(true)
    expect(getSyncStatusSnapshot().draining).toBe(true)
    setDraining(false)
    expect(getSyncStatusSnapshot().draining).toBe(false)
  })

  it('returns the same snapshot reference until something changes', () => {
    const first = getSyncStatusSnapshot()
    const second = getSyncStatusSnapshot()
    expect(first).toBe(second)
    notifySyncOutboxChanged()
    expect(getSyncStatusSnapshot()).not.toBe(first)
  })

  it('notifies subscribers on change and stops after unsubscribing', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSyncStatus(listener)
    notifySyncOutboxChanged()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    notifySyncOutboxChanged()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
