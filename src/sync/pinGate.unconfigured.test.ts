import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('./firebaseConfig', () => ({
  isSyncConfigured: false,
  stallEmail: undefined,
  getFirebaseAuth: () => {
    throw new Error('should not be called when sync is not configured')
  },
}))

const { signInWithPin, watchStallAccess } = await import('./pinGate')

describe('pinGate when sync is not configured', () => {
  it('signInWithPin refuses rather than reaching into an uninitialized Firebase app', async () => {
    await expect(signInWithPin('1234')).rejects.toThrow('not configured')
  })

  it('watchStallAccess reports no user and never subscribes', () => {
    const onChange = vi.fn()
    const unsubscribe = watchStallAccess(onChange)
    expect(onChange).toHaveBeenCalledWith(null)
    expect(() => unsubscribe()).not.toThrow()
  })
})
