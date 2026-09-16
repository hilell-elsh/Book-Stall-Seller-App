import { useSyncExternalStore } from 'react'
import { getSyncOutbox } from '../data/store'
import type { OutboxOp } from './outbox'

// An op that has failed this many times in a row is surfaced to the seller
// as "stuck" instead of retrying silently in the background forever.
const STUCK_ATTEMPTS_THRESHOLD = 3

export interface SyncStatus {
  online: boolean
  draining: boolean
  pendingCount: number
  stuckOps: OutboxOp[]
  lastSyncedAt: string | null
}

let lastSyncedAt: string | null = null
let draining = false
const listeners = new Set<() => void>()

function isOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true
  return navigator.onLine
}

function computeSnapshot(): SyncStatus {
  const outbox = getSyncOutbox()
  return {
    online: isOnline(),
    draining,
    pendingCount: outbox.length,
    stuckOps: outbox.filter((op) => op.attempts >= STUCK_ATTEMPTS_THRESHOLD),
    lastSyncedAt,
  }
}

// useSyncExternalStore requires getSnapshot to return the same reference
// until something actually changed, so the snapshot is only recomputed here,
// never on every read.
let snapshot: SyncStatus = computeSnapshot()

function notify(): void {
  snapshot = computeSnapshot()
  for (const listener of listeners) listener()
}

// Called by outbox.ts (op enqueued) and drain.ts (drain pass changed the
// outbox) so pendingCount/stuckOps stay current.
export function notifySyncOutboxChanged(): void {
  notify()
}

// Called by drain.ts right after at least one op reaches Firestore.
export function recordSyncSuccess(timestamp: string): void {
  lastSyncedAt = timestamp
  notify()
}

export function setDraining(value: boolean): void {
  draining = value
  notify()
}

export function getSyncStatusSnapshot(): SyncStatus {
  return snapshot
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener)
  if (typeof window === 'undefined') return () => listeners.delete(listener)
  const handleChange = () => notify()
  window.addEventListener('online', handleChange)
  window.addEventListener('offline', handleChange)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('online', handleChange)
    window.removeEventListener('offline', handleChange)
  }
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatusSnapshot)
}
