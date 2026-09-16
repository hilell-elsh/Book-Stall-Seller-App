import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, isSyncConfigured, stallEmail } from './firebaseConfig'

// Stopgap access gate (Phase 2, until Phase 3's real per-person auth):
// one shared Firebase Auth email/password account for the whole stall. The
// "PIN" sellers type is literally that account's password — this avoids
// building/hosting a Cloud Function just to check a PIN, at the cost of the
// password being a plain string, which is an accepted tradeoff for a
// low-stakes stopgap (see Phase 2 plan, Task 11).
export async function signInWithPin(pin: string): Promise<void> {
  if (!isSyncConfigured || !stallEmail) {
    throw new Error('Firebase sync is not configured')
  }
  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), stallEmail, pin)
  } catch {
    // Deliberately don't surface Firebase's own error (leaks whether the
    // email/account exists) — from the seller's point of view there's only
    // one failure mode: wrong PIN.
    throw new Error('קוד שגוי')
  }
}

export function signOutOfStall(): Promise<void> {
  return signOut(getFirebaseAuth())
}

export function watchStallAccess(onChange: (user: User | null) => void): () => void {
  if (!isSyncConfigured) {
    onChange(null)
    return () => {}
  }
  return onAuthStateChanged(getFirebaseAuth(), onChange)
}
