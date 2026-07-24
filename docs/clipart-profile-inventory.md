# Clipart Site Profile Inventory

Inventory date: **2026-07-24**.

This document records the current scanner-profile ownership for STS Clipart Pro 8.3. The migration to scanner-profile-first runtime is complete; this inventory should describe current runtime ownership, not historical phase progress.

## Ownership classes

- **Canonical scanner profile:** a supported named site owns one `content_modules/clipart/scanner-profile-<site-id>.js` file.
- **Default fallback:** unknown or unsupported pages are handled by `content_modules/clipart/scanner-profile-default.js`.
- **Reference fixture:** raw copied HTML samples under `HTML/` are research inputs only and are not runtime-loaded.

## Current runtime ownership

| Site/profile | Runtime owner | Auto/Manual expectation | Reference HTML pattern |
| --- | --- | --- | --- |
| Pawesomehouse / Customily | `content_modules/clipart/scanner-profile-pawesomehouse-customily.js` | Auto should reuse Manual title expansion and profile collection when candidates exist. | Customily `customily_option`, `option_name`, `customily-swatch` samples. |
| Macorner / Customily | `content_modules/clipart/scanner-profile-macorner-customily.js` | Auto should reuse Manual title expansion and profile collection when candidates exist. | Customily groups and swatches. |
| GeckoCustom | `content_modules/clipart/scanner-profile-geckocustom.js` | Profile-specific Manual candidates/containers should drive Auto where available. | GeckoCustom/custom product group markup. |
| Pawfecthouse / Teeinblue | `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js` | Auto must use Teeinblue-aware profile collection instead of Customily assumptions. | Teeinblue option markup. |
| PersonalFury / Customily | `content_modules/clipart/scanner-profile-personalfury.js` | Auto should reuse Manual title expansion and profile collection when candidates exist. | Customily groups/options. |
| InterestPod / personalization forms | `content_modules/clipart/scanner-profile-interestpod.js` | Auto should reuse Manual title expansion and profile collection when candidates exist. | Customily/personalization groups. |
| Gossby / personalized form | `content_modules/clipart/scanner-profile-gossby.js` | Profile selectors should determine whether Manual-driven Auto can run. | Site-specific personalized form markup. |
| Suzitee / Customily | `content_modules/clipart/scanner-profile-suzitee.js` | Auto should reuse Manual title expansion and profile collection when candidates exist. | Customily groups/options. |
| TrendingCustom / personalization forms | `content_modules/clipart/scanner-profile-trendingcustom.js` | Auto should use Ant Design form-item candidates and profile collection. | Ant Design `ant-form-item` groups. |
| Wanderprints / Customily | `content_modules/clipart/scanner-profile-wanderprints.js` | Auto should reuse Manual title expansion and profile collection when candidates exist. | Customily groups/swatch options. |
| Etsy / Shopify-like forms | `content_modules/clipart/scanner-profile-etsy.js` | Etsy hosts resolve to the Etsy profile; generic/unknown pages stay default-only. | Etsy/generic listing form scope. |
| Generic / unknown pages | `content_modules/clipart/scanner-profile-default.js` | Default fallback only; do not create a site-specific generic profile. | Generic page markup. |

## Maintenance rules

- Add a site only when it has a canonical scanner profile, fixture coverage, and route/profile tests.
- Keep one runtime owner per supported named site.
- Put new site-specific selectors, expand-target behavior, and extraction overrides in the canonical profile file.
- Keep raw HTML under `HTML/` flat and use it only as reference material for fixtures/tests.
