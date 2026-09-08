import type { Category, CatalogItem } from '../types/catalog'
import type { DiscountRule } from '../types/discount'
import type { AppliedDiscount, CartLine, SaleLineItem } from '../types/sale'

export interface EvaluatedSale {
  lines: SaleLineItem[]
  discounts: AppliedDiscount[]
  subtotal: number
  totalDiscount: number
  total: number
}

interface Unit {
  categoryId: string
  unitPriceAgorot: number
}

function toAgorot(shekels: number): number {
  return Math.round(shekels * 100)
}

function fromAgorot(agorot: number): number {
  return agorot / 100
}

function assertNever(value: never): never {
  throw new Error(`Unhandled discount rule kind: ${JSON.stringify(value)}`)
}

function describeDiscount(
  rule: DiscountRule,
  categoryById: Map<string, Category>,
): string {
  if (rule.kind === 'categoryStep') {
    const categoryName = categoryById.get(rule.categoryId)?.name ?? ''
    const discountLabel =
      rule.discount.kind === 'flat'
        ? `${rule.discount.amount}₪`
        : `${rule.discount.percent}%`
    return `${categoryName}: הנחה של ${discountLabel} מהפריט ה-${rule.startFromNth} ואילך`
  }

  const categoryNames = rule.categoryIds
    .map((id) => categoryById.get(id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ')
  return `${rule.bundleSize} יחידות מ-${categoryNames} במחיר חבילה ${rule.bundlePrice}₪`
}

export function evaluateSale(
  cart: CartLine[],
  categories: Category[],
  items: CatalogItem[],
  rules: DiscountRule[],
): EvaluatedSale {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  const lines: SaleLineItem[] = []
  const units: Unit[] = []

  for (const cartLine of cart) {
    const item = itemById.get(cartLine.itemId)
    if (!item || cartLine.qty <= 0) continue

    const unitPriceAgorot = toAgorot(item.price)
    lines.push({
      itemId: item.id,
      itemName: item.name,
      categoryId: item.categoryId,
      categoryName: categoryById.get(item.categoryId)?.name ?? '',
      unitPrice: item.price,
      qty: cartLine.qty,
      lineSubtotal: fromAgorot(unitPriceAgorot * cartLine.qty),
    })

    for (let i = 0; i < cartLine.qty; i++) {
      units.push({ categoryId: item.categoryId, unitPriceAgorot })
    }
  }

  const subtotalAgorot = units.reduce((sum, unit) => sum + unit.unitPriceAgorot, 0)
  const discounts: AppliedDiscount[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue

    if (rule.trigger) {
      const triggerQty = units.filter((unit) =>
        rule.trigger!.categoryIds.includes(unit.categoryId),
      ).length
      if (triggerQty < (rule.trigger.minQty ?? 1)) continue
    }

    let discountAgorot = 0

    switch (rule.kind) {
      case 'categoryStep': {
        const categoryUnits = units
          .filter((unit) => unit.categoryId === rule.categoryId)
          .sort((a, b) => b.unitPriceAgorot - a.unitPriceAgorot)
        if (categoryUnits.length >= rule.startFromNth) {
          const qualifying = categoryUnits.slice(rule.startFromNth - 1)
          for (const unit of qualifying) {
            const perUnit =
              rule.discount.kind === 'flat'
                ? toAgorot(rule.discount.amount)
                : Math.round((unit.unitPriceAgorot * rule.discount.percent) / 100)
            discountAgorot += Math.min(perUnit, unit.unitPriceAgorot)
          }
        }
        break
      }
      case 'bundlePrice': {
        const bundleUnits = units
          .filter((unit) => rule.categoryIds.includes(unit.categoryId))
          .sort((a, b) => b.unitPriceAgorot - a.unitPriceAgorot)
        const numBundles = Math.floor(bundleUnits.length / rule.bundleSize)
        if (numBundles > 0) {
          const qualifying = bundleUnits.slice(0, numBundles * rule.bundleSize)
          const qualifyingTotal = qualifying.reduce(
            (sum, unit) => sum + unit.unitPriceAgorot,
            0,
          )
          discountAgorot = Math.max(
            0,
            qualifyingTotal - toAgorot(rule.bundlePrice) * numBundles,
          )
        }
        break
      }
      default:
        assertNever(rule)
    }

    if (discountAgorot > 0) {
      discounts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        amount: fromAgorot(discountAgorot),
        description: describeDiscount(rule, categoryById),
      })
    }
  }

  const totalDiscountAgorot = discounts.reduce(
    (sum, discount) => sum + toAgorot(discount.amount),
    0,
  )
  const totalAgorot = Math.max(0, subtotalAgorot - totalDiscountAgorot)

  return {
    lines,
    discounts,
    subtotal: fromAgorot(subtotalAgorot),
    totalDiscount: fromAgorot(totalDiscountAgorot),
    total: fromAgorot(totalAgorot),
  }
}
