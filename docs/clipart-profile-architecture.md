# Clipart Profile Architecture — Current State and Final Target

## Scope

This document is the source-of-truth architecture snapshot for the current STS Clipart Pro 8.3 runtime and the target architecture for future profile work.

It describes two states:

1. **Current state:** Phase 6 complete, scanner-profile-first routing is integrated, but scanner profiles, V2 adapter-backed profiles, consolidated profiles, and legacy compatibility layers still coexist.
2. **Final target:** one canonical scanner profile package per supported named site, with shared behavior kept in shared scanner modules and generic/unknown pages handled by the default scanner profile.

## Current phase status

The current implementation is **Phase 6 complete; Phase 7 planned**.

Completed or mostly completed:

- Scanner-profile registry and effective-profile fallback are implemented.
- Auto Scan routes through the effective scanner profile via `scanPage(ctx)`.
- Append Visible State routes through the effective scanner profile via `scanVisibleState(ctx)`.
- Screenshot Pick option collection and nearest-title detection route through the effective scanner profile before generic collectors.
- Legacy V2 site profiles can be adapted into scanner profiles.
- Manual Scan panel bootstrap is owned by `scanner-manual.js`, and manual group collection exposes a profile-first route through the effective scanner profile.
- Automated QA/release checks run through the discovered unit suite and release consistency guards.

Still transitional:

- Some picker/panel internals still bridge through legacy core where tests prove runtime dependency.
- V2 site profiles still coexist with scanner profiles.
- PersonalFury, InterestPod, and Gossby are scanner-registry-owned through a consolidated transitional scanner profile instead of one dedicated file per site.
- Suzitee, TrendingCustom, Wanderprints, and Etsy remain intentionally adapter-backed V2 profiles until migration is scheduled.
- Legacy scanner-list routing and manual profile assets remain warning-backed compatibility contracts.
- Real-browser Chrome domain verification remains external to this container.

## Final architecture target

The final profile architecture is **one supported named site = one canonical scanner profile package**.

A canonical site package contains:

- `content_modules/clipart/scanner-profile-<site-id>.js`
- `tests/fixtures/site-profiles/<site-id>/`
- expected output JSON for the supported DOM patterns
- unit coverage for resolver behavior, route behavior, and normalized output shape
- manual Chrome verification notes for Auto Scan, Append Visible State, Manual Pick, and Screenshot Pick

The canonical profile owns site-specific behavior only. Shared collectors, schema normalization, state helpers, and utilities remain in shared scanner modules.

Unknown/custom/generic pages do **not** receive fake site profiles. They resolve through the default scanner profile.

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

Target Phase 7 work should convert remaining supported named sites into this layer.

### 2. Transitional scanner layer: consolidated site profiles

`content_modules/clipart/scanner-profile-site-v2-consolidated.js` currently registers multiple site-specific profiles before the generic V2 adapter pass.

Current consolidated sites:

- PersonalFury
- InterestPod
- Gossby

This layer is useful for low-risk migration but is not the final target. Phase 7 should split each consolidated site into its own canonical scanner profile file when fixtures and tests are ready.

### 3. Transitional layer: V2 site profiles

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

Final target: V2 files are compatibility/source fixtures only, not the primary ownership layer for new feature behavior.

### 4. Legacy layer: scanner-list routing

`content_modules/site-profiles.js` exposes the legacy scanner-list routing layer (`window.STSSiteProfiles`). It remains as a deprecated permanent fallback compatibility contract and emits a one-time warning when selected.

Do not add new feature behavior here unless it is required to preserve existing legacy behavior during a staged migration.

### 5. Legacy/manual compatibility layer

`content_modules/manual_profiles/` still contains manual-profile assets. These are deprecated compatibility fixtures, not the target ownership layer, and the registry emits a one-time warning when one resolves.

New Manual Pick behavior must prefer scanner-profile methods.

## Feature routing reality

| Feature | Current primary route | Fallback / transitional behavior | Final target |
|---|---|---|---|
| Auto Scan | Effective scanner profile `scanPage(ctx)` | Legacy scan pipeline when resolver is unavailable or returns no usable groups | Site-specific `scanPage(ctx)` in the canonical scanner profile or default profile for unknown pages |
| Append Visible State | Effective scanner profile `scanVisibleState(ctx)` | Legacy `scanDOM()` append path when resolver returns no groups | Site-specific/default `scanVisibleState(ctx)` only |
| Manual Pick | `scanner-manual.js` owns Manual Scan bootstrap and exposes effective scanner profile `scanManualGroupFromTitle()` + `normalizeGroup()` collection | Legacy core picker UI/event plumbing and generic container fallback remain for compatibility-only cases | Site-specific/default manual methods with legacy UI bridges minimized |
| Screenshot Pick | Effective scanner profile `collectOptionsInRegion()` and `detectNearestGroupTitleFromOption()` | Generic collectors when profile method is unavailable | Site-specific/default screenshot methods with generic fallback only through default profile |
| Normalize/output | Profile/default `normalizeGroup()` and `normalizeOption()` where resolver path is used | Legacy normalization remains in core for old routes | Shared schema normalization before state, panel, export, render, and sync |

## Compatibility rules

- Keep `window.__stsClipartPro` and other legacy globals stable unless tests and replacement runtime bridges prove they can be removed safely.
- Keep `<all_urls>` host permission unchanged unless explicitly requested.
- Keep content script load order stable unless tests and docs are updated in the same change.
- Prefer dedicated scanner-profile additions over V2, consolidated, or legacy scanner-list additions.
- Prefer adapters over rewrites when migrating existing V2 behavior, but use dedicated scanner profiles for substantial new behavior.
- Do not migrate multiple unrelated sites in one behavior-changing refactor unless the change is schema-only and covered by tests.

## Legacy fallback audit

Legacy routes are deprecated and allowed only for compatibility cases:

1. Auto Scan may call the legacy scan pipeline when the scanner-profile resolver is unavailable or returns no usable groups.
2. Append Visible State may call legacy `scanDOM()` when `scanVisibleState(ctx)` returns no groups.
3. Manual Pick may call legacy core picker UI/event plumbing while selected group collection prefers the effective scanner profile first.
4. Screenshot Pick may use generic collectors when the effective profile does not provide the corresponding region/title method.

## Known gaps before final target

1. V2 site profiles and scanner profiles coexist, so ownership still overlaps.
2. Consolidated scanner-profile entries still need to become dedicated one-file-per-site profiles.
3. Adapter-backed V2 sites still need dedicated scanner-profile migrations when they receive substantial updates.
4. Legacy core still bridges some picker internals for compatibility.
5. Some test fixture references require cleanup when fixture files are moved or duplicated.
6. Chrome real-domain verification is still required before declaring a migrated site production-verified.
