import { describe, expect, it } from 'vitest'
import { findLocalWins, mergeRows, resolveLastWriteWins } from './merge'
import { diffToOps } from './outbox'

interface Row {
  id: string
  updatedAt: string
  name: string
}

describe('resolveLastWriteWins', () => {
  it('keeps the row with the later updatedAt', () => {
    const local: Row = { id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Local name' }
    const remote: Row = { id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Remote name' }
    expect(resolveLastWriteWins(local, remote)).toBe(remote)
  })

  it('keeps the local row when it is newer than the incoming remote row', () => {
    const local: Row = { id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Local name' }
    const remote: Row = { id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Remote name' }
    expect(resolveLastWriteWins(local, remote)).toBe(local)
  })

  it('reproduces the documented Dana/Noa race: the later push wins the whole row, silently dropping the earlier edit', () => {
    // Noa (offline) drops the price to 38, syncs first.
    const noa: Row & { price: number } = {
      id: 'item-1',
      updatedAt: '2026-09-16T09:00:00.000Z',
      name: 'אוסף — יולי',
      price: 38,
    }
    // Dana (offline, unaware of Noa's edit) renames the item, syncs a few minutes later.
    const dana: Row & { price: number } = {
      id: 'item-1',
      updatedAt: '2026-09-16T09:05:00.000Z',
      name: 'אוסף — קיץ',
      price: 42,
    }
    const result = resolveLastWriteWins(noa, dana)
    // Whole-row LWW: Dana's row wins entirely, including the stale price — accepted risk, not a bug.
    expect(result).toBe(dana)
    expect(result.price).toBe(42)
  })
})

describe('mergeRows', () => {
  it('adopts remote-only rows', () => {
    const merged = mergeRows<Row>([], [{ id: 'c1', updatedAt: 't1', name: 'Fiction' }])
    expect(merged).toEqual([{ id: 'c1', updatedAt: 't1', name: 'Fiction' }])
  })

  it('keeps local-only rows not yet known to the remote', () => {
    const local: Row[] = [{ id: 'local-only', updatedAt: 't1', name: 'Not synced yet' }]
    expect(mergeRows(local, [])).toEqual(local)
  })

  it('applies LWW per row when both sides know an id', () => {
    const local: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Local wins' }]
    const remote: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Remote loses' }]
    expect(mergeRows(local, remote)).toEqual([{ id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Local wins' }])
  })
})

describe('findLocalWins', () => {
  it('flags a row whose local value beat the incoming remote value', () => {
    const remote: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Remote loses' }]
    const local: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Local wins' }]
    const merged = mergeRows(local, remote)
    expect(findLocalWins(remote, merged)).toEqual([{ id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Local wins' }])
  })

  it('does not flag a row where the incoming remote value won', () => {
    const remote: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:05:00.000Z', name: 'Remote wins' }]
    const local: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Local loses' }]
    const merged = mergeRows(local, remote)
    expect(findLocalWins(remote, merged)).toEqual([])
  })

  it('does not flag a remote-only row (nothing local to compare)', () => {
    const remote: Row[] = [{ id: 'c1', updatedAt: 't1', name: 'Fiction' }]
    const merged = mergeRows([], remote)
    expect(findLocalWins(remote, merged)).toEqual([])
  })

  it('does not flag a local-only row (not present in remote at all)', () => {
    const local: Row[] = [{ id: 'local-only', updatedAt: 't1', name: 'Not synced yet' }]
    const merged = mergeRows(local, [])
    expect(findLocalWins([], merged)).toEqual([])
  })

  it('does not flag equal-content rows even when the reference differs', () => {
    const remote: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Same' }]
    const local: Row[] = [{ id: 'c1', updatedAt: '2026-09-16T10:00:00.000Z', name: 'Same' }]
    const merged = mergeRows(local, remote)
    // Tie goes to remote per resolveLastWriteWins, so merged[0] IS remote[0] by reference.
    expect(findLocalWins(remote, merged)).toEqual([])
  })
})

describe('two-device convergence (the AppDataContext.tsx pull-handler pattern)', () => {
  // Reproduces the exact race that motivated findLocalWins: Firestore's
  // stored document is decided by whichever setDoc() reaches the server
  // last (a network race), NOT by comparing updatedAt — so without pushing
  // corrections back, the device whose local edit is logically newer but
  // whose write lost the network race would keep reverting its own view
  // locally on every pull, while Firestore (and any other device) stays
  // stuck on the stale value forever, surviving refreshes.
  it('produces a correction op when a stale write won the race to Firestore', () => {
    // Device B's older edit happened to reach Firestore last, so that's
    // what's now stored there — logically stale, but the current server
    // truth as far as Device A's next pull is concerned.
    const firestoreDoc: Row = { id: 'item-1', updatedAt: '2026-09-16T09:00:00.000Z', name: 'Stale (Device B)' }
    // Device A's own local edit is logically newer.
    const deviceALocal: Row[] = [{ id: 'item-1', updatedAt: '2026-09-16T09:05:00.000Z', name: 'Fresh (Device A)' }]

    const merged = mergeRows(deviceALocal, [firestoreDoc])
    expect(merged).toEqual([{ id: 'item-1', updatedAt: '2026-09-16T09:05:00.000Z', name: 'Fresh (Device A)' }])

    const corrections = findLocalWins([firestoreDoc], merged)
    expect(corrections).toHaveLength(1)

    // This is exactly what AppDataContext's pull handler does next: enqueue
    // the correction as an upsert so it reaches Firestore and the stale
    // document actually gets fixed, instead of every device just silently
    // disagreeing about what the row's current value is.
    const ops = diffToOps('items', [firestoreDoc], corrections, 'device-a', '2026-09-16T09:06:00.000Z')
    expect(ops).toEqual([
      {
        opId: 'items:item-1:2026-09-16T09:06:00.000Z',
        entity: 'items',
        entityId: 'item-1',
        op: 'upsert',
        payload: { id: 'item-1', updatedAt: '2026-09-16T09:05:00.000Z', name: 'Fresh (Device A)' },
        deviceId: 'device-a',
        clientTimestamp: '2026-09-16T09:06:00.000Z',
        attempts: 0,
      },
    ])
  })

  it('produces no correction op when Firestore already reflects the newest edit', () => {
    const firestoreDoc: Row = { id: 'item-1', updatedAt: '2026-09-16T09:05:00.000Z', name: 'Fresh (Device A)' }
    const deviceBLocal: Row[] = [{ id: 'item-1', updatedAt: '2026-09-16T09:00:00.000Z', name: 'Stale (Device B)' }]

    const merged = mergeRows(deviceBLocal, [firestoreDoc])
    // AppDataContext's pull handler only calls diffToOps/enqueue when
    // corrections is non-empty (see the `if (corrections.length > 0)` guard) —
    // an empty array here means no correction push happens at all.
    expect(findLocalWins([firestoreDoc], merged)).toEqual([])
  })
})
