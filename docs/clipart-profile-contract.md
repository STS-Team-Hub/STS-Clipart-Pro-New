# Clipart Target Profile Contract (Design Baseline)

## Purpose
This document defines the **target** profile contract for future phases. It does **not** change current runtime behavior in Phase 1.

## Target profile rule

1. If current website has a matching site profile, all features use that profile:
   - Auto Scan
   - Append Visible State
   - Manual Pick
   - Screenshot Pick
2. If current website has no matching profile, all features use the default generic profile.
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
| `id` | Optional (recommended yes) | Yes | string | string | all | fallback to default profile id |
| `name` | Optional (recommended yes) | Yes | string | string | all | fallback to default profile name |
| `hosts` | Optional | No (can use `detect`) | array of host patterns | host list metadata | resolver | if absent, resolver uses `detect` or other matching rule |
| `detect(ctx)` | Optional in site override | No | context `{ host, url, document, ... }` | boolean | resolver | if missing, resolver host matching rules apply |
| `scanPage(ctx)` | Optional in site override | **Yes** | context | raw group list or normalized groups | Auto Scan | default generic scan for full page |
| `scanVisibleState(ctx)` | Optional in site override | **Yes** | context | group list representing visible/current state | Append Visible State | default generic visible-state scan |
| `scanManualGroupFromTitle(titleEl, ctx)` | Optional in site override | **Yes** | clicked/manual-picked title element + context | one group (raw or normalized) or null | Manual Pick | default generic: find container + collect options |
| `collectOptionsInContainer(containerEl, ctx)` | Optional in site override | **Yes** | container element + context | option list | Manual Pick | default generic container collector |
| `collectOptionsInRegion(region, ctx)` | Optional in site override | **Yes** | rectangle `{left,top,right,bottom}` + context | option list | Screenshot Pick | default generic region collector |
| `detectNearestGroupTitleFromOption(optionEl, ctx)` | Optional in site override | **Yes** | option element + context | title string | Screenshot Pick (auto-name) | default nearest-title heuristic |
| `normalizeGroup(rawGroup, ctx)` | Optional in site override | **Yes** | raw group + context | schema-compatible group | all features before state merge | default normalizer |
| `normalizeOption(rawOption, ctx)` | Optional in site override | **Yes** | raw option + context | schema-compatible option | all features before state merge | default normalizer |

## Compatibility notes against current repository

- Current V2 profiles `pawesomehouse/suzitee` can map into this contract with adapter logic (already output `{title,items}` and manual group helpers).
- Current legacy/generic path can supply default implementations for scan + collectors.
- Current screenshot flow currently uses collectors module directly; this contract formalizes that behavior under profile methods.

