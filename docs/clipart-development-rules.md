# Clipart Development Rules

## Purpose

This document defines current development rules for STS Clipart Pro runtime changes. The current architecture is scanner-profile-first. The final target is one canonical scanner profile package per supported named site.

## Current phase

Current state: **Phase 6 complete; Phase 7 planned**.

The scanner-profile contract is wired into Auto Scan, Append Visible State, Screenshot collector/title routing, and profile-aware Manual Pick paths. Safe ownership extraction has moved scan-mode UI into `scanner-ui.js` and Manual Scan empty-state mutation into `scanner-state.js`; legacy wrappers are deprecated compatibility bridges and warn when selected where applicable.

Phase 7 will standardize site ownership so every supported named site has one dedicated scanner profile file, fixtures, and tests. See `docs/clipart-roadmap.md` for the phase plan and `TEST_CASES.md` for the external Chrome checklist.

## Runtime layers and ownership

### Target layer: scanner profiles

Phase 7 naming note: this target layer now means **dedicated scanner profiles** for supported named sites.

New site-specific scanner behavior must prefer the `window.STSClipartScanner.profiles` contract in `content_modules/clipart/scanner-profile-*.js`.

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

### Canonical site package rule

Every new supported named site must include a canonical profile package:

1. `content_modules/clipart/scanner-profile-<site-id>.js`
2. `tests/fixtures/site-profiles/<site-id>/`
3. expected output JSON for relevant DOM patterns
4. unit coverage for resolver/routing/schema behavior
5. manifest load-order registration before `scanner-profile-adapters.js` when the profile registers directly
6. manual Chrome verification notes for Auto Scan, Append Visible State, Manual Pick, and Screenshot Pick

Existing supported sites should migrate to this package shape when they receive substantial updates.

### Transitional consolidated scanner profiles

`content_modules/clipart/scanner-profile-site-v2-consolidated.js` is a transitional bridge for sites that were moved into scanner registry ownership together.

Do not add unrelated new sites to this file. If a consolidated site receives substantial work, split it into `scanner-profile-<site-id>.js` with fixtures and tests.

### Transitional layer: V2 site profiles

Files in `content_modules/site_profiles/` are transitional V2 site profiles. They may still be used when a site already has V2 selectors/helpers or when adapting existing behavior is lower risk than rewriting it directly as a scanner profile.

V2 profiles should be adapted into scanner profiles through `content_modules/clipart/scanner-profile-adapters.js` when possible.

Do not add a new V2 profile if the same feature can be implemented cleanly as a dedicated scanner profile.

### Legacy layer: scanner-list routing

`content_modules/site-profiles.js` is the legacy scanner-list routing layer. It is a deprecated permanent fallback compatibility contract and warns when selected.

Do not add new feature behavior to this layer. Only update it when required to preserve legacy routing compatibility for an existing site during migration.

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
2. Create `content_modules/clipart/scanner-profile-<site-id>.js`.
3. Add the new script to the ordered `manifest.json` content-script list before `scanner-profile-adapters.js` if it registers a scanner profile directly.
4. Add fixtures under `tests/fixtures/site-profiles/<site-id>/` when practical. If legacy tests still require `HTML/*.txt`, keep those fixture paths in sync until the tests are migrated.
5. Add or update unit tests for routing, profile contract behavior, and normalized output shape.
6. Update `docs/clipart-profile-inventory.md`, `docs/clipart-new-site-onboarding.md` if the workflow changed, and `docs/clipart-roadmap.md` if phase status changed.
7. Run `npm run check` and relevant unit tests before shipping.
8. Run Chrome manual verification before marking the site production-verified.

## Updating an existing site

When modifying an existing site:

- If it already has a dedicated scanner profile, update that profile and its fixtures/tests.
- If it is consolidated, split it into a dedicated scanner profile when the change is substantial.
- If it is V2 adapter-backed, keep small compatibility fixes in V2 only when lower risk; otherwise create a dedicated scanner profile and leave V2 as a compatibility/source fixture.
- If the behavior currently lives in `content_modules/site-profiles.js` or `content_modules/manual_profiles/`, migrate it into a scanner profile instead of expanding legacy code.

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
