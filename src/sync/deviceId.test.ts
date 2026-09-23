import { describe, expect, it } from 'vitest'
import { getDeviceId, type DeviceIdStorage } from './deviceId'

function fakeStorage(initial: string | null = null): DeviceIdStorage {
  let value = initial
  return {
    read: () => value,
    write: (next) => {
      value = next
    },
  }
}

describe('getDeviceId', () => {
  it('generates and persists a new id when none exists', () => {
    const storage = fakeStorage(null)
    const id = getDeviceId(storage)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(storage.read()).toBe(id)
  })

  it('returns the existing id without generating a new one', () => {
    const storage = fakeStorage('existing-device-id')
    expect(getDeviceId(storage)).toBe('existing-device-id')
  })

  it('returns the same id across repeated calls', () => {
    const storage = fakeStorage(null)
    expect(getDeviceId(storage)).toBe(getDeviceId(storage))
  })
})
