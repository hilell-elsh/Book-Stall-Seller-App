import { newId } from '../domain/ids'

// A stable, generated-once identifier for this device/browser. Sync
// bookkeeping only — never a user identity, never synced itself (same
// private bucket as the stall PIN and, later, ShiftSeller).
const STORAGE_KEY = 'shaatnez:v1:deviceId'

export interface DeviceIdStorage {
  read(): string | null
  write(value: string): void
}

const localStorageBacked: DeviceIdStorage = {
  read: () => localStorage.getItem(STORAGE_KEY),
  write: (value) => localStorage.setItem(STORAGE_KEY, value),
}

export function getDeviceId(storage: DeviceIdStorage = localStorageBacked): string {
  const existing = storage.read()
  if (existing) return existing
  const generated = newId()
  storage.write(generated)
  return generated
}
