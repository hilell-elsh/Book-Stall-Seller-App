import { fromAgorot, toAgorot } from './pricing'
import { computeCreatorPayouts } from './payouts'
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

  // One column per item/creator that actually appears, in order of first appearance.
  // Kept after the fixed columns so a long item list doesn't push totals/payment out of view.
  const itemColumns: { name: string; unitPrice: number }[] = []
  const itemColumnIndex = new Map<string, number>()
  const creatorColumns: string[] = []
  const creatorColumnIndex = new Map<string, number>()

  for (const record of records) {
    for (const line of record.lines) {
      if (!itemColumnIndex.has(line.itemId)) {
        itemColumnIndex.set(line.itemId, itemColumns.length)
        itemColumns.push({ name: line.itemName, unitPrice: line.unitPrice })
      }
    }
    for (const payout of computeCreatorPayouts(record)) {
      if (!creatorColumnIndex.has(payout.creatorId)) {
        creatorColumnIndex.set(payout.creatorId, creatorColumns.length)
        creatorColumns.push(payout.creatorName)
      }
    }
  }

  const itemQtyTotals = new Array(itemColumns.length).fill(0)
  const creatorTotalsAgorot = new Array(creatorColumns.length).fill(0)
  let subtotalAgorot = 0
  let discountAgorot = 0
  let totalAgorot = 0

  const dataRows: string[][] = []
  for (const record of records) {
    const paymentMethodName = record.paymentMethodId
      ? (paymentMethodById.get(record.paymentMethodId)?.name ?? '')
      : ''

    const itemCells = new Array(itemColumns.length).fill('')
    for (const line of record.lines) {
      const index = itemColumnIndex.get(line.itemId)!
      itemCells[index] = String(line.qty)
      itemQtyTotals[index] += line.qty
    }

    const creatorCells = new Array(creatorColumns.length).fill('')
    for (const payout of computeCreatorPayouts(record)) {
      const index = creatorColumnIndex.get(payout.creatorId)!
      creatorCells[index] = payout.amount.toFixed(2)
      creatorTotalsAgorot[index] += toAgorot(payout.amount)
    }

    subtotalAgorot += toAgorot(record.subtotal)
    discountAgorot += toAgorot(record.totalDiscount)
    totalAgorot += toAgorot(record.total)

    dataRows.push([
      dateFormatter.format(new Date(record.createdAt)),
      record.subtotal.toFixed(2),
      record.totalDiscount.toFixed(2),
      record.total.toFixed(2),
      paymentMethodName,
      record.receiver ?? '',
      record.comment ?? '',
      ...itemCells,
      ...creatorCells,
    ])
  }

  const header = [
    'תאריך',
    'סכום ביניים',
    'הנחה',
    'סה"כ',
    'אמצעי תשלום',
    'מקבל/ת',
    'הערה',
    ...itemColumns.map((item) => `${item.name} (${item.unitPrice.toFixed(2)})`),
    ...creatorColumns,
  ]

  const totalRow = [
    'סה"כ',
    fromAgorot(subtotalAgorot).toFixed(2),
    fromAgorot(discountAgorot).toFixed(2),
    fromAgorot(totalAgorot).toFixed(2),
    '',
    '',
    '',
    ...itemQtyTotals.map((qty) => String(qty)),
    ...creatorTotalsAgorot.map((agorot) => fromAgorot(agorot).toFixed(2)),
  ]

  return [header, totalRow, ...dataRows]
}

export function buildItemSummaryRows(records: SaleRecord[]): string[][] {
  const totals = new Map<
    string,
    { itemName: string; categoryName: string; qty: number; subtotalAgorot: number; discountAgorot: number }
  >()

  for (const record of records) {
    for (const line of record.lines) {
      const existing = totals.get(line.itemId)
      totals.set(line.itemId, {
        itemName: line.itemName,
        categoryName: line.categoryName,
        qty: (existing?.qty ?? 0) + line.qty,
        subtotalAgorot: (existing?.subtotalAgorot ?? 0) + toAgorot(line.lineSubtotal),
        discountAgorot: (existing?.discountAgorot ?? 0) + toAgorot(line.lineDiscount),
      })
    }
  }

  const items = [...totals.values()].sort((a, b) => b.qty - a.qty)

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)
  const totalSubtotalAgorot = items.reduce((sum, item) => sum + item.subtotalAgorot, 0)
  const totalDiscountAgorot = items.reduce((sum, item) => sum + item.discountAgorot, 0)

  const rows: string[][] = [
    ['פריט', 'קטגוריה', 'כמות', 'סכום ביניים', 'הנחה', 'סה"כ'],
    [
      'סה"כ',
      '',
      String(totalQty),
      fromAgorot(totalSubtotalAgorot).toFixed(2),
      fromAgorot(totalDiscountAgorot).toFixed(2),
      fromAgorot(totalSubtotalAgorot - totalDiscountAgorot).toFixed(2),
    ],
  ]

  for (const item of items) {
    rows.push([
      item.itemName,
      item.categoryName,
      String(item.qty),
      fromAgorot(item.subtotalAgorot).toFixed(2),
      fromAgorot(item.discountAgorot).toFixed(2),
      fromAgorot(item.subtotalAgorot - item.discountAgorot).toFixed(2),
    ])
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
