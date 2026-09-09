import { fromAgorot, toAgorot } from './pricing'
import type { SaleRecord } from '../types/sale'

export interface CreatorPayout {
  creatorId: string
  creatorName: string
  amount: number
}

// Splits each line's post-discount amount across its snapshotted creator shares.
// Only reconciles the split to the exact post-discount amount when the shares sum
// to 100% — an item saved with a misconfigured split (sum != 100) is left as a
// literal per-share calculation instead of being silently forced to add up.
export function computeCreatorPayouts(record: SaleRecord): CreatorPayout[] {
  const totals = new Map<string, { name: string; amountAgorot: number }>()

  for (const line of record.lines) {
    if (line.creatorShares.length === 0) continue
    const postDiscountAgorot = toAgorot(line.lineSubtotal) - toAgorot(line.lineDiscount)
    const sumPercent = line.creatorShares.reduce((sum, share) => sum + share.percentage, 0)

    let allocated = 0
    line.creatorShares.forEach((share, index) => {
      const isLast = index === line.creatorShares.length - 1
      const shareAgorot =
        isLast && sumPercent === 100
          ? postDiscountAgorot - allocated
          : Math.round((postDiscountAgorot * share.percentage) / 100)
      allocated += shareAgorot

      const existing = totals.get(share.creatorId)
      totals.set(share.creatorId, {
        name: share.creatorName,
        amountAgorot: (existing?.amountAgorot ?? 0) + shareAgorot,
      })
    })
  }

  return [...totals.entries()].map(([creatorId, { name, amountAgorot }]) => ({
    creatorId,
    creatorName: name,
    amount: fromAgorot(amountAgorot),
  }))
}
