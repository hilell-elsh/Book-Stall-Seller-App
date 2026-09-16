import { getSyncOutbox, saveSyncOutbox } from '../data/store'
import { getDeviceId } from './deviceId'
import { drainOutbox } from './drain'

export interface OutboxOp {
  opId: string
  entity: string
  entityId: string
  op: 'upsert' | 'delete'
  payload: unknown
  deviceId: string
  clientTimestamp: string
  attempts: number
  lastError?: string
}

// Pure diff of a persistX(prev, next) pair into outbox ops. Compares by
// serialized value (not reference) so it's correct regardless of whether
// callers reuse object references for unchanged rows.
export function diffToOps<T extends { id: string }>(
  entity: string,
  prev: T[],
  next: T[],
  deviceId: string,
  clientTimestamp: string,
): OutboxOp[] {
  const prevById = new Map(prev.map((row) => [row.id, row]))
  const nextById = new Map(next.map((row) => [row.id, row]))
  const ops: OutboxOp[] = []

  for (const [id, row] of nextById) {
    const before = prevById.get(id)
    if (!before || JSON.stringify(before) !== JSON.stringify(row)) {
      ops.push({
        opId: `${entity}:${id}:${clientTimestamp}`,
        entity,
        entityId: id,
        op: 'upsert',
        payload: row,
        deviceId,
        clientTimestamp,
        attempts: 0,
      })
    }
  }

  for (const id of prevById.keys()) {
    if (!nextById.has(id)) {
      ops.push({
        opId: `${entity}:${id}:${clientTimestamp}`,
        entity,
        entityId: id,
        op: 'delete',
        payload: null,
        deviceId,
        clientTimestamp,
        attempts: 0,
      })
    }
  }

  return ops
}

// The persistX-facing entry point: diffs prev/next and appends any resulting
// ops onto the persisted local queue, then kicks off a drain attempt so a
// seller's edit reaches Firestore right away rather than waiting for the
// next load/online/interval trigger (those remain as retry safety nets —
// see drain.ts). Fire-and-forget: drainOutbox() no-ops instantly if sync
// isn't configured, and is safe to call while another drain is in flight.
export function enqueue<T extends { id: string }>(entity: string, prev: T[], next: T[]): void {
  const ops = diffToOps(entity, prev, next, getDeviceId(), new Date().toISOString())
  if (ops.length === 0) return
  saveSyncOutbox([...getSyncOutbox(), ...ops])
  void drainOutbox()
}

// Same as enqueue() but for single-document entities (currently just
// eventName) that aren't shaped as an array of id-rows.
export function enqueueSingleton<T>(entity: string, entityId: string, prev: T, next: T): void {
  if (JSON.stringify(prev) === JSON.stringify(next)) return
  const op: OutboxOp = {
    opId: `${entity}:${entityId}:${new Date().toISOString()}`,
    entity,
    entityId,
    op: 'upsert',
    payload: next,
    deviceId: getDeviceId(),
    clientTimestamp: new Date().toISOString(),
    attempts: 0,
  }
  saveSyncOutbox([...getSyncOutbox(), op])
  void drainOutbox()
}
