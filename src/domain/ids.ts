// crypto.randomUUID() is restricted to secure contexts (https://, localhost,
// or file:// depending on the browser) — it's undefined over plain http://
// to a LAN IP, which is exactly how this app gets tested/served during
// development. crypto.getRandomValues() has no such restriction, so build a
// v4 UUID from it manually as the fallback rather than assuming randomUUID
// is always available.
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
