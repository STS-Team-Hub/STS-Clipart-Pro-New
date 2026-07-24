# Clipart Architecture Baseline

## Purpose

This document records the stable runtime boundaries that must be preserved while the clipart runtime continues migrating toward the final one-site-one-scanner-profile architecture.

For current profile routing, phase status, and final target, use:

- `docs/clipart-profile-architecture.md`
- `docs/clipart-profile-contract.md`
- `docs/clipart-profile-inventory.md`
- `docs/clipart-roadmap.md`

## Current state versus final target

Current state: **Phase 3 runtime cleanup complete on 2026-07-24**.

- Scanner-profile-first routing is integrated into the main scanner flows.
- All supported named sites now have dedicated scanner profile files; V2, legacy scanner-list, manual-profile, adapter, and consolidated shim layers are removed from manifest runtime loading.
- The final target is one canonical scanner profile package per supported named site.
- Unknown/custom/generic pages should continue to resolve through the default scanner profile.

## Stable runtime package facts

- Extension version is synchronized as 8.3 / 8.3.0.
- `<all_urls>` host permission is intentionally retained.
- Runtime content scripts are loaded in an explicit order in `manifest.json`.
- Sanitization/debug/shared helpers load before scanner modules.
- Dedicated scanner profiles load before scanner routing/core.
- Legacy compatibility globals are not part of the operational profile runtime.

## Content-script load order groups

The exact script list lives in `manifest.json`. Preserve these order groups unless tests and docs are updated in the same change:

1. Shared utilities: debug, sanitize, label/dropdown extraction, sync payload.
2. Product crawler and FAB manager.
3. Clipart scanner shared modules: utils, schema, state, collectors, profile context, profile registry, default profile.
4. Dedicated scanner profiles and shared native adapter glue.
5. Site router, UI, export, sync, render.
6. Auto, manual, screenshot, panel, core, and legacy marker.

## Frozen content-script load order

Phase 0 freezes this exact `manifest.json` content-script list. Any runtime phase that changes this list must update this baseline document and the smoke check in the same commit.

1. `content_modules/debug.js`
2. `content_modules/sanitize.js`
3. `content_modules/label-extraction.js`
4. `content_modules/dropdown-detection.js`
5. `content_modules/sync-payload.js`
6. `content_modules/product-crawler.js`
7. `content_modules/fab-manager.js`
8. `content_modules/clipart/scanner-utils.js`
9. `content_modules/clipart/scanner-schema.js`
10. `content_modules/clipart/scanner-state.js`
11. `content_modules/clipart/scanner-collectors.js`
12. `content_modules/clipart/scanner-profile-context.js`
13. `content_modules/clipart/scanner-profile-registry.js`
14. `content_modules/clipart/scanner-profile-default.js`
15. `content_modules/clipart/scanner-profile-pawesomehouse-customily.js`
16. `content_modules/clipart/scanner-profile-macorner-customily.js`
17. `content_modules/clipart/scanner-profile-geckocustom.js`
18. `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js`
19. `content_modules/clipart/scanner-profile-native-adapter.js`
20. `content_modules/clipart/scanner-profile-suzitee.js`
21. `content_modules/clipart/scanner-profile-trendingcustom.js`
22. `content_modules/clipart/scanner-profile-wanderprints.js`
23. `content_modules/clipart/scanner-profile-etsy.js`
24. `content_modules/clipart/scanner-profile-personalfury.js`
25. `content_modules/clipart/scanner-profile-interestpod.js`
26. `content_modules/clipart/scanner-profile-gossby.js`
27. `content_modules/clipart/scanner-site-router.js`
28. `content_modules/clipart/scanner-ui.js`
29. `content_modules/clipart/scanner-export.js`
30. `content_modules/clipart/scanner-sync.js`
31. `content_modules/clipart/scanner-render.js`
32. `content_modules/clipart/scanner-auto-default-v2.js`
33. `content_modules/clipart/scanner-auto.js`
34. `content_modules/clipart/scanner-manual.js`
35. `content_modules/clipart/scanner-screenshot.js`
36. `content_modules/clipart/scanner-panel.js`
37. `content_modules/clipart/scanner-core.js`
38. `content_modules/clipart-scanner.js`
