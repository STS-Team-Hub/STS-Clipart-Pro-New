# Clipart Target Profile Contract

## Purpose

This document defines the scanner-profile contract used as the target runtime architecture.

The repository is currently **Phase 7 complete**:

- The contract is implemented for registry/default fallback.
- Auto Scan, Append Visible State, Screenshot collector/title routes, and profile-aware Manual Pick paths use effective scanner profiles.
- Legacy and V2 routes remain warning-backed or adapter-backed compatibility contracts.
- The final target is one canonical scanner profile per supported named site.

## Target profile rule

1. If the current website has a matching site profile, all supported scanner features use that effective profile:
   - Auto Scan
   - Append Visible State
   - Manual Pick
   - Screenshot Pick
2. If the current website has no matching site profile, all supported scanner features use the default generic profile.
3. Effective profile is merged:

```js
effectiveProfile = {
  ...defaultProfile,
  ...matchedProfile,
  id: matchedProfile?.id || defaultProfile.id,
  name: matchedProfile?.name || defaultProfile.name,
};
```

4. Missing site-specific methods fall back to default profile methods.
5. New supported named sites should provide a dedicated scanner profile file instead of relying on V2 or legacy routing.

## Canonical site profile package

A supported named site is considered canonical when it has:

- one scanner profile file: `content_modules/clipart/scanner-profile-<site-id>.js`
- one fixture folder: `tests/fixtures/site-profiles/<site-id>/`
- expected output JSON for supported DOM patterns
- unit coverage for resolver/routing/schema behavior
- Chrome manual verification notes for Auto Scan, Append Visible State, Manual Pick, and Screenshot Pick

Generic unknown pages are intentionally handled by the default scanner profile and do not need one profile file per host.

## Contract shape

```js
{
  id,
  name,
  hosts,
  detect(ctx),

  scanPage(ctx),
  scanVisibleState(ctx),

  scanManualGroupFromTitle(titleEl, ctx),

  collectOptionsInContainer(containerEl, ctx),
  collectOptionsInRegion(region, ctx),
  detectNearestGroupTitleFromOption(optionEl, ctx),

  normalizeGroup(rawGroup, ctx),
  normalizeOption(rawOption, ctx)
}
```

## Method-by-method contract

| Method | Site override required? | Guaranteed on effective profile? | Input | Output | Used by feature(s) | Default fallback behavior |
|---|---|---|---|---|---|---|
| `id` | Optional, recommended yes | Yes | string | string | all | fallback to default profile id |
| `name` | Optional, recommended yes | Yes | string | string | all | fallback to default profile name |
| `hosts` | Optional | No, can use `detect` | array of host patterns | host list metadata | resolver | if absent, resolver uses `detect` or other matching rule |
| `detect(ctx)` | Optional in site override | No | context `{ host, url, document, ... }` | boolean | resolver | if missing, resolver host matching rules apply |
| `scanPage(ctx)` | Optional in site override | **Yes** | context | raw group list or normalized groups | Auto Scan | default generic scan for full page |
| `scanVisibleState(ctx)` | Optional in site override | **Yes** | context | group list representing visible/current state | Append Visible State | default generic visible-state scan |
| `scanManualGroupFromTitle(titleEl, ctx)` | Optional in site override | **Yes** | clicked/manual-picked title element + context | one group, raw or normalized, or null | Manual Pick | default generic: find container + collect options |
| `collectOptionsInContainer(containerEl, ctx)` | Optional in site override | **Yes** | container element + context | option list | Manual Pick | default generic container collector |
| `collectOptionsInRegion(region, ctx)` | Optional in site override | **Yes** | rectangle `{left,top,right,bottom}` + context | option list | Screenshot Pick | default generic region collector |
| `detectNearestGroupTitleFromOption(optionEl, ctx)` | Optional in site override | **Yes** | option element + context | title string | Screenshot Pick auto-name | default nearest-title heuristic |
| `normalizeGroup(rawGroup, ctx)` | Optional in site override | **Yes** | raw group + context | schema-compatible group | all features before state merge | default normalizer |
| `normalizeOption(rawOption, ctx)` | Optional in site override | **Yes** | raw option + context | schema-compatible option | all features before state merge | default normalizer |

## Output compatibility requirements

A normalized group should preserve at least:

- `name` or `label`
- `prefix`
- `options[]`
- `optionCount`

A normalized option should preserve at least:

- `label`
- `textContent`, `text`, `value`, or `name` when available
- `imageUrl` and/or `capturedImage` for image-backed options
- `bgColor` for color-backed options
- visual classification metadata such as `optionType`, `sourceKind`, or `visualKind` when available

Visual fields must not be dropped while mapping profile output into panel categories, export/render payloads, or sync payloads.

## Compatibility notes against current repository

- V2 profiles can map into this contract with adapter logic when they expose `autoScan()` or `scanManualGroupFromTitle()`.
- The default scanner profile supplies fallback implementations for scan, manual/container collection, screenshot region collection, nearest-title detection, and normalization.
- Screenshot collection/title detection route through the effective scanner profile before falling back to generic collectors.
- Manual Pick uses profile-aware resolver/collector paths; legacy UI entrypoints remain only as compatibility bridges where tests still prove runtime dependency.
- Phase 7 reduced consolidated ownership by moving PersonalFury, InterestPod, and Gossby into dedicated scanner profiles. Future work should reduce remaining V2 adapter-backed ownership site by site.
