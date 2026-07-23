# STS vs Matrixty auto-scan: root cause for image items rendering as text

## Context compared
- STS auto flow: `content_modules/clipart/scanner-auto.js` + `content_modules/clipart/scanner-auto-default-v2.js`.
- Matrixty auto flow (reference): `ETC/matrixty-extension-v1.3.6/content.js`.

## Key difference that caused the bug
The wrong rendering happens when option metadata is **degraded** while mapping scanner output to panel categories.

In STS Auto V2, if mapping only keeps text-like fields and drops visual intent fields (`optionType`, `capturedImage`, `imageUrl`, `bgColor`, `sourceKind`, `hasVisual`, `needsCapture`), UI heuristics can classify the option as text-only and render text tiles instead of visual/image options.

Matrixty keeps visual fields from scanner output all the way into final `categories` output (including `imageUrl`, `capturedImage`, `bgColor`, `textContent`). That preserves image intent and avoids text fallback.

## Evidence in STS current code (already hardened)
Current STS mapping now explicitly preserves visual fields:
- `scanner-auto.js::mapV2GroupsToCategories(...)` carries through `imageUrl`, `capturedImage`, `optionType`, `sourceKind`, `bgColor`, `visualKind`, `hasVisual`, `needsCapture`, `classificationReason`.
- `scanner-auto-default-v2.js::normalizeOptionV2(...)` sets `optionType` based on image presence and keeps capture metadata.
- `scanner-auto-default-v2.js::classifyVisualTextTileV2(...)` marks text-only swatch tiles as `optionType='visual-text'` so renderer treats them as visual choices.

## Why this matters for pawesomehouse.com
Pawesomehouse has many swatches that are visually represented as:
1) image-backed swatches,
2) color swatches,
3) visual text tiles (e.g., YOUNG/AGED style boxes).

If (3) is treated as plain text, the render panel can flatten these into text items.
STS now flags these as `visual-text` + `needsCapture=true`, which is the correct behavior for Auto default + auto profile rollout.

## Comparison note to Matrixty
Matrixty uses a simpler invariant: keep image/capture fields on options and only fallback when truly no image visual exists. STS now mirrors this invariant while adding explicit `visual-text` classification for Customily swatch tiles.

## Regression guards in repository
- `tests/unit/map-v2-preserve-image-fields.test.js`
- `tests/unit/render-image-backed-classification.test.js`
- `tests/unit/auto-pawesomehouse-v2-routing.test.js`

These tests encode the exact class of bug where visual options accidentally degrade to text-only rendering.
