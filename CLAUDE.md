# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"דוכן הספרים" (the book stand) — a point-of-sale app for a book fair / seller stand: browse a catalog, build a cart, apply discount rules, record sales, and export reports. Hebrew UI, RTL layout (`index.html` sets `lang="he" dir="rtl"`). No backend — all data lives in the browser's `localStorage`.

## Plan doc

`.claude/plans/roadmap.md` is the long-range roadmap (Phase 2 cloud sync, designed in implementation-ready task-by-task detail; Phases 3–5 — access control, multi-stall, productionization — roadmap-level only, each gets its own dedicated planning session before implementation starts). Check it before starting any Phase 2+ work, and keep its "Execution status" note at the end current as tasks land.

**After finishing each task from the plan**, before moving to the next one: update the plan doc's "Execution status" note, and re-check this file (CLAUDE.md) — new modules, commands, or architecture introduced by that task usually belong here (e.g. a new `src/sync/` file worth a one-line mention, a new npm script, a changed data-flow diagram). Don't wait until the phase is fully done to document it.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`.
- `npm run lint` — oxlint (config in `.oxlintrc.json`). There is no separate typecheck script; `npx tsc -b --noEmit` typechecks without emitting or building.
- `npm run preview` — serve the built `dist/` locally.
- `npm run test` — run the Vitest suite (`vitest run`; config in `vitest.config.ts`, tests live next to the code as `*.test.ts`).

### Offline single-file builds

These bundle the entire app (JS + CSS inlined) into one `dist*/index.html` with no external assets, so it can be opened directly via `file://` (double-click) with no server — used for handing a build to non-technical testers.

- `npm run build:offline` — plain build to `dist-offline/`, starts fully empty.
- `npm run build:offline:demo` — build to `dist-offline-demo/`, pre-seeded with a small mock catalog (see "Demo seeding" below).

Both use `vite.config.offline.ts` (the `vite-plugin-singlefile` plugin), not the default `vite.config.ts`.

## Architecture

### Data flow: store → context → pages

- `src/data/localStorageDriver.ts` — thin `readJSON`/`writeJSON` wrapper over `localStorage`, all keys prefixed `shaatnez:v1:`.
- `src/data/store.ts` — one get/save function pair per entity (categories, items, discount rules, labels, sale records, payment methods, creators, event name). This is also where **backward-compatible normalization** happens: whenever a field is added to a persisted type, `store.ts` defaults it here on read (e.g. `item.labelIds ?? []`, `rule.stackable ?? true`) so old localStorage data doesn't break. When adding a new field to a persisted type, add its default here. Event name is the one exception to "one value per entity": it's stored as a timestamped `EventNameRecord` (`{ name, updatedAt }`, migrated transparently from the pre-Phase-2 bare string) so it can take part in sync's LWW conflict resolution like every other config entity.
- `src/context/AppDataContext.tsx` — the single global state container. Loads everything from `store.ts` into React state on mount, exposes CRUD/reorder functions for every entity, and persists back to `store.ts` on every mutation (`persistXxx` helpers do `setState` + `store.saveXxx` together). All pages read/write through `useAppData()`; there is no other state management.
- Pages (`src/pages/...`) are thin: they call `useAppData()` and compose components. `src/App.tsx` owns the single `useCartState()` instance above the tab switch so an in-progress sale survives navigating between tabs.

### Pricing engine (`src/domain/pricing.ts`)

`evaluateSale(cart, categories, items, labels, creators, rules, manualDiscount?)` is the one function that turns cart lines into priced totals. Internally it expands cart lines into per-unit `Unit` records (one per physical item, not per line) so discounts can apply below the line level, then:

1. Filters rules to `enabled` ones whose optional `trigger` condition (min qty of some selector present in the cart) is met.
2. Splits into **exclusive** (`stackable: false`) and **stackable** (`stackable: true`, the default) rules.
3. Exclusive rules only ever claim units with `discountAgorot === 0 && !locked`. When several exclusive rules could claim the same units, it greedily awards each round to whichever remaining rule currently gives the customer the biggest discount, then locks those units so nothing else can touch them — this is what "the discount can't combine with others" means in the UI.
4. Stackable rules then apply in the seller's configured order (`DiscountRuleManager`'s up/down reordering), skipping any locked units, and can layer on top of each other and of already-discounted units.
5. `manualDiscount` (a cashier-entered flat/percent adjustment from the sale page) is applied last, on the post-rule total, and isn't attributed to any line or creator share.

Rule kinds (`src/types/discount.ts`): `stepDiscount` (discount from the Nth matching unit onward), `bundlePrice` (fixed price per group of N units), `comboBundle` (fixed price for a set of different components together). Each rule kind has a pure `computeXAssignments(rule, pool) -> Assignment[]` function (never mutates) used both to trial exclusive-rule candidates and to actually apply a rule — mutation only happens where the result is committed in `evaluateSale`. Money is handled in agorot (integer cents) internally via `toAgorot`/`fromAgorot` to avoid floating-point drift; shekels only appear at the boundaries.

`ItemSelector` (`src/types/selector.ts`) — `{ type: 'filter', categoryIds, labelIds, creatorIds }` (OR-matched within each list, AND across lists) or `{ type: 'item', itemIds }` — is the shared targeting mechanism used by discount rule targets, triggers, and combo components.

### Cart state (`src/hooks/useCartState.ts`)

Wraps lines + manual discount + comment, and memoizes `evaluateSale(...)` as `evaluated`. Used both by `SalePage` (fresh cart, persists across tab switches) and `RecordsPage/RecordEditor` (seeded from an existing `SaleRecord` to edit a past sale in place, reusing the exact same cart UI).

### Reports/payouts (`src/domain/payouts.ts`, `src/domain/reports.ts`)

`computeCreatorPayouts` splits each line's *post-rule-discount* amount across its snapshotted `creatorShares` (percentages captured on the item at time of sale, not looked up live) — manual discount is deliberately excluded from this split. `reports.ts` builds CSV row arrays (`domain/csv.ts` handles escaping/BOM-for-Excel) for the three exports on the Records page: per-sale rows, per-payment-method/receiver totals, and per-item totals.

### Adding a new persisted field

1. Add it to the type in `src/types/*.ts`.
2. Default it in the corresponding `getXxx()` in `src/data/store.ts` if old data might lack it.
3. Thread it through `AppDataContext.tsx` CRUD functions if it's user-editable.
4. If it's a new *entity* (not a field on an existing one), it needs its own outbox wiring in its `persistX` helper (`enqueue(...)`) and its own inbound handler in the `startSyncPull(...)` call — see "Sync foundations" below. Individual fields never need per-field sync config; resolution is whole-row by default.

### Tombstones and soft deletes (Phase 2)

Every shared entity (`Category`, `CatalogItem`, `DiscountRule`, `Label`, `Creator`, `PaymentMethod`, `SaleRecord`) has an optional `deletedAt?: string`. **Deleting one of these through `AppDataContext` never removes the row from state/localStorage** — it sets `deletedAt` and leaves the row in place (a "tombstone"), so a delete that's already synced elsewhere can't leave another device's concurrent edit pointing at a vanished id. `useAppData()` exposes only `isLive`-filtered rows (`src/domain/cascade.ts`), so tombstoned rows disappear from the UI exactly as a hard delete used to — but they still round-trip through the outbox as an `upsert` (Firestore's copy of the doc also just gains `deletedAt`, it's never `deleteDoc`'d). `cascade.ts` also holds the pure cascade/unlink helpers for local deletes: `applyCategoryTombstone` (cascades to the category's items), `applyLabelTombstone`/`applyCreatorTombstone` (unlink from `item.labelIds`/`item.creatorShares` rather than cascading). Note: these cascades currently only run for *local* deletes — a tombstone arriving from another device via sync doesn't yet re-run them (that's Task 16).

### Sync foundations (`src/sync/`, Phase 2 — in progress, Tasks 10-15 done)

Cloud sync (see the plan doc above for full design) is being built additively — the app must keep working fully offline/local-only at every point in between tasks.

- `src/sync/firebaseConfig.ts` — lazy Firestore/Auth init, gated by `isSyncConfigured` (true only when `VITE_FIREBASE_*`/`VITE_STALL_EMAIL` env vars are set). Everything below no-ops without it. **Note for tests**: Vitest loads `.env.local` like Vite does, so `isSyncConfigured` is `true` in the test process whenever a real `.env.local` is present — any test that reaches real sync code (`drain.ts`, `backend.ts`, `pinGate.ts`) must mock its dependencies rather than relying on sync being "off" by default.
- `src/sync/deviceId.ts` — stable per-device id, generated once, never synced.
- `src/sync/pinGate.ts` + `src/components/PinGate.tsx` (wraps `main.tsx`) — the stopgap access gate: the "PIN" is the password of one shared Firebase Auth email/password account, not a real per-person login (that's Phase 3). Also starts the sync drain loop (see below) once `watchStallAccess` reports signed-in.
- `src/sync/backend.ts` — thin Firestore adapter (`pushAll`/`pullAll` per entity), kept small on purpose so a future backend migration doesn't mean rewriting every call site. Only used by `SyncDebugPanel`'s one-off bulk push/pull — per-op sync goes through `outbox.ts`/`drain.ts` instead.
- `src/sync/outbox.ts` — `diffToOps` (pure prev/next diff) and `enqueue` (the persistX-facing wrapper), appending to a private `syncOutbox` localStorage key and then firing an immediate best-effort `drainOutbox()` call so an edit reaches Firestore right away. Wired into every `persistX` helper in `AppDataContext.tsx` as of Task 12.
- `src/sync/drain.ts` (Task 13) — `drainOutbox()` pushes each queued op to Firestore via `setDoc`/`deleteDoc` (per-doc, not the bulk `backend.ts` path), removing it from the outbox on success and requeuing it with `attempts`/`lastError` on failure — including a per-op timeout so one op stuck with no network can't block the queue forever (Firestore's own SDK is relied on for retrying ordinary transient failures, per the Phase 2 plan). `startSyncDrain()` wires this to fire on load/sign-in, on the browser `online` event, and on a 30s foreground interval as a catch-all — no service worker, no background sync.
- `src/sync/merge.ts` (Task 10, wired in Task 14) — `resolveLastWriteWins` (whole-row LWW by `updatedAt`) and `mergeRows` (LWW per shared id + adopt remote-only rows + keep not-yet-pushed local-only rows). Reused as-is for every one of the 7 row entities *and* for sale records specifically — "append + id-based dedup" for new sale records turned out to be exactly what `mergeRows` already does, so there's no separate merge path for them.
- `src/sync/pull.ts` (Task 14) — `startSyncPull(handlers)`: one Firestore `onSnapshot` listener per collection plus one for the `eventName` singleton doc, calling the matching handler with the raw snapshot rows whenever another device's push lands. Purely inbound — never touches the outbox, so it can't loop a pulled change back into a push.
- `src/context/AppDataContext.tsx`'s mount-time `useEffect` wires `startSyncPull` in: each handler merges the incoming rows into local state via `sync/merge.ts` and writes straight to `store.ts`, deliberately bypassing `enqueue` (the change already exists on the server). Uses functional `setState` updates since these callbacks fire outside the normal render-triggered flow.
- Rule-target resolution against a tombstoned/vanished id needed no special-casing: `pricing.ts`'s selector matching is purely id-based, so once the referencing row is filtered out of what `AppDataContext` exposes, a discount rule targeting it just naturally matches nothing (locked in by Task 10's `pricing.test.ts` suite).
- `src/sync/syncStatus.ts` (Task 15) — a small external store (`useSyncExternalStore`, no polling) tracking `{online, draining, pendingCount, stuckOps, lastSyncedAt}`. `outbox.ts`/`drain.ts` call its `notifySyncOutboxChanged`/`recordSyncSuccess`/`setDraining` after they touch the outbox or Firestore, so the two UI consumers stay live: `src/components/SyncStatusBadge.tsx` (minimal always-visible dot+label, in `SideNav.tsx`'s mobile top bar and desktop sidebar) and `src/pages/ConfigPage/SyncStatusPanel.tsx` (full detail — connection status, pending count, last-synced-at, manual "sync now", stuck-op errors). Both render `null` when `!isSyncConfigured`. This replaced Task 11's temporary `SyncDebugPanel.tsx` (deleted).

### Demo seeding (`src/dev/demoData.ts`, `src/main.tsx`)

`seedDemoDataIfEmpty()` writes a small mock catalog through the normal `store.ts` save functions, but only if the store is empty — guarded so it can never clobber real data and is a no-op on reload. Gated behind `import.meta.env.VITE_SEED_DEMO === 'true'` (build-time only, set via the `build:offline:demo` script), so it's fully dead-code-eliminated from the normal build.
