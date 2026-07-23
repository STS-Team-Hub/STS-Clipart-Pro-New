# Clipart Profile Architecture Baseline (Phase 1)

## Scope
This document records the **current** profile architecture and behavior as of Phase 1 (Profile inventory + contract docs + smoke tests). It is intentionally descriptive and does not introduce runtime behavior changes.

## Current profile systems in repository

There are currently two profile systems in runtime:

1. Legacy scanner list routing:
- File: `content_modules/site-profiles.js`
- Namespace: `window.STSSiteProfiles`
- Core concept: host -> `{ key, scanners[] }`.

2. V2 registry-based profile objects:
- Files: `content_modules/site_profiles/index.js` and `content_modules/site_profiles/*.js`
- Namespace: `window.STSSiteProfilesV2`
- Core concept: registry with `register(profile)` + `resolve(host, url)`.

Current clipart site router (`content_modules/clipart/scanner-site-router.js`) resolves V2 first, then falls back to legacy system.

## Current profile inventory

| Profile ID | Name | Match rule | Source file | Current API/methods | Auto uses it | Append uses it | Manual uses it | Screenshot uses it | Generic fallback reliance | Current output shape | Known limitations |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `generic` | Generic | `match()` and `matchHost()` always true | `content_modules/site_profiles/generic.js` | metadata + `useLegacyGeneric:true` | Yes (legacy scan pipeline) | Yes (via `scanDOM` + merge) | Yes (legacy/manual generic flow) | Yes (generic collectors) | Yes (is fallback) | legacy groups: `{ label, options[] }` normalized later | No site-specific overrides; broad generic heuristics |
| `pawesomehouse` | Pawesomehouse | host equals/endsWith `pawesomehouse.com` | `content_modules/site_profiles/pawesomehouse.js` | `getRoot/getGroups/getTitleElement/getItems/extractValue/cleanupTitle/cleanupValue/isValidGroup/autoScan/getManualTitleElements/scanManualGroupFromTitle` + metadata | Yes (if resolved and `!useLegacyGeneric`) | Partial (append calls `scanDOM`; same route as auto) | Partial-to-yes (manual uses profile path when active profile is non-legacy) | Partial (screenshot collection still uses generic collector pipeline, not profile-specific collector methods) | No (`useLegacyGeneric:false`) | profile output: `{ title, items[] }`, then mapped to `{ label, options[] }` | Screenshot flow not profile-specialized; output adapter currently required |
| `suzitee` | Suzitee | host equals `suzitee.com` / `www.suzitee.com` / endsWith `.suzitee.com` | `content_modules/site_profiles/suzitee.js` | same pattern as pawesomehouse (`autoScan`, `scanManualGroupFromTitle`, etc.) | Yes (if resolved and non-legacy) | Partial | Partial-to-yes | Partial | No (`useLegacyGeneric:false`) | profile output: `{ title, items[] }`, mapped to legacy group shape | Same limitation pattern as pawesomehouse |
| `macorner` | Macorner | host equals/endsWith `macorner.co` | `content_modules/site_profiles/macorner.js` | metadata + `useLegacyGeneric:true` | Yes (legacy) | Yes | Yes | Yes | Yes | legacy groups `{ label, options[] }` | No site-specific profile methods |
| `etsy` | Etsy | host equals/endsWith `etsy.com` | `content_modules/site_profiles/etsy.js` | metadata + `useLegacyGeneric:true` | Yes (legacy) | Yes | Yes | Yes | Yes | legacy groups `{ label, options[] }` | No site-specific profile methods |
| `wanderprints` | Wanderprints | host equals/endsWith `wanderprints.com` | `content_modules/site_profiles/wanderprints.js` | metadata + `useLegacyGeneric:true` | Yes (legacy) | Yes | Yes | Yes | Yes | legacy groups `{ label, options[] }` | No site-specific profile methods |
| `gossby` | Gossby | host equals/endsWith `gossby.com` | `content_modules/site_profiles/gossby.js` | metadata + `useLegacyGeneric:true` | Yes (legacy) | Yes | Yes | Yes | Yes | legacy groups `{ label, options[] }` | No site-specific profile methods |

## Other profile-related files discovered

- `content_modules/manual_profiles/*.js`: manual profile assets that are **not** wired as the primary profile resolver path for current clipart runtime.
- `content_modules/site_profiles/shared/*.js`: shared helper modules used by richer V2 profiles.

## Current feature usage reality (important baseline)

- Auto: can use V2 profile `autoScan` for non-legacy profiles, otherwise uses legacy scanner list from `STSSiteProfiles`.
- Append: reuses current scan pipeline and merge behavior; no dedicated per-profile append method yet.
- Manual: supports profile-assisted group extraction in non-legacy profiles (`scanManualGroupFromTitle`) but still depends on legacy/manual runtime flow.
- Screenshot: currently uses generic collector functions and nearest-title detection; profile-specific screenshot methods are not yet first-class runtime contract.

## Current architecture limitations

1. Two overlapping profile systems (legacy + V2).
2. Mixed output shapes (`{ title, items }` vs `{ label, options }`) requiring adapters.
3. Full four-feature parity via a unified profile contract is not yet implemented.
4. Screenshot flow currently relies mostly on generic collectors.

