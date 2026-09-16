import { describe, expect, it } from 'vitest'
import { mergeRows, resolveLastWriteWins } from './merge'

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
