export interface CartLine {
  itemId: string
  qty: number
}

export interface ManualDiscount {
  kind: 'flat' | 'percent'
  amount: number
}

export interface LineCreatorShare {
  creatorId: string
  creatorName: string
  percentage: number
}

export interface SaleLineItem {
  itemId: string
  itemName: string
  categoryId: string
  categoryName: string
  unitPrice: number
  qty: number
  lineSubtotal: number
  lineDiscount: number
  creatorShares: LineCreatorShare[]
}

export interface AppliedDiscount {
  ruleId: string
  ruleName: string
  amount: number
  description: string
}

export interface SaleRecord {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  eventName: string
  paymentMethodId?: string
  // Snapshotted at sale time, same idea as itemName/categoryName on
  // SaleLineItem: paymentMethodId is a live reference, so a payment method
  // deleted later (possibly on another device, post-sync) would otherwise
  // corrupt historical reports everywhere instead of just locally.
  paymentMethodName?: string
  receiver?: string
  lines: SaleLineItem[]
  discounts: AppliedDiscount[]
  manualDiscount?: ManualDiscount
  comment?: string
  subtotal: number
  totalDiscount: number
  total: number
}
