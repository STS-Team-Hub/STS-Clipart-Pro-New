# Clipart Development Rules

## Purpose

This document defines current development rules for STS Clipart Pro runtime changes. The target architecture is scanner-profile-first, with legacy and V2 layers kept only for compatibility or controlled migration.

## Current phase

Current state: **Phase 6 complete**.

The scanner-profile contract is wired into Auto Scan, Append Visible State, Screenshot collector/title routing, and profile-aware Manual Pick paths. Safe ownership extraction has moved scan-mode UI into `scanner-ui.js` and Manual Scan empty-state mutation into `scanner-state.js`; legacy wrappers are deprecated compatibility bridges and now warn when selected where applicable.

See `docs/clipart-roadmap.md` for the completed phase plan and remaining external manual Chrome verification checklist.

## Runtime layers and ownership

### Target layer: scanner profiles

New site-specific scanner behavior should prefer the `window.STSClipartScanner.profiles` contract in `content_modules/clipart/scanner-profile-*.js`.

A scanner profile should align with `docs/clipart-profile-contract.md`:

- `scanPage(ctx)` for Auto Scan.
- `scanVisibleState(ctx)` for Append Visible State.
- `scanManualGroupFromTitle(titleEl, ctx)` for Manual Pick.
- `collectOptionsInContainer(containerEl, ctx)` for Manual/container collection.
- `collectOptionsInRegion(region, ctx)` for Screenshot Pick.
- `detectNearestGroupTitleFromOption(optionEl, ctx)` for Screenshot auto naming.
- `normalizeGroup(rawGroup, ctx)` for group normalization.
- `normalizeOption(rawOption, ctx)` for option normalization.

If a site-specific profile does not need to override a method, it should rely on effective-profile fallback to the default scanner profile.

### Transitional layer: V2 site profiles

Files in `content_modules/site_profiles/` are transitional V2 site profiles. They may still be used when a site already has V2 selectors/helpers or when adapting existing behavior is lower risk than rewriting it directly as a scanner profile.

V2 profiles should be adapted into scanner profiles through `content_modules/clipart/scanner-profile-adapters.js` when possible.

Do not add a new V2 profile if the same feature can be implemented cleanly as a scanner profile.

### Legacy layer: scanner-list routing

`content_modules/site-profiles.js` is the legacy scanner-list routing layer. It is a deprecated permanent fallback compatibility contract and warns when selected.

Do not add new feature behavior to this layer. Only update it when required to preserve legacy routing compatibility for an existing site.

### Legacy/manual compatibility layer

Files in `content_modules/manual_profiles/` are legacy manual-profile assets. They are deprecated compatibility fixtures and warn when resolved; new Manual Pick behavior should prefer scanner profile methods.

If manual-profile logic is still needed, prefer adapting or migrating it into a scanner profile instead of expanding the legacy manual layer.

## Scanner core rules

`content_modules/clipart/scanner-core.js` is legacy-heavy orchestration code and should not receive new feature ownership unless there is no safer alternative.

When adding or changing behavior, prefer these ownership boundaries:

- Auto Scan: `content_modules/clipart/scanner-auto.js`, `scanner-auto-default-v2.js`, or `scanner-profile-*.js`.
- Manual Pick: `content_modules/clipart/scanner-manual.js` and scanner profile methods.
- Screenshot Pick: `content_modules/clipart/scanner-screenshot.js`, `scanner-collectors.js`, and scanner profile methods.
- Panel/UI: `content_modules/clipart/scanner-panel.js`, `scanner-ui.js`, and `scanner-render.js`.
- Export/sync/auth helpers: `scanner-export.js`, `scanner-sync.js`, and background message handlers where appropriate.
- Shared helpers: `scanner-utils.js`, `scanner-schema.js`, and `scanner-state.js`.

Bug fixes in `scanner-core.js` are allowed, but new code should be extracted to the proper module when practical.

## Data shape rules

Runtime data should be normalized before it enters shared state, panel rendering, export, or sync flows.

The canonical group shape should include:

- `id` or `_stsId` when available.
- `label` / `name`.
- `prefix`.
- `optionCount`.
- `options[]`.
- Optional `rect` and site-specific metadata.

The canonical option shape should include:

- `id` or `_stsId` when available.
- `label`.
- `text`, `value`, `name`, and/or `textContent`.
- `imageUrl` and/or `capturedImage` for image-backed options.
- `bgColor` for color-backed options.
- `optionType`, `sourceKind`, or equivalent classification metadata when available.
- Optional `rect`, selected-state metadata, and capture metadata.

Profiles may collect raw site-specific objects, but adapters or normalizers should convert them before shared runtime usage.

## New site onboarding rules

When adding support for a new site:

1. Identify the site engine or DOM pattern, such as Customily, Teeinblue, Shopify options, generic personalization forms, or a custom DOM.
2. Prefer a scanner profile in `content_modules/clipart/scanner-profile-<site>.js`.
3. Add the new script to the ordered `manifest.json` content-script list before `scanner-profile-adapters.js` if it registers a scanner profile directly.
4. Add fixtures under `tests/fixtures/site-profiles/<site>/` when practical. If legacy tests still require `HTML/*.txt`, keep those fixture paths in sync until the tests are migrated.
5. Add or update unit tests for routing, profile contract behavior, and normalized output shape.
6. Run `npm run check` and relevant unit tests before shipping.

## Refactor rules

Refactors should be incremental and behavior-preserving.

- Move one responsibility at a time.
- Keep legacy globals and namespace contracts stable until tests and replacement bridges prove they can be removed.
- Preserve manifest load order unless related tests and docs are updated in the same change.
- Prefer adapters over rewrites when migrating existing site logic.
- Avoid changing multiple site profiles in the same refactor unless the change is schema-only and covered by tests.
- Keep rollback simple: one phase should be revertible without reverting unrelated features.

## Repository scope notes

`ETC/` and `HTML/` are reference/sample material and are not considered primary runtime code for the clipart extension architecture.

Runtime architecture decisions should be based on `manifest.json`, `content_modules/`, `background.js`, `popup.*`, `panel.*`, `docs/`, and `tests/`.
