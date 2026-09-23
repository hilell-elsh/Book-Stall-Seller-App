---
name: browser-repro
description: Reproduce a browser/mobile compatibility bug (blank screen, silent JS error, an insecure-context or opaque-origin API failure) using headless Chromium with console/pageerror capture and a screenshot, including this app's known simulation tricks (forced-crash query param, IndexedDB.open failure, missing crypto.randomUUID/navigator.clipboard). Use when reproducing, debugging, or verifying a browser/mobile bug — whether reported by a user or observed directly.
allowed-tools: Bash, Read, WebSearch
---

# browser-repro

## One-time setup (per machine/worktree)

```bash
test -d node_modules/playwright || npm install --no-save playwright
```

`--no-save` keeps this out of `package.json`/`package-lock.json` — it's a
devtool for diagnosing bugs, not a runtime dependency of the app.
`node_modules` is already gitignored, so this never risks a stray commit.
First run downloads a Chromium binary (a couple hundred MB); skip the
reinstall if the directory already exists.

## The core pattern (why it's bundled as a script)

The recurring shape used repeatedly while debugging this app: launch
Chromium, register `console`/`pageerror` listeners **before** navigating
(registering them after `goto()` misses errors that happen during initial
load — this is exactly what made a real `crypto.randomUUID` bug hard to pin
down at first), navigate, wait, screenshot, dump captured output.
`scripts/repro.mjs` bundles this so you invoke it with flags instead of
rewriting it from scratch.

```bash
node .claude/skills/browser-repro/scripts/repro.mjs \
  --target <file-path-or-url> \
  [--crashtest] \
  [--init-code "<js>"]... \
  [--click "<css-selector>"]... \
  [--wait-ms 1500] \
  [--screenshot /tmp/repro.png]
```

- `--target`: a local file path (opened as `file://`) or an http(s) URL —
  e.g. the LAN URL from the `serve-offline-build` skill.
- `--crashtest`: appends `?crashtest=1` to the target (App.tsx's forced-crash
  query param — use this to confirm the ErrorBoundary fallback actually
  renders instead of the tree going blank).
- `--init-code`: raw JS executed via `page.addInitScript()` before
  navigation. This is the generic mechanism for every "simulate a
  restriction" trick below — pass it as a string, no new script needed.
- `--click`: CSS selector(s) to click in order after load (e.g. walk
  Settings → a manager section → "Add").
- After running, **read the screenshot with the `Read` tool** — the script
  only reports console/pageerror text; you need to actually look at the
  rendered page yourself to judge blank-vs-rendered.

## Known simulation tricks (pass via `--init-code`)

**IndexedDB unavailable (mobile `file://` opaque-origin restriction):**
```
--init-code "window.indexedDB.open = () => { throw new DOMException('IndexedDB unavailable', 'SecurityError') }"
```

**`crypto.randomUUID` unavailable (insecure `http://` context):**
```
--init-code "delete crypto.randomUUID"
```

**`navigator.clipboard` unavailable (insecure context — affects
`DebugLogPanel`'s copy button, which already has a `<textarea>` fallback for
exactly this):**
```
--init-code "delete navigator.clipboard"
```

See `references/secure-context-apis.md` before assuming a *new* API failure
is a fresh bug — check whether it's actually the same class of restriction
first.

## Reporting back

After a run: summarize the captured console/pageerror lines, describe what
the screenshot actually shows, and state plainly whether the hypothesis
under test is **confirmed**, **ruled out**, or **inconclusive** (and why) —
don't just paste the raw dump.

## If this is investigating a field-reported bug, not a fresh local repro

Check the `field-bug-triage` skill first — a Playwright repro attempt should
usually follow from a hypothesis formed off the user's actual
`DebugLogPanel` export, not replace it. A local headless run may simply not
reproduce a real-device/real-network condition (this app's own Firestore
convergence bug needed real two-device testing, not a single-browser repro).
