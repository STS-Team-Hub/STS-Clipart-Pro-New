# Clipart Profile Architecture — Current State

## Scope

This document is the source-of-truth architecture snapshot for the current STS Clipart Pro 8.3 runtime. It replaces older Phase 1-only assumptions and reflects the repository as implemented now.

## Current phase status

The repository is past the original Phase 1 baseline. The current implementation is best described as **Phase 2 partial: unified scanner-profile routing is integrated, but legacy compatibility layers still remain**.

Completed or mostly completed:

- Scanner-profile registry and effective-profile fallback are implemented.
- Auto Scan routes through the effective scanner profile via `scanPage(ctx)`.
- Append Visible State routes through the effective scanner profile via `scanVisibleState(ctx)`.
- Screenshot Pick option collection and nearest-title detection route through the effective scanner profile before falling back to generic collectors.
- Legacy V2 site profiles can be adapted into scanner profiles.

Still transitional:

- Manual Pick is profile-aware through resolver/collector paths, but the top-level `scanner-manual.js` module is still a legacy wrapper.
- Legacy scanner-list routing and V2 site profiles remain for compatibility.
- Some docs/tests still need maintenance when fixture files are moved or added.

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

`content_modules/site-profiles.js` exposes the legacy scanner-list routing layer (`window.STSSiteProfiles`). It remains as fallback compatibility only.

Do not add new feature behavior here unless it is required to preserve existing legacy behavior.

### 4. Legacy/manual compatibility layer

`content_modules/manual_profiles/` still contains manual-profile assets. These are compatibility assets, not the target ownership layer.

New Manual Pick behavior should prefer scanner-profile methods or adapter-backed scanner profiles.

## Feature routing reality

| Feature | Current primary route | Fallback / transitional behavior | Status |
|---|---|---|---|
| Auto Scan | Effective scanner profile `scanPage(ctx)` | Legacy scan pipeline when resolver is unavailable or returns no usable groups | Implemented, still fallback-compatible |
| Append Visible State | Effective scanner profile `scanVisibleState(ctx)` | Legacy `scanDOM()` append path when resolver returns no groups | Implemented, still fallback-compatible |
| Manual Pick | Legacy UI flow with profile-aware group/container collection | Manual profile/V2 helpers and generic collectors remain | Partially migrated |
| Screenshot Pick | Effective scanner profile `collectOptionsInRegion()` and `detectNearestGroupTitleFromOption()` | Generic collectors when profile method is unavailable | Implemented at collector/title layer |
| Normalize/output | Profile/default `normalizeGroup()` and `normalizeOption()` where resolver path is used | Legacy normalization remains in core for old routes | Partially unified |

## Compatibility rules

- Keep `window.__stsClipartPro` and other legacy globals stable until a dedicated removal phase is approved.
- Keep `<all_urls>` host permission unchanged unless explicitly requested.
- Keep content script load order stable unless tests and docs are updated in the same change.
- Prefer scanner-profile additions over V2 or legacy scanner-list additions.
- Prefer adapters over rewrites when migrating existing V2 behavior.

## Known gaps

1. Manual Pick still has a legacy top-level module wrapper.
2. Legacy core still owns significant orchestration and UI/picker behavior.
3. V2 site profiles and scanner profiles coexist, so there are still overlapping profile systems.
4. Some test fixture references require repository cleanup when fixture files are moved or duplicated.
5. The docs must be kept aligned with actual runtime routes after each phase.
