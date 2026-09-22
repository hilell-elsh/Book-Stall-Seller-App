import { describe, expect, it } from 'vitest'
import {
  applyCategoryTombstone,
  applyCategoryTombstones,
  applyCreatorTombstone,
  applyCreatorTombstones,
  applyLabelTombstone,
  applyLabelTombstones,
  isLive,
} from './cascade'

interface Item {
  id: string
  categoryId: string
  labelIds: string[]
  creatorShares: { creatorId: string }[]
  deletedAt?: string
}

describe('applyCategoryTombstone', () => {
  it('soft-deletes items belonging to the tombstoned category', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [] },
      { id: 'i2', categoryId: 'cat-2', labelIds: [], creatorShares: [] },
    ]
    const result = applyCategoryTombstone(items, 'cat-1', '2026-09-16T10:00:00.000Z')
    expect(result.find((i) => i.id === 'i1')?.deletedAt).toBe('2026-09-16T10:00:00.000Z')
    expect(result.find((i) => i.id === 'i2')?.deletedAt).toBeUndefined()
  })

  it('does not overwrite an item already tombstoned earlier', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [], deletedAt: 'earlier' },
    ]
    const result = applyCategoryTombstone(items, 'cat-1', 'later')
    expect(result[0].deletedAt).toBe('earlier')
  })
})

describe('applyLabelTombstone', () => {
  it('unlinks the label from items instead of deleting them', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: ['label-1', 'label-2'], creatorShares: [] },
    ]
    const result = applyLabelTombstone(items, 'label-1')
    expect(result).toEqual([{ id: 'i1', categoryId: 'cat-1', labelIds: ['label-2'], creatorShares: [] }])
  })

  it('leaves items without the label untouched', () => {
    const items: Item[] = [{ id: 'i1', categoryId: 'cat-1', labelIds: ['label-2'], creatorShares: [] }]
    expect(applyLabelTombstone(items, 'label-1')).toEqual(items)
  })
})

describe('applyCreatorTombstone', () => {
  it('unlinks the creator share from items instead of deleting them', () => {
    const items: Item[] = [
      {
        id: 'i1',
        categoryId: 'cat-1',
        labelIds: [],
        creatorShares: [{ creatorId: 'creator-1' }, { creatorId: 'creator-2' }],
      },
    ]
    const result = applyCreatorTombstone(items, 'creator-1')
    expect(result).toEqual([
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [{ creatorId: 'creator-2' }] },
    ])
  })

  it('leaves items without that creator share untouched', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [{ creatorId: 'creator-2' }] },
    ]
    expect(applyCreatorTombstone(items, 'creator-1')).toEqual(items)
  })
})

describe('applyCategoryTombstones (batch, sync-pull path)', () => {
  it('cascades every tombstoned category in the pulled set, skipping live ones', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [] },
      { id: 'i2', categoryId: 'cat-2', labelIds: [], creatorShares: [] },
      { id: 'i3', categoryId: 'cat-3', labelIds: [], creatorShares: [] },
    ]
    const categories = [
      { id: 'cat-1', deletedAt: '2026-09-16T10:00:00.000Z' },
      { id: 'cat-2', deletedAt: undefined },
      { id: 'cat-3', deletedAt: '2026-09-16T10:05:00.000Z' },
    ]
    const result = applyCategoryTombstones(items, categories)
    expect(result.find((i) => i.id === 'i1')?.deletedAt).toBe('2026-09-16T10:00:00.000Z')
    expect(result.find((i) => i.id === 'i2')?.deletedAt).toBeUndefined()
    expect(result.find((i) => i.id === 'i3')?.deletedAt).toBe('2026-09-16T10:05:00.000Z')
  })

  it('is idempotent, so replaying an already-applied tombstone changes nothing', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [], deletedAt: 'earlier' },
    ]
    const categories = [{ id: 'cat-1', deletedAt: 'earlier' }]
    expect(applyCategoryTombstones(items, categories)).toEqual(items)
  })

  it('self-heals a race where a concurrent item edit clobbered the original cascade', () => {
    // Simulates the documented race: device A's cascade tombstoned i1, but a
    // concurrent edit on device B (later updatedAt) won LWW and reverted the
    // item to live, still pointing at the now-gone category. Re-running the
    // batch cascade against the pulled category list should fix it again.
    const items: Item[] = [{ id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [] }]
    const categories = [{ id: 'cat-1', deletedAt: '2026-09-16T10:00:00.000Z' }]
    const result = applyCategoryTombstones(items, categories)
    expect(result[0].deletedAt).toBe('2026-09-16T10:00:00.000Z')
  })
})

describe('applyLabelTombstones (batch, sync-pull path)', () => {
  it('unlinks every tombstoned label in the pulled set, skipping live ones', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: ['label-1', 'label-2', 'label-3'], creatorShares: [] },
    ]
    const labels = [
      { id: 'label-1', deletedAt: '2026-09-16T10:00:00.000Z' },
      { id: 'label-2', deletedAt: undefined },
      { id: 'label-3', deletedAt: '2026-09-16T10:05:00.000Z' },
    ]
    const result = applyLabelTombstones(items, labels)
    expect(result[0].labelIds).toEqual(['label-2'])
  })

  it('is idempotent, so replaying an already-unlinked label changes nothing', () => {
    const items: Item[] = [{ id: 'i1', categoryId: 'cat-1', labelIds: ['label-2'], creatorShares: [] }]
    const labels = [{ id: 'label-1', deletedAt: '2026-09-16T10:00:00.000Z' }]
    expect(applyLabelTombstones(items, labels)).toEqual(items)
  })
})

describe('applyCreatorTombstones (batch, sync-pull path)', () => {
  it('unlinks every tombstoned creator in the pulled set, skipping live ones', () => {
    const items: Item[] = [
      {
        id: 'i1',
        categoryId: 'cat-1',
        labelIds: [],
        creatorShares: [{ creatorId: 'creator-1' }, { creatorId: 'creator-2' }],
      },
    ]
    const creators = [
      { id: 'creator-1', deletedAt: '2026-09-16T10:00:00.000Z' },
      { id: 'creator-2', deletedAt: undefined },
    ]
    const result = applyCreatorTombstones(items, creators)
    expect(result[0].creatorShares).toEqual([{ creatorId: 'creator-2' }])
  })

  it('is idempotent, so replaying an already-unlinked creator changes nothing', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [], creatorShares: [{ creatorId: 'creator-2' }] },
    ]
    const creators = [{ id: 'creator-1', deletedAt: '2026-09-16T10:00:00.000Z' }]
    expect(applyCreatorTombstones(items, creators)).toEqual(items)
  })
})

describe('isLive', () => {
  it('treats a row with no deletedAt as live', () => {
    expect(isLive({ id: 'i1', deletedAt: undefined })).toBe(true)
  })

  it('treats a tombstoned row as not live', () => {
    expect(isLive({ id: 'i1', deletedAt: '2026-09-16T10:00:00.000Z' })).toBe(false)
  })
})
