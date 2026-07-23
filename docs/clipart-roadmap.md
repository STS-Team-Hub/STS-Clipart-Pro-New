# Clipart Runtime Roadmap and Final Architecture Plan

## Goal

Move STS Clipart Pro from the current mixed scanner-profile / V2 / legacy compatibility runtime to a final **one-site-one-scanner-profile** architecture while preserving current extension behavior.

The final target is:

- Each supported site has one canonical scanner profile file under `content_modules/clipart/scanner-profile-<site-id>.js`.
- Each site has its own fixture folder under `tests/fixtures/site-profiles/<site-id>/`.
- Each site has focused unit coverage for profile resolution, Auto Scan, Append Visible State, Manual Pick, Screenshot Pick where applicable, and normalized output shape.
- Shared behavior stays in shared scanner modules (`scanner-collectors.js`, `scanner-schema.js`, `scanner-utils.js`, `scanner-state.js`) instead of being copy-pasted into each profile.
- V2 and legacy layers remain only as compatibility bridges until a site has been migrated and verified.

## Current checkpoint

Current checkpoint: **Phase 6 complete; Phase 7 planned**.

The repository is complete for the Phase 6 automation/package baseline:

- Auto Scan resolves an effective scanner profile and calls `scanPage(ctx)`.
- Append Visible State resolves an effective scanner profile and calls `scanVisibleState(ctx)`.
- Manual Pick has a profile-first route through `scanManualGroupFromTitle(titleEl, ctx)` and profile/default normalization.
- Screenshot Pick routes region collection and nearest-title detection through the effective scanner profile before generic fallback.
- V2 site profiles can be adapted into scanner profiles.
- QA hardening is complete for the automated and packaging checks available in this repository.

The repository is **not yet at the final architecture** because scanner profiles, consolidated profiles, V2 adapter-backed profiles, and legacy compatibility layers still coexist. Manual Chrome domain verification remains an external release checklist item.

## Architecture target policy

From this point forward, new or expanded site behavior must follow this policy:

1. **New site support must use a dedicated scanner profile** in `content_modules/clipart/scanner-profile-<site-id>.js` unless there is a documented compatibility reason not to.
2. **Existing site behavior should migrate toward one dedicated scanner profile per site** when a site receives substantial updates.
3. **Do not add new feature behavior to `content_modules/site-profiles.js`**; keep it as a deprecated compatibility fallback only.
4. **Do not expand `content_modules/manual_profiles/` for new Manual Pick behavior**; use scanner-profile methods instead.
5. **V2 site-profile edits are allowed only for small compatibility fixes or staged migration**. Larger changes should create or update a dedicated scanner profile.
6. **Every site migration must include fixtures, tests, manifest load-order updates, docs updates, and Chrome manual verification notes**.

## Phase 0 — Architecture baseline

Status: **Complete**.

Deliverables:

- Freeze current content-script load order.
- Document runtime modules, schema baseline, user flows, and legacy global contracts.
- Add smoke checks for load order and basic namespace contracts.

Exit criteria:

- `npm run check` passes.
- Baseline docs exist and reflect the runtime at that checkpoint.

## Phase 1 — Profile contract and development rules

Status: **Complete**.

Completion recorded: **2026-07-23**.

Deliverables:

- Define target scanner-profile contract in `docs/clipart-profile-contract.md`.
- Define development rules for scanner-profile-first work in `docs/clipart-development-rules.md`.
- Document profile systems and onboarding workflow in `docs/clipart-profile-architecture.md` and `docs/clipart-new-site-onboarding.md`.
- Add smoke-check guards for the Phase 1 documentation baseline in `tests/smoke-check.js`.

Exit criteria:

- New scanner work has a documented target ownership layer.
- Legacy, V2, manual, and scanner-profile layers are clearly separated.
- Onboarding guidance points new site work at scanner profiles first.
- `npm run check` passes for the Phase 1 documentation and namespace guards.

Phase 1 verification record:

- Verified on **2026-07-23** that Phase 1 documentation guards pass through `npm run check`.
- Verified on **2026-07-23** that the full unit route/profile suite passes through `npm run test:unit`.
- Result: Phase 1 is considered successfully completed; no Phase 1 blockers remain in the documented baseline.

## Phase 2 — Unified routing integration

Status: **Complete**.

Completion recorded: **2026-07-23**.

Completed work:

- Implement scanner-profile registry and effective-profile fallback.
- Implement default scanner profile with required methods.
- Route Auto Scan through `scanPage(ctx)`.
- Route Append Visible State through `scanVisibleState(ctx)`.
- Route Screenshot Pick collection/title detection through scanner-profile methods.
- Adapt V2 site profiles into scanner profiles when practical.
- Move Manual Scan panel bootstrap and profile-first manual group collection into `scanner-manual.js`.
- Normalize Manual Scan empty panel data through shared schema helpers before it enters shared state/panel paths.
- Audit legacy fallback branches and keep them documented as compatibility-only paths.
- Keep the full unit suite green with existing route/profile/fallback fixtures.

Exit criteria:

- Auto, Append, Manual, and Screenshot all enter through scanner-profile-first functions.
- Legacy fallback only runs for documented compatibility cases.
- Unit tests cover each feature route and fallback route.
- `npm run check` and `npm run test:unit` pass.

Phase 2 verification record:

- Verified on **2026-07-23** that smoke checks pass through `npm run check`.
- Verified on **2026-07-23** that route/profile/fallback unit coverage passes through `npm run test:unit`.
- Result: Phase 2 is considered successfully completed; remaining ownership cleanup is tracked under Phase 4 and legacy cleanup under Phase 5+.

## Phase 3 — Site-profile consolidation

Status: **Complete**.

Completion recorded: **2026-07-23**.

Completed work:

1. Inventoried current V2 site profiles and classified ownership in `docs/clipart-profile-inventory.md`.
2. Kept existing dedicated scanner profiles for high-value complex sites:
   - Pawesomehouse / Customily
   - Macorner / Customily
   - Geckocustom
   - Pawfecthouse / Teeinblue
3. Consolidated PersonalFury, InterestPod, and Gossby into scanner-profile registry ownership through `scanner-profile-site-v2-consolidated.js` before the generic V2 adapter pass.
4. Kept fixture-driven tests for consolidated sites through existing unit fixtures.
5. Updated manifest load order and docs in the same change.

Exit criteria:

- No new site behavior is added to `content_modules/site-profiles.js`.
- Most active sites are scanner-profile-native or intentionally adapter-backed.
- Profile inventory docs list only current, verified profiles.

Phase 3 verification record:

- Verified on **2026-07-23** that smoke checks pass through `npm run check`.
- Verified on **2026-07-23** that route/profile/fallback unit coverage passes through `npm run test:unit`.
- Result: Phase 3 is complete as a transitional consolidation step, not as the final one-profile-per-site architecture.

## Phase 4 — Core extraction and ownership cleanup

Status: **Complete**.

Completion recorded: **2026-07-23**.

Completed work:

1. Moved FAB scan-mode selector UI ownership into `scanner-ui.js`; `scanner-core.js` now only supplies authenticated Auto/Manual action callbacks for that popup.
2. Moved Manual Scan empty-state mutation into `scanner-state.js` through `startManualScanState()`, keeping `scanner-core.js` as the compatibility caller that opens the existing panel renderer.
3. Kept panel rendering delegated through `scanner-panel.js` with the legacy renderer registered by core for rollback-safe compatibility.
4. Preserved legacy globals such as `window.__stsClipartPro`, FAB bridge globals, and core fallback functions while replacement module APIs remain covered by tests.
5. Updated routing/unit guards so FAB Auto Scan continues to prove it reaches `scanClipartsOrchestrated('fab')` after UI extraction.

Exit criteria:

- Safe UI/state ownership moved out of `scanner-core.js` without changing public globals.
- Feature modules continue to own their feature entrypoints while core remains the compatibility bridge for legacy picker/panel internals.
- Rollback remains phase-by-phase and low risk.

Phase 4 verification record:

- Verified on **2026-07-23** that smoke checks pass through `npm run check`.
- Verified on **2026-07-23** that route/profile/fallback unit coverage passes through `npm run test:unit`.
- Result: Phase 4 is considered successfully completed for safe ownership extraction.

## Phase 5 — Legacy deprecation and compatibility contracts

Status: **Complete**.

Completion recorded: **2026-07-23**.

Completed work:

1. Audited legacy globals used by popup/product-crawler bridges and content runtime: `window.__stsClipartPro`, FAB auth/panel bridge globals, `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, and `window.STSManualProfiles` remain runtime contracts.
2. Added one-time deprecation warnings to the legacy scanner-list router and manual-profile registry so any runtime fallback use is visible without breaking compatibility.
3. Kept `content_modules/site-profiles.js` as the permanent compatibility scanner-list fallback because `scanner-site-router.js` and legacy core paths still resolve it when scanner-profile/V2 routes are unavailable.
4. Kept `content_modules/manual_profiles/` as compatibility fixtures because GeckoCustom and older manual fallback tests still verify those assets.
5. Updated smoke checks to pin warning contracts and docs to record Phase 5 completion.

Exit criteria:

- Legacy scanner-list routing is explicitly documented as permanent compatibility fallback and emits a warning when used.
- Manual legacy profile assets are explicitly documented as compatibility fixtures and emit a warning when resolved.
- Scanner-profile-first routing remains the target; no new feature behavior should be added to legacy scanner-list or manual-profile layers.

Phase 5 verification record:

- Verified on **2026-07-23** that smoke checks pass through `npm run check`.
- Verified on **2026-07-23** that route/profile/fallback unit coverage passes through `npm run test:unit`.
- Result: Phase 5 is complete with legacy routes documented as compatibility contracts rather than removed runtime code.

## Phase 6 — QA hardening and release packaging

Status: **Complete**.

Completion recorded: **2026-07-23**.

Completed work:

1. Restored full automated unit-test health by routing `npm run test:unit` through `tests/run-unit-tests.js`, which discovers and executes every `tests/unit/*.test.js` file instead of a hand-maintained subset.
2. Added release consistency coverage for version/package alignment, manifest host permissions, packaged popup/panel assets, scanner render/sync modules, sanitizer load order, and sync payload shape in `tests/unit/release-consistency.test.js`.
3. Verified supported-domain fixture coverage remains present for required high-value domains through existing domain/profile fixture tests, including Pawesomehouse, Suzitee, Wanderprints, Gossby, Macorner, Etsy/generic routing, GeckoCustom, PersonalFury, and InterestPod.
4. Verified render/export/sync payload guard coverage through image-field preservation, image-backed render classification, scanner render packaging, scanner sync packaging, and sync payload shape tests.
5. Packaged release notes by updating README and changelog/log records to document Phase 6 completion while keeping STS Clipart Pro 8.3 / 8.3.0 consistent.

Exit criteria:

- `npm run check` passes.
- `npm run test:unit` passes and executes every unit test file.
- Manual domain checklist is documented in `TEST_CASES.md`; Chrome browser execution remains external to this non-interactive container.
- Version, README, changelog, manifest, popup, and panel consistency is pinned by automated unit coverage.

Phase 6 verification record:

- Verified on **2026-07-23** that smoke checks pass through `npm run check`.
- Verified on **2026-07-23** that the full discovered unit suite passes through `npm run test:unit`.
- Result: Phase 6 is complete for repository QA hardening and release packaging; only real-browser manual domain execution remains external.

## Phase 7 — Canonical one-site-one-profile architecture

Status: **Planned**.

Purpose:

Standardize the profile system so every supported site has one canonical scanner profile and a matching test/fixture package. This phase is architecture cleanup, not a behavior rewrite. Migration must be incremental and site-by-site.

Target deliverables:

1. Define and enforce a canonical site package shape:
   - `content_modules/clipart/scanner-profile-<site-id>.js`
   - `tests/fixtures/site-profiles/<site-id>/`
   - `tests/unit/<site-id>-profile-contract.test.js` or equivalent route/profile test coverage
2. Convert `scanner-profile-site-v2-consolidated.js` entries into dedicated scanner profile files for:
   - PersonalFury
   - InterestPod
   - Gossby
3. Convert adapter-backed V2 profiles into dedicated scanner profile files when they next receive substantial updates:
   - Suzitee
   - TrendingCustom
   - Wanderprints
   - Etsy
4. Keep V2 files as compatibility/source fixtures during migration, then freeze them when dedicated scanner coverage proves parity.
5. Keep `content_modules/site-profiles.js` and `content_modules/manual_profiles/` as compatibility-only fallback contracts until no tests/runtime flows depend on them.
6. Add or update smoke/unit guards so new site support cannot land without a scanner-profile file, manifest registration, fixture folder, expected output, and route coverage.
7. Preserve default scanner profile ownership for unknown/custom/generic pages; do not create fake site profiles for unknown hosts.

Exit criteria:

- Every named supported site in `docs/clipart-profile-inventory.md` has exactly one canonical scanner profile entry.
- Consolidated site-specific behavior is split out of `scanner-profile-site-v2-consolidated.js` or that file is reduced to a documented temporary migration shim.
- Adapter-backed V2 behavior is either migrated to dedicated scanner profiles or explicitly documented as not yet canonical with owner/date/reason.
- No new site behavior exists in `content_modules/site-profiles.js` or `content_modules/manual_profiles/`.
- `npm run check` and `npm run test:unit` pass.
- Manual Chrome verification is completed for each migrated site before declaring that site canonical.

Recommended migration order:

1. Use existing native profiles as the template: Pawesomehouse, Macorner, GeckoCustom, Pawfecthouse.
2. Split consolidated profiles: PersonalFury, InterestPod, Gossby.
3. Migrate adapter-backed V2 profiles: Suzitee, TrendingCustom, Wanderprints, Etsy.
4. Audit remaining legacy fallback usage and update docs/tests before any removal.

## Final repo definition of done

The repository reaches its final target state when:

- All supported named sites are scanner-profile-native.
- Each supported named site owns one canonical scanner profile file and one fixture/test package.
- Unknown or unsupported sites resolve only through the default scanner profile.
- V2 and legacy profile systems no longer receive feature development and are either removed or retained only as documented compatibility shims.
- Automated checks and real-browser Chrome domain verification both pass for the supported domain matrix.

## Documentation maintenance rules

- Any phase that changes runtime routing must update `docs/clipart-profile-architecture.md`, `docs/clipart-profile-inventory.md`, and this roadmap.
- Any new site support or site migration must update `docs/clipart-new-site-onboarding.md` if the workflow changes.
- Any file-level ownership change must update `docs/clipart-development-rules.md`.
- Remove outdated claims instead of preserving contradictory historical notes.
- Keep historical/root-cause docs only when they still explain a current regression guard or architectural constraint.
