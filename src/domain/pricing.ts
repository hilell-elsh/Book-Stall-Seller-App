import type { Category, CatalogItem } from '../types/catalog'
import type { Creator } from '../types/creator'
import type { BundlePriceRule, ComboBundleRule, DiscountRule, StepDiscountRule } from '../types/discount'
import type { Label } from '../types/label'
import type { ItemSelector } from '../types/selector'
import type { AppliedDiscount, CartLine, ManualDiscount, SaleLineItem } from '../types/sale'

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
  // Set once an exclusive (non-stackable) rule claims this unit; from then on
  // no other rule — exclusive or stackable — may touch it.
  locked: boolean
}

interface Assignment {
  unit: Unit
  amount: number
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
function distributeAssignments(units: Unit[], totalAgorot: number): Assignment[] {
  if (totalAgorot <= 0 || units.length === 0) return []
  const priceSum = units.reduce((sum, unit) => sum + unit.unitPriceAgorot, 0)
  let allocated = 0
  return units.map((unit, index) => {
    const isLast = index === units.length - 1
    const share = isLast
      ? totalAgorot - allocated
      : priceSum > 0
        ? Math.round((totalAgorot * unit.unitPriceAgorot) / priceSum)
        : 0
    const applied = Math.max(0, Math.min(share, unit.unitPriceAgorot - unit.discountAgorot))
    allocated += applied
    return { unit, amount: applied }
  })
}

// Pure (non-mutating) computation of what each of the three rule kinds would
// assign to units in `pool`, used to evaluate exclusive rules against a
// candidate pool without committing anything until a winner is picked — see
// the exclusive-rule resolution loop in evaluateSale.
function computeStepDiscountAssignments(rule: StepDiscountRule, pool: Unit[]): Assignment[] {
  const targetUnits = pool
    .filter((unit) => matchesSelector(unit, rule.target))
    .sort((a, b) => b.unitPriceAgorot - a.unitPriceAgorot)
  if (targetUnits.length < rule.startFromNth) return []
  const qualifying = targetUnits.slice(rule.startFromNth - 1)
  return qualifying
    .map((unit) => {
      const perUnit =
        rule.discount.kind === 'flat'
          ? toAgorot(rule.discount.amount)
          : Math.round((unit.unitPriceAgorot * rule.discount.percent) / 100)
      return { unit, amount: Math.min(perUnit, unit.unitPriceAgorot - unit.discountAgorot) }
    })
    .filter((assignment) => assignment.amount > 0)
}

function computeBundlePriceAssignments(rule: BundlePriceRule, pool: Unit[]): Assignment[] {
  const targetUnits = pool
    .filter((unit) => matchesSelector(unit, rule.target))
    .sort((a, b) => b.unitPriceAgorot - a.unitPriceAgorot)
  const numBundles = Math.floor(targetUnits.length / rule.bundleSize)
  if (numBundles === 0) return []
  const qualifying = targetUnits.slice(0, numBundles * rule.bundleSize)
  const qualifyingTotal = qualifying.reduce((sum, unit) => sum + unit.unitPriceAgorot, 0)
  const totalDiscount = Math.max(0, qualifyingTotal - toAgorot(rule.bundlePrice) * numBundles)
  return distributeAssignments(qualifying, totalDiscount)
}

function computeComboBundleAssignments(rule: ComboBundleRule, pool: Unit[]): Assignment[] {
  if (rule.components.length === 0) return []
  const rawCounts = rule.components.map(
    (component) => pool.filter((unit) => matchesSelector(unit, component.target)).length,
  )
  const numCombos = Math.min(
    ...rule.components.map((component, i) => Math.floor(rawCounts[i] / component.qty)),
  )
  if (numCombos <= 0) return []

  const usedIndices = new Set<number>()
  const consumedUnits: Unit[] = []
  let qualifyingTotal = 0

  for (const component of rule.components) {
    const candidates = pool
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit, index }) => !usedIndices.has(index) && matchesSelector(unit, component.target))
      .sort((a, b) => b.unit.unitPriceAgorot - a.unit.unitPriceAgorot)
      .slice(0, numCombos * component.qty)

    for (const { unit, index } of candidates) {
      usedIndices.add(index)
      consumedUnits.push(unit)
      qualifyingTotal += unit.unitPriceAgorot
    }
  }

  const totalDiscount = Math.max(0, qualifyingTotal - toAgorot(rule.bundlePrice) * numCombos)
  return distributeAssignments(consumedUnits, totalDiscount)
}

function computeRuleAssignments(rule: DiscountRule, pool: Unit[]): Assignment[] {
  switch (rule.kind) {
    case 'stepDiscount':
      return computeStepDiscountAssignments(rule, pool)
    case 'bundlePrice':
      return computeBundlePriceAssignments(rule, pool)
    case 'comboBundle':
      return computeComboBundleAssignments(rule, pool)
    default:
      return assertNever(rule)
  }
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
  manualDiscount?: ManualDiscount,
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
        locked: false,
      })
    }
  }

  const subtotalAgorot = units.reduce((sum, unit) => sum + unit.unitPriceAgorot, 0)
  const discounts: AppliedDiscount[] = []

  const activeRules = rules.filter((rule) => {
    if (!rule.enabled) return false
    if (rule.trigger) {
      const triggerQty = units.filter((unit) => matchesSelector(unit, rule.trigger!.selector)).length
      return triggerQty >= (rule.trigger.minQty ?? 1)
    }
    return true
  })

  const exclusiveRules = activeRules.filter((rule) => !rule.stackable)
  const stackableRules = activeRules.filter((rule) => rule.stackable)

  // Exclusive rules may only touch units no other discount has touched yet
  // (discountAgorot === 0 && !locked). When several exclusive rules could
  // each claim the same untouched units, award them round by round to
  // whichever remaining rule currently saves the customer the most — a
  // greedy pick that gets the customer a lower price than blindly following
  // the rules' configured order, without a full combinatorial search.
  let remainingExclusive = exclusiveRules
  while (remainingExclusive.length > 0) {
    const pool = units.filter((unit) => !unit.locked && unit.discountAgorot === 0)
    let best: { rule: DiscountRule; assignments: Assignment[]; total: number } | null = null

    for (const rule of remainingExclusive) {
      const assignments = computeRuleAssignments(rule, pool)
      const total = assignments.reduce((sum, assignment) => sum + assignment.amount, 0)
      if (total > 0 && (!best || total > best.total)) {
        best = { rule, assignments, total }
      }
    }

    if (!best) break

    for (const { unit, amount } of best.assignments) {
      unit.discountAgorot += amount
      unit.locked = true
    }
    discounts.push({
      ruleId: best.rule.id,
      ruleName: best.rule.name,
      amount: fromAgorot(best.total),
      description: describeDiscount(best.rule, maps),
    })
    remainingExclusive = remainingExclusive.filter((rule) => rule.id !== best.rule.id)
  }

  // Stackable rules apply in the seller's configured order, same as before,
  // just skipping units an exclusive rule has already locked.
  for (const rule of stackableRules) {
    const available = units.filter((unit) => !unit.locked)
    const assignments = computeRuleAssignments(rule, available)
    const discountAgorot = assignments.reduce((sum, assignment) => sum + assignment.amount, 0)

    for (const { unit, amount } of assignments) {
      unit.discountAgorot += amount
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

  const ruleDiscountAgorot = discounts.reduce((sum, discount) => sum + toAgorot(discount.amount), 0)

  // Manual discount is a cashier-entered, whole-sale adjustment applied on
  // top of whatever the rules already worked out; it isn't attributed to a
  // specific line (see line-discount computation below, which only reflects
  // `units`) or split with creators.
  const preManualTotalAgorot = Math.max(0, subtotalAgorot - ruleDiscountAgorot)
  if (manualDiscount) {
    const rawAgorot =
      manualDiscount.kind === 'flat'
        ? toAgorot(manualDiscount.amount)
        : Math.round((preManualTotalAgorot * manualDiscount.amount) / 100)
    const manualAgorot = Math.max(0, Math.min(rawAgorot, preManualTotalAgorot))
    if (manualAgorot > 0) {
      discounts.push({
        ruleId: 'manual',
        ruleName: 'הנחה ידנית',
        amount: fromAgorot(manualAgorot),
        description: 'הנחה ידנית',
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
