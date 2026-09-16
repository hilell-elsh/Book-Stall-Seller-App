import { describe, expect, it } from 'vitest'
import { applyCategoryTombstone, applyLabelTombstone, isLive } from './cascade'

interface Item {
  id: string
  categoryId: string
  labelIds: string[]
  deletedAt?: string
}

describe('applyCategoryTombstone', () => {
  it('soft-deletes items belonging to the tombstoned category', () => {
    const items: Item[] = [
      { id: 'i1', categoryId: 'cat-1', labelIds: [] },
      { id: 'i2', categoryId: 'cat-2', labelIds: [] },
    ]
    const result = applyCategoryTombstone(items, 'cat-1', '2026-09-16T10:00:00.000Z')
    expect(result.find((i) => i.id === 'i1')?.deletedAt).toBe('2026-09-16T10:00:00.000Z')
    expect(result.find((i) => i.id === 'i2')?.deletedAt).toBeUndefined()
  })

  it('does not overwrite an item already tombstoned earlier', () => {
    const items: Item[] = [{ id: 'i1', categoryId: 'cat-1', labelIds: [], deletedAt: 'earlier' }]
    const result = applyCategoryTombstone(items, 'cat-1', 'later')
    expect(result[0].deletedAt).toBe('earlier')
  })
})

describe('applyLabelTombstone', () => {
  it('unlinks the label from items instead of deleting them', () => {
    const items: Item[] = [{ id: 'i1', categoryId: 'cat-1', labelIds: ['label-1', 'label-2'] }]
    const result = applyLabelTombstone(items, 'label-1')
    expect(result).toEqual([{ id: 'i1', categoryId: 'cat-1', labelIds: ['label-2'] }])
  })

  it('leaves items without the label untouched', () => {
    const items: Item[] = [{ id: 'i1', categoryId: 'cat-1', labelIds: ['label-2'] }]
    expect(applyLabelTombstone(items, 'label-1')).toEqual(items)
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
