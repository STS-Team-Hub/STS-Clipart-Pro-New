# Clipart Runtime Roadmap — 3-Phase One-Site-One-Profile Plan

## Goal

Move STS Clipart Pro from the current mixed scanner-profile / V2 / legacy compatibility runtime to a final **one-site-one-scanner-profile** architecture while preserving current extension behavior.

The Phase 3 finish line is strict:

- Each supported named site has exactly one canonical scanner profile file under `content_modules/clipart/scanner-profile-<site-id>.js`.
- Each supported named site has one matching fixture/test package under `tests/fixtures/site-profiles/<site-id>/` and focused unit coverage.
- Generic, unknown, or unsupported pages do not receive fake site profiles; they resolve only through the default scanner profile.
- `content_modules/site_profiles/`, `content_modules/manual_profiles/`, `content_modules/site-profiles.js`, `scanner-profile-adapters.js`, and other V2/legacy profile bridges are removed from the operational runtime once parity is proven.
- Shared behavior stays in shared scanner modules (`scanner-collectors.js`, `scanner-schema.js`, `scanner-utils.js`, `scanner-state.js`) instead of being copy-pasted into each profile.

## Current checkpoint

Current checkpoint: **Phase 8 in progress; roadmap reset to a 3-phase execution plan on 2026-07-24**.

Repository baseline already completed before this reset:

- Define target scanner-profile contract in `docs/clipart-profile-contract.md`.
- Define development rules for scanner-profile-first work in `docs/clipart-development-rules.md`.
- Document profile systems and onboarding workflow in `docs/clipart-profile-architecture.md` and `docs/clipart-new-site-onboarding.md`.
- Auto Scan resolves an effective scanner profile and calls `scanPage(ctx)`.
- Append Visible State resolves an effective scanner profile and calls `scanVisibleState(ctx)`.
- Manual Pick has a profile-first route through `scanManualGroupFromTitle(titleEl, ctx)` and profile/default normalization.
- Screenshot Pick routes region collection and nearest-title detection through the effective scanner profile before generic fallback.
- V2 site profiles can currently be adapted into scanner profiles, but that adapter path is a removal target.
- Status: **Complete** for the historical contract/routing baseline; incomplete for the final one-site-one-profile runtime.

The repository is **not yet at the final architecture** because scanner profiles, V2 site profiles, manual profiles, legacy scanner-list routing, and adapter bridges still coexist.

## Non-negotiable architecture policy

1. **One supported named site = one canonical scanner profile file.**
2. **No supported named site may remain V2 adapter-backed after Phase 3.**
3. **No Manual Pick behavior may remain owned by `content_modules/manual_profiles/` after Phase 3.**
4. **No scanner-list behavior may remain owned by `content_modules/site-profiles.js` after Phase 3.**
5. **No new site behavior may be added outside `content_modules/clipart/scanner-profile-<site-id>.js`.**
6. **Shared utilities stay shared; site files own only site-specific detection, selectors, extraction, and normalization overrides.**
7. **Every migrated site must have manifest registration, fixtures, expected output, unit coverage, and Chrome manual verification notes before it is marked done.**

## Supported-site target matrix

| Site/profile | Final canonical owner | Phase 3 requirement |
| --- | --- | --- |
| Pawesomehouse / Customily | `content_modules/clipart/scanner-profile-pawesomehouse-customily.js` | Remove dependence on V2/manual/legacy source files; keep canonical fixtures/tests current. |
| Macorner / Customily | `content_modules/clipart/scanner-profile-macorner-customily.js` | Remove dependence on V2/manual/legacy source files; keep canonical fixtures/tests current. |
| GeckoCustom | `content_modules/clipart/scanner-profile-geckocustom.js` | Migrate any still-needed manual/V2 behavior into the scanner profile, then remove legacy profile runtime loading. |
| Pawfecthouse / Teeinblue | `content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js` | Remove dependence on V2 compatibility profile; keep canonical fixtures/tests current. |
| PersonalFury / Customily | `content_modules/clipart/scanner-profile-personalfury.js` | De-bridge from `window.STSSiteProfilesV2`; profile must be self-contained except for shared scanner modules. |
| InterestPod / personalization forms | `content_modules/clipart/scanner-profile-interestpod.js` | De-bridge from `window.STSSiteProfilesV2`; profile must be self-contained except for shared scanner modules. |
| Gossby / personalized form | `content_modules/clipart/scanner-profile-gossby.js` | De-bridge from `window.STSSiteProfilesV2`; profile must be self-contained except for shared scanner modules. |
| Suzitee / Customily | `content_modules/clipart/scanner-profile-suzitee.js` | Remove retained V2 compatibility dependency and prove parity through fixtures/tests. |
| TrendingCustom / personalization forms | `content_modules/clipart/scanner-profile-trendingcustom.js` | Remove retained V2 compatibility dependency and prove parity through fixtures/tests. |
| Wanderprints / Customily | `content_modules/clipart/scanner-profile-wanderprints.js` | Remove retained V2 compatibility dependency and prove parity through fixtures/tests. |
| Etsy / Shopify-like forms | `content_modules/clipart/scanner-profile-etsy.js` | Finalize support scope, remove V2 fallback dependency, and prove generic/listing behavior through tests. |
| Generic / unknown pages | `content_modules/clipart/scanner-profile-default.js` | Remain default-only; do not create a site-specific `generic` profile. |

## Phase 1 — Canonical ownership lock and gap audit

Status: **Complete on 2026-07-24**.

Purpose:

Lock the inventory so there is exactly one intended owner per supported site before code is moved. This phase does not remove runtime files yet; it prevents more drift.

Deliverables:

1. Update `docs/clipart-profile-inventory.md` so every supported named site has one final canonical owner and no “substantial updates later” loophole.
2. Add or update an automated ownership audit that fails when a supported named site is missing:
   - one canonical `scanner-profile-<site-id>.js` file,
   - manifest registration before scanner routing/core,
   - fixture folder,
   - expected output JSON,
   - route/profile unit coverage.
3. Add a duplicate-owner audit that identifies behavior still present in:
   - `content_modules/site_profiles/<site>.js`,
   - `content_modules/manual_profiles/<site>.js`,
   - `content_modules/site-profiles.js`,
   - `scanner-profile-site-v2-consolidated.js`,
   - `scanner-profile-adapters.js`.
4. For each duplicate owner, record the exact canonical scanner profile method that must absorb it: `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `collectOptionsInRegion(region, ctx)`, `detectNearestGroupTitleFromOption(optionEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, or `normalizeOption(rawOption, ctx)`.
5. Freeze V2/manual/legacy files: compatibility fixes only, no feature expansion.


Phase 2 progress recorded on 2026-07-24:

- Completed execution-order step 1 for PersonalFury, InterestPod, and Gossby by moving their legacy V2 profile logic directly into `content_modules/clipart/scanner-profile-personalfury.js`, `content_modules/clipart/scanner-profile-interestpod.js`, and `content_modules/clipart/scanner-profile-gossby.js`.
- Added `content_modules/clipart/scanner-profile-native-adapter.js` as scanner-profile-native mapping glue for canonical profiles; it normalizes legacy-shaped in-file groups/options without reading `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, `window.STSManualProfiles`, or `ns.siteV2Bridge`.
- Added `tests/unit/phase2-native-debridging.test.js` to prove those three canonical files have no V2/manual/legacy registry references, expose scanner-profile contract methods, and resolve directly from `STSClipartScanner.profiles`.
- Completed execution-order step 2 for Suzitee, TrendingCustom, Wanderprints, and Etsy by moving their scanner registration onto `content_modules/clipart/scanner-profile-native-adapter.js` and proving the canonical files do not reference V2/manual/legacy registries. Etsy remains default/generic-scope only while resolving as its canonical named scanner profile on Etsy hosts.
- Completed execution-order step 3 by auditing Pawesomehouse, Macorner, GeckoCustom, and Pawfecthouse canonical scanner profiles for V2/manual/legacy registry references and direct scanner-registry resolution.
- Completed execution-order step 4 by confirming GeckoCustom manual collection, nearest-title detection, and container option collection are owned by `content_modules/clipart/scanner-profile-geckocustom.js`.
- Completed execution-order step 5 by confirming Etsy remains named-host resolution only while unknown/generic pages continue to resolve through `content_modules/clipart/scanner-profile-default.js`; no site-specific generic profile was added.
- Added canonical scanner contract coverage for Pawesomehouse and Macorner `scanVisibleState(ctx)`, `collectOptionsInContainer(containerEl, ctx)`, nearest-title detection, and normalization helpers so hidden manual leftovers are owned by their canonical files.

Exit criteria:

- The supported-site target matrix and inventory agree.
- Every supported named site has exactly one declared final owner.
- CI exposes any duplicate profile owner that still needs migration.
- `npm run check` and `npm run test:unit` pass.

Phase 1 progress recorded on 2026-07-24:

- Locked canonical ownership in `docs/clipart-profile-inventory.md`; every supported named site now declares exactly one final scanner-profile owner and the inventory removes deferred “substantial updates later” migration language.
- Added `tests/unit/phase1-canonical-ownership-audit.test.js` to enforce canonical profile files, manifest registration before `scanner-core.js`, fixture folders, expected output JSON, and named route/profile unit coverage for every supported named site.
- Added canonical Phase 1 fixture packages for Pawesomehouse / Customily, Macorner / Customily, Pawfecthouse / Teeinblue, Suzitee, TrendingCustom, Wanderprints, and Etsy under `tests/fixtures/site-profiles/<site-id>/`. Existing GeckoCustom, PersonalFury, InterestPod, and Gossby fixture packages remain the canonical fixtures for those sites.
- Duplicate-owner audit is now exposed through `npm run test:unit`; it records the legacy/V2/manual files below as migration debt instead of allowing undocumented secondary owners.
- V2/manual/legacy files are frozen for compatibility fixes only; new site behavior must land in the canonical scanner profile listed in the inventory.

Phase 1 duplicate-owner gap audit:

| Duplicate owner file | Supported site(s) affected | Canonical absorber method(s) required in Phase 2 |
| --- | --- | --- |
| `content_modules/site_profiles/pawesomehouse.js` and `content_modules/manual_profiles/pawesomehouse.js` | Pawesomehouse / Customily | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/macorner.js` and `content_modules/manual_profiles/macorner.js` | Macorner / Customily | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/geckocustom.js` and `content_modules/manual_profiles/geckocustom.js` | GeckoCustom | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInRegion(region, ctx)`, `detectNearestGroupTitleFromOption(optionEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/pawfecthouse.js` | Pawfecthouse / Teeinblue | `scanPage(ctx)`, `scanVisibleState(ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/personalfury.js` | PersonalFury / Customily | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/interestpod.js` | InterestPod / personalization forms | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/gossby.js` | Gossby / personalized form | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/suzitee.js` and `content_modules/manual_profiles/suzitee.js` | Suzitee / Customily | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/trendingcustom.js` | TrendingCustom / personalization forms | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/wanderprints.js` | Wanderprints / Customily | `scanPage(ctx)`, `scanVisibleState(ctx)`, `scanManualGroupFromTitle(titleEl, ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site_profiles/etsy.js` | Etsy / Shopify-like forms | `scanPage(ctx)`, `scanVisibleState(ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, `normalizeOption(rawOption, ctx)` |
| `content_modules/site-profiles.js` | Legacy scanner-list behavior across supported sites | Move any still-required scanner-list selectors into each affected canonical profile’s `scanPage(ctx)`, `collectOptionsInContainer(containerEl, ctx)`, `normalizeGroup(rawGroup, ctx)`, and `normalizeOption(rawOption, ctx)` |
| `content_modules/clipart/scanner-profile-site-v2-consolidated.js` | PersonalFury, InterestPod, Gossby historical consolidation shim | Confirm no behavior remains outside canonical `scanPage(ctx)`, `scanVisibleState(ctx)`, and normalization methods; delete or reduce to non-operational metadata in Phase 2/3 |
| `content_modules/clipart/scanner-profile-adapters.js` | V2 adapter path for supported named sites | Move any adapter-only behavior into each canonical profile’s scanner methods, then remove supported-site adaptation in Phase 2/3 |


## Phase 2 — Site-by-site de-bridging into canonical scanner profiles

Status: **Complete on 2026-07-24**.

Purpose:

Move all remaining site-specific behavior out of V2/manual/legacy layers and into each site’s canonical scanner profile. This is the main migration phase.

Execution order:

1. **De-bridge dedicated profiles that currently reuse V2 helpers:** PersonalFury, InterestPod, and Gossby.
2. **Finalize Phase 8 native profiles:** Suzitee, TrendingCustom, Wanderprints, and Etsy.
3. **Audit already-canonical profiles for hidden legacy dependencies:** Pawesomehouse, Macorner, GeckoCustom, and Pawfecthouse.
4. **Migrate manual-only leftovers:** move any GeckoCustom/manual fallback behavior still required by tests into `scanner-profile-geckocustom.js` or the default scanner profile.
5. **Preserve default-only behavior:** keep unknown/generic pages owned by `scanner-profile-default.js` only.

Deliverables per site:

1. Canonical scanner profile contains all required site-specific selectors and extraction logic.
2. Profile does not call `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, or `window.STSManualProfiles`.
3. Fixtures cover representative Auto Scan, Append Visible State, Manual Pick, and Screenshot Pick cases where applicable.
4. Expected output validates normalized group/option shape.
5. Unit tests prove scanner registry resolution and route behavior without V2/manual adapters.
6. Chrome manual verification notes are added or refreshed.


Phase 2 progress recorded on 2026-07-24:

- Completed execution-order step 1 for PersonalFury, InterestPod, and Gossby by moving their legacy V2 profile logic directly into `content_modules/clipart/scanner-profile-personalfury.js`, `content_modules/clipart/scanner-profile-interestpod.js`, and `content_modules/clipart/scanner-profile-gossby.js`.
- Added `content_modules/clipart/scanner-profile-native-adapter.js` as scanner-profile-native mapping glue for canonical profiles; it normalizes legacy-shaped in-file groups/options without reading `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, `window.STSManualProfiles`, or `ns.siteV2Bridge`.
- Added `tests/unit/phase2-native-debridging.test.js` to prove those three canonical files have no V2/manual/legacy registry references, expose scanner-profile contract methods, and resolve directly from `STSClipartScanner.profiles`.
- Completed execution-order step 2 for Suzitee, TrendingCustom, Wanderprints, and Etsy by moving their scanner registration onto `content_modules/clipart/scanner-profile-native-adapter.js` and proving the canonical files do not reference V2/manual/legacy registries. Etsy remains default/generic-scope only while resolving as its canonical named scanner profile on Etsy hosts.
- Completed execution-order step 3 by auditing Pawesomehouse, Macorner, GeckoCustom, and Pawfecthouse canonical scanner profiles for V2/manual/legacy registry references and direct scanner-registry resolution.
- Completed execution-order step 4 by confirming GeckoCustom manual collection, nearest-title detection, and container option collection are owned by `content_modules/clipart/scanner-profile-geckocustom.js`.
- Completed execution-order step 5 by confirming Etsy remains named-host resolution only while unknown/generic pages continue to resolve through `content_modules/clipart/scanner-profile-default.js`; no site-specific generic profile was added.
- Added canonical scanner contract coverage for Pawesomehouse and Macorner `scanVisibleState(ctx)`, `collectOptionsInContainer(containerEl, ctx)`, nearest-title detection, and normalization helpers so hidden manual leftovers are owned by their canonical files.

Exit criteria:

- Every supported named site scans through its canonical scanner profile without a V2/manual/legacy dependency.
- `scanner-profile-site-v2-consolidated.js` is either empty metadata only or deleted.
- `scanner-profile-adapters.js` has no supported named site left to adapt.
- `npm run check` and `npm run test:unit` pass.

## Phase 3 — Remove legacy profile runtime and enforce one site = one profile

Status: **In progress — Phase 2 parity audit complete on 2026-07-24**.

Purpose:

Delete or fully detach legacy profile systems from the operational runtime so the repository result is exactly what was requested: **mỗi site một bộ profile duy nhất**.

Deliverables:

1. Remove these scripts from `manifest.json` content-script loading after Phase 2 parity is proven:
   - `content_modules/site-profiles.js`,
   - `content_modules/site_profiles/index.js`,
   - `content_modules/site_profiles/shared/*.js`,
   - `content_modules/site_profiles/<site>.js`,
   - `content_modules/manual_profiles/index.js`,
   - `content_modules/manual_profiles/<site>.js`,
   - `content_modules/clipart/scanner-profile-adapters.js`,
   - `content_modules/clipart/scanner-profile-site-v2-consolidated.js` if it is only a shim.
2. Delete removed-runtime tests that only prove V2/manual/legacy compatibility, or rewrite them to prove scanner-profile parity.
3. Add a final architecture guard that fails if any supported named site has more than one operational owner.
4. Add a manifest guard that allows only:
   - shared scanner modules,
   - `scanner-profile-default.js`,
   - one dedicated `scanner-profile-<site-id>.js` per supported named site,
   - non-profile runtime modules needed by UI/export/sync/core.
5. Update architecture, development rules, onboarding, inventory, removal-plan docs, README/changelog if release scope changes.
6. Run full automated checks and complete Chrome manual domain verification for the supported matrix.

Exit criteria / final definition of done:

- Each supported named site has exactly one operational profile file: `content_modules/clipart/scanner-profile-<site-id>.js`.
- Unknown or unsupported pages resolve only through `content_modules/clipart/scanner-profile-default.js`.
- No runtime code loads `content_modules/site_profiles/`, `content_modules/manual_profiles/`, or `content_modules/site-profiles.js`.
- No scanner route depends on `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, or `window.STSManualProfiles`.
- `scanner-profile-adapters.js` and `scanner-profile-site-v2-consolidated.js` are removed from runtime loading unless retained only as non-operational historical files.
- Automated checks and real-browser Chrome domain verification both pass for every supported domain.

## Documentation maintenance rules

- Any phase that changes runtime routing must update `docs/clipart-profile-architecture.md`, `docs/clipart-profile-inventory.md`, and this roadmap.
- Any new site support or site migration must update `docs/clipart-new-site-onboarding.md` if the workflow changes.
- Any file-level ownership change must update `docs/clipart-development-rules.md`.
- Remove outdated claims instead of preserving contradictory historical notes.
- Keep historical/root-cause docs only when they still explain a current regression guard or architectural constraint.
