# Clipart New Site Onboarding Workflow

## Goal

Define a repeatable, low-risk onboarding process for adding a new website profile and for migrating existing sites toward the final one-site-one-scanner-profile architecture.

## Current repository context

The project is currently **Phase 8 in progress**.

- Phase 6 means scanner-profile-first routing and automated QA/release checks are in place.
- Phase 7 made the former consolidated profiles canonical: PersonalFury, InterestPod, and Gossby now have a dedicated scanner profile file, fixture folder, and test package. Phase 8 added dedicated scanner profile files for Suzitee, TrendingCustom, Wanderprints, and Etsy while leaving compatibility cleanup in progress.
- V2 adapters and legacy profile layers may still exist, but they are compatibility bridges, not the target place for new site behavior.

## Required input from user

Provide copied HTML snippets for:

- option group area
- group title area
- option/swatch elements
- selected/active state
- disabled/unavailable state (if any)
- image/color/text examples (if any)
- dynamic/accordion/click-to-reveal state (if options appear only after interaction)

A URL alone is not enough for stable implementation. The scanner profile should be built from representative DOM snippets and verified in Chrome.

## Canonical site package

Each supported named site should have:

1. A scanner profile file:
   - `content_modules/clipart/scanner-profile-<site-id>.js`
2. A fixture folder:
   - `tests/fixtures/site-profiles/<site-id>/`
3. Expected output JSON for supported DOM patterns.
4. Unit tests for profile resolution, route behavior, and normalized schema.
5. Manifest registration before `content_modules/clipart/scanner-profile-adapters.js` when the file registers a scanner profile directly.
6. Manual Chrome verification notes for Auto Scan, Append Visible State, Manual Pick, and Screenshot Pick.

## Standard onboarding steps for a new site

Compatibility note: older docs described this step as: Implement a scanner profile under `content_modules/clipart/scanner-profile-<site>.js`. The current canonical file name is `content_modules/clipart/scanner-profile-<site-id>.js`.

1. Pick a stable `<site-id>`.
2. Identify the site engine or DOM pattern:
   - Customily
   - Teeinblue
   - Shopify options
   - generic personalization form
   - marketplace/custom DOM
3. Create fixture folder:
   - `tests/fixtures/site-profiles/<site-id>/`
4. Save snippet fixtures, as applicable:
   - `group-basic.html`
   - `group-with-images.html`
   - `group-selected-state.html`
   - `group-disabled-state.html`
   - `group-dynamic-expanded.html`
   - `expected.json`
5. Implement scanner profile:
   - `content_modules/clipart/scanner-profile-<site-id>.js`
6. Add the profile script to `manifest.json` before `scanner-profile-adapters.js` if it registers directly.
7. Add expected parsed output JSON in the fixture folder.
8. Add or update unit tests.
9. Run fixture/profile tests.
10. Run smoke checks.
11. Run Chrome manual verification for:
    - Auto Scan
    - Append Visible State
    - Manual Pick
    - Screenshot Pick

## Updating or migrating an existing site

Use the current ownership class to choose the safest path:

### Dedicated scanner-profile-native site

Examples include Pawesomehouse, Macorner, GeckoCustom, and Pawfecthouse.

- Update the existing `content_modules/clipart/scanner-profile-*.js` file.
- Add or update fixtures for the changed DOM pattern.
- Add or update unit tests for the changed route/schema behavior.
- Run Chrome manual verification for the changed site.

### Former consolidated scanner profile site

PersonalFury, InterestPod, and Gossby were split in Phase 7 and are now dedicated scanner-profile-native sites.

- Update their dedicated `content_modules/clipart/scanner-profile-<site-id>.js` files for future behavior changes.
- Keep V2 source profiles as compatibility fixtures unless a compatibility fix is required.
- Keep fixtures in `tests/fixtures/site-profiles/<site-id>/` and route coverage in `tests/unit/phase7-canonical-site-profiles.test.js` current with behavior changes.
- Do not add new registrations to `scanner-profile-site-v2-consolidated.js`; it is a load-order compatibility shim only.

### V2 adapter-backed site

Examples include Suzitee, TrendingCustom, Wanderprints, and Etsy.

- For small compatibility fixes, V2 edits are allowed when lower risk.
- For new feature behavior or substantial DOM changes, create a dedicated scanner profile and keep the V2 file as compatibility/source material.
- Verify parity against existing fixtures before changing runtime priority.

### Legacy scanner-list or manual-profile behavior

- Do not expand `content_modules/site-profiles.js` for new feature behavior.
- Do not expand `content_modules/manual_profiles/` for new Manual Pick behavior.
- Port required logic into a scanner profile and leave legacy code only as a compatibility fallback.

## Data schema compatibility (must preserve)

Category schema:

```json
{
  "name": "",
  "prefix": "",
  "options": [],
  "optionCount": 0
}
```

Option schema:

```json
{
  "label": "",
  "textContent": "",
  "value": "",
  "name": "",
  "imageUrl": null,
  "capturedImage": null,
  "bgColor": ""
}
```

Profiles may add metadata, but they must not drop these compatibility fields before data enters state, panel, export, render, or sync flows.

## Required tests/checks before shipping

Run at minimum:

```bash
npm run check
npm run test:unit
```

For a site-specific migration, also run or add the relevant unit test file for that site.

Chrome manual verification remains required before marking a site production-verified.

## Suggested Codex prompt template for future onboarding

Use the following prompt template:

> You are adding or migrating one site profile for STS Clipart Pro using the final one-site-one-scanner-profile architecture.
> Site id: `<site-id>`.
> Inputs include HTML snippets for group/title/options/selected/disabled/dynamic states.
> Implement `content_modules/clipart/scanner-profile-<site-id>.js` following `docs/clipart-profile-contract.md`.
> Preserve output schema compatibility.
> Add fixtures under `tests/fixtures/site-profiles/<site-id>/` and expected output JSON.
> Add or update unit tests for resolver, Auto Scan, Append Visible State, Manual Pick, Screenshot Pick where applicable, and schema normalization.
> Register the script in `manifest.json` before `scanner-profile-adapters.js` if it registers directly.
> Do not add new feature behavior to V2 or legacy profile layers unless explicitly documented as compatibility-only.
> Provide test commands and manual verification steps for Auto/Append/Manual/Screenshot.

## Documentation updates required with profile work

- Update `docs/clipart-profile-inventory.md` whenever a site changes ownership class.
- Update `docs/clipart-roadmap.md` when a migration phase starts or completes.
- Update `docs/clipart-development-rules.md` if ownership rules change.
- Update this document if the onboarding workflow changes.
