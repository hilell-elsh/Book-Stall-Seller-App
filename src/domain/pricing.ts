import type { Category, CatalogItem } from '../types/catalog'
import type { Creator } from '../types/creator'
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
  creatorIds: string[]
  unitPriceAgorot: number
  discountAgorot: number
}

interface NameMaps {
  categoryById: Map<string, Category>
  labelById: Map<string, Label>
  creatorById: Map<string, Creator>
  itemById: Map<string, CatalogItem>
}

export function toAgorot(shekels: number): number {
  return Math.round(shekels * 100)
}

export function fromAgorot(agorot: number): number {
  return agorot / 100
}

// Splits `totalAgorot` of discount across `units` proportionally to each unit's
// price, clamped so a unit already carrying discount from an earlier rule never
// goes below zero. The remainder goes to the last unit so the split sums exactly.
function distributeDiscount(units: Unit[], totalAgorot: number): void {
  if (totalAgorot <= 0 || units.length === 0) return
  const priceSum = units.reduce((sum, unit) => sum + unit.unitPriceAgorot, 0)
  let allocated = 0
  units.forEach((unit, index) => {
    const isLast = index === units.length - 1
    const share = isLast
      ? totalAgorot - allocated
      : priceSum > 0
        ? Math.round((totalAgorot * unit.unitPriceAgorot) / priceSum)
        : 0
    const applied = Math.max(0, Math.min(share, unit.unitPriceAgorot - unit.discountAgorot))
    unit.discountAgorot += applied
    allocated += applied
  })
}

function assertNever(value: never): never {
  throw new Error(`Unhandled discount rule kind: ${JSON.stringify(value)}`)
}

function matchesSelector(unit: Unit, selector: ItemSelector): boolean {
  switch (selector.type) {
    case 'filter': {
      const categoryOk =
        selector.categoryIds.length === 0 || selector.categoryIds.includes(unit.categoryId)
      const labelOk =
        selector.labelIds.length === 0 ||
        selector.labelIds.some((labelId) => unit.labelIds.includes(labelId))
      const creatorOk =
        selector.creatorIds.length === 0 ||
        selector.creatorIds.some((creatorId) => unit.creatorIds.includes(creatorId))
      return categoryOk && labelOk && creatorOk
    }
    case 'item':
      return selector.itemIds.includes(unit.itemId)
    default:
      return assertNever(selector)
  }
}

function describeSelector(selector: ItemSelector, maps: NameMaps): string {
  switch (selector.type) {
    case 'filter': {
      const categoryNames = selector.categoryIds
        .map((id) => maps.categoryById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
      const labelNames = selector.labelIds
        .map((id) => maps.labelById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
      const creatorNames = selector.creatorIds
        .map((id) => maps.creatorById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
      return [...categoryNames, ...labelNames, ...creatorNames].join(' + ')
    }
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
  if (rule.kind === 'stepDiscount') {
    const targetLabel = describeSelector(rule.target, maps)
    const discountLabel =
      rule.discount.kind === 'flat'
        ? `${rule.discount.amount}₪`
        : `${rule.discount.percent}%`
    return `${targetLabel}: הנחה של ${discountLabel} מהפריט ה-${rule.startFromNth} ואילך`
  }

  if (rule.kind === 'bundlePrice') {
    const targetLabel = describeSelector(rule.target, maps)
    return `${rule.bundleSize} יחידות מ-${targetLabel} במחיר חבילה ${rule.bundlePrice}₪`
  }

  const componentsLabel = rule.components
    .map((component) => `${component.qty}×${describeSelector(component.target, maps)}`)
    .join(' + ')
  return `קומבו: ${componentsLabel} ב-${rule.bundlePrice}₪`
}

export function evaluateSale(
  cart: CartLine[],
  categories: Category[],
  items: CatalogItem[],
  labels: Label[],
  creators: Creator[],
  rules: DiscountRule[],
): EvaluatedSale {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const labelById = new Map(labels.map((label) => [label.id, label]))
  const creatorById = new Map(creators.map((creator) => [creator.id, creator]))
  const maps: NameMaps = { categoryById, labelById, creatorById, itemById }

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
      lineDiscount: 0,
      creatorShares: item.creatorShares
        .map((share) => ({
          creatorId: share.creatorId,
          creatorName: creatorById.get(share.creatorId)?.name ?? '',
          percentage: share.percentage,
        }))
        .filter((share) => share.creatorName !== ''),
    })

    for (let i = 0; i < cartLine.qty; i++) {
      units.push({
        itemId: item.id,
        categoryId: item.categoryId,
        labelIds: item.labelIds,
        creatorIds: item.creatorShares.map((share) => share.creatorId),
        unitPriceAgorot,
        discountAgorot: 0,
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
            const applied = Math.min(perUnit, unit.unitPriceAgorot - unit.discountAgorot)
            unit.discountAgorot += applied
            discountAgorot += applied
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
          distributeDiscount(qualifying, discountAgorot)
        }
        break
      }
      case 'comboBundle': {
        // Components are expected to target non-overlapping sets of units for
        // predictable results; a unit matching two components' selectors is
        // only ever consumed by whichever component claims it first below.
        if (rule.components.length > 0) {
          const rawCounts = rule.components.map(
            (component) => units.filter((unit) => matchesSelector(unit, component.target)).length,
          )
          const numCombos = Math.min(
            ...rule.components.map((component, i) => Math.floor(rawCounts[i] / component.qty)),
          )

          if (numCombos > 0) {
            const usedIndices = new Set<number>()
            const consumedUnits: Unit[] = []
            let qualifyingTotal = 0

            for (const component of rule.components) {
              const pool = units
                .map((unit, index) => ({ unit, index }))
                .filter(({ unit, index }) => !usedIndices.has(index) && matchesSelector(unit, component.target))
                .sort((a, b) => b.unit.unitPriceAgorot - a.unit.unitPriceAgorot)
                .slice(0, numCombos * component.qty)

              for (const { unit, index } of pool) {
                usedIndices.add(index)
                consumedUnits.push(unit)
                qualifyingTotal += unit.unitPriceAgorot
              }
            }

            discountAgorot = Math.max(
              0,
              qualifyingTotal - toAgorot(rule.bundlePrice) * numCombos,
            )
            distributeDiscount(consumedUnits, discountAgorot)
          }
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

  const discountAgorotByItemId = new Map<string, number>()
  for (const unit of units) {
    discountAgorotByItemId.set(
      unit.itemId,
      (discountAgorotByItemId.get(unit.itemId) ?? 0) + unit.discountAgorot,
    )
  }
  for (const line of lines) {
    line.lineDiscount = fromAgorot(discountAgorotByItemId.get(line.itemId) ?? 0)
  }

  return {
    lines,
    discounts,
    subtotal: fromAgorot(subtotalAgorot),
    totalDiscount: fromAgorot(totalDiscountAgorot),
    total: fromAgorot(totalAgorot),
  }
}
