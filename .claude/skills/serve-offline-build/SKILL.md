---
name: serve-offline-build
description: Build the single-file offline app (npm run build:offline / build:offline:demo) and serve it over the LAN for phone testing, since opening it via file:// is unreliable on mobile. Use when asked to test on a phone, hand someone a build to try, or reproduce a bug that only shows up in the offline/single-file build.
disable-model-invocation: true
allowed-tools: Bash
---

# serve-offline-build

Known bug (see CLAUDE.md's "Commands" section): opening a `dist-offline/
index.html` build via `file://` directly is unreliable on mobile (confirmed
blank white screen on iPhone; unconfirmed whether it's the `<script
type="module">`-under-`file://` issue or something else — an attempted fix
was tried and reverted this session). The confirmed workaround is: build
normally, then serve the output over plain HTTP on the LAN and open that URL
in a normal phone browser (confirmed working on both Android and iPhone
Safari).

## 1. Pick the variant

Ask which of these is wanted, if not already obvious from context:

- **Sync-configured** (real Firebase creds from `.env.local`, requires PIN
  sign-in): `npm run build:offline`
- **Unconfigured / "phase 1" behavior** (blanks Firebase env vars so
  `isSyncConfigured` is false and PinGate doesn't gate anything):
  ```bash
  VITE_FIREBASE_API_KEY="" VITE_FIREBASE_PROJECT_ID="" VITE_FIREBASE_APP_ID="" VITE_STALL_EMAIL="" npm run build:offline
  ```
- **Demo** (pre-seeded mock catalog, own output dir):
  `npm run build:offline:demo` → builds to `dist-offline-demo/` instead.

## 2. Serve it (only once per session — don't restart on every rebuild)

```bash
cd dist-offline   # or dist-offline-demo for the demo variant
python3 -m http.server <port> --bind 0.0.0.0
```

Run this **backgrounded** (the calling agent's Bash tool `run_in_background`
option, or `nohup ... &`) — it needs to keep running while testing continues.
Pick a port unlikely to collide (e.g. 8787); note the PID/job so it can be
killed later.

Get the Mac's LAN IP: `ipconfig getifaddr en0` (the usual Wi-Fi interface on
this Mac). If that's empty (e.g. connected via Ethernet or a different
interface), fall back to `ipconfig getifaddr en1`, or `ifconfig | grep 'inet '
| grep -v 127.0.0.1` to find it manually.

Hand the user: `http://<lan-ip>:<port>/`

## 3. On every subsequent code change

**Rebuild into the same output directory** — do not restart the server, it
picks up the new `index.html` on the next request with no restart needed.
Re-run the same build command from step 1 into the same `dist-offline/` (or
`dist-offline-demo/`).

Then verify the new build is actually what's now being served (a stale
browser cache or a build that silently failed can otherwise go unnoticed):

```bash
curl -s http://<lan-ip>:<port>/ -o /dev/null -w "HTTP %{http_code}, size %{size_download} bytes\n"
```

Compare the byte size against the previous build's — an unexpectedly
identical size after a code change usually means the build didn't actually
pick up the edit (stale `tsc -b` cache is the most common cause; a `rm -rf
dist-offline` and rebuild is the reliable fix if this happens).

## 4. Caveats to keep in mind while testing this way

- This exposes the running build to anything else on the same LAN for as
  long as the server runs. Kill it (the backgrounded PID) when done.
- Plain `http://<lan-ip>` is an **insecure context** (only `https://`,
  `localhost`, and `file://` count as secure) — `crypto.randomUUID()` is
  unavailable here, which is exactly the bug this app hit this session
  (`src/domain/ids.ts`'s `newId()` now falls back to
  `crypto.getRandomValues()` for this). If some *other* browser API starts
  silently failing only when testing this way and not via `file://`/`https://`,
  suspect the same insecure-context restriction before assuming it's a new
  bug — see the `browser-repro` skill's `references/secure-context-apis.md`
  for the running list of APIs this affects.
- `dist-offline/` and `dist-offline-demo/` are both gitignored — nothing here
  risks landing in a commit.
