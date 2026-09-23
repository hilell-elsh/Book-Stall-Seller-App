import { beforeEach, describe, expect, it, vi } from 'vitest'

const setMock = vi.fn()
const commitMock = vi.fn()
const getDocsMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, entity: string) => ({ __collection: entity }),
  doc: (_db: unknown, entity: string, id: string) => ({ __doc: `${entity}/${id}` }),
  writeBatch: () => ({ set: setMock, commit: commitMock }),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}))

vi.mock('./firebaseConfig', () => ({
  getDb: () => 'fake-db',
}))

const { pushAll, pullAll } = await import('./backend')

interface Row {
  id: string
  name: string
}

describe('pushAll', () => {
  beforeEach(() => {
    setMock.mockReset()
    commitMock.mockReset().mockResolvedValue(undefined)
  })

  it('writes every row to its own doc, keyed by id, in a single batch', async () => {
    const rows: Row[] = [
      { id: 'c1', name: 'Fiction' },
      { id: 'c2', name: 'Poetry' },
    ]
    await pushAll('categories', rows)
    expect(setMock).toHaveBeenCalledTimes(2)
    expect(setMock).toHaveBeenCalledWith({ __doc: 'categories/c1' }, rows[0])
    expect(setMock).toHaveBeenCalledWith({ __doc: 'categories/c2' }, rows[1])
    expect(commitMock).toHaveBeenCalledTimes(1)
  })

  it('splits into multiple batches beyond the 500-write Firestore limit', async () => {
    const rows: Row[] = Array.from({ length: 501 }, (_, i) => ({ id: `c${i}`, name: `Item ${i}` }))
    await pushAll('categories', rows)
    expect(commitMock).toHaveBeenCalledTimes(2)
  })

  it('is a no-op for an empty array', async () => {
    await pushAll('categories', [])
    expect(commitMock).not.toHaveBeenCalled()
  })
})

describe('pullAll', () => {
  it('maps each doc snapshot back to its stored data', async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ data: () => ({ id: 'c1', name: 'Fiction' }) }, { data: () => ({ id: 'c2', name: 'Poetry' }) }],
    })
    const rows = await pullAll<Row>('categories')
    expect(rows).toEqual([
      { id: 'c1', name: 'Fiction' },
      { id: 'c2', name: 'Poetry' },
    ])
  })
})
