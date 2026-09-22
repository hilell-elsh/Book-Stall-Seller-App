import { useState } from 'react'
import * as store from '../data/store'
import type { ShiftSeller } from '../domain/shiftSeller'

export interface ShiftSellerState {
  shiftSeller: ShiftSeller | null
  setShiftSeller: (name: string) => void
  clearShiftSeller: () => void
}

// Thin React wrapper around store.ts's private shiftSeller key. Deliberately
// never touches AppDataContext/outbox — see domain/shiftSeller.ts for why
// this must stay local-only.
export function useShiftSeller(): ShiftSellerState {
  const [shiftSeller, setShiftSellerState] = useState<ShiftSeller | null>(() => store.getShiftSeller())

  function setShiftSeller(name: string) {
    const next: ShiftSeller = { name, setAt: new Date().toISOString() }
    store.saveShiftSeller(next)
    setShiftSellerState(next)
  }

  function clearShiftSeller() {
    store.saveShiftSeller(null)
    setShiftSellerState(null)
  }

  return { shiftSeller, setShiftSeller, clearShiftSeller }
}
