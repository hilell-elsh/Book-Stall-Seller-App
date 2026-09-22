import { afterEach, describe, expect, it } from 'vitest'
import { newId } from './ids'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const originalRandomUUID = crypto.randomUUID

describe('newId', () => {
  afterEach(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: originalRandomUUID, configurable: true })
  })

  it('returns a valid v4 UUID via crypto.randomUUID when available', () => {
    expect(newId()).toMatch(UUID_RE)
  })

  it('falls back to crypto.getRandomValues when randomUUID is unavailable (e.g. an insecure http:// context)', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })

    const id = newId()
    expect(id).toMatch(UUID_RE)
  })

  it('produces unique ids across calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
  })
})
