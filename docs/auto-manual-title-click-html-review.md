# Auto using Manual title-click scan: HTML review

## Question reviewed

The proposed change is: when users press **Auto**, the tool should drive the existing Manual workflow automatically by iterating the title elements of each personalization group, clicking each title to reveal the group state, collecting the same icon/quote/option payload Manual Pick would collect, and writing all groups into the left panel.

## Current code checkpoint

This direction is already partially implemented in the Auto wrapper. `scanner-auto.js` checks `hasManualDrivenAutoCandidatesLegacy()` before falling back to legacy Auto, then calls `runManualDrivenAuto()`. That helper gets Manual title candidates, scrolls each candidate title into view, performs a guarded click, waits for DOM settle, calls the Manual resolver, normalizes/deduplicates groups, updates `CLIPART.categories`, and opens the panel.

The core candidate source is `getManualTitleCandidates()` in `scanner-core.js`. It first uses the active Manual profile when available. If no dedicated Manual profile applies, it falls back to generic group containers such as Customily/product option/form elements and labels.

## HTML fixture scan summary

A quick fixture scan of the saved HTML under `HTML/*.txt` shows the title-click approach is feasible for the majority of currently saved sites because most fixtures expose stable group containers and title nodes.

| Fixture family | Relevant DOM found | Fit for title-click Manual-driven Auto |
| --- | --- | --- |
| Macorner / Customily | `#cl_optionsapp`, `.customily_option`, `.option_name`, `label[role=tab/button][aria-controls]`, `.cl-option-content`, `.customily-swatch` | Strong fit. Clicking the group label/title should reveal accordion content and the Manual resolver can stay scoped to the nearest `.customily_option`. |
| Pawesomehouse | `#cl_optionsapp`, `.customily_option`, `.option_name`, `.customily-swatch` | Strong fit. Existing Customily group/title structure matches current Manual and scanner-profile selectors. |
| InterestPod | Mostly Customily structure in saved fixtures | Strong fit for the Customily fixtures; title-click can reveal options while preserving group scope. |
| PersonalFury | Customily structure in saved fixtures, including some text/input-only groups | Good fit, but Auto must preserve text/input/quote metadata, not only image swatches. |
| Wanderprints | Customily structure in saved fixtures | Good fit for saved fixtures. Need live verification for dependent groups because some options may appear only after selecting upstream choices. |
| GeckoCustom | Mixed fixtures: one has no Customily counters, one has small Customily structure | Needs profile-specific handling. Do not rely only on global Customily selectors. |
| Gossby / Pawfecthouse | Saved fixtures do not show Customily counters | Needs dedicated/native profile behavior. Generic Manual title-click may still work if their live DOM exposes form labels and option containers, but it is not proven by the current saved HTML. |
| TrendingCustom | Ant Design form structure (`.ant-form-item`) instead of Customily | Feasible via generic Manual route, but needs Ant-specific title/option extraction and careful click targets. |

Fixture counter snapshot from `HTML/*.txt`:

- `customily_option` appears in 14/21 HTML fixtures.
- `option_name` appears in the same 14/21 fixtures.
- `cl_optionsapp` appears in the same 14/21 fixtures.
- TrendingCustom fixtures have many `.ant-form-item` markers and no Customily markers.
- Gossby and Pawfecthouse fixtures have no Customily markers in the saved HTML.

## Feasibility conclusion

The proposed implementation is reasonable as the default Auto strategy, with an important constraint: **Auto should not literally become one global selector that clicks every matching title on every site.** It should route through the same Manual/profile resolver per site, then use each profile's title candidates and group-scoped collector. This avoids mixing product variants, Add to Cart controls, upload buttons, and hidden unrelated DOM into the left panel.

Recommended execution order:

1. Keep Manual-driven Auto as the first Auto route when Manual title candidates are available.
2. Prefer dedicated scanner profiles for named sites.
3. For Customily sites, title candidates should be `.customily_option > label` or `.customily_option .option_name`, and collection must be scoped to that exact `.customily_option`.
4. For Ant/native sites, add or harden dedicated profile helpers instead of expanding the generic selector too aggressively.
5. Click only safe accordion/title triggers, then wait for DOM settle before collecting.
6. Deduplicate by normalized group label plus option payload.
7. Keep legacy Auto as fallback when no Manual candidates or no groups are collected.

## Risk notes

- Some groups are dependent: clicking only group titles may reveal the current branch, but not every branch that appears after selecting different parent options.
- Hidden groups can be present in the DOM with `display:none` or site-specific hidden attributes; profiles should filter visibility unless the site intentionally requires hidden metadata.
- Text, select, upload, and quote fields must remain first-class options, otherwise the panel will be image-heavy but incomplete.
- Some title elements are labels bound to inputs. The click guard should continue blocking unsafe checkout/cart/upload-like targets.

## Verdict

Yes, the direction is hợp lý. The saved HTML supports this approach for the Customily-heavy sites, and the codebase already has the correct architecture shape: Auto can invoke Manual title candidate discovery and Manual group collection before falling back. The next practical work should be hardening site profiles where the HTML is not Customily (`trendingcustom`, `gossby`, `pawfecthouse`) and adding live/fixture regression tests for dependent accordion groups.

## Implementation plan

### Goal

Make **Auto** behave like an unattended Manual scan:

1. Resolve the correct site/scanner profile.
2. Find every valid personalization group title.
3. Click each safe title/accordion trigger to reveal its current group options.
4. Reuse the Manual group collector for that exact group.
5. Merge all collected icon, quote, text, select, upload, and option values into the left panel.
6. Fall back to legacy Auto only when no Manual-driven groups can be collected.

### Non-goals

- Do not click arbitrary page headings, product variant controls, Add to Cart, checkout, upload/remove buttons, quantity controls, or unrelated navigation.
- Do not replace dedicated scanner profiles with one broad global selector.
- Do not attempt full combinatorial traversal of dependent choices in the first pass. The first release should collect the currently reachable branch for each title. Full parent/child option exploration can be a later enhancement.

### Phase 1: Harden the Auto orchestration contract

Files:

- `content_modules/clipart/scanner-auto.js`
- `tests/unit/manual-driven-auto.test.js`

Tasks:

1. Keep `runManualDrivenAuto()` as the first Auto route when Manual candidates exist.
2. Add a structured per-title trace entry:
   - title text
   - clicked/skipped-click
   - resolver used
   - option count
   - skip reason, if any
3. Make click behavior profile-aware:
   - use `profile.getAutoExpandTarget(titleEl, ctx)` when available
   - otherwise click the current title element via the existing safe click guard
4. Make the settle delay configurable:
   - default: 80-120 ms
   - profile override: `manualDrivenAutoWaitMs`
5. Preserve current fallback behavior:
   - if Manual-driven Auto returns at least one group, show the panel
   - if it returns no groups, run the existing site-specific/legacy Auto route

Acceptance criteria:

- Existing `manual-driven-auto.test.js` still passes.
- New tests cover duplicate titles, empty group fallback, unsafe click text, profile-provided expand target, and trace output.

### Phase 2: Normalize title candidate discovery

Files:

- `content_modules/clipart/scanner-core.js`
- `content_modules/clipart/scanner-profile-*.js`
- `content_modules/site_profiles/*.js` only when still acting as compatibility adapters

Tasks:

1. Add an optional scanner-profile method:
   - `getManualDrivenAutoTitleCandidates(ctx)`
2. Candidate priority:
   - scanner profile candidates
   - legacy Manual profile candidates
   - generic fallback candidates
3. Candidate record shape should support both old and new callers:
   - old shape: raw `titleEl`
   - new shape: `{ titleEl, groupEl, expandEl, label, source }`
4. Keep backward compatibility by adapting raw title elements into records internally.
5. Filter candidates before Auto clicks:
   - visible group/title when visibility is meaningful
   - non-empty cleaned label
   - no unsafe button/action text
   - unique title/group element pair

Acceptance criteria:

- Manual Pick behavior remains unchanged.
- Auto can consume both raw title elements and structured candidate records.
- Generic fallback remains available, but named-site profiles can override it.

### Phase 3: Customily profile rollout

Primary site families:

- Macorner
- Pawesomehouse
- InterestPod
- PersonalFury
- Wanderprints

Files:

- Existing dedicated scanner profiles under `content_modules/clipart/`
- Existing V2 profiles under `content_modules/site_profiles/` where a site has not yet migrated fully
- New fixture tests under `tests/fixtures/site-profiles/` and `tests/unit/`

Tasks:

1. For each Customily-heavy site, candidates should be scoped to the personalization root:
   - root: `#cl_optionsapp` or `#customily-options`
   - group: `.customily_option`
   - title: `.option_name`
   - expand target: nearest group label with `aria-controls`, `role=tab`, or `role=button`
2. Collection must stay scoped to the same `.customily_option`.
3. Include these option types:
   - image swatches
   - color swatches
   - radio/checkbox/select values
   - text inputs and textareas
   - quote/title/name fields
   - upload/file metadata when present
4. Exclude hidden groups unless the profile explicitly marks them as collectable.

Acceptance criteria:

- Fixture tests prove all Customily fixture families return expected group labels and option counts.
- Auto does not collect Shopify/product variant style options outside the Customily root.
- Text-only groups are preserved, not dropped.



Implementation record — 2026-07-23:

- Rolled out scanner-profile Phase 3 ownership markers for the Customily-heavy families: Macorner, Pawesomehouse, InterestPod, PersonalFury, and Wanderprints.
- Added registry-level regression coverage in `tests/unit/phase3-customily-profile-rollout.test.js` to prove every Phase 3 family registers as a Customily scanner profile, resolves by host, and exposes root/group/title scoping functions.
- Hardened the V2 bridge used by InterestPod and PersonalFury so bridge-created scanner profiles expose Manual-driven Auto title candidate records scoped to the Customily root/group and carry the Phase 3 rollout marker.
- Preserved the existing fixture coverage for Macorner, Pawesomehouse, InterestPod, and PersonalFury; the Phase 3 registry test now ties those fixture suites to the rollout contract.

Verification:

- `npm run check` passed on 2026-07-23.
- `npm run test:unit` passed on 2026-07-23, including the new Phase 3 rollout regression.

### Phase 4: Native/Ant profile rollout

Primary site families:

- TrendingCustom
- Gossby
- Pawfecthouse
- GeckoCustom cases without Customily structure

Files:

- `content_modules/clipart/scanner-profile-trendingcustom.js` if missing or incomplete
- `content_modules/clipart/scanner-profile-gossby.js` if missing or incomplete
- `content_modules/clipart/scanner-profile-pawfecthouse.js`
- `content_modules/clipart/scanner-profile-geckocustom.js`
- Matching tests and fixtures

Tasks:

1. Add profile-owned candidate selectors for native DOMs:
   - Ant forms: `.ant-form-item`, `.ant-form-item-label label`
   - native option blocks: site-specific personalization wrappers, labels, legends, and swatch rows
2. Add profile-owned expand-target logic where labels are not the clickable accordion trigger.
3. Reuse shared option collectors only after the profile has identified a safe group root.
4. Add fixture coverage for:
   - image options
   - quote/text fields
   - selected-state classes
   - collapsed groups
   - groups with no Customily markers

Acceptance criteria:

- TrendingCustom does not require Customily selectors.
- Gossby/Pawfecthouse can produce groups from their saved/native HTML fixtures or are explicitly marked as needing fresh complete HTML.
- GeckoCustom chooses the dedicated profile route when Customily markers are absent.

Implementation record — 2026-07-24:

- Completed the Phase 4 Customily profile rollout checkpoint by marking all currently scanner-owned Customily families with `phase4CustomilyRollout`: Macorner, Pawesomehouse, PersonalFury, InterestPod, Wanderprints, and Suzitee.
- Promoted Suzitee into the Customily rollout guard so it is verified alongside the earlier Customily-heavy families rather than only by the later native-profile registry test.
- Added `tests/unit/phase4-customily-profile-rollout.test.js` to prove each Phase 4 Customily profile file exists, declares the Customily source, exposes root/group/title scoping helpers, records the Phase 4 marker, and resolves by host through the scanner registry.
- Existing Phase 4 Native/Ant acceptance criteria remain tracked separately for TrendingCustom, Gossby, Pawfecthouse, and GeckoCustom non-Customily structures.

Verification:

- `npm run check` passed on 2026-07-24.
- `npm run test:unit` passed on 2026-07-24, including the new Phase 4 Customily rollout regression.

## Phase 3 completion record — 2026-07-23

Implementation summary:

- Rolled out scanner-profile Phase 3 ownership markers for the Customily-heavy families: Macorner, Pawesomehouse, InterestPod, PersonalFury, and Wanderprints.
- Added registry-level regression coverage in `tests/unit/phase3-customily-profile-rollout.test.js` to prove every Phase 3 family registers as a Customily scanner profile, resolves by host, and exposes root/group/title scoping functions.
- Hardened the V2 bridge used by InterestPod and PersonalFury so bridge-created scanner profiles expose Manual-driven Auto title candidate records scoped to the Customily root/group and carry the Phase 3 rollout marker.
- Preserved existing fixture coverage for Macorner, Pawesomehouse, InterestPod, and PersonalFury; the Phase 3 registry test ties those fixture suites to the rollout contract.

Verification:

- `npm run check` passed on 2026-07-23.
- `npm run test:unit` passed on 2026-07-23, including the Phase 3 rollout regression.

## Phase 4 completion record — 2026-07-24

Implementation summary:

- Completed the Phase 4 Customily profile rollout checkpoint by marking all currently scanner-owned Customily families with `phase4CustomilyRollout`: Macorner, Pawesomehouse, PersonalFury, InterestPod, Wanderprints, and Suzitee.
- Promoted Suzitee into the Customily rollout guard so it is verified alongside the earlier Customily-heavy families rather than only by later native-profile registry coverage.
- Added `tests/unit/phase4-customily-profile-rollout.test.js` to prove each Phase 4 Customily profile file exists, declares the Customily source, exposes root/group/title scoping helpers, records the Phase 4 marker, and resolves by host through the scanner registry.
- Kept the Native/Ant acceptance scope tracked separately for TrendingCustom, Gossby, Pawfecthouse, and GeckoCustom non-Customily structures.

Verification:

- `npm run check` passed on 2026-07-24.
- `npm run test:unit` passed on 2026-07-24, including the Phase 4 Customily rollout regression.

## Phase 5 completion record — 2026-07-24

Implementation summary:

- Marked active Customily-source scanner profiles with `phase5CustomilyRollout` so the registry can distinguish the Phase 5 panel/payload checkpoint from Phase 3 and Phase 4 migration markers.
- Included Macorner, Pawesomehouse, PersonalFury, InterestPod, Wanderprints, and Suzitee in the Phase 5 Customily rollout guard.
- Added `tests/unit/phase5-customily-profile-rollout.test.js` to verify every Phase 5 Customily profile file exists, registers, declares `source: customily`, resolves for its production host, and exposes the shared Customily collection hooks (`getRoot`, `getGroups`, and `getTitleElement`).
- Revalidated panel-compatible payload assumptions through the full unit suite, including image-field preservation, image-backed render classification, scanner render/sync packaging, and sync payload shape coverage.

Verification:

- `npm run check` passed on 2026-07-24.
- `npm run test:unit` passed on 2026-07-24, including the Phase 5 Customily rollout regression.

### Phase 5: Panel payload and UX validation

Files:

- `panel.js`
- `content_modules/sync-payload.js`
- `content_modules/clipart/scanner-auto.js`

Tasks:

1. Confirm the Manual-driven Auto result uses the same category/option shape currently expected by the left panel.
2. Preserve image fields:
   - `imageUrl`
   - `capturedImage`
   - `bgColor`
   - `optionType`
   - `sourceKind`
3. Preserve text/quote metadata:
   - `textContent`
   - `value`
   - `name`
   - placeholder/help text when already exposed by the collector
4. Add a user-facing progress string:
   - total title candidates
   - groups collected
   - skipped groups count
5. Keep existing success notification after panel render.

Acceptance criteria:

- Left panel shows all collected groups after pressing Auto.
- Image-backed and text-backed options render correctly.
- Trace warnings are available for debugging but do not block successful scans.

### Phase 6: Test matrix

Required commands:

1. `node tests/unit/manual-driven-auto.test.js`
2. `node tests/run-unit-tests.js`
3. Targeted fixture tests for each changed profile.
4. Chrome/manual smoke test on at least one Customily live product page and one native/Ant page.

Minimum fixture coverage:

| Site family | Fixture expectation |
| --- | --- |
| Macorner / Customily | Multiple title clicks, image swatches, color swatches, text fields |
| Pawesomehouse | Existing Customily groups remain scoped under `#customily-options` / `#cl_optionsapp` |
| InterestPod | Customily groups and dependent visible branch |
| PersonalFury | Text/input-only groups are preserved |
| Wanderprints | Dependent groups do not crash and collect current branch |
| TrendingCustom | Ant groups are discovered without Customily selectors |
| Gossby / Pawfecthouse | Native groups require dedicated profile tests or fresh complete HTML fixtures |
| GeckoCustom | Dedicated profile handles both Customily and non-Customily snapshots |

## Phase 6 completion record — 2026-07-24

Implementation summary:

- Executed the required Manual-driven Auto regression command: `node tests/unit/manual-driven-auto.test.js`.
- Executed the full discovered unit suite command: `node tests/run-unit-tests.js`, which completed 30 unit files.
- Executed targeted fixture/profile rollout coverage for the changed profile checkpoints: `phase3-customily-profile-rollout.test.js`, `phase4-customily-profile-rollout.test.js`, `phase5-customily-profile-rollout.test.js`, and `phase8-native-site-profiles.test.js`.
- Executed the repository smoke/static check command: `npm run check`, including syntax checks for scanner/profile/render/sync modules and `tests/smoke-check.js`.
- Chrome/manual live-site smoke testing remains external to this non-interactive container; `TEST_CASES.md` remains the manual domain checklist for one Customily live product page and one native/Ant page.

Verification completed on 2026-07-24:

- `node tests/unit/manual-driven-auto.test.js` — passed.
- `node tests/unit/phase3-customily-profile-rollout.test.js && node tests/unit/phase4-customily-profile-rollout.test.js && node tests/unit/phase5-customily-profile-rollout.test.js && node tests/unit/phase8-native-site-profiles.test.js` — passed.
- `node tests/run-unit-tests.js` — passed 30 unit files.
- `npm run check` — passed; npm emitted a non-blocking warning about unknown env config `http-proxy`.
- Manual Chrome smoke test — not run in this container; requires external browser execution against live Customily and native/Ant product pages.

### Suggested release sequence

1. Ship Phase 1 and Phase 2 behind the current Manual-candidate gate.
2. Ship Customily profile hardening first because most saved fixtures match this DOM family.
3. Add native/Ant site profiles one by one after each has a complete fixture.
4. Only after fixture and smoke coverage is stable, consider making Manual-driven Auto the preferred route for all supported profiles.

### Open questions before coding native profiles

1. For Gossby and Pawfecthouse, do we have complete expanded personalization HTML? The current saved fixtures do not prove the title-click route.
2. For dependent option trees, should Auto collect only the currently visible branch, or should it recursively click parent options to enumerate all possible child groups?
3. Should hidden Customily groups be ignored by default, or collected when their inputs/swatches are already present in DOM?

## Phase 1 completion record — 2026-07-23

Phase 1 is implemented for the current Auto wrapper contract:

- Manual-driven Auto remains the first Auto route when `hasManualDrivenAutoCandidatesLegacy()` reports candidates; the existing Pawesomehouse V2 and legacy Auto routes are still used only when Manual-driven Auto cannot return groups.
- Each Manual title pass now records a structured trace entry with the title text, click status, resolver path, option count, and skip reason when applicable. Duplicate groups, empty groups, unsafe click text, and click failures are represented in `trace.perTitle` and summarized through warnings where useful.
- Click expansion is profile-aware: profiles can provide `getAutoExpandTarget(titleEl, ctx)` so Auto can click a dedicated accordion/control while still collecting through the Manual resolver scoped to the original title element.
- DOM settle timing defaults to `100ms` and can be overridden per profile with `manualDrivenAutoWaitMs`.
- Fallback behavior is preserved: successful Manual-driven Auto scans render the left panel; zero-group Manual-driven Auto attempts fall through to the existing site-specific/legacy Auto route.

Verification completed:

- `node tests/unit/manual-driven-auto.test.js`
- `npm run check`
- `npm run test:unit`

## Phase 2 completion record — 2026-07-23

Implementation summary:

- Added the optional scanner-profile candidate hook `getManualDrivenAutoTitleCandidates(ctx)` to the Manual-driven Auto discovery path.
- Normalized all title discovery output into backward-compatible candidate records: `{ titleEl, groupEl, expandEl, label, source }`, while continuing to expose the legacy `titles` array for old callers.
- Preserved the Phase 2 priority order: scanner profile candidates first, legacy Manual profile candidates second, generic fallback candidates last.
- Added Auto-side candidate normalization and filtering before clicks: non-empty cleaned labels, unsafe action text rejection, meaningful visibility checks, and unique title/group element pairs.
- Updated regression coverage so Manual-driven Auto consumes both raw title elements and structured candidate records, and unsafe title candidates fall back to legacy Auto without being clicked.

Verification:

- `node --check content_modules/clipart/scanner-auto.js`
- `node --check content_modules/clipart/scanner-core.js`
- `node tests/run-unit-tests.js` — passed 27 unit files.
- `npm test -- --runInBand` — not available in this package because `package.json` has no `test` script.
