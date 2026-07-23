# Clipart Site Profile Inventory

Inventory date: **2026-07-23**.

This document records current site-profile ownership and the target migration state for the final one-site-one-scanner-profile architecture.

## Ownership classes

- **Canonical scanner profile:** the site has its own `content_modules/clipart/scanner-profile-<site-id>.js` file and should receive future feature work there.
- **Consolidated scanner profile:** the site is registered through `scanner-profile-site-v2-consolidated.js`; this is scanner-registry-owned but not yet one file per site.
- **V2 adapter-backed:** the site remains primarily in `content_modules/site_profiles/` and is adapted into scanner-profile routing by `scanner-profile-adapters.js`.
- **Default fallback:** unknown/generic pages are handled by the default scanner profile instead of a named site profile.
- **Legacy compatibility:** `content_modules/site-profiles.js` and `content_modules/manual_profiles/` remain fallback contracts only.

## Current classification and target migration

| Site/profile | Current ownership | Runtime status | Final target | Notes |
| --- | --- | --- | --- | --- |
| Pawesomehouse / Customily | Dedicated scanner profile | Scanner-profile-native | Already canonical, keep fixtures/tests current | Owned by `scanner-profile-pawesomehouse-customily.js`; V2 profile remains as compatibility/source. |
| Macorner / Customily | Dedicated scanner profile | Scanner-profile-native | Already canonical, keep fixtures/tests current | Owned by `scanner-profile-macorner-customily.js`; V2 profile remains as compatibility/source. |
| Geckocustom | Dedicated scanner profile | Scanner-profile-native | Already canonical, keep fixtures/tests current | Owned by `scanner-profile-geckocustom.js`; V2 and manual assets remain compatibility/source. |
| Pawfecthouse / Teeinblue | Dedicated scanner profile | Scanner-profile-native | Already canonical, keep fixtures/tests current | Owned by `scanner-profile-pawfecthouse-teeinblue.js`; V2 profile remains as compatibility/source. |
| PersonalFury / Customily | Dedicated scanner profile | Scanner-profile-native | Canonical after Phase 7 split | Owned by `scanner-profile-personalfury.js`; V2 profile remains compatibility/source, with canonical fixtures in `tests/fixtures/site-profiles/personalfury/` and route coverage in `phase7-canonical-site-profiles.test.js`. |
| InterestPod / personalization forms | Dedicated scanner profile | Scanner-profile-native | Canonical after Phase 7 split | Owned by `scanner-profile-interestpod.js`; V2 profile remains compatibility/source, with canonical fixtures in `tests/fixtures/site-profiles/interestpod/` and route coverage in `phase7-canonical-site-profiles.test.js`. |
| Gossby / personalized form | Dedicated scanner profile | Scanner-profile-native | Canonical after Phase 7 split | Owned by `scanner-profile-gossby.js`; V2 profile remains compatibility/source, with canonical fixtures in `tests/fixtures/site-profiles/gossby/` and route coverage in `phase7-canonical-site-profiles.test.js`. |
| Suzitee / Customily | V2 adapter-backed | Intentional transitional adapter | Create `scanner-profile-suzitee.js` when substantial changes are needed | Existing unit coverage remains in `auto-suzitee-profile.test.js`; no Phase 6 behavior change. |
| TrendingCustom / personalization forms | V2 adapter-backed | Intentional transitional adapter | Create `scanner-profile-trendingcustom.js` when migration is scheduled | Lower-priority active profile; remains intentionally adapter-backed until dedicated migration. |
| Wanderprints / Customily | V2 adapter-backed | Intentional transitional adapter | Create `scanner-profile-wanderprints.js` when migration is scheduled | Lower-priority active profile; remains intentionally adapter-backed until dedicated migration. |
| Etsy / Shopify-like forms | V2 adapter-backed | Intentional transitional adapter | Create `scanner-profile-etsy.js` when migration is scheduled | Marketplace profile stays adapter-backed until dedicated scanner-profile migration. |
| Generic / unknown pages | Default scanner profile | Default fallback | Remain default-only | Generic V2 profile is intentionally not registered as a scanner profile because the default scanner profile owns fallback behavior. |

## Why profiles are currently grouped

The profile system is grouped because the project migrated incrementally from legacy/V2 routing toward scanner-profile-first routing:

1. High-value complex sites were moved first into dedicated scanner profiles.
2. Some similar sites were moved into a consolidated scanner registry bridge to reduce migration risk.
3. Existing V2 profiles that were already working remain adapter-backed until dedicated migration is justified.
4. Legacy layers remain as compatibility fallbacks because tests and runtime bridges still depend on them in specific cases.

This grouping is temporary for site ownership. The final target is one canonical scanner profile package for every supported named site.

## Migration priority

1. Keep native scanner profiles stable and use them as templates.
2. Phase 7 split the former consolidated profiles into dedicated scanner profile files:
   - PersonalFury
   - InterestPod
   - Gossby
3. Migrate adapter-backed V2 profiles when they receive substantial updates:
   - Suzitee
   - TrendingCustom
   - Wanderprints
   - Etsy
4. Do not create site-specific files for unknown/generic hosts; keep default scanner profile ownership.
5. Keep legacy compatibility layers frozen unless a compatibility fix is required.

## Inventory maintenance rules

- Update this file whenever a site changes ownership class.
- Record whether a site is canonical, consolidated, adapter-backed, default-only, or legacy compatibility-only.
- Do not mark a site canonical until it has a dedicated scanner profile, fixtures/tests, and Chrome manual verification notes.
- If a V2 adapter-backed site cannot be migrated yet, document the reason and revisit during future canonicalization work.
