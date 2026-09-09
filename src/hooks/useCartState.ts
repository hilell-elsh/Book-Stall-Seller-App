import { useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { evaluateSale, type EvaluatedSale } from '../domain/pricing'
import type { CartLine } from '../types/sale'

export interface CartState {
  lines: CartLine[]
  evaluated: EvaluatedSale
  addItem: (itemId: string) => void
  setQty: (itemId: string, qty: number) => void
  removeItem: (itemId: string) => void
  clear: () => void
}

export function useCartState(initialLines: CartLine[] = []): CartState {
  const { categories, items, labels, creators, discountRules } = useAppData()
  const [lines, setLines] = useState<CartLine[]>(initialLines)

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
  }

  const evaluated = useMemo(
    () => evaluateSale(lines, categories, items, labels, creators, discountRules),
    [lines, categories, items, labels, creators, discountRules],
  )

  return { lines, evaluated, addItem, setQty, removeItem, clear }
}
