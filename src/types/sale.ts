export interface CartLine {
  itemId: string
  qty: number
}

export interface SaleLineItem {
  itemId: string
  itemName: string
  categoryId: string
  categoryName: string
  unitPrice: number
  qty: number
  lineSubtotal: number
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
  paymentMethodId?: string
  receiver?: string
  lines: SaleLineItem[]
  discounts: AppliedDiscount[]
  subtotal: number
  totalDiscount: number
  total: number
}
