import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithEmailAndPassword = vi.fn()
const onAuthStateChanged = vi.fn()
const signOut = vi.fn()

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPassword(...args),
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChanged(...args),
  signOut: (...args: unknown[]) => signOut(...args),
}))

vi.mock('./firebaseConfig', () => ({
  isSyncConfigured: true,
  stallEmail: 'stall@shaatnez.app',
  getFirebaseAuth: () => 'fake-auth-instance',
}))

const { signInWithPin, watchStallAccess } = await import('./pinGate')

describe('signInWithPin', () => {
  beforeEach(() => {
    signInWithEmailAndPassword.mockReset()
  })

  it('signs in with the fixed stall email and the entered pin as the password', async () => {
    signInWithEmailAndPassword.mockResolvedValue(undefined)
    await signInWithPin('1234')
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith('fake-auth-instance', 'stall@shaatnez.app', '1234')
  })

  it('translates any auth failure into a generic wrong-pin message, never leaking Firebase details', async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error('auth/user-not-found'))
    await expect(signInWithPin('0000')).rejects.toThrow('קוד שגוי')
  })
})

describe('watchStallAccess', () => {
  it('subscribes via onAuthStateChanged when sync is configured', () => {
    const unsubscribe = vi.fn()
    onAuthStateChanged.mockReturnValue(unsubscribe)
    const onChange = vi.fn()
    const result = watchStallAccess(onChange)
    expect(onAuthStateChanged).toHaveBeenCalledWith('fake-auth-instance', onChange)
    expect(result).toBe(unsubscribe)
  })
})
