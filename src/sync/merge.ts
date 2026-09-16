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
