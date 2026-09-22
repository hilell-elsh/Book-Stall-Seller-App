---
name: field-bug-triage
description: Triage a bug reported from a real device/field use (not something currently reproducible locally) using this app's in-app debug log (src/debug/errorLog.ts, Settings' DebugLogPanel) as the primary evidence source. Use when a user reports "it's broken on my phone", "the app did X and I don't know why", or any bug report where you weren't there watching it happen.
---

# field-bug-triage

This app has a private, device-local, 200-entry ring-buffer debug log
(`src/debug/errorLog.ts`) that wraps `console.error`/`console.warn` and
listens for `window.onerror`/`unhandledrejection` — it exists precisely
because this app hit a bug (`crypto.randomUUID` unavailable) that showed
*nothing* on screen and required several rounds of the user manually
copy-pasting a minified stack trace before the real cause was found.
`DebugLogPanel` (Settings page) lets the user copy this log (or, if
`navigator.clipboard` is itself unavailable — ironic, but it's the same
insecure-context restriction — select it from a fallback `<textarea>`).

## Step 1 — ask for the log before doing anything else

Don't start guessing, and don't reach for `browser-repro` yet. Ask the user
to open Settings → the debug log panel, copy it, and paste it here. This is
higher-signal than a from-scratch repro attempt, because it's evidence of
what *actually* happened on the real device, not a guess at what might have.

If the report predates this feature, or the relevant entry has aged out of
the 200-entry cap, or the log is empty/unhelpful: fall back to asking
directly — browser, `file://` vs `http(s)` (and if `http(s)`, LAN-IP vs
localhost — the insecure-context boundary matters), online/offline at the
time, and exact steps taken. Only then consider a `browser-repro` attempt,
and treat it as one hypothesis test, not a guaranteed repro — this app's
real Firestore convergence bug needed actual two-device testing to catch; a
single local headless run wouldn't have shown it.

## Step 2 — correlate the log against source

Each entry is `[timestamp] [source] message`, where `source` is one of
`console.error` / `console.warn` / `window.error` / `unhandledrejection` /
`errorBoundary`. Grep `src/` for literal strings/function names from the
message or stack. If the field build had sourcemaps disabled (check
`vite.config.offline.ts` / the main `vite.config.ts` for `build.sourcemap`
— it isn't currently set), a stack trace may point at minified names/lines;
reason from the unminified source's logic and structure instead of trusting
exact line numbers, and consider whether enabling `build.sourcemap` would be
worth doing before the *next* field build.

## Step 3 — don't stop at the first matching call site

Two real bugs in this app's history are the kind that look fixed after the
first patch but aren't:

- **`crypto.randomUUID` unavailable**: the first fix patched
  `src/domain/ids.ts`'s `newId()`, but a *second*, separate unguarded
  `crypto.randomUUID()` call existed in `src/sync/deviceId.ts` and wasn't
  caught until it broke again in the field. **Before declaring a fix
  complete for any "API unavailable in some context" bug, grep for every
  call site of that API across `src/`, not just the one the stack trace
  pointed at.**
- **Two-device Firestore convergence**: a race between a `useEffect`-mirrored
  ref and Firestore's near-instant `onSnapshot` echo, only visible with real
  multi-device timing. For any sync-related field report, consider timing
  races between local state updates and `onSnapshot` callbacks as a
  first-class hypothesis, not an edge case — see CLAUDE.md's "Sync
  foundations" section for the exact bug and fix history.

## Step 4 — confirm, then hand off normally

Once a hypothesis is confirmed (via the log correlation, and optionally a
`browser-repro` simulation), fix it in the normal flow — this skill is only
about how the triage conversation starts and what evidence to trust first,
not a separate restricted mode.
