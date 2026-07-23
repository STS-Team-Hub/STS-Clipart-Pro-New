# Clipart New Site Onboarding Workflow

## Goal
Define a repeatable, low-risk onboarding process for adding a new website profile in future phases.

## Required input from user

Provide copied HTML snippets for:
- option group area
- group title area
- option/swatch elements
- selected/active state
- disabled/unavailable state (if any)
- image/color/text examples (if any)

## Standard onboarding steps

1. Create fixture folder
   - `tests/fixtures/site-profiles/<site-id>/`
2. Save snippet fixtures (minimum examples)
   - `group-basic.html`
   - `group-with-images.html` (if applicable)
   - `group-selected-state.html` (if applicable)
   - `group-disabled-state.html` (if applicable)
   - `expected.json`
3. Implement a scanner profile under `content_modules/clipart/scanner-profile-<site>.js` when possible. Use `content_modules/site_profiles/` only for transitional V2 compatibility when a direct scanner profile is not the safest path.
4. Add expected parsed output JSON in fixture folder.
5. Run fixture/profile tests.
6. Run smoke checks.
7. Manual Chrome verification for:
   - Auto Scan
   - Append Visible State
   - Manual Pick
   - Screenshot Pick

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

## Suggested Codex prompt template for future onboarding

Use the following prompt template:

> You are adding one new `site_profiles/<site-id>.js` profile for STS Clipart Pro.
> Inputs include HTML snippets for group/title/options/selected/disabled states.
> Implement profile methods following `docs/clipart-profile-contract.md`.
> Preserve output schema compatibility.
> Add fixtures under `tests/fixtures/site-profiles/<site-id>/` and expected output JSON.
> Do not change unrelated runtime behavior.
> Provide test commands and manual verification steps for Auto/Append/Manual/Screenshot.

## Current implementation note

The project is currently Phase 6 complete. New onboarding should remain scanner-profile-first, with V2 adapters used only as a migration bridge. Keep fixtures, manifest load order, routing tests, and docs in the same change.

