# Clipart Site Profile Inventory

Inventory date: **2026-07-24**.

This document records current site-profile ownership and the target migration state for the final one-site-one-scanner-profile architecture.

## Ownership classes

- **Canonical scanner profile:** the site has its own `content_modules/clipart/scanner-profile-<site-id>.js` file and should receive future feature work there.
- **Consolidated scanner profile:** the site is registered through `scanner-profile-site-v2-consolidated.js`; this is scanner-registry-owned but not yet one file per site.
- **V2 adapter-backed:** historical ownership class only; Phase 3 runtime must not use this class for supported named sites.
- **Default fallback:** unknown/generic pages are handled by the default scanner profile instead of a named site profile.
- **Legacy compatibility:** historical/source fixture files only; Phase 3 runtime must not load them.

## Current classification and target migration

| Site/profile | Current runtime state | Final canonical owner | Canonical lock / remaining gap |
| --- | --- | --- | --- |
| Pawesomehouse / Customily | Phase 3 canonical scanner-profile-native; legacy V2/manual files are not runtime-loaded | `content_modules/clipart/scanner-profile-pawesomehouse-customily.js` | Complete for Phase 2: canonical profile owns auto, visible-state, manual-pick, container option collection, nearest-title detection, and normalization helpers without V2/manual/legacy registry references. |
| Macorner / Customily | Phase 3 canonical scanner-profile-native; legacy V2/manual files are not runtime-loaded | `content_modules/clipart/scanner-profile-macorner-customily.js` | Complete for Phase 2: canonical profile owns auto, visible-state, manual-pick, container option collection, nearest-title detection, and normalization helpers without V2/manual/legacy registry references. |
| GeckoCustom | Phase 3 canonical scanner-profile-native; legacy V2/manual files are not runtime-loaded | `content_modules/clipart/scanner-profile-geckocustom.js` | Complete for Phase 2: canonical profile owns GeckoCustom auto, visible-state, manual-pick, container option collection, and nearest-title behavior without V2/manual/legacy registry references. |
| Pawfecthouse / Teeinblue | Phase 2 audited scanner-profile-native; legacy V2 files are not runtime-loaded | `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js` | Complete for Phase 2: canonical profile owns Pawfecthouse auto, visible-state, manual-pick, container option collection, and nearest-title behavior without V2/manual/legacy registry references. |
| PersonalFury / Customily | Phase 2 de-bridged canonical scanner profile; legacy V2 source file is not runtime-loaded | `content_modules/clipart/scanner-profile-personalfury.js` | Complete for Phase 2 step 1: canonical profile no longer depends on `content_modules/site_profiles/personalfury.js`, `STSSiteProfilesV2`, or `scanner-profile-site-v2-consolidated.js`. |
| InterestPod / personalization forms | Phase 2 de-bridged canonical scanner profile; legacy V2 source file is not runtime-loaded | `content_modules/clipart/scanner-profile-interestpod.js` | Complete for Phase 2 step 1: canonical profile no longer depends on `content_modules/site_profiles/interestpod.js`, `STSSiteProfilesV2`, or `scanner-profile-site-v2-consolidated.js`. |
| Gossby / personalized form | Phase 2 de-bridged canonical scanner profile; legacy V2 source file is not runtime-loaded | `content_modules/clipart/scanner-profile-gossby.js` | Complete for Phase 2 step 1: canonical profile no longer depends on `content_modules/site_profiles/gossby.js`, `STSSiteProfilesV2`, or `scanner-profile-site-v2-consolidated.js`. |
| Suzitee / Customily | Phase 2 de-bridged canonical scanner profile; legacy V2/manual source files are not runtime-loaded | `content_modules/clipart/scanner-profile-suzitee.js` | Complete for Phase 2 step 2: canonical profile no longer depends on `content_modules/site_profiles/suzitee.js`, `content_modules/manual_profiles/suzitee.js`, V2/manual registries, or scanner-profile adapters. |
| TrendingCustom / personalization forms | Phase 2 de-bridged canonical scanner profile; legacy V2 source file is not runtime-loaded | `content_modules/clipart/scanner-profile-trendingcustom.js` | Complete for Phase 2 step 2: canonical profile no longer depends on `content_modules/site_profiles/trendingcustom.js`, V2 registries, or scanner-profile adapters. |
| Wanderprints / Customily | Phase 2 de-bridged canonical scanner profile; legacy V2 source file is not runtime-loaded | `content_modules/clipart/scanner-profile-wanderprints.js` | Complete for Phase 2 step 2: canonical profile no longer depends on `content_modules/site_profiles/wanderprints.js`, V2 registries, or scanner-profile adapters. |
| Etsy / Shopify-like forms | Phase 2 de-bridged canonical scanner profile with generic/default scan scope retained | `content_modules/clipart/scanner-profile-etsy.js` | Complete for Phase 2 step 2: canonical profile no longer depends on `content_modules/site_profiles/etsy.js`, V2 registries, or scanner-profile adapters; generic/unknown behavior remains default-only. |
| Generic / unknown pages | Default scanner profile only | `content_modules/clipart/scanner-profile-default.js` | Locked as default-only. Do not create a site-specific `generic` scanner profile. |

## Why profiles are currently grouped

The profile system is grouped because the project migrated incrementally from legacy/V2 routing toward scanner-profile-first routing:

1. High-value complex sites were moved first into dedicated scanner profiles.
2. Some similar sites were moved into a consolidated scanner registry bridge to reduce migration risk.
3. Existing V2/manual/legacy files are retained only as historical/source fixtures; they are not loaded by the Phase 3 runtime.
4. The manifest and runtime guards now prevent legacy layers from becoming operational owners again.

This grouping is temporary for site ownership. The final target is one canonical scanner profile package for every supported named site.

## Migration priority

1. Keep native scanner profiles stable and use them as templates.
2. Phase 7 split the former consolidated profiles into dedicated scanner profile files:
   - PersonalFury
   - InterestPod
   - Gossby
3. Phase 2 step 2 de-bridged the Phase 8 native profiles without waiting for future feature work:
   - Suzitee
   - TrendingCustom
   - Wanderprints
   - Etsy
4. Do not create site-specific files for unknown/generic hosts; keep default scanner profile ownership.
5. Keep legacy files non-operational; no feature expansion is allowed outside canonical scanner profiles.

## Inventory maintenance rules

- Update this file whenever a site changes ownership class.
- Record whether a site is canonical, consolidated, adapter-backed, default-only, or legacy compatibility-only.
- Do not mark a site canonical until it has a dedicated scanner profile, fixtures/tests, and Chrome manual verification notes.
- If a V2 adapter-backed site cannot be migrated yet, document the reason and revisit during future canonicalization work.
