# Browser API restrictions this app has hit (or is likely to hit)

Two *different* browser security boundaries matter for this app — don't
conflate them, they have different fixes:

## 1. Insecure context (plain `http://` to a non-localhost address)

Per this app's own finding (`src/domain/ids.ts`): `https://`, `localhost`,
and `file://` all count as secure; plain `http://<lan-ip>` (exactly how
phone testing over `serve-offline-build`'s LAN server works) does not.

APIs unavailable in an insecure context:
- `crypto.randomUUID()` — hit this while building this app; `src/domain/ids.ts`'s
  `newId()` falls back to `crypto.getRandomValues()`. A second, separate
  unguarded call site (`src/sync/deviceId.ts`) was missed by the first fix —
  when an API turns out to be restricted like this, grep for *every* call
  site across `src/`, not just the one a stack trace pointed at.
- `crypto.subtle` (SubtleCrypto) — not used by this app today; if a future
  feature needs it, expect the same restriction.
- `navigator.clipboard` (read and write) — hit by `DebugLogPanel`'s copy
  button, which already has a manual `<textarea>` fallback for this.
- Service Worker registration, WebAuthn, the Notification API — not used by
  this app; listed for completeness if they ever come up.

## 2. Opaque origin (`file://`, when opened directly rather than served)

A different restriction, mobile-browser-dependent rather than universal:
- `IndexedDB` — `src/sync/firebaseConfig.ts`'s `persistentLocalCache` call
  throws synchronously under this on some mobile browsers; already wrapped
  in try/catch with a non-persistent Firestore fallback.
- Suspected but unconfirmed: `<script type="module">` failing to execute at
  all under `file://`'s opaque origin on some mobile browsers — the
  still-open blank-white-screen-on-iPhone bug (see CLAUDE.md). This is why
  `serve-offline-build` serves over LAN http instead of testing file://
  directly.

When a new "works everywhere except X" report comes in, check both
categories before assuming a novel bug.
