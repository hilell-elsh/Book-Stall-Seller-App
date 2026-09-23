export interface Timestamped {
  updatedAt: string
}

// Whole-row last-write-wins by updatedAt, per the Phase 2 conflict-resolution
// decision (config tables + eventName) — a later-arriving row always fully
// replaces the earlier one, ties favoring the incoming (remote) row.
export function resolveLastWriteWins<T extends Timestamped>(local: T, remote: T): T {
  return new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime() ? remote : local
}

// Merges a full remote row set into the local one: LWW per shared id, remote
// additions are adopted, local-only rows (not yet pushed) are kept as-is.
export function mergeRows<T extends Timestamped & { id: string }>(local: T[], remote: T[]): T[] {
  const localById = new Map(local.map((row) => [row.id, row]))
  const remoteIds = new Set(remote.map((row) => row.id))
  const merged = remote.map((remoteRow) => {
    const localRow = localById.get(remoteRow.id)
    return localRow ? resolveLastWriteWins(localRow, remoteRow) : remoteRow
  })
  const localOnly = local.filter((row) => !remoteIds.has(row.id))
  return [...merged, ...localOnly]
}

// Firestore's stored document is only ever a plain overwrite (setDoc), so
// which write "wins" there is decided by network arrival order, not by
// updatedAt — a genuine LWW guarantee only holds if whichever device's
// mergeRows() picks its own local row over a stale/racing remote one also
// pushes that winning row back, correcting Firestore to match. This finds
// exactly those rows so the caller can re-enqueue them. Relies on
// mergeRows/resolveLastWriteWins returning the winning object by reference
// (never a clone) — a property their own tests above already lock in.
export function findLocalWins<T extends { id: string }>(remote: T[], merged: T[]): T[] {
  const remoteById = new Map(remote.map((row) => [row.id, row]))
  return merged.filter((row) => {
    const remoteRow = remoteById.get(row.id)
    return remoteRow !== undefined && remoteRow !== row
  })
}
