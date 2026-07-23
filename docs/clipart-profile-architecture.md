# Clipart Profile Architecture — Current State

## Scope

This document is the source-of-truth architecture snapshot for the current STS Clipart Pro 8.3 runtime. It replaces older Phase 1-only assumptions and reflects the repository as implemented now.

## Current phase status

The repository is past the original Phase 1 baseline. The current implementation is best described as **Phase 6 complete: scanner-profile-first routing is integrated, safe UI/state ownership has been extracted, legacy compatibility layers are deprecated warning-backed fallback contracts, and automated QA/release checks are hardened**.

Completed or mostly completed:

- Scanner-profile registry and effective-profile fallback are implemented.
- Auto Scan routes through the effective scanner profile via `scanPage(ctx)`.
- Append Visible State routes through the effective scanner profile via `scanVisibleState(ctx)`.
- Screenshot Pick option collection and nearest-title detection route through the effective scanner profile before falling back to generic collectors.
- Legacy V2 site profiles can be adapted into scanner profiles.
- Manual Scan panel bootstrap is owned by `scanner-manual.js`, and manual group collection exposes a profile-first route through the effective scanner profile.

Still transitional:

- Legacy picker internals remain only where tests still prove runtime dependency; removal is no longer assumed safe without replacing those dependencies first.
- Legacy scanner-list routing and V2 site profiles remain for compatibility, with the scanner-list route documented as a permanent fallback contract.
- Manual legacy profile assets remain as compatibility fixtures for older manual fallback coverage.
- Phase 6 automated QA/release checks run through the discovered unit suite and release consistency guards; real-browser domain verification remains external.

## Runtime profile layers

### 1. Target layer: scanner profiles

Scanner profiles live under `content_modules/clipart/scanner-profile-*.js` and register with `window.STSClipartScanner.profiles`.

The effective scanner profile is resolved by `content_modules/clipart/scanner-profile-registry.js` and is composed from:

1. the default scanner profile, and
2. the best matched site-specific scanner profile.

Missing methods on a site-specific profile fall back to the default scanner profile. This is the primary target architecture.

Current dedicated scanner profiles include:

- `default`
- `pawesomehouse-customily-manual`
- `macorner-customily`
- `geckocustom`
- `pawfecthouse-teeinblue`

### 2. Transitional layer: V2 site profiles

V2 site profiles live under `content_modules/site_profiles/` and register with `window.STSSiteProfilesV2`.

They are transitional because they predate the scanner-profile contract. When a V2 profile exposes `autoScan()` or `scanManualGroupFromTitle()`, `content_modules/clipart/scanner-profile-adapters.js` adapts it into a scanner profile.

Current V2 site-profile files include:

- `generic`
- `macorner`
- `pawesomehouse`
- `suzitee`
- `pawfecthouse`
- `trendingcustom`
- `interestpod`
- `personalfury`
- `etsy`
- `wanderprints`
- `gossby`
- `geckocustom`

### 3. Legacy layer: scanner-list routing

`content_modules/site-profiles.js` exposes the legacy scanner-list routing layer (`window.STSSiteProfiles`). It remains as a deprecated permanent fallback compatibility contract and emits a one-time warning when selected.

Do not add new feature behavior here unless it is required to preserve existing legacy behavior.

### 4. Legacy/manual compatibility layer

`content_modules/manual_profiles/` still contains manual-profile assets. These are deprecated compatibility fixtures, not the target ownership layer, and the registry emits a one-time warning when one resolves.

New Manual Pick behavior must prefer scanner-profile methods or adapter-backed scanner profiles.

## Feature routing reality

| Feature | Current primary route | Fallback / transitional behavior | Status |
|---|---|---|---|
| Auto Scan | Effective scanner profile `scanPage(ctx)` | Legacy scan pipeline when resolver is unavailable or returns no usable groups | Implemented, still fallback-compatible |
| Append Visible State | Effective scanner profile `scanVisibleState(ctx)` | Legacy `scanDOM()` append path when resolver returns no groups | Implemented, still fallback-compatible |
| Manual Pick | `scanner-manual.js` owns Manual Scan bootstrap and exposes effective scanner profile `scanManualGroupFromTitle()` + `normalizeGroup()` collection; Manual Scan empty-state mutation is owned by `scanner-state.js` | Legacy core picker UI/event plumbing and generic container fallback remain for compatibility-only cases | Implemented, still fallback-compatible |
| Screenshot Pick | Effective scanner profile `collectOptionsInRegion()` and `detectNearestGroupTitleFromOption()` | Generic collectors when profile method is unavailable | Implemented at collector/title layer |
| Normalize/output | Profile/default `normalizeGroup()` and `normalizeOption()` where resolver path is used | Legacy normalization remains in core for old routes | Partially unified |

## Compatibility rules

- Keep `window.__stsClipartPro` and other legacy globals stable unless tests and replacement runtime bridges prove they can be removed safely.
- Keep `<all_urls>` host permission unchanged unless explicitly requested.
- Keep content script load order stable unless tests and docs are updated in the same change.
- Prefer scanner-profile additions over V2 or legacy scanner-list additions.
- Prefer adapters over rewrites when migrating existing V2 behavior.

## Legacy fallback audit

Legacy routes are deprecated and allowed only for compatibility cases:

1. Auto Scan may call the legacy scan pipeline when the scanner-profile resolver is unavailable or returns no usable groups.
2. Append Visible State may call legacy `scanDOM()` when `scanVisibleState(ctx)` returns no groups.
3. Manual Pick may call legacy core picker UI/event plumbing while the selected group collection prefers the effective scanner profile first. Generic container collection remains only when profile infrastructure is unavailable, invalid, or returns an empty default/manual group.
4. Screenshot Pick may use generic collectors only when the effective profile does not provide the corresponding region/title method.

## Known gaps

1. Legacy core still bridges some picker internals for compatibility, but the FAB scan-mode popup is owned by `scanner-ui.js` and Manual Scan empty-state mutation is owned by `scanner-state.js`.
2. V2 site profiles and scanner profiles coexist, so there are still overlapping profile systems.
3. Some test fixture references require repository cleanup when fixture files are moved or duplicated.
4. The docs must be kept aligned with actual runtime routes after each phase.
