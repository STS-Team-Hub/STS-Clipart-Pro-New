# STS vs Matrixty auto-scan: root cause for image items rendering as text

## Context compared

- STS auto flow: `content_modules/clipart/scanner-auto.js` + `content_modules/clipart/scanner-auto-default-v2.js` + scanner profiles.
- Matrixty auto flow (reference): `ETC/matrixty-extension-v1.3.6/content.js`.

## Current repository context

The repository is **Phase 6 complete; Phase 7 planned**.

- Phase 6 hardened the scanner-profile-first automated route and regression tests.
- Phase 7 will move the remaining supported named sites toward one dedicated scanner profile package per site.
- The image-field preservation invariant in this document applies to every scanner profile, adapter-backed V2 profile, and future site migration.

## Key difference that caused the bug

The wrong rendering happens when option metadata is **degraded** while mapping scanner output to panel categories.

In STS Auto V2, if mapping only keeps text-like fields and drops visual intent fields (`optionType`, `capturedImage`, `imageUrl`, `bgColor`, `sourceKind`, `hasVisual`, `needsCapture`), UI heuristics can classify the option as text-only and render text tiles instead of visual/image options.

Matrixty keeps visual fields from scanner output all the way into final `categories` output, including `imageUrl`, `capturedImage`, `bgColor`, and `textContent`. That preserves image intent and avoids text fallback.

## Evidence in STS current code (already hardened)

Current STS mapping now explicitly preserves visual fields:

- `scanner-auto.js::mapV2GroupsToCategories(...)` carries through `imageUrl`, `capturedImage`, `optionType`, `sourceKind`, `bgColor`, `visualKind`, `hasVisual`, `needsCapture`, and `classificationReason`.
- `scanner-auto-default-v2.js::normalizeOptionV2(...)` sets `optionType` based on image presence and keeps capture metadata.
- `scanner-auto-default-v2.js::classifyVisualTextTileV2(...)` marks text-only swatch tiles as `optionType='visual-text'` so renderer treats them as visual choices.

## Why this matters for profile migration

One-site-one-scanner-profile migration must preserve visual metadata in every site profile.

Each scanner profile should return options that keep image/color/visual intent fields when available:

- `imageUrl`
- `capturedImage`
- `bgColor`
- `optionType`
- `sourceKind`
- `visualKind`
- `hasVisual`
- `needsCapture`
- selected-state metadata

If a profile normalizer drops these fields, the render panel can regress to text-only output even when the DOM contains image-backed or color-backed choices.

## Why this matters for pawesomehouse.com

Pawesomehouse has many swatches that are visually represented as:

1. image-backed swatches,
2. color swatches,
3. visual text tiles such as style boxes.

If visual text tiles are treated as plain text, the render panel can flatten them into text items. STS now flags these as `visual-text` plus capture metadata where needed, which is the correct behavior for Auto default and scanner profile rollout.

## Comparison note to Matrixty

Matrixty uses a simpler invariant: keep image/capture fields on options and only fallback when truly no image visual exists. STS now mirrors this invariant while adding explicit `visual-text` classification for Customily swatch tiles.

## Regression guards in repository

- `tests/unit/map-v2-preserve-image-fields.test.js`
- `tests/unit/render-image-backed-classification.test.js`
- `tests/unit/auto-pawesomehouse-v2-routing.test.js`

These tests encode the exact class of bug where visual options accidentally degrade to text-only rendering.

## Rule for future site profiles

Every new or migrated site profile must include a fixture/test case for visual options when the site exposes image, color, or visual text choices. The expected output must prove that visual metadata survives from scan output into normalized categories.
