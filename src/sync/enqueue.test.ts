import { beforeEach, describe, expect, it, vi } from 'vitest'

let fakeOutbox: unknown[] = []
const getSyncOutbox = vi.fn(() => fakeOutbox)
const saveSyncOutbox = vi.fn((ops: unknown[]) => {
  fakeOutbox = ops
})

vi.mock('../data/store', () => ({
  getSyncOutbox: () => getSyncOutbox(),
  saveSyncOutbox: (ops: unknown[]) => saveSyncOutbox(ops),
}))

vi.mock('./deviceId', () => ({
  getDeviceId: () => 'device-1',
}))

const { enqueue } = await import('./outbox')

interface Row {
  id: string
  name: string
}

describe('enqueue', () => {
  beforeEach(() => {
    fakeOutbox = []
    getSyncOutbox.mockClear()
    saveSyncOutbox.mockClear()
  })

  it('appends the diff onto the persisted outbox', () => {
    enqueue<Row>('categories', [], [{ id: 'c1', name: 'Fiction' }])
    expect(saveSyncOutbox).toHaveBeenCalledTimes(1)
    expect(fakeOutbox).toHaveLength(1)
    expect((fakeOutbox[0] as { entity: string }).entity).toBe('categories')
    expect((fakeOutbox[0] as { deviceId: string }).deviceId).toBe('device-1')
  })

  it('does not touch the outbox when nothing changed', () => {
    const rows = [{ id: 'c1', name: 'Fiction' }]
    enqueue<Row>('categories', rows, [...rows])
    expect(saveSyncOutbox).not.toHaveBeenCalled()
  })

  it('accumulates across multiple calls rather than overwriting', () => {
    enqueue<Row>('categories', [], [{ id: 'c1', name: 'Fiction' }])
    enqueue<Row>('categories', [{ id: 'c1', name: 'Fiction' }], [])
    expect(fakeOutbox).toHaveLength(2)
  })
})
