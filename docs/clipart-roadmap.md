# Clipart Runtime Architecture Status

## Current status

STS Clipart Pro 8.3 now uses a scanner-profile-first runtime. Supported named sites load one canonical scanner profile file under `content_modules/clipart/scanner-profile-<site-id>.js`, while unknown or unsupported pages resolve through `content_modules/clipart/scanner-profile-default.js`.

The former migration roadmap is complete and has been replaced by this current-state document so outdated phase notes do not contradict the runtime.

## Auto and Manual model

Auto Scan is implemented as **Manual-driven Auto** whenever Manual candidates are available:

1. Resolve the effective site scanner profile.
2. Reuse the same Manual title candidate path users pick by hand.
3. Safely scroll and click/expand each candidate title.
4. Collect the group through the Manual resolver path.
5. Normalize with the active scanner profile.
6. Dedupe groups and publish the standard category payload for panel/export/sync.

If no Manual candidates are available, Auto falls back to the profile `scanPage(ctx)`/legacy-compatible scan path so unsupported or generic pages still have a best-effort scan.

## Runtime ownership rules

1. One supported named site has one canonical scanner profile file.
2. New site-specific scan behavior belongs in `content_modules/clipart/scanner-profile-<site-id>.js`.
3. Shared helpers belong in shared scanner modules such as `scanner-collectors.js`, `scanner-schema.js`, `scanner-utils.js`, and `scanner-state.js`.
4. Manual collection must route through `scanManualGroupFromTitle(titleEl, ctx)` plus `normalizeGroup(rawGroup, ctx)` where a site profile supports Manual Pick.
5. Auto-specific click orchestration is centralized in `content_modules/clipart/scanner-auto.js`; core runtime should reuse that collector instead of carrying a second implementation.
6. Unknown/generic pages remain default-profile-owned only.

## Supported-site profile matrix

| Site/profile | Canonical owner | Dominant HTML pattern |
| --- | --- | --- |
| Pawesomehouse / Customily | `content_modules/clipart/scanner-profile-pawesomehouse-customily.js` | Customily groups/swatch options |
| Macorner / Customily | `content_modules/clipart/scanner-profile-macorner-customily.js` | Customily groups/swatch options |
| GeckoCustom | `content_modules/clipart/scanner-profile-geckocustom.js` | GeckoCustom/custom product groups |
| Pawfecthouse / Teeinblue | `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js` | Teeinblue option markup |
| PersonalFury / Customily | `content_modules/clipart/scanner-profile-personalfury.js` | Customily groups/options |
| InterestPod / personalization forms | `content_modules/clipart/scanner-profile-interestpod.js` | Customily/personalization groups |
| Gossby / personalized form | `content_modules/clipart/scanner-profile-gossby.js` | Site-specific personalized form groups |
| Suzitee / Customily | `content_modules/clipart/scanner-profile-suzitee.js` | Customily groups/options |
| TrendingCustom / personalization forms | `content_modules/clipart/scanner-profile-trendingcustom.js` | Ant Design form items |
| Wanderprints / Customily | `content_modules/clipart/scanner-profile-wanderprints.js` | Customily groups/swatch options |
| Etsy / Shopify-like forms | `content_modules/clipart/scanner-profile-etsy.js` | Etsy/generic listing form scope |
| Generic / unknown pages | `content_modules/clipart/scanner-profile-default.js` | Default fallback only |

## Documentation maintenance rules

- Update this file when Auto/Manual routing behavior changes.
- Update `docs/clipart-profile-inventory.md` when a supported site, profile file, or dominant HTML pattern changes.
- Remove outdated phase/migration claims instead of preserving contradictory historical notes.
- Keep historical notes only when they describe a current regression guard or operational constraint.
