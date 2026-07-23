# Clipart Architecture Baseline

## Purpose

This document records the stable runtime boundaries that must be preserved while the clipart runtime continues migrating toward scanner-profile-first ownership.

For current profile routing and phase status, use:

- `docs/clipart-profile-architecture.md`
- `docs/clipart-profile-contract.md`
- `docs/clipart-roadmap.md`

## Stable runtime package facts

- Extension version is synchronized as 8.3 / 8.3.0.
- `<all_urls>` host permission is intentionally retained.
- Runtime content scripts are loaded in an explicit order in `manifest.json`.
- Sanitization/debug/shared helpers load before scanner modules.
- Legacy compatibility globals remain available until a dedicated deprecation phase removes them.

## Content-script load order groups

The exact script list lives in `manifest.json`. Preserve these order groups unless tests and docs are updated in the same change:

1. Shared utilities: debug, sanitize, label/dropdown extraction, sync payload.
2. Legacy and V2 site-profile registries and site profile files.
3. Manual-profile compatibility files.
4. Product crawler and FAB manager.
5. Clipart scanner shared modules: utils, schema, state, collectors, profile context, profile registry, default profile.
6. Dedicated scanner profiles.
7. V2-to-scanner profile adapters.
8. Site router, UI, export, sync, render.
9. Auto, manual, screenshot, panel, core, and legacy marker.

## Runtime namespace baseline

Primary namespace:

- `window.STSClipartScanner`

Important submodules:

- `utils`
- `schema`
- `state`
- `collectors`
- `profileContext`
- `profiles`
- `siteRouter`
- `ui`
- `export`
- `sync`
- `render`
- `auto`
- `manual`
- `screenshot`
- `panel`

Legacy globals that must remain stable until removal is explicitly planned:

- `window.__stsClipartPro`
- `window.__stsEnsureClipartLoggedIn`
- `window.__stsIsClipartAuthenticated`
- `window.__stsShowScanModePopup`
- `window.__stsOpenClipartPanelFromFab`
- `window.__stsIsClipartPanelOpen`
- `window.__stsOnClipartPanelVisibilityChange`

## Data schema baseline

Top-level scan payload:

- `url`
- `title`
- `platform`
- `scannedAt`
- `categories[]`

Category/group payload:

- `id` or `_stsId` when available
- `name` / `label`
- `prefix`
- `options[]`
- `optionCount`
- optional `kind`, `rect`, and metadata

Option payload:

- `id` or `_stsId` when available
- `label`
- `text`, `value`, `name`, and/or `textContent`
- `capturedImage` and/or `imageUrl`
- `bgColor`
- optional `optionType`, `sourceKind`, `visualKind`, selected-state data, capture metadata, and `rect`

Selection baseline:

- `data._selection.groups`
- `data._selection.items`

## User flows that must remain stable

- Auto Scan
- Append Visible State
- Manual Scan and Manual Pick
- Screenshot Pick
- Panel render/refresh/edit interactions
- Export/capture/sync actions where enabled

## Stability gates

Every phase must keep extension behavior stable and pass:

1. Content scripts load successfully.
2. Namespace contracts remain valid.
3. No new `ReferenceError` or `TypeError` during load and core flows.
4. Profile resolver fallbacks are documented and tested.
5. Manual Chrome verification remains possible for required domains.
6. Rollback is possible by reverting the phase commit only.

## Automated baseline checks

At minimum, run:

```bash
npm run check
```

When fixture health allows, also run:

```bash
npm run test:unit
```
