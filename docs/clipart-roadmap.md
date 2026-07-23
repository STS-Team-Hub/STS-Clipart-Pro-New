# Clipart Runtime Roadmap and Phase Plan

## Goal

Move STS Clipart Pro from mixed legacy/V2/scanner-profile routing to a clean scanner-profile-first runtime while preserving current extension behavior.

## Current checkpoint

Current checkpoint: **Phase 2 partial**.

The scanner-profile contract is already wired into the most important runtime paths:

- Auto Scan resolves an effective scanner profile and calls `scanPage(ctx)`.
- Append Visible State resolves an effective scanner profile and calls `scanVisibleState(ctx)`.
- Screenshot Pick routes region collection and nearest-title detection through the effective scanner profile before generic fallback.
- V2 site profiles can be adapted into scanner profiles.

Manual Pick and core ownership are not fully migrated yet.

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

Phase 1 progress notes:

- Contract scope is complete: the target scanner-profile shape and effective-profile fallback rules are documented.
- Development rules are complete: target, transitional, legacy, and manual-compatibility layers are separated with ownership boundaries.
- Onboarding guidance is complete: future site work has fixture, manifest, test, and manual-verification steps.
- Current runtime progress has moved beyond Phase 1 into Phase 2 partial; remaining work is tracked under Phase 2 and later phases below.

Phase 1 verification record:

- Verified on **2026-07-23** that Phase 1 documentation guards pass through `npm run check`.
- Verified on **2026-07-23** that the full unit route/profile suite passes through `npm run test:unit`.
- Result: Phase 1 is considered successfully completed; no Phase 1 blockers remain in the documented baseline.

## Phase 2 — Unified routing integration

Status: **In progress / partial complete**.

Already done:

- Implement scanner-profile registry and effective-profile fallback.
- Implement default scanner profile with required methods.
- Route Auto Scan through `scanPage(ctx)`.
- Route Append Visible State through `scanVisibleState(ctx)`.
- Route Screenshot Pick collection/title detection through scanner-profile methods.
- Adapt V2 site profiles into scanner profiles when practical.

Remaining work:

1. Finish Manual Pick migration so the top-level manual module owns profile-first flow instead of acting only as a legacy wrapper.
2. Make all resolver paths normalize with the same schema helpers before entering shared state/panel/export.
3. Audit fallback branches and document exactly when legacy routes are still allowed.
4. Add/repair fixtures so the full unit suite is green.

Exit criteria:

- Auto, Append, Manual, and Screenshot all enter through scanner-profile-first functions.
- Legacy fallback only runs for documented compatibility cases.
- Unit tests cover each feature route and fallback route.
- `npm run check` and `npm run test:unit` pass.

## Phase 3 — Site-profile consolidation

Status: **Not started**.

Planned work:

1. Inventory every V2 site profile and classify it as:
   - migrate to dedicated scanner profile,
   - keep as adapter-backed transitional profile,
   - remove if obsolete.
2. Migrate high-value or complex sites to dedicated scanner profiles first:
   - Pawesomehouse / Customily
   - Macorner / Customily
   - Geckocustom
   - Pawfecthouse / Teeinblue
   - PersonalFury / Customily
   - InterestPod / personalization forms
   - Gossby / personalized form
3. Keep fixture-driven tests for each migrated site.
4. Update manifest load order and docs in the same change as each migration.

Exit criteria:

- No new site behavior is added to `content_modules/site-profiles.js`.
- Most active sites are scanner-profile-native or intentionally adapter-backed.
- Profile inventory docs list only current, verified profiles.

## Phase 4 — Core extraction and ownership cleanup

Status: **Not started**.

Planned work:

1. Move remaining picker orchestration out of `scanner-core.js` into feature modules where safe.
2. Move panel/UI responsibilities toward `scanner-panel.js`, `scanner-ui.js`, and `scanner-render.js`.
3. Move state mutations toward `scanner-state.js`.
4. Move schema normalization toward `scanner-schema.js`.
5. Preserve legacy globals until replacement APIs are tested.

Exit criteria:

- `scanner-core.js` is reduced to bootstrap/orchestration compatibility only.
- Feature modules own their feature entrypoints.
- Rollback remains phase-by-phase and low risk.

## Phase 5 — Legacy deprecation and removal

Status: **Not started**.

Planned work:

1. Identify legacy globals and functions still used by popup/panel/background/content scripts.
2. Add warnings or compatibility shims where needed.
3. Remove unused legacy scanner-list/manual-profile code only after tests prove no runtime dependency remains.
4. Update README, architecture docs, onboarding docs, and tests.

Exit criteria:

- Legacy scanner-list routing is either removed or explicitly documented as permanent fallback.
- Manual legacy profile assets are removed or documented as compatibility fixtures.
- No dead code remains in scanner modules.

## Phase 6 — QA hardening and release packaging

Status: **Not started**.

Planned work:

1. Restore full automated test health.
2. Add fixture coverage for every supported domain.
3. Run manual Chrome verification on required domains from `TEST_CASES.md`.
4. Verify render/export/sync payload shape.
5. Package release notes and changelog.

Exit criteria:

- `npm run check` passes.
- `npm run test:unit` passes.
- Manual domain checklist is completed.
- Version, README, changelog, manifest, popup, and panel are consistent.

## Documentation maintenance rules

- Any phase that changes runtime routing must update `docs/clipart-profile-architecture.md` and this roadmap.
- Any new site support must update `docs/clipart-new-site-onboarding.md` if the workflow changes.
- Remove outdated claims instead of preserving contradictory historical notes.
- Keep historical/root-cause docs only when they still explain a current regression guard or architectural constraint.
