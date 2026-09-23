// Pure cascade rules, shared between local mutation handlers and sync-delivered
// tombstones (Phase 2 switches deletes to soft `deletedAt` tombstones so a
// pulled delete never leaves another device's concurrent edit pointing at a
// vanished id). Called the same way whether the delete originated on this
// device or arrived from another one during a sync pull.

interface Tombstonable {
  id: string
  deletedAt?: string
}

interface ItemLike extends Tombstonable {
  categoryId: string
  labelIds: string[]
  creatorShares: { creatorId: string }[]
}

// Category delete cascades to its items: they're soft-deleted too, not
// hard-removed, so a concurrent edit to one of them (arriving from another
// device) has a tombstoned row to land on instead of a missing id.
export function applyCategoryTombstone<T extends ItemLike>(
  items: T[],
  categoryId: string,
  deletedAt: string,
): T[] {
  return items.map((item) =>
    item.categoryId === categoryId && !item.deletedAt ? { ...item, deletedAt } : item,
  )
}

// Label delete unlinks rather than cascade-deletes: items keep existing, they
// just stop wearing the tombstoned label.
export function applyLabelTombstone<T extends ItemLike>(items: T[], labelId: string): T[] {
  return items.map((item) =>
    item.labelIds.includes(labelId)
      ? { ...item, labelIds: item.labelIds.filter((id) => id !== labelId) }
      : item,
  )
}

// Creator delete unlinks rather than cascade-deletes: items keep existing and
// keep whatever other creator shares they have, they just stop crediting the
// tombstoned creator (same shape of fix as label unlinking above).
export function applyCreatorTombstone<T extends ItemLike>(items: T[], creatorId: string): T[] {
  return items.map((item) =>
    item.creatorShares.some((share) => share.creatorId === creatorId)
      ? { ...item, creatorShares: item.creatorShares.filter((share) => share.creatorId !== creatorId) }
      : item,
  )
}

export function isLive<T extends Tombstonable>(row: T): boolean {
  return !row.deletedAt
}

// Batch variants for sync-delivered tombstones: a local delete cascades
// immediately via the single-row functions above, but a tombstone arriving
// from another device via a Firestore pull lands as a plain field change
// through LWW merge, with nothing re-running the cascade against it. Worse,
// a race is possible where a concurrent item edit on another device carries
// a later `updatedAt` than the cascade's own item tombstone/unlink, so LWW
// picks the edit and the item silently reverts to referencing a
// category/label/creator that's already gone. Re-applying the cascade
// against every currently-tombstoned row on every pull self-heals that race
// — each single-row function is idempotent (only touches items still
// carrying the stale reference), so replaying already-applied tombstones is
// harmless.
export function applyCategoryTombstones<T extends ItemLike>(
  items: T[],
  categories: Tombstonable[],
): T[] {
  let result = items
  for (const category of categories) {
    if (category.deletedAt) result = applyCategoryTombstone(result, category.id, category.deletedAt)
  }
  return result
}

export function applyLabelTombstones<T extends ItemLike>(items: T[], labels: Tombstonable[]): T[] {
  let result = items
  for (const label of labels) {
    if (label.deletedAt) result = applyLabelTombstone(result, label.id)
  }
  return result
}

export function applyCreatorTombstones<T extends ItemLike>(items: T[], creators: Tombstonable[]): T[] {
  let result = items
  for (const creator of creators) {
    if (creator.deletedAt) result = applyCreatorTombstone(result, creator.id)
  }
  return result
}
