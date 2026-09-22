import { describe, expect, it } from 'vitest'
import { defaultReceiverForShiftSeller } from './shiftSeller'

describe('defaultReceiverForShiftSeller', () => {
  it('resolves the shift seller name', () => {
    expect(defaultReceiverForShiftSeller({ name: 'Dana', setAt: 't1' })).toBe('Dana')
  })

  it('returns empty string when no shift seller is set', () => {
    expect(defaultReceiverForShiftSeller(null)).toBe('')
  })
})
