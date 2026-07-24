# Clipart Site Profile Inventory

Inventory date: **2026-07-24**.

This document records current site-profile ownership and the target migration state for the final one-site-one-scanner-profile architecture.

## Ownership classes

- **Canonical scanner profile:** the site has its own `content_modules/clipart/scanner-profile-<site-id>.js` file and should receive future feature work there.
- **Consolidated scanner profile:** the site is registered through `scanner-profile-site-v2-consolidated.js`; this is scanner-registry-owned but not yet one file per site.
- **V2 adapter-backed:** the site remains primarily in `content_modules/site_profiles/` and is adapted into scanner-profile routing by `scanner-profile-adapters.js`.
- **Default fallback:** unknown/generic pages are handled by the default scanner profile instead of a named site profile.
- **Legacy compatibility:** `content_modules/site-profiles.js` and `content_modules/manual_profiles/` remain fallback contracts only.

## Current classification and target migration

| Site/profile | Current runtime state | Final canonical owner | Canonical lock / remaining gap |
| --- | --- | --- | --- |
| Pawesomehouse / Customily | Scanner-profile-native with V2 compatibility files still loaded | `content_modules/clipart/scanner-profile-pawesomehouse-customily.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/pawesomehouse.js`, `content_modules/manual_profiles/pawesomehouse.js`, and scanner-list/adapter bridges. |
| Macorner / Customily | Scanner-profile-native with V2 compatibility files still loaded | `content_modules/clipart/scanner-profile-macorner-customily.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/macorner.js`, `content_modules/manual_profiles/macorner.js`, and scanner-list/adapter bridges. |
| GeckoCustom | Scanner-profile-native with V2/manual compatibility files still loaded | `content_modules/clipart/scanner-profile-geckocustom.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/geckocustom.js`, `content_modules/manual_profiles/geckocustom.js`, and scanner-list/adapter bridges. |
| Pawfecthouse / Teeinblue | Scanner-profile-native with V2 compatibility files still loaded | `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/pawfecthouse.js` and scanner-list/adapter bridges. |
| PersonalFury / Customily | Dedicated scanner profile with historical V2 bridge compatibility still loaded | `content_modules/clipart/scanner-profile-personalfury.js` | Locked. Phase 2 must remove dependence on `content_modules/site_profiles/personalfury.js` and `scanner-profile-site-v2-consolidated.js`. |
| InterestPod / personalization forms | Dedicated scanner profile with historical V2 bridge compatibility still loaded | `content_modules/clipart/scanner-profile-interestpod.js` | Locked. Phase 2 must remove dependence on `content_modules/site_profiles/interestpod.js` and `scanner-profile-site-v2-consolidated.js`. |
| Gossby / personalized form | Dedicated scanner profile with historical V2 bridge compatibility still loaded | `content_modules/clipart/scanner-profile-gossby.js` | Locked. Phase 2 must remove dependence on `content_modules/site_profiles/gossby.js` and `scanner-profile-site-v2-consolidated.js`. |
| Suzitee / Customily | Phase 8 scanner-profile-native with V2/manual compatibility retained | `content_modules/clipart/scanner-profile-suzitee.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/suzitee.js` and `content_modules/manual_profiles/suzitee.js`. |
| TrendingCustom / personalization forms | Phase 8 scanner-profile-native with V2 compatibility retained | `content_modules/clipart/scanner-profile-trendingcustom.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/trendingcustom.js`. |
| Wanderprints / Customily | Phase 8 scanner-profile-native with V2 compatibility retained | `content_modules/clipart/scanner-profile-wanderprints.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/wanderprints.js`. |
| Etsy / Shopify-like forms | Phase 8 scanner-profile-native with V2 compatibility retained while support scope is finalized | `content_modules/clipart/scanner-profile-etsy.js` | Locked. Phase 2 must absorb or retire duplicate behavior from `content_modules/site_profiles/etsy.js`; generic/unknown behavior remains default-only. |
| Generic / unknown pages | Default scanner profile only | `content_modules/clipart/scanner-profile-default.js` | Locked as default-only. Do not create a site-specific `generic` scanner profile. |

## Why profiles are currently grouped

The profile system is grouped because the project migrated incrementally from legacy/V2 routing toward scanner-profile-first routing:

1. High-value complex sites were moved first into dedicated scanner profiles.
2. Some similar sites were moved into a consolidated scanner registry bridge to reduce migration risk.
3. Existing V2/manual/legacy files remain only as frozen compatibility debt until Phase 2 absorbs required behavior into the locked canonical scanner profiles.
4. Legacy layers remain as compatibility fallbacks because tests and runtime bridges still depend on them in specific cases.

This grouping is temporary for site ownership. The final target is one canonical scanner profile package for every supported named site.

## Migration priority

1. Keep native scanner profiles stable and use them as templates.
2. Phase 7 split the former consolidated profiles into dedicated scanner profile files:
   - PersonalFury
   - InterestPod
   - Gossby
3. De-bridge the Phase 8 native profiles without waiting for future feature work:
   - Suzitee
   - TrendingCustom
   - Wanderprints
   - Etsy
4. Do not create site-specific files for unknown/generic hosts; keep default scanner profile ownership.
5. Keep legacy compatibility layers frozen unless a compatibility fix is required; no feature expansion is allowed outside canonical scanner profiles.

## Inventory maintenance rules

- Update this file whenever a site changes ownership class.
- Record whether a site is canonical, consolidated, adapter-backed, default-only, or legacy compatibility-only.
- Do not mark a site canonical until it has a dedicated scanner profile, fixtures/tests, and Chrome manual verification notes.
- If a V2 adapter-backed site cannot be migrated yet, document the reason and revisit during future canonicalization work.
