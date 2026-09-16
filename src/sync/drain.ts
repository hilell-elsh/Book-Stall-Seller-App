import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { getSyncOutbox, saveSyncOutbox } from '../data/store'
import { getDb, isSyncConfigured } from './firebaseConfig'
import type { OutboxOp } from './outbox'

// Firestore's own SDK already retries transient network failures on its own
// (offline persistence + automatic reconnect) — per the Phase 2 plan, this
// module leans on that instead of hand-building backoff. The one thing the
// SDK won't do for us is give up: a write started with no network at all can
// sit unresolved indefinitely, so each op gets a bounded attempt here purely
// to stop one stuck op from blocking every future drain trigger forever.
const PER_OP_TIMEOUT_MS = 10_000
const DRAIN_INTERVAL_MS = 30_000

let draining = false

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sync op timed out (likely offline)')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

async function applyOp(op: OutboxOp): Promise<void> {
  const ref = doc(getDb(), op.entity, op.entityId)
  if (op.op === 'delete') {
    await withTimeout(deleteDoc(ref), PER_OP_TIMEOUT_MS)
  } else {
    await withTimeout(setDoc(ref, op.payload as Record<string, unknown>), PER_OP_TIMEOUT_MS)
  }
}

// Drains the local outbox into Firestore, one op at a time, in enqueue order.
// Ops that fail (including timing out while offline) are kept in the outbox
// with attempts/lastError updated, so the next trigger (load/online/interval)
// retries them — no data is dropped, only deferred.
export async function drainOutbox(): Promise<void> {
  if (!isSyncConfigured || draining) return
  draining = true
  try {
    const ops = getSyncOutbox()
    if (ops.length === 0) return
    const remaining: OutboxOp[] = []
    for (const op of ops) {
      try {
        await applyOp(op)
      } catch (err) {
        remaining.push({ ...op, attempts: op.attempts + 1, lastError: (err as Error).message })
      }
    }
    saveSyncOutbox(remaining)
  } finally {
    draining = false
  }
}

let intervalHandle: ReturnType<typeof setInterval> | undefined
let onlineListenerAttached = false

function handleOnline(): void {
  void drainOutbox()
}

// Wires drainOutbox() to the plan's foreground-only sync timing: once on
// call (app load / sign-in), again whenever the browser regains connectivity,
// and on a while-open interval as a catch-all. No service worker, no
// background sync — matches the Phase 2 design decision to keep this simple.
// Returns a cleanup function (safe to call from a React effect).
export function startSyncDrain(): () => void {
  if (!isSyncConfigured) return () => {}
  void drainOutbox()
  if (!onlineListenerAttached) {
    window.addEventListener('online', handleOnline)
    onlineListenerAttached = true
  }
  if (intervalHandle === undefined) {
    intervalHandle = setInterval(() => void drainOutbox(), DRAIN_INTERVAL_MS)
  }
  return () => {
    window.removeEventListener('online', handleOnline)
    onlineListenerAttached = false
    if (intervalHandle !== undefined) {
      clearInterval(intervalHandle)
      intervalHandle = undefined
    }
  }
}
