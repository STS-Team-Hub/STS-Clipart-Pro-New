# Manual Profile → Auto Profile analysis

## Scope and inventory

The repository has two profile layers that matter for Manual-to-Auto migration:

1. **Legacy Manual Profiles** in `content_modules/manual_profiles/`.
   - Registry: `content_modules/manual_profiles/index.js` exposes `window.STSManualProfiles.register(profile)` and `resolve(host)`.
   - Profile shape is intentionally small: `key`, `matchHost(host)`, optional `useLegacyGeneric`, and optional DOM helpers such as `getRoot`, `getGroups`, `getTitle`, `getItems`, `extractValue`, `cleanupTitle`, and `cleanupValue`.
   - Existing manual sites:
     - `pawesomehouse` for `pawesomehouse.com` / subdomains.
     - `suzitee` for `suzitee.com`, `www.suzitee.com`, / subdomains.
     - `macorner-baseline` for `macorner.co` / subdomains, using the legacy generic path.

2. **Auto / scanner profiles** loaded by the extension content script.
   - V2 site-profile registry: `content_modules/site_profiles/index.js` exposes `window.STSSiteProfilesV2.register(profile)`, `resolve(host, url)`, and `list()`.
   - Scanner-profile registry: `content_modules/clipart/scanner-profile-registry.js` exposes `window.STSClipartScanner.profiles.register(profile)` and composes matched profiles with the default scanner profile.
   - Legacy V2 site profiles are adapted into scanner profiles by `content_modules/clipart/scanner-profile-adapters.js`, mapping `autoScan()` results (`title/items`) into scanner groups (`label/name/title/options`).
   - Dedicated scanner profiles already exist for:
     - `pawesomehouse-customily-manual` in `content_modules/clipart/scanner-profile-pawesomehouse-customily.js`.
     - `macorner-customily` in `content_modules/clipart/scanner-profile-macorner-customily.js`.

## Manual profile format and behavior

### `pawesomehouse`

Manual profile file: `content_modules/manual_profiles/pawesomehouse.js`.

- Host match: `pawesomehouse.com` and all subdomains.
- Root selector: `#customily-options`.
- Group selector: `.customily_option` scoped to that root.
- Group title selector: `.option_name`.
- Option selector: `.swatch-container .customily-swatch`.
- Value extraction priority:
  1. `input[value]`, with SKU-like values converted to display text when possible.
  2. `img[alt]`.
  3. `title` attribute.
  4. `aria-label` attribute.
- Manual behavior: the clicked title is mapped to the nearest `.customily_option`, then only swatches inside that group are extracted.

### `suzitee`

Manual profile file: `content_modules/manual_profiles/suzitee.js`.

- Host match: `suzitee.com`, `www.suzitee.com`, and all subdomains.
- Root selector: `#cl_optionsapp`.
- Group selector: `.customily_option` scoped to that root.
- Group title selector: `.option_name`.
- Option selector: `.swatch-container .customily-swatch`.
- Value extraction priority:
  1. `input[value]`.
  2. `img[alt]`.
  3. `title` attribute.
  4. `aria-label` attribute.
- Manual behavior: same Customily pattern as Pawesomehouse, but with a different root selector.

### `macorner-baseline`

Manual profile file: `content_modules/manual_profiles/macorner.js`.

- Host match: `macorner.co` and all subdomains.
- No site-specific manual DOM helpers in the legacy manual profile.
- It delegates to the legacy generic/manual path with `useLegacyGeneric: true`.
- In the scanner layer there is a dedicated `macorner-customily` profile that handles Macorner Customily pages when `#customily-options` and valid title signal are present.

## Auto profile format and runner behavior

### V2 site profiles

V2 site profiles live in `content_modules/site_profiles/` and usually provide:

- `id`, `name`, `domains`, `match(hostname)`, `matchHost(hostname)`.
- DOM helpers: `getRoot(doc)`, `getGroups(root)`, `getTitleElement(group)`, `getItems(group)`, `extractValue(item)`.
- Validation/mapping helpers: `isValidGroup(group)`, `autoScan(doc)`, `getManualTitleElements(doc)`, `scanManualGroupFromTitle(titleEl)`.
- Metadata: `selectors`, `scanHints`, `cleanupRules`, and `fallback`.

The `scanner-profile-adapters.js` file adapts each V2 site profile into a scanner profile when `autoScan()` or `scanManualGroupFromTitle()` exists. This preserves site-specific DOM selectors while allowing Auto mode to call the unified scanner-profile API.

### Dedicated scanner profiles

Dedicated scanner profiles live in `content_modules/clipart/scanner-profile-*.js` and can provide:

- `id`, `name`, `hosts`, and optional `detect(ctx)`.
- `scanPage(ctx)` for Auto.
- `scanManualGroupFromTitle(titleEl, ctx)` for Manual.
- Optional helper methods inherited or consumed by the default scanner profile.

The Auto runner resolves the effective scanner profile through `window.STSClipartScanner.profiles.resolve(ctx)` and then calls `profile.scanPage(ctx)`. If a matched profile omits methods, the registry composes it with the default profile to keep backward compatibility.

## Manual → Auto mapping

| Manual site | Manual root/group/title/items | Auto route | Conversion status |
| --- | --- | --- | --- |
| Pawesomehouse | `#customily-options` → `.customily_option` → `.option_name` → `.customily-swatch` | Dedicated scanner profile `pawesomehouse-customily-manual` | Auto scans all groups inside the Customily root. This change also includes text inputs, textareas, file inputs, select/dropdown options, radio/checkbox-backed swatches, images, colors, and selected state. |
| Suzitee | `#cl_optionsapp` → `.customily_option` → `.option_name` → `.customily-swatch` | V2 site profile `suzitee`, adapted into scanner profile | Auto scans all groups inside the Customily root. This change extends the profile beyond manual swatches to include selects, text inputs, textareas, and file inputs. |
| Macorner | Legacy generic manual profile | Dedicated scanner profile `macorner-customily` | Auto already uses `#customily-options` and `.customily_option`, delegates expandable Customily scanning to Auto V2, and adds text-input metadata. No extra selector change was needed. |

## DOM pattern and isolation rules

### Pawesomehouse

- Auto root: `#customily-options`.
- Auto group containers: all `.customily_option` descendants of the root.
- Title: `.option_name` inside each group.
- Options are collected only from the current `.customily_option`, so product variant buttons outside the Customily root and options from sibling groups are ignored.
- Supported option sources:
  - `.customily-swatch.swatch` or `.customily-swatch` with radio/checkbox inputs.
  - `select[name^="properties["] option` with placeholder filtering.
  - Text-like `input` controls and `textarea` controls.
  - `input[type="file"]` metadata.
- Existing selected-state logic is reused: checked inputs and common selected/active classes are preserved on swatch options.

### Suzitee

- Auto root: `#cl_optionsapp` first, with `#customily-options` as fallback.
- Auto group containers: all visible `.customily_option` descendants of the root.
- Title: `.option_name` inside each group.
- Options are collected only from the current group.
- Supported option sources:
  - `.swatch-container .customily-swatch` and `.customily-swatch`.
  - `select option` with placeholder filtering.
  - Text-like `input` controls and `textarea` controls.
  - `input[type="file"]` metadata.

### Macorner

- Auto root: `#customily-options`.
- Auto group containers: `.customily_option`.
- Title: `.option_name` with Customily title cleanup.
- `scanPage()` uses Auto V2 where available with Customily/select strategies and bounded clicks (`maxClicks: 8`) to reveal dynamic/accordion options, then appends text-input metadata from the group element.
- Manual scan remains scoped to the clicked title's closest `.customily_option` and refuses titles outside the Macorner Customily root.

## Sites requiring interaction or special logic

- **Macorner** can require accordion/render interaction. The dedicated profile already routes through `runAutoV2()` with Customily/select strategies and a click budget.
- **Pawesomehouse** and **Suzitee** can be auto-scanned by scoped Customily selectors when options are already in the DOM. If a specific live page lazy-renders a group's options only after click, the next backward-compatible extension should add a small optional descriptor field such as `expandTriggerSelector`, `requiresClickToRevealOptions`, and `waitAfterClickMs` to the site profile rather than replacing the current selectors.
- No manual profile was removed, and Manual mode continues to call the same group-scoped extractor path for Pawesomehouse and the same legacy/V2 helper paths for other sites.

## Recommended backward-compatible profile fields if more dynamic sites appear

The current format is sufficient for the analyzed manual profiles. If future manual profiles require Auto to click each title before options exist in the DOM, add optional fields without changing old profiles:

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

The runner can check these fields only when present, preserving all existing profile behavior.
