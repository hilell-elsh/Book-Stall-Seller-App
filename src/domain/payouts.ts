import { fromAgorot, toAgorot } from './pricing'
import type { SaleLineItem, SaleRecord } from '../types/sale'

export interface CreatorPayout {
  creatorId: string
  creatorName: string
  amount: number
}

export interface LineCreatorPayout {
  creatorId: string
  creatorName: string
  percentage: number
  amount: number
}

// Splits a line's post-discount amount across its snapshotted creator shares.
// Only reconciles the split to the exact post-discount amount when the shares sum
// to 100% — an item saved with a misconfigured split (sum != 100) is left as a
// literal per-share calculation instead of being silently forced to add up.
export function splitLineCreatorShares(line: SaleLineItem): LineCreatorPayout[] {
  if (line.creatorShares.length === 0) return []
  const postDiscountAgorot = toAgorot(line.lineSubtotal) - toAgorot(line.lineDiscount)
  const sumPercent = line.creatorShares.reduce((sum, share) => sum + share.percentage, 0)

  let allocated = 0
  return line.creatorShares.map((share, index) => {
    const isLast = index === line.creatorShares.length - 1
    const shareAgorot =
      isLast && sumPercent === 100
        ? postDiscountAgorot - allocated
        : Math.round((postDiscountAgorot * share.percentage) / 100)
    allocated += shareAgorot

    return {
      creatorId: share.creatorId,
      creatorName: share.creatorName,
      percentage: share.percentage,
      amount: fromAgorot(shareAgorot),
    }
  })
}

export function computeCreatorPayouts(record: SaleRecord): CreatorPayout[] {
  const totals = new Map<string, { name: string; amountAgorot: number }>()

  for (const line of record.lines) {
    for (const share of splitLineCreatorShares(line)) {
      const existing = totals.get(share.creatorId)
      totals.set(share.creatorId, {
        name: share.creatorName,
        amountAgorot: (existing?.amountAgorot ?? 0) + toAgorot(share.amount),
      })
    }
  }

  return [...totals.entries()].map(([creatorId, { name, amountAgorot }]) => ({
    creatorId,
    creatorName: name,
    amount: fromAgorot(amountAgorot),
  }))
}
