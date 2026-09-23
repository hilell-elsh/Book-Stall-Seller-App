import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readJSON, writeJSON } from './localStorageDriver'

// Task 18 (offline-resilience hardening): writeJSON previously threw a bare,
// unlabeled error straight from localStorage.setItem on quota exhaustion,
// with nothing distinguishing it in the debug log from any other failure.
// These tests lock in that a write failure is now logged with enough
// context to diagnose (which key, that it's likely quota) while still
// rethrowing — callers (AppDataContext's persistX helpers) rely on the
// throw happening before they touch React state or the sync outbox.

describe('writeJSON', () => {
  let backing: Record<string, string>
  let setItem: ReturnType<typeof vi.fn>

  beforeEach(() => {
    backing = {}
    setItem = vi.fn((key: string, value: string) => {
      backing[key] = value
    })
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => backing[key] ?? null,
      setItem,
      removeItem: (key: string) => {
        delete backing[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes JSON under the shaatnez:v1: prefix', () => {
    writeJSON('foo', { a: 1 })
    expect(backing['shaatnez:v1:foo']).toBe(JSON.stringify({ a: 1 }))
  })

  it('logs a clear, key-identifying message and rethrows when the underlying write fails', () => {
    const quotaError = new Error('The quota has been exceeded.')
    setItem.mockImplementation(() => {
      throw quotaError
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => writeJSON('saleRecords', [{ id: 'r1' }])).toThrow(quotaError)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0][0]).toContain('saleRecords')
    expect(consoleError.mock.calls[0][1]).toBe(quotaError)

    consoleError.mockRestore()
  })
})

describe('readJSON', () => {
  it('falls back to the default value when the underlying read throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('boom')
      },
    })
    expect(readJSON('foo', 'fallback')).toBe('fallback')
    vi.unstubAllGlobals()
  })
})
