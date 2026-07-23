# Clipart Architecture Baseline (Phase 0)

This document freezes the current runtime architecture before any extraction/refactor phases.

## 1) Manifest clipart content-script load order

Current order in `manifest.json`:

1. `content_modules/clipart/scanner-utils.js`
2. `content_modules/clipart/scanner-site-router.js`
3. `content_modules/clipart/scanner-ui.js`
4. `content_modules/clipart/scanner-export.js`
5. `content_modules/clipart/scanner-sync.js`
6. `content_modules/clipart/scanner-render.js`
7. `content_modules/clipart/scanner-auto.js`
8. `content_modules/clipart/scanner-manual.js`
9. `content_modules/clipart/scanner-screenshot.js`
10. `content_modules/clipart/scanner-core.js`
11. `content_modules/clipart-scanner.js` (legacy marker)

## 2) Current module map

Namespace root: `window.STSClipartScanner`.

- `utils`: geometry/text/css helper APIs
- `siteRouter`: site profile resolution
- `ui`: progress and notification helpers
- `export`: empty clipart payload builder
- `sync`: local auth retrieval helper
- `render`: icon/button/html helper APIs
- `auto`: wrapper module delegating to `ctx.coreFns.*Legacy`
- `manual`: wrapper module delegating to `ctx.coreFns.*Legacy`
- `screenshot`: wrapper module delegating to `ctx.coreFns.*Legacy`

Legacy globals exposed by core:

- `window.__stsClipartPro`
- `window.__stsEnsureClipartLoggedIn`
- `window.__stsIsClipartAuthenticated`
- `window.__stsShowScanModePopup`
- `window.__stsOpenClipartPanelFromFab`
- `window.__stsIsClipartPanelOpen`
- `window.__stsOnClipartPanelVisibilityChange`

## 3) Current data schema baseline

Top-level payload baseline:

- `url`
- `title`
- `platform`
- `scannedAt`
- `categories[]`

Category baseline (normalized in core):

- `_stsId`
- `name`
- `prefix`
- `options[]`
- `optionCount`
- optional `kind`
- `kind === "text-frame"` includes `textFrame` object
- `kind === "title-only"` includes `titleLine` object and empty `options`

Option baseline (normalized in core):

- `_stsId`
- `label`
- `textContent`
- `capturedImage`
- `imageUrl`
- `bgColor`
- optional `kind` (`text-item` special handling)

Selection baseline (core-managed):

- `data._selection.groups`
- `data._selection.items`

## 4) Current user flows baseline

- Auto Scan
- Append Visible State
- Manual Scan + Manual Pick
- Screenshot Pick
- Panel render/refresh + edit interactions
- Export/capture/sync actions

## 5) Known coupling / technical debt baseline

- `scanner-core.js` acts as a god-file containing runtime orchestration, scanning, panel rendering/events, manual/screenshot pick modes, export, capture, sync, and legacy API exposure.
- `scanner-auto.js`, `scanner-manual.js`, `scanner-screenshot.js` are currently wrappers that delegate to `coreFns` supplied by core context.
- Core and wrapper modules form a legacy loop (core orchestrates wrappers; wrappers call back into legacy core functions).

## 6) Stability gates for future phases

Every phase must keep extension behavior stable and pass:

1. Content scripts still load successfully.
2. Namespace contracts remain valid.
3. No new `ReferenceError` or `TypeError` during load and core flows.
4. Features still work manually:
   - open panel
   - auto scan
   - append visible state
   - manual pick
   - screenshot pick
   - export/sync/capture (if enabled)
5. Rollback possible by reverting that phase commit only.

## 7) Phase 0 automated baseline checks

Phase 0 smoke checks now enforce:

- manifest clipart load order invariant
- expected namespace module declarations
- wrapper API shape and legacy delegation contract
- core legacy runtime exposure contract
- legacy no-op marker behavior in `clipart-scanner.js`
- schema helper baseline presence in unit tests
