# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"דוכן הספרים" (the book stand) — a point-of-sale app for a book fair / seller stand: browse a catalog, build a cart, apply discount rules, record sales, and export reports. Hebrew UI, RTL layout (`index.html` sets `lang="he" dir="rtl"`). No backend — all data lives in the browser's `localStorage`.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`.
- `npm run lint` — oxlint (config in `.oxlintrc.json`). There is no separate typecheck script; `npx tsc -b --noEmit` typechecks without emitting or building.
- `npm run preview` — serve the built `dist/` locally.
- No test runner is configured in this repo.

### Offline single-file builds

These bundle the entire app (JS + CSS inlined) into one `dist*/index.html` with no external assets, so it can be opened directly via `file://` (double-click) with no server — used for handing a build to non-technical testers.

- `npm run build:offline` — plain build to `dist-offline/`, starts fully empty.
- `npm run build:offline:demo` — build to `dist-offline-demo/`, pre-seeded with a small mock catalog (see "Demo seeding" below).

Both use `vite.config.offline.ts` (the `vite-plugin-singlefile` plugin), not the default `vite.config.ts`.

## Architecture

### Data flow: store → context → pages

- `src/data/localStorageDriver.ts` — thin `readJSON`/`writeJSON` wrapper over `localStorage`, all keys prefixed `shaatnez:v1:`.
- `src/data/store.ts` — one get/save function pair per entity (categories, items, discount rules, labels, sale records, payment methods, creators, event name). This is also where **backward-compatible normalization** happens: whenever a field is added to a persisted type, `store.ts` defaults it here on read (e.g. `item.labelIds ?? []`, `rule.stackable ?? true`) so old localStorage data doesn't break. When adding a new field to a persisted type, add its default here.
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

### Demo seeding (`src/dev/demoData.ts`, `src/main.tsx`)

`seedDemoDataIfEmpty()` writes a small mock catalog through the normal `store.ts` save functions, but only if the store is empty — guarded so it can never clobber real data and is a no-op on reload. Gated behind `import.meta.env.VITE_SEED_DEMO === 'true'` (build-time only, set via the `build:offline:demo` script), so it's fully dead-code-eliminated from the normal build.
