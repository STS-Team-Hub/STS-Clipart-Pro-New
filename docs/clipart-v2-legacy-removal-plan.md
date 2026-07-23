# V2 and Legacy Removal Plan

Planning date: **2026-07-23**.

## Decision

STS Clipart Pro should move from mixed V2/legacy compatibility routing to **one operational scanner flow**:

1. The runtime enters through the shared scanner orchestrators.
2. The scanner profile registry resolves one effective profile for the current site.
3. The default profile supplies the common path for unknown or unsupported pages.
4. Each supported site customizes that same path with one dedicated `scanner-profile-<site-id>.js` file.

This makes the repo easier to extend: every site uses the same road, while each site's scanner profile is the site-specific color/lane on that road.

## Target runtime shape

The final runtime must have these layers only:

| Layer | Responsibility | Files |
| --- | --- | --- |
| Shared orchestration | Auto Scan, Append Visible State, Manual Pick, Screenshot Pick, state, rendering, sync, and export entrypoints | `content_modules/clipart/scanner-auto.js`, `scanner-manual.js`, `scanner-screenshot.js`, `scanner-state.js`, `scanner-render.js`, `scanner-sync.js`, `scanner-export.js`, `scanner-panel.js` |
| Profile registry | Resolve the effective scanner profile and compose missing methods with the default profile | `content_modules/clipart/scanner-profile-registry.js`, `scanner-profile-context.js` |
| Default profile | Generic behavior for unknown/custom pages | `content_modules/clipart/scanner-profile-default.js` |
| Site profiles | One dedicated profile file per supported named site | `content_modules/clipart/scanner-profile-<site-id>.js` |
| Shared helpers | Schema, collectors, normalization, sanitization, label/dropdown helpers | `content_modules/clipart/scanner-schema.js`, `scanner-collectors.js`, `scanner-utils.js`, plus shared top-level helper modules |

The final runtime must not depend on `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, or `window.STSManualProfiles` for scan behavior.

## What will be removed

Remove these compatibility layers after the replacement scanner-profile paths exist:

1. `content_modules/site-profiles.js` legacy scanner-list router.
2. `content_modules/site_profiles/` V2 profile registry and site files.
3. `content_modules/manual_profiles/` legacy Manual Pick registry and site files.
4. `content_modules/clipart/scanner-profile-adapters.js` generic V2-to-scanner adapter.
5. `content_modules/clipart/scanner-profile-site-v2-bridge.js` once profiles copied from V2 no longer import it.
6. `content_modules/clipart/scanner-profile-site-v2-consolidated.js` temporary load-order shim.
7. Runtime references to `window.STSSiteProfiles`, `window.STSSiteProfilesV2`, and `window.STSManualProfiles` inside scanner modules and tests.
8. Manifest entries that load the removed compatibility scripts.

Do not remove `content_modules/clipart/scanner-auto-default-v2.js` solely because of the `V2` suffix. It currently contains the reusable default expansion/snapshot implementation used by scanner profiles. Rename it only after callers have moved to a neutral API name such as `scanner-auto-default.js`.

## Migration principles

1. **One route first.** All scan modes must resolve through `window.STSClipartScanner.profiles.resolve(ctx)` before collecting site-specific data.
2. **Site-specific color stays in one file.** Selectors, DOM quirks, field cleanup, option extraction, and site-specific scan hints live in exactly one dedicated site profile file.
3. **Shared logic stays shared.** Dedupe, schema normalization, image metadata preservation, collectors, rendering, export, sync, and state must remain in shared modules.
4. **Default handles unknown sites.** Do not create fake site profiles for unknown hosts; fallback belongs to the default profile.
5. **Broken sites are acceptable during cleanup.** If a site breaks after V2/legacy removal, capture updated HTML and fix the dedicated scanner profile afterward.
6. **No new compatibility code.** Do not add new behavior to V2, `site-profiles.js`, or `manual_profiles/` while this plan is active.

## Execution phases

### Phase A — Freeze compatibility layers

- Mark V2, legacy scanner-list, and manual profile folders as removal targets in docs.
- Reject new feature behavior in `content_modules/site-profiles.js`, `content_modules/site_profiles/`, and `content_modules/manual_profiles/`.
- Keep only syntax/test maintenance needed to reach the removal PR.

### Phase B — Create canonical profiles for remaining adapter-backed sites

Create dedicated scanner profiles for the remaining named sites that still depend on V2 adapters:

1. `scanner-profile-suzitee.js`
2. `scanner-profile-trendingcustom.js`
3. `scanner-profile-wanderprints.js`
4. `scanner-profile-etsy.js`

Each profile must include:

- `id`, `name`, `hosts`, and `detect(ctx)`.
- `scanPage(ctx)` for Auto Scan.
- `scanVisibleState(ctx)` when visible-state append needs site-specific behavior.
- `scanManualGroupFromTitle(titleEl, ctx)` when Manual Pick is supported.
- Any Screenshot Pick customizations if the site requires them.
- Fixture coverage under `tests/fixtures/site-profiles/<site-id>/` when current or refreshed HTML is available.
- Unit coverage proving registry resolution and normalized output shape.

### Phase C — De-bridge existing dedicated profiles

PersonalFury, InterestPod, and Gossby already have dedicated files, but they still use the V2 bridge helper. Convert them from bridge-backed files into fully self-contained scanner profiles:

1. Copy only the required selector/extraction behavior from the V2 source into each dedicated profile.
2. Remove imports/reads of `window.STSSiteProfilesV2` from those dedicated profiles.
3. Keep shared normalization in shared scanner modules instead of duplicating bridge mapper logic.
4. Update tests so route coverage passes without loading V2 registry files.

### Phase D — Remove runtime fallback references

After all named sites are scanner-profile-native:

1. Update `scanner-site-router.js` to resolve only through scanner profiles/default behavior.
2. Remove V2/manual fallback branches from `scanner-core.js` and related tests.
3. Remove `scanner-profile-adapters.js`, `scanner-profile-site-v2-bridge.js`, and `scanner-profile-site-v2-consolidated.js` from `manifest.json`.
4. Remove `content_modules/site-profiles.js`, `content_modules/site_profiles/`, and `content_modules/manual_profiles/` from `manifest.json`.
5. Delete obsolete tests that only assert compatibility warnings, or rewrite them to assert the new one-flow contract.

### Phase E — Clean naming and docs

- Rename reusable APIs that still carry a historical `V2` name after behavior is no longer tied to the V2 profile system.
- Update architecture docs, development rules, profile inventory, and release checklist to describe scanner profiles as the only supported path.
- Keep a short migration note explaining that old V2/manual HTML fixtures were intentionally removed or archived.

## Definition of done

The removal is complete when:

- `rg "STSSiteProfiles|STSSiteProfilesV2|STSManualProfiles" content_modules tests manifest.json` returns no runtime dependency, except archived migration notes if intentionally kept in docs.
- `manifest.json` loads scanner runtime modules, shared helpers, default profile, and dedicated scanner profiles only.
- Every supported named site in `docs/clipart-profile-inventory.md` is marked scanner-profile-native.
- Unknown pages use `scanner-profile-default.js` only.
- Unit tests prove Auto Scan, Append Visible State, Manual Pick, Screenshot Pick where applicable, and normalized output shape for supported named sites.
- `npm run check` and `npm run test:unit` pass.
