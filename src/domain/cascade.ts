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
