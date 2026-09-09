import { fromAgorot, toAgorot } from './pricing'
import { computeCreatorPayouts, splitLineCreatorShares } from './payouts'
import type { PaymentMethod } from '../types/paymentMethod'
import type { SaleRecord } from '../types/sale'

const dateFormatter = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' })

export function eventNamesFromRecords(records: SaleRecord[]): string[] {
  const byLatest = new Map<string, string>()
  for (const record of [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    byLatest.set(record.eventName, record.createdAt)
  }
  return [...byLatest.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([eventName]) => eventName)
}

export function recordsForEvent(records: SaleRecord[], eventName: string): SaleRecord[] {
  return records
    .filter((record) => record.eventName === eventName)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function buildSalesCsvRows(
  records: SaleRecord[],
  paymentMethods: PaymentMethod[],
): string[][] {
  const paymentMethodById = new Map(paymentMethods.map((method) => [method.id, method]))
  const rows: string[][] = [
    [
      'תאריך',
      'שם פריט',
      'קטגוריה',
      'כמות',
      'מחיר יחידה',
      'סכום שורה',
      'הנחת שורה',
      'אמצעי תשלום',
      'מקבל/ת',
      'יוצרים',
    ],
  ]
  for (const record of records) {
    const paymentMethodName = record.paymentMethodId
      ? (paymentMethodById.get(record.paymentMethodId)?.name ?? '')
      : ''
    for (const line of record.lines) {
      const creatorShares = splitLineCreatorShares(line)
        .map((share) => `${share.creatorName} ${share.percentage}% (${share.amount.toFixed(2)})`)
        .join('; ')
      rows.push([
        dateFormatter.format(new Date(record.createdAt)),
        line.itemName,
        line.categoryName,
        String(line.qty),
        line.unitPrice.toFixed(2),
        line.lineSubtotal.toFixed(2),
        line.lineDiscount.toFixed(2),
        paymentMethodName,
        record.receiver ?? '',
        creatorShares,
      ])
    }
  }
  return rows
}

export function buildPaymentReportRows(
  records: SaleRecord[],
  paymentMethods: PaymentMethod[],
): string[][] {
  const paymentMethodById = new Map(paymentMethods.map((method) => [method.id, method]))

  const byMethodReceiver = new Map<string, { methodName: string; receiver: string; agorot: number }>()
  for (const record of records) {
    const methodName = record.paymentMethodId
      ? (paymentMethodById.get(record.paymentMethodId)?.name ?? '')
      : ''
    const receiver = record.receiver ?? ''
    const key = `${methodName} ${receiver}`
    const existing = byMethodReceiver.get(key)
    byMethodReceiver.set(key, {
      methodName,
      receiver,
      agorot: (existing?.agorot ?? 0) + toAgorot(record.total),
    })
  }

  const creatorTotals = new Map<string, { name: string; agorot: number }>()
  let noCreatorAgorot = 0
  for (const record of records) {
    for (const payout of computeCreatorPayouts(record)) {
      const existing = creatorTotals.get(payout.creatorId)
      creatorTotals.set(payout.creatorId, {
        name: payout.creatorName,
        agorot: (existing?.agorot ?? 0) + toAgorot(payout.amount),
      })
    }
    for (const line of record.lines) {
      if (line.creatorShares.length === 0) {
        noCreatorAgorot += toAgorot(line.lineSubtotal) - toAgorot(line.lineDiscount)
      }
    }
  }

  const rows: string[][] = []
  rows.push(['סיכום לפי אמצעי תשלום ומקבל/ת'])
  rows.push(['אמצעי תשלום', 'מקבל/ת', 'סה"כ'])
  for (const { methodName, receiver, agorot } of byMethodReceiver.values()) {
    rows.push([methodName, receiver, fromAgorot(agorot).toFixed(2)])
  }

  rows.push([])
  rows.push(['סיכום תשלום ליוצרים'])
  rows.push(['יוצר', 'סה"כ'])
  for (const { name, agorot } of creatorTotals.values()) {
    rows.push([name, fromAgorot(agorot).toFixed(2)])
  }
  if (noCreatorAgorot > 0) {
    rows.push(['ללא יוצר', fromAgorot(noCreatorAgorot).toFixed(2)])
  }

  return rows
}
