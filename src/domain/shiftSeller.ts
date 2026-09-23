// Private, device-local "who's on shift here" setting (never synced). It only
// ever *defaults* the sale page's receiver field — the seller ringing up a
// sale isn't necessarily who a Bit/PayBox payment lands with, so `receiver`
// stays a required, editable per-sale confirmation regardless of this value.
// Plain free text rather than a Creator reference: whoever's minding the
// till for a shift isn't necessarily in the `creators` revenue-share roster.
export interface ShiftSeller {
  name: string
  setAt: string
}

// Resolves the shift seller's name to seed a new sale's receiver field.
// Degrades to '' (never throws) if no shift seller is set.
export function defaultReceiverForShiftSeller(shiftSeller: ShiftSeller | null): string {
  return shiftSeller?.name ?? ''
}
