import { describe, expect, it } from 'vitest'
import { buildPaymentReportRows, buildSalesCsvRows } from './reports'
import type { PaymentMethod } from '../types/paymentMethod'
import type { SaleRecord } from '../types/sale'

// paymentMethodId is a live reference (unlike itemName/categoryName on
// SaleLineItem, which already snapshot). Once sync lets a payment method be
// deleted on one device, a report built on another device via live lookup
// would silently lose the name from every historical sale. paymentMethodName
// closes that gap — these tests lock in that reports prefer the snapshot.

function baseRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 'r1',
    createdAt: '2026-09-16T10:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z',
    eventName: 'יריד',
    lines: [],
    discounts: [],
    subtotal: 0,
    totalDiscount: 0,
    total: 10,
    ...overrides,
  }
}

describe('buildSalesCsvRows payment method name', () => {
  it('prefers the snapshotted paymentMethodName even when the live payment method is gone', () => {
    const record = baseRecord({ paymentMethodId: 'pm-1', paymentMethodName: 'ביט' })
    const rows = buildSalesCsvRows([record], [])
    const dataRow = rows[2]
    expect(dataRow).toContain('ביט')
  })

  it('falls back to a live lookup for older records saved before the snapshot existed', () => {
    const record = baseRecord({ paymentMethodId: 'pm-1' })
    const methods: PaymentMethod[] = [
      { id: 'pm-1', name: 'מזומן', createdAt: 't0', updatedAt: 't0' },
    ]
    const rows = buildSalesCsvRows([record], methods)
    expect(rows[2]).toContain('מזומן')
  })

  it('renders an empty payment method cell when neither a snapshot nor a live record exists', () => {
    const record = baseRecord({ paymentMethodId: 'pm-deleted' })
    const rows = buildSalesCsvRows([record], [])
    expect(rows[2]).toContain('')
  })
})

describe('buildPaymentReportRows payment method name', () => {
  it('prefers the snapshotted paymentMethodName even when the live payment method is gone', () => {
    const record = baseRecord({ paymentMethodId: 'pm-1', paymentMethodName: 'ביט' })
    const rows = buildPaymentReportRows([record], [])
    expect(rows.some((row) => row[0] === 'ביט')).toBe(true)
  })

  it('falls back to a live lookup for older records saved before the snapshot existed', () => {
    const record = baseRecord({ paymentMethodId: 'pm-1' })
    const methods: PaymentMethod[] = [
      { id: 'pm-1', name: 'מזומן', createdAt: 't0', updatedAt: 't0' },
    ]
    const rows = buildPaymentReportRows([record], methods)
    expect(rows.some((row) => row[0] === 'מזומן')).toBe(true)
  })
})
