import type { Category, CatalogItem } from '../types/catalog'
import type { DiscountRule } from '../types/discount'
import type { Label } from '../types/label'
import type { ItemSelector } from '../types/selector'
import type { AppliedDiscount, CartLine, SaleLineItem } from '../types/sale'

export interface EvaluatedSale {
  lines: SaleLineItem[]
  discounts: AppliedDiscount[]
  subtotal: number
  totalDiscount: number
  total: number
}

interface Unit {
  itemId: string
  categoryId: string
  labelIds: string[]
  unitPriceAgorot: number
}

interface NameMaps {
  categoryById: Map<string, Category>
  labelById: Map<string, Label>
  itemById: Map<string, CatalogItem>
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

function matchesSelector(unit: Unit, selector: ItemSelector): boolean {
  switch (selector.type) {
    case 'category':
      return selector.categoryIds.includes(unit.categoryId)
    case 'label':
      return selector.labelIds.some((labelId) => unit.labelIds.includes(labelId))
    case 'item':
      return selector.itemIds.includes(unit.itemId)
    default:
      return assertNever(selector)
  }
}

function describeSelector(selector: ItemSelector, maps: NameMaps): string {
  switch (selector.type) {
    case 'category':
      return selector.categoryIds
        .map((id) => maps.categoryById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
        .join(', ')
    case 'label':
      return selector.labelIds
        .map((id) => maps.labelById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
        .join(', ')
    case 'item':
      return selector.itemIds
        .map((id) => maps.itemById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
        .join(', ')
    default:
      return assertNever(selector)
  }
}

function describeDiscount(rule: DiscountRule, maps: NameMaps): string {
  const targetLabel = describeSelector(rule.target, maps)
  if (rule.kind === 'stepDiscount') {
    const discountLabel =
      rule.discount.kind === 'flat'
        ? `${rule.discount.amount}₪`
        : `${rule.discount.percent}%`
    return `${targetLabel}: הנחה של ${discountLabel} מהפריט ה-${rule.startFromNth} ואילך`
  }

  return `${rule.bundleSize} יחידות מ-${targetLabel} במחיר חבילה ${rule.bundlePrice}₪`
}

export function evaluateSale(
  cart: CartLine[],
  categories: Category[],
  items: CatalogItem[],
  labels: Label[],
  rules: DiscountRule[],
): EvaluatedSale {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const labelById = new Map(labels.map((label) => [label.id, label]))
  const maps: NameMaps = { categoryById, labelById, itemById }

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
      units.push({
        itemId: item.id,
        categoryId: item.categoryId,
        labelIds: item.labelIds,
        unitPriceAgorot,
      })
    }
  }

  const subtotalAgorot = units.reduce((sum, unit) => sum + unit.unitPriceAgorot, 0)
  const discounts: AppliedDiscount[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue

    if (rule.trigger) {
      const triggerQty = units.filter((unit) =>
        matchesSelector(unit, rule.trigger!.selector),
      ).length
      if (triggerQty < (rule.trigger.minQty ?? 1)) continue
    }

    let discountAgorot = 0

    switch (rule.kind) {
      case 'stepDiscount': {
        const targetUnits = units
          .filter((unit) => matchesSelector(unit, rule.target))
          .sort((a, b) => b.unitPriceAgorot - a.unitPriceAgorot)
        if (targetUnits.length >= rule.startFromNth) {
          const qualifying = targetUnits.slice(rule.startFromNth - 1)
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
        const targetUnits = units
          .filter((unit) => matchesSelector(unit, rule.target))
          .sort((a, b) => b.unitPriceAgorot - a.unitPriceAgorot)
        const numBundles = Math.floor(targetUnits.length / rule.bundleSize)
        if (numBundles > 0) {
          const qualifying = targetUnits.slice(0, numBundles * rule.bundleSize)
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
        description: describeDiscount(rule, maps),
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
