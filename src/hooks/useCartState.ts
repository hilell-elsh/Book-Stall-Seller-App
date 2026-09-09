import { useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { evaluateSale, type EvaluatedSale } from '../domain/pricing'
import type { CartLine, ManualDiscount } from '../types/sale'

export interface CartState {
  lines: CartLine[]
  evaluated: EvaluatedSale
  manualDiscount: ManualDiscount | null
  comment: string
  addItem: (itemId: string) => void
  setQty: (itemId: string, qty: number) => void
  removeItem: (itemId: string) => void
  clear: () => void
  setManualDiscount: (discount: ManualDiscount | null) => void
  setComment: (comment: string) => void
}

export function useCartState(
  initialLines: CartLine[] = [],
  initialManualDiscount: ManualDiscount | null = null,
  initialComment: string = '',
): CartState {
  const { categories, items, labels, creators, discountRules } = useAppData()
  const [lines, setLines] = useState<CartLine[]>(initialLines)
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(initialManualDiscount)
  const [comment, setComment] = useState(initialComment)

  function addItem(itemId: string) {
    setLines((prev) => {
      const existing = prev.find((line) => line.itemId === itemId)
      if (existing) {
        return prev.map((line) =>
          line.itemId === itemId ? { ...line, qty: line.qty + 1 } : line,
        )
      }
      return [...prev, { itemId, qty: 1 }]
    })
  }

  function removeItem(itemId: string) {
    setLines((prev) => prev.filter((line) => line.itemId !== itemId))
  }

  function setQty(itemId: string, qty: number) {
    if (qty <= 0) {
      removeItem(itemId)
      return
    }
    setLines((prev) => prev.map((line) => (line.itemId === itemId ? { ...line, qty } : line)))
  }

  function clear() {
    setLines([])
    setManualDiscount(null)
    setComment('')
  }

  const evaluated = useMemo(
    () =>
      evaluateSale(
        lines,
        categories,
        items,
        labels,
        creators,
        discountRules,
        manualDiscount ?? undefined,
      ),
    [lines, categories, items, labels, creators, discountRules, manualDiscount],
  )

  return {
    lines,
    evaluated,
    manualDiscount,
    comment,
    addItem,
    setQty,
    removeItem,
    clear,
    setManualDiscount,
    setComment,
  }
}
