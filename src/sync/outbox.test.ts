import { describe, expect, it } from 'vitest'
import { diffToOps } from './outbox'

interface Row {
  id: string
  name: string
}

describe('diffToOps', () => {
  it('emits an upsert for a newly added row', () => {
    const ops = diffToOps<Row>('categories', [], [{ id: 'c1', name: 'Fiction' }], 'device-1', 't1')
    expect(ops).toEqual([
      {
        opId: 'categories:c1:t1',
        entity: 'categories',
        entityId: 'c1',
        op: 'upsert',
        payload: { id: 'c1', name: 'Fiction' },
        deviceId: 'device-1',
        clientTimestamp: 't1',
        attempts: 0,
      },
    ])
  })

  it('emits an upsert for a changed row', () => {
    const prev = [{ id: 'c1', name: 'Fiction' }]
    const next = [{ id: 'c1', name: 'Non-fiction' }]
    const ops = diffToOps<Row>('categories', prev, next, 'device-1', 't2')
    expect(ops).toHaveLength(1)
    expect(ops[0].op).toBe('upsert')
    expect(ops[0].payload).toEqual({ id: 'c1', name: 'Non-fiction' })
  })

  it('emits a delete when a row disappears', () => {
    const prev = [{ id: 'c1', name: 'Fiction' }]
    const ops = diffToOps<Row>('categories', prev, [], 'device-1', 't3')
    expect(ops).toEqual([
      {
        opId: 'categories:c1:t3',
        entity: 'categories',
        entityId: 'c1',
        op: 'delete',
        payload: null,
        deviceId: 'device-1',
        clientTimestamp: 't3',
        attempts: 0,
      },
    ])
  })

  it('emits nothing when nothing changed', () => {
    const rows = [{ id: 'c1', name: 'Fiction' }]
    expect(diffToOps<Row>('categories', rows, [...rows], 'device-1', 't4')).toEqual([])
  })

  it('handles simultaneous add, update, and delete in one diff', () => {
    const prev = [
      { id: 'c1', name: 'Fiction' },
      { id: 'c2', name: 'Poetry' },
    ]
    const next = [
      { id: 'c1', name: 'Fiction' },
      { id: 'c3', name: 'History' },
    ]
    const ops = diffToOps<Row>('categories', prev, next, 'device-1', 't5')
    expect(ops).toHaveLength(2)
    expect(ops.find((op) => op.entityId === 'c3')?.op).toBe('upsert')
    expect(ops.find((op) => op.entityId === 'c2')?.op).toBe('delete')
  })
})
