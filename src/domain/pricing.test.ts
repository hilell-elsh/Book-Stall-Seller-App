import { describe, expect, it } from 'vitest'
import { evaluateSale } from './pricing'
import type { Category, CatalogItem } from '../types/catalog'
import type { StepDiscountRule } from '../types/discount'

// Once sync (Phase 2) lets catalog edits arrive mid-session from another
// device, a discount rule can end up targeting a category/creator id that no
// longer exists locally (deleted/tombstoned elsewhere). Rule matching in
// evaluateSale is purely id-based (never dereferences the category/label/
// creator record to decide a match), so these cases must degrade to "rule
// matches nothing" rather than throw — this suite locks that property in
// ahead of Phase 2's Task 16 (tombstone cascades).

const item: CatalogItem = {
  id: 'item-1',
  name: 'ספר',
  price: 50,
  categoryId: 'cat-1',
  labelIds: [],
  creatorShares: [{ creatorId: 'creator-1', percentage: 100 }],
  active: true,
  order: 0,
  createdAt: 't0',
  updatedAt: 't0',
}

function stepRule(categoryId: string): StepDiscountRule {
  return {
    id: 'rule-1',
    kind: 'stepDiscount',
    name: 'הנחת קטגוריה',
    enabled: true,
    order: 0,
    stackable: true,
    target: { type: 'filter', categoryIds: [categoryId], labelIds: [], creatorIds: [] },
    startFromNth: 1,
    discount: { kind: 'percent', percent: 10 },
    createdAt: 't0',
    updatedAt: 't0',
  }
}

describe('evaluateSale rule-target resolution against missing/tombstoned ids', () => {
  it('does not crash when a rule targets a category id absent from the categories list', () => {
    const categories: Category[] = [] // the category has been deleted/tombstoned elsewhere
    const rule = stepRule('cat-1')
    expect(() => evaluateSale([{ itemId: item.id, qty: 1 }], categories, [item], [], [], [rule])).not.toThrow()
  })

  it('still applies the discount when the item still carries the targeted category id, even if the category record is gone', () => {
    const result = evaluateSale([{ itemId: item.id, qty: 1 }], [], [item], [], [], [stepRule('cat-1')])
    expect(result.totalDiscount).toBeGreaterThan(0)
  })

  it('matches nothing (no throw, zero discount) once no item references the tombstoned category id any more', () => {
    const result = evaluateSale([{ itemId: item.id, qty: 1 }], [], [item], [], [], [stepRule('some-other-cat')])
    expect(result.totalDiscount).toBe(0)
    expect(result.discounts).toEqual([])
  })

  it('does not crash describing a discount whose target category has no matching record for its name', () => {
    const result = evaluateSale([{ itemId: item.id, qty: 1 }], [], [item], [], [], [stepRule('cat-1')])
    expect(result.discounts[0].description).toBeTypeOf('string')
  })

  it('does not crash when a line item references a creator id absent from the creators list', () => {
    // creator-1 tombstoned elsewhere; item.creatorShares hasn't been re-synced yet
    const result = evaluateSale([{ itemId: item.id, qty: 1 }], [], [item], [], [], [])
    expect(() => result.lines[0].creatorShares).not.toThrow()
    // missing creator name is filtered out rather than surfacing a broken share
    expect(result.lines[0].creatorShares).toEqual([])
  })
})
