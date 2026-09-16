import { useEffect, useState, type ReactNode } from 'react'
import { isSyncConfigured } from '../sync/firebaseConfig'
import { signInWithPin, watchStallAccess } from '../sync/pinGate'

type Status = 'loading' | 'signed-out' | 'signed-in'

// Gates the whole app behind the shared stall PIN, but only when sync is
// actually configured (VITE_FIREBASE_*/VITE_STALL_EMAIL set) — a device with
// no Firebase project configured at all (e.g. the offline single-file
// builds, or before this stall has set one up) must keep working exactly as
// Phase 1, never blocked on a gate it has nothing to sync to.
export function PinGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(isSyncConfigured ? 'loading' : 'signed-in')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isSyncConfigured) return
    return watchStallAccess((user) => setStatus(user ? 'signed-in' : 'signed-out'))
  }, [])

  if (status === 'loading') return null
  if (status === 'signed-in') return children

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signInWithPin(pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'קוד שגוי')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs rounded-lg border border-line bg-surface p-5 text-center"
      >
        <h1 className="text-base font-semibold">קוד גישה לדוכן</h1>
        <p className="mt-1 text-sm text-faint">הזינו את קוד הדוכן כדי להמשיך</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mt-3 w-full rounded border border-line-strong px-2 py-2 text-center text-lg tracking-widest"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || pin.length === 0}
          className="mt-3 w-full rounded bg-accent-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'בודק…' : 'כניסה'}
        </button>
      </form>
    </div>
  )
}
