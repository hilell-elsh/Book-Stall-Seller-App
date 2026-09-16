import { beforeEach, describe, expect, it, vi } from 'vitest'

const initializeApp = vi.fn((..._args: unknown[]) => ({ name: 'fake-app' }))
const initializeFirestore = vi.fn((..._args: unknown[]) => ({}) as unknown)
const persistentLocalCache = vi.fn((opts: unknown) => ({ kind: 'persistent', opts }))
const persistentMultipleTabManager = vi.fn(() => ({ kind: 'tab-manager' }))
const getAuth = vi.fn((..._args: unknown[]) => ({ kind: 'fake-auth' }))

vi.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => initializeApp(...args),
}))

vi.mock('firebase/firestore', () => ({
  initializeFirestore: (...args: unknown[]) => initializeFirestore(...args),
  persistentLocalCache: (opts: unknown) => persistentLocalCache(opts),
  persistentMultipleTabManager: () => persistentMultipleTabManager(),
}))

vi.mock('firebase/auth', () => ({
  getAuth: (...args: unknown[]) => getAuth(...args),
}))

// firebaseConfig.ts computes isSyncConfigured from import.meta.env.VITE_FIREBASE_*/
// VITE_STALL_EMAIL at module load time — this worktree's real .env.local makes
// those true already (see CLAUDE.md's sync foundations note), so no extra env
// stubbing is needed here.
describe('ensureInitialized (via getDb/getFirebaseAuth)', () => {
  beforeEach(() => {
    // firebaseConfig.ts caches app/db/auth as module-level singletons behind
    // an `if (app) return` guard, so each scenario needs a fresh module
    // instance — otherwise the second test would hit that early-out and
    // never re-run ensureInitialized()'s logic at all.
    vi.resetModules()
    initializeApp.mockClear()
    initializeFirestore.mockClear()
    getAuth.mockClear()
  })

  it('falls back to a non-persistent Firestore instance when persistentLocalCache init throws (e.g. IndexedDB unavailable on file://)', async () => {
    initializeFirestore
      .mockImplementationOnce(() => {
        throw new DOMException('IndexedDB unavailable', 'SecurityError')
      })
      .mockImplementationOnce(() => ({ kind: 'memory-only-db' }))

    const { getDb } = await import('./firebaseConfig')
    const db = getDb()

    expect(initializeFirestore).toHaveBeenCalledTimes(2)
    // Second call has no localCache option — that's what actually avoids IndexedDB.
    expect(initializeFirestore).toHaveBeenNthCalledWith(2, { name: 'fake-app' }, {})
    expect(db).toEqual({ kind: 'memory-only-db' })
  })

  it('still returns an Auth instance after the Firestore fallback path', async () => {
    initializeFirestore.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const { getFirebaseAuth } = await import('./firebaseConfig')
    expect(() => getFirebaseAuth()).not.toThrow()
    expect(getAuth).toHaveBeenCalledTimes(1)
  })

  it('uses the persistent cache directly when it does not throw', async () => {
    const { getDb } = await import('./firebaseConfig')
    getDb()
    expect(initializeFirestore).toHaveBeenCalledTimes(1)
    expect(initializeFirestore).toHaveBeenCalledWith(
      { name: 'fake-app' },
      { localCache: { kind: 'persistent', opts: { tabManager: { kind: 'tab-manager' } } } },
    )
  })
})
