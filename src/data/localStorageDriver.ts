const PREFIX = 'shaatnez:v1:'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Deliberately still throws (callers rely on this — see AppDataContext.tsx's
// persistX helpers, which write storage first specifically so a failure
// here happens before the outbox/React state are touched). This just makes
// sure a quota-exceeded failure lands in the debug log with enough context
// (which key, that it's likely quota) instead of a bare, unlabeled
// QuotaExceededError — the previous version threw straight from
// localStorage.setItem with no logging at all (Task 18).
export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (err) {
    console.error(`Storage write failed for "${key}" (likely quota exceeded) — this change was not saved`, err)
    throw err
  }
}
