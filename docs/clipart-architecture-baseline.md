# Clipart Architecture Baseline

## Purpose

This document records the stable runtime boundaries that must be preserved while the clipart runtime continues migrating toward the final one-site-one-scanner-profile architecture.

For current profile routing, phase status, and final target, use:

- `docs/clipart-profile-architecture.md`
- `docs/clipart-profile-contract.md`
- `docs/clipart-profile-inventory.md`
- `docs/clipart-roadmap.md`

## Current state versus final target

Current state: **Phase 8 in progress**.

- Scanner-profile-first routing is integrated into the main scanner flows.
- All supported named sites now have dedicated scanner profile files; V2, legacy scanner-list, manual-profile, adapter, and consolidated shim layers still coexist as compatibility/removal targets.
- The final target is one canonical scanner profile package per supported named site.
- Unknown/custom/generic pages should continue to resolve through the default scanner profile.

## Stable runtime package facts

- Extension version is synchronized as 8.3 / 8.3.0.
- `<all_urls>` host permission is intentionally retained.
- Runtime content scripts are loaded in an explicit order in `manifest.json`.
- Sanitization/debug/shared helpers load before scanner modules.
- Dedicated scanner profiles load before V2-to-scanner adapters.
- Legacy compatibility globals remain available until tests and replacement bridges prove they can be removed safely.

## Content-script load order groups

The exact script list lives in `manifest.json`. Preserve these order groups unless tests and docs are updated in the same change:

1. Shared utilities: debug, sanitize, label/dropdown extraction, sync payload.
2. Legacy and V2 site-profile registries and site profile files.
3. Manual-profile compatibility files.
4. Product crawler and FAB manager.
5. Clipart scanner shared modules: utils, schema, state, collectors, profile context, profile registry, default profile.
6. Dedicated scanner profiles.
7. Transitional consolidated scanner profiles.
8. V2-to-scanner profile adapters.
9. Site router, UI, export, sync, render.
10. Auto, manual, screenshot, panel, core, and legacy marker.

## Frozen content-script load order

Phase 0 freezes this exact `manifest.json` content-script list. Any runtime phase that changes this list must update this baseline document and the smoke check in the same commit.

1. `content_modules/debug.js`
2. `content_modules/sanitize.js`
3. `content_modules/label-extraction.js`
4. `content_modules/dropdown-detection.js`
5. `content_modules/sync-payload.js`
6. `content_modules/site-profiles.js`
7. `content_modules/site_profiles/index.js`
8. `content_modules/site_profiles/shared/cleanup.js`
9. `content_modules/site_profiles/shared/dom.js`
10. `content_modules/site_profiles/shared/values.js`
11. `content_modules/site_profiles/macorner.js`
12. `content_modules/site_profiles/pawesomehouse.js`
13. `content_modules/site_profiles/suzitee.js`
14. `content_modules/site_profiles/pawfecthouse.js`
15. `content_modules/site_profiles/trendingcustom.js`
16. `content_modules/site_profiles/interestpod.js`
17. `content_modules/site_profiles/personalfury.js`
18. `content_modules/site_profiles/generic.js`
19. `content_modules/site_profiles/etsy.js`
20. `content_modules/site_profiles/wanderprints.js`
21. `content_modules/site_profiles/gossby.js`
22. `content_modules/site_profiles/geckocustom.js`
23. `content_modules/manual_profiles/index.js`
24. `content_modules/manual_profiles/macorner.js`
25. `content_modules/manual_profiles/pawesomehouse.js`
26. `content_modules/manual_profiles/suzitee.js`
27. `content_modules/manual_profiles/geckocustom.js`
28. `content_modules/product-crawler.js`
29. `content_modules/fab-manager.js`
30. `content_modules/clipart/scanner-utils.js`
31. `content_modules/clipart/scanner-schema.js`
32. `content_modules/clipart/scanner-state.js`
33. `content_modules/clipart/scanner-collectors.js`
34. `content_modules/clipart/scanner-profile-context.js`
35. `content_modules/clipart/scanner-profile-registry.js`
36. `content_modules/clipart/scanner-profile-default.js`
37. `content_modules/clipart/scanner-profile-pawesomehouse-customily.js`
38. `content_modules/clipart/scanner-profile-macorner-customily.js`
39. `content_modules/clipart/scanner-profile-geckocustom.js`
40. `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js`
41. `content_modules/clipart/scanner-profile-suzitee.js`
42. `content_modules/clipart/scanner-profile-trendingcustom.js`
43. `content_modules/clipart/scanner-profile-wanderprints.js`
44. `content_modules/clipart/scanner-profile-etsy.js`
45. `content_modules/clipart/scanner-profile-site-v2-bridge.js`
46. `content_modules/clipart/scanner-profile-personalfury.js`
47. `content_modules/clipart/scanner-profile-interestpod.js`
48. `content_modules/clipart/scanner-profile-gossby.js`
49. `content_modules/clipart/scanner-profile-site-v2-consolidated.js`
50. `content_modules/clipart/scanner-profile-adapters.js`
51. `content_modules/clipart/scanner-site-router.js`
52. `content_modules/clipart/scanner-ui.js`
53. `content_modules/clipart/scanner-export.js`
54. `content_modules/clipart/scanner-sync.js`
55. `content_modules/clipart/scanner-render.js`
56. `content_modules/clipart/scanner-auto-default-v2.js`
57. `content_modules/clipart/scanner-auto.js`
58. `content_modules/clipart/scanner-manual.js`
59. `content_modules/clipart/scanner-screenshot.js`
60. `content_modules/clipart/scanner-panel.js`
61. `content_modules/clipart/scanner-core.js`
62. `content_modules/clipart-scanner.js`

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

For profile migrations, also run:

```bash
npm run test:unit
```
