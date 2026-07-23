# Clipart Site Profile Inventory

Inventory date: **2026-07-23**.

This document records the Phase 3 classification for every current V2 site profile and identifies whether runtime ownership is scanner-profile-native, consolidated through the Phase 3 scanner registry bridge, or intentionally adapter-backed.

## Classification

| Site/profile | Current ownership | Runtime status | Notes |
| --- | --- | --- | --- |
| Pawesomehouse / Customily | Dedicated scanner profile | Scanner-profile-native | Owned by `scanner-profile-pawesomehouse-customily.js`; V2 profile remains as compatibility fixture/source. |
| Macorner / Customily | Dedicated scanner profile | Scanner-profile-native | Owned by `scanner-profile-macorner-customily.js`; V2 profile remains as compatibility fixture/source. |
| Geckocustom | Dedicated scanner profile | Scanner-profile-native | Owned by `scanner-profile-geckocustom.js`; V2 profile remains as compatibility fixture/source. |
| Pawfecthouse / Teeinblue | Dedicated scanner profile | Scanner-profile-native | Owned by `scanner-profile-pawfecthouse-teeinblue.js`; V2 profile remains as compatibility fixture/source. |
| PersonalFury / Customily | Phase 3 consolidated scanner profile | Scanner-registry-owned transitional profile | Registered by `scanner-profile-site-v2-consolidated.js` before the generic adapter pass; fixture coverage remains in `manual-new-site-profiles.test.js`. |
| InterestPod / personalization forms | Phase 3 consolidated scanner profile | Scanner-registry-owned transitional profile | Registered by `scanner-profile-site-v2-consolidated.js` before the generic adapter pass; fixture coverage remains in `manual-new-site-profiles.test.js`. |
| Gossby / personalized form | Phase 3 consolidated scanner profile | Scanner-registry-owned transitional profile | Registered by `scanner-profile-site-v2-consolidated.js` before the generic adapter pass; fixture coverage remains in `manual-new-site-profiles.test.js`. |
| Suzitee / Customily | V2 adapter-backed | Intentional transitional adapter | Existing unit coverage remains in `auto-suzitee-profile.test.js`; no Phase 3 behavior change. |
| TrendingCustom / personalization forms | V2 adapter-backed | Intentional transitional adapter | Lower-priority active profile; remains intentionally adapter-backed after Phase 6 QA hardening until a dedicated scanner-profile migration is scheduled. |
| Wanderprints / Customily | V2 adapter-backed | Intentional transitional adapter | Lower-priority active profile; remains intentionally adapter-backed after Phase 6 QA hardening until a dedicated scanner-profile migration is scheduled. |
| Etsy / Shopify-like forms | V2 adapter-backed | Intentional transitional adapter | Marketplace profile stays adapter-backed until legacy deprecation analysis. |
| Generic | V2 fallback only | Not adapted | Generic V2 profile is intentionally not registered as a scanner profile because the default scanner profile owns fallback behavior. |

## Phase 3 result

- New site behavior must not be added to `content_modules/site-profiles.js`.
- High-value complex sites now resolve through dedicated or Phase 3 consolidated scanner profiles before the generic adapter pass.
- Remaining adapter-backed profiles are explicitly transitional and should be revisited during Phase 4 ownership cleanup or Phase 6 QA hardening.
