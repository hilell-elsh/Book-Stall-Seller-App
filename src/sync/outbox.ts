import { getSyncOutbox, saveSyncOutbox } from '../data/store'
import { getDeviceId } from './deviceId'

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
// ops onto the persisted local queue. No network here — draining the queue
// is Task 13.
export function enqueue<T extends { id: string }>(entity: string, prev: T[], next: T[]): void {
  const ops = diffToOps(entity, prev, next, getDeviceId(), new Date().toISOString())
  if (ops.length === 0) return
  saveSyncOutbox([...getSyncOutbox(), ...ops])
}
