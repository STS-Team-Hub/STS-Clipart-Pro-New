# Clipart Runtime Architecture Status

## New roadmap

The new roadmap is organized into implementation phases so every Auto change starts with analysis, ships in small steps, and records the result after each edit.

### Phase 1 — Analysis

- Audit each target site's source personalization markup before changing collectors.
- Identify the canonical group title element that users see on the source site.
- Classify each option's original source shape as `icon`, `item`, or `text` before mapping it into the STS category schema.
- Confirm whether the site needs click/expand orchestration before options are visible.

**Result log:** Current scanner ownership is profile-first, and Auto already prefers Manual title candidates before falling back to profile or generic scanning.

### Phase 2 — Implementation phrases

Use these phrases for each implementation pass:

1. **Find Title** — locate canonical group title elements.
2. **Open Group** — safely scroll/click only personalization expand targets.
3. **Collect Options** — collect visible options from the active group scope.
4. **Preserve Origin Kind** — tag options as `icon`, `item`, or `text` based on the source site shape.
5. **Normalize Output** — publish deduped STS categories with standard prefixes and option labels.
6. **Record Result** — update tests/docs with the observed outcome before moving to the next pass.

**Result log:** Auto V2 and Manual-driven Auto now carry `roadmapGoal` trace metadata so QA can verify the active roadmap path.

### Phase 3 — Auto goal

Auto's goal is: **return canonical Groups using the source site's visible Title, and return Options with origin-aware `icon`, `item`, or `text` metadata.**

- If an option is an image swatch, color swatch, visual text tile, or other visual swatch on the source site, Auto marks it as `icon`.
- If an option is a plain selector/input text value on the source site, Auto marks it as `text`.
- If an option is neither a visual swatch nor plain text, Auto keeps it as `item`.
- Existing rendering fields such as `optionType`, `imageUrl`, `capturedImage`, `bgColor`, and `needsCapture` remain intact.

**Result log:** Pawesomehouse/Customily Auto V2 now emits `optionKind`, `originalOptionKind`, and `displayKind` while preserving icon-like visual options for capture when no image URL exists.

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
