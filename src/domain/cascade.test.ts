import { describe, expect, it } from 'vitest'
import { applyCategoryTombstone, applyCreatorTombstone, applyLabelTombstone, isLive } from './cascade'

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

describe('isLive', () => {
  it('treats a row with no deletedAt as live', () => {
    expect(isLive({ id: 'i1', deletedAt: undefined })).toBe(true)
  })

  it('treats a tombstoned row as not live', () => {
    expect(isLive({ id: 'i1', deletedAt: '2026-09-16T10:00:00.000Z' })).toBe(false)
  })
})
