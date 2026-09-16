// Private, device-local "who's on shift here" setting (never synced). It only
// ever *defaults* the sale page's receiver field — the seller ringing up a
// sale isn't necessarily who a Bit/PayBox payment lands with, so `receiver`
// stays a required, editable per-sale confirmation regardless of this value.
export interface ShiftSeller {
  creatorId: string
  setAt: string
}

interface CreatorLike {
  id: string
  name: string
}

// Resolves the shift seller's current name to seed a new sale's receiver
// field. Degrades to '' (never throws) if no shift seller is set, or if the
// shift seller's creator has since been removed/tombstoned.
export function defaultReceiverForShiftSeller(
  shiftSeller: ShiftSeller | null,
  creators: CreatorLike[],
): string {
  if (!shiftSeller) return ''
  return creators.find((creator) => creator.id === shiftSeller.creatorId)?.name ?? ''
}
