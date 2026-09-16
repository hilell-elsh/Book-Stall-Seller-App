import { describe, expect, it } from 'vitest'
import { defaultReceiverForShiftSeller } from './shiftSeller'

const creators = [
  { id: 'creator-1', name: 'Dana' },
  { id: 'creator-2', name: 'Noa' },
]

describe('defaultReceiverForShiftSeller', () => {
  it('resolves the shift seller creator name', () => {
    expect(defaultReceiverForShiftSeller({ creatorId: 'creator-2', setAt: 't1' }, creators)).toBe('Noa')
  })

  it('returns empty string when no shift seller is set', () => {
    expect(defaultReceiverForShiftSeller(null, creators)).toBe('')
  })

  it('degrades to empty string rather than throwing when the creator no longer exists', () => {
    expect(defaultReceiverForShiftSeller({ creatorId: 'gone', setAt: 't1' }, creators)).toBe('')
  })
})
