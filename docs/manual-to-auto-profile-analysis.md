# Manual Profile → Auto/Profile Architecture Analysis

## Scope

This document explains how older Manual-profile behavior maps into the current scanner-profile-first runtime and how that mapping should evolve toward the final one-site-one-scanner-profile architecture.

## Current architecture checkpoint

The repository is currently **Phase 7 complete**.

- Phase 6 completed scanner-profile-first routing for major flows and hardened automated QA.
- Phase 7 made consolidated supported sites canonical by giving PersonalFury, InterestPod, and Gossby dedicated scanner profile files, fixtures, tests, and documented verification notes.
- Manual legacy profiles remain compatibility fixtures only; new Manual Pick behavior should be implemented in scanner profiles.

## Scope and inventory

The repository has three profile layers that matter for Manual-to-Auto migration:

1. **Legacy Manual Profiles** in `content_modules/manual_profiles/`.
   - Registry: `content_modules/manual_profiles/index.js` exposes `window.STSManualProfiles.register(profile)` and `resolve(host)`.
   - Profile shape is intentionally small: `key`, `matchHost(host)`, optional `useLegacyGeneric`, and optional DOM helpers such as `getRoot`, `getGroups`, `getTitle`, `getItems`, `extractValue`, `cleanupTitle`, and `cleanupValue`.
   - Existing manual sites include Pawesomehouse, Suzitee, Macorner baseline, and GeckoCustom compatibility assets.
   - Final target: do not add new Manual Pick feature behavior here; migrate behavior into scanner profiles.

2. **V2 site profiles** in `content_modules/site_profiles/`.
   - Registry: `content_modules/site_profiles/index.js` exposes `window.STSSiteProfilesV2.register(profile)`, `resolve(host, url)`, and `list()`.
   - V2 profiles can be adapted into scanner profiles by `content_modules/clipart/scanner-profile-adapters.js` when they expose `autoScan()` or `scanManualGroupFromTitle()`.
   - Final target: keep V2 as compatibility/source material, not the primary ownership layer for substantial new behavior.

3. **Scanner profiles** in `content_modules/clipart/scanner-profile-*.js`.
   - Registry: `content_modules/clipart/scanner-profile-registry.js` exposes `window.STSClipartScanner.profiles.register(profile)` and composes matched profiles with the default scanner profile.
   - Dedicated scanner profiles already exist for Pawesomehouse, Macorner, GeckoCustom, and Pawfecthouse.
   - Final target: every supported named site has one dedicated scanner profile package.

## Manual profile format and behavior

### `pawesomehouse`

Manual profile file: `content_modules/manual_profiles/pawesomehouse.js`.

- Host match: `pawesomehouse.com` and all subdomains.
- Root selector: `#customily-options`.
- Group selector: `.customily_option` scoped to that root.
- Group title selector: `.option_name`.
- Option selector: `.swatch-container .customily-swatch`.
- Manual behavior: the clicked title is mapped to the nearest `.customily_option`, then only swatches inside that group are extracted.
- Target ownership: existing dedicated scanner profile should remain the canonical place for future behavior.

### `suzitee`

Manual profile file: `content_modules/manual_profiles/suzitee.js`.

- Host match: `suzitee.com`, `www.suzitee.com`, and all subdomains.
- Root selector: `#cl_optionsapp`.
- Group selector: `.customily_option` scoped to that root.
- Group title selector: `.option_name`.
- Option selector: `.swatch-container .customily-swatch`.
- Manual behavior: same Customily pattern as Pawesomehouse, but with a different root selector.
- Target ownership: migrate substantial changes into `scanner-profile-suzitee.js`; keep manual/V2 paths compatibility-only until parity is verified.

### `macorner-baseline`

Manual profile file: `content_modules/manual_profiles/macorner.js`.

- Host match: `macorner.co` and all subdomains.
- Legacy manual profile delegates to generic/manual behavior with `useLegacyGeneric: true`.
- Scanner layer has a dedicated `macorner-customily` profile that handles Macorner Customily pages when `#customily-options` and valid title signal are present.
- Target ownership: dedicated scanner profile remains canonical.

## Scanner-profile route behavior

Dedicated scanner profiles can provide:

- `id`, `name`, `hosts`, and optional `detect(ctx)`.
- `scanPage(ctx)` for Auto Scan.
- `scanVisibleState(ctx)` for Append Visible State.
- `scanManualGroupFromTitle(titleEl, ctx)` for Manual Pick.
- `collectOptionsInContainer(containerEl, ctx)` for container/manual collection.
- `collectOptionsInRegion(region, ctx)` and `detectNearestGroupTitleFromOption(optionEl, ctx)` for Screenshot Pick.
- `normalizeGroup(rawGroup, ctx)` and `normalizeOption(rawOption, ctx)` for schema compatibility.

The runner resolves the effective scanner profile through `window.STSClipartScanner.profiles.resolve(ctx)` and calls feature methods on that effective profile. If a matched profile omits methods, the registry composes it with the default profile.

## Manual → scanner ownership mapping

| Manual/V2 site | Legacy/manual source | Current scanner route | Target conversion status |
| --- | --- | --- | --- |
| Pawesomehouse | `#customily-options` → `.customily_option` → `.option_name` → `.customily-swatch` | Dedicated scanner profile `pawesomehouse-customily-manual` | Canonical scanner profile; keep fixtures/tests current. |
| Suzitee | `#cl_optionsapp` → `.customily_option` → `.option_name` → `.customily-swatch` | V2 site profile `suzitee`, adapted into scanner profile | Create `scanner-profile-suzitee.js` when substantial work is scheduled. |
| Macorner | Legacy generic manual profile | Dedicated scanner profile `macorner-customily` | Canonical scanner profile; keep fixtures/tests current. |
| GeckoCustom | Legacy manual compatibility assets exist | Dedicated scanner profile `geckocustom` | Canonical scanner profile; legacy manual assets remain compatibility fixtures. |

## DOM pattern and isolation rules

### Pawesomehouse

- Auto root: `#customily-options`.
- Auto group containers: all `.customily_option` descendants of the root.
- Title: `.option_name` inside each group.
- Options are collected only from the current `.customily_option`, so product variant buttons outside the Customily root and options from sibling groups are ignored.
- Supported option sources include swatches, selects, text inputs, textareas, file metadata, image/color values, and selected state.

### Suzitee

- Auto root: `#cl_optionsapp` first, with `#customily-options` as fallback.
- Auto group containers: all visible `.customily_option` descendants of the root.
- Title: `.option_name` inside each group.
- Options are collected only from the current group.
- Supported option sources include swatches, selects, text inputs, textareas, and file metadata.

### Macorner

- Auto root: `#customily-options`.
- Auto group containers: `.customily_option`.
- Title: `.option_name` with Customily title cleanup.
- `scanPage()` uses Auto V2 where available with Customily/select strategies and bounded clicks to reveal dynamic/accordion options, then appends text-input metadata from the group element.
- Manual scan remains scoped to the clicked title's closest `.customily_option` and refuses titles outside the Macorner Customily root.

## Recommended migration rule

When a Manual or V2 site needs meaningful new behavior:

1. Create or update the dedicated scanner profile.
2. Move site-specific selectors/helpers into that profile.
3. Keep shared logic in shared scanner modules.
4. Add fixtures and expected output.
5. Add route/schema unit tests.
6. Keep legacy/V2 behavior as compatibility only until parity is verified.
7. Run Chrome verification before marking the site canonical.

## Optional fields for dynamic sites

If future profiles require Auto to click each title before options exist in the DOM, add optional profile fields or helper behavior without changing old profiles:

- `groupContainerSelector`
- `groupTitleSelector`
- `optionContainerSelector`
- `optionItemSelector`
- `optionLabelSelector`
- `optionValueSelector`
- `expandTriggerSelector`
- `requiresClickToRevealOptions`
- `waitAfterClickMs`
- `selectedStateSelector`
- `selectedStateClass`
- `selectedStateAttribute`

The runner or profile helper should check these fields only when present, preserving existing behavior.
