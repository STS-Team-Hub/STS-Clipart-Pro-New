# Clipart Auto Accuracy Roadmap

## Purpose

This roadmap explains why Manual Scan can produce acceptable results while Auto Scan can still miss or mis-classify options, records the current raw F12 HTML/TXT reference audit, and defines the shortest path for Auto to support every site that already has an HTML sample in this repository.

## Why Manual works when Auto does not

Manual Scan succeeds more often because the user supplies the missing state and scope decisions that are implicit in the page UI:

1. **Manual starts from the visible title the user clicked.** The selected title element is already the canonical personalization group, so the scanner can call the site profile's `scanManualGroupFromTitle(titleEl, ctx)` inside the right `.customily_option` or site-specific container.
2. **Manual happens after the user sees the correct UI state.** If a group is collapsed, lazy-loaded, or dependent on a previous choice, the user naturally opens or selects the correct state before picking the group.
3. **Manual has a small collection scope.** It collects options near the picked title/container, so variant controls outside personalization areas and hidden dependent groups are less likely to pollute the result.
4. **Manual preserves visual context.** When text is generic, such as `1`, `2`, or `Value 1`, the clicked swatch still has a visual target that the manual path can capture or resolve as an image/color option.

Auto fails when it tries to infer those same choices without enough orchestration:

1. **Auto can scan before the right state is open.** Dependent Customily groups may be hidden until a prior swatch is clicked, and lazy images may only expose `data-src`, `srcset`, background CSS, or rendered pixels after the UI settles.
2. **Auto can use text too early as a rejection signal.** Generic input values (`Value 1`, numeric IDs, or group-name repeats) are not option names, but they often sit on the same radio input as the real image swatch. If Auto rejects on text before resolving `imageUrl`/`bgColor`/capture target, the good visual option is dropped.
3. **Auto can collect too broadly.** If it scans the full DOM or clicks generic swatch-like elements without a profile-owned boundary, product variants such as Color/Size/Style and dependent value containers can appear as fake STS groups.
4. **Auto can normalize away the evidence.** If `name` or the group title is used as fallback `textContent`, image-only options become mislabeled even though the visual fields are correct.

The current fix addresses point 2 and point 4 for Customily Auto V2: visual fields are resolved before generic text rejection, generic `Value N` text is cleared only when visual evidence exists, and group names are no longer copied into option text during normalization.

## Repository HTML/TXT source audit

The `HTML/*.txt` files are authoritative raw source references copied from browser DevTools/F12 by site. They are not throwaway text files; they are the inputs for building both Manual and Auto extraction logic. The smaller `tests/fixtures/**/*.html` files are executable regression fixtures derived from those raw references. This audit covers the current raw F12 TXT references plus the HTML fixtures outside `ETC/` and `node_modules`.



### Raw F12 TXT references

| Raw source file | Observed pattern | Auto/Manual implication |
| --- | --- | --- |
| `HTML/1 marconer.co.txt` | Macorner Customily: many `customily_option`, `option_name`, and `customily-swatch` nodes. | Build Macorner Manual/Auto from Customily group boundaries and rich swatch coverage. |
| `HTML/geckocustom.com 1.txt` | GeckoCustom `sl-option-set-item` structure. | Profile must understand GeckoCustom option-set titles/options, not only Customily. |
| `HTML/geckocustom.com 2.txt` | GeckoCustom page with Customily-like `customily_option` and swatches. | GeckoCustom profile needs multiple collectors/fixtures for both DOM shapes. |
| `HTML/gossby.com 1.txt` | Gossby personalized markup. | Gossby profile must first lock title/container selectors before option assertions. |
| `HTML/gossby.com 2.txt` | Larger Gossby personalized page. | Add richer Gossby fixture coverage; one sample is not enough. |
| `HTML/gossby.com 3.txt` | Additional Gossby personalized page. | Validate repeated Gossby patterns and avoid overfitting one page. |
| `HTML/interestpod.co 1.txt` | InterestPod Customily groups with small swatch count. | Support title candidate detection even when options are sparse. |
| `HTML/interestpod.co 2.txt` | InterestPod Customily groups with many swatches. | Test full swatch extraction and kind preservation. |
| `HTML/pawesomehouse.com 1.txt` | Pawesomehouse Customily with many swatches/groups. | Primary source for fixing image/color/generic-value Auto behavior. |
| `HTML/pawesomehouse.com 2.txt` | Pawesomehouse smaller Customily sample. | Use as compact regression for dependency/lazy cases. |
| `HTML/pawfecthouse.com 1.txt` | Pawfecthouse Teeinblue-heavy markup. | Manual/Auto must use Teeinblue selectors, not Customily assumptions. |
| `HTML/pawfecthouse.com 2.txt` | Pawfecthouse Teeinblue medium sample. | Add fixture for repeated Teeinblue options. |
| `HTML/pawfecthouse.com 3.txt` | Pawfecthouse Teeinblue compact sample. | Use as minimal Teeinblue smoke/regression fixture. |
| `HTML/personalfury.com 1.txt` | PersonalFury Customily groups/swatches. | PersonalFury profile should share Customily contract with site-specific cleanup. |
| `HTML/personalfury.com 2.txt` | PersonalFury larger Customily swatch sample. | Validate visual swatch coverage beyond minimal title detection. |
| `HTML/personalfury.com 3.txt` | PersonalFury sparse Customily sample. | Keep title/group detection robust when options are sparse. |
| `HTML/trendingcustom.com 1.txt` | TrendingCustom Ant Design/personalized form markup. | Profile must use Ant form-item boundaries and avoid Customily-only assumptions. |
| `HTML/trendingcustom.com 2.txt` | TrendingCustom smaller Ant Design sample. | Add compact Ant form regression fixture. |
| `HTML/wanderprints.com 1.txt` | Wanderprints Customily groups/swatches. | Cover Customily extraction with Wanderprints-specific selectors/cleanup. |
| `HTML/wanderprints.com 2.txt` | Wanderprints larger swatch sample. | Validate option collection and visual preservation at scale. |
| `HTML/wanderprints.com 3.txt` | Wanderprints larger multi-group sample. | Test group enumeration/dependency behavior across multiple groups. |

### Executable HTML fixtures

| HTML file | Site/profile meaning | Auto implication |
| --- | --- | --- |
| `panel.html` | Extension UI shell, not a product personalization page. | Exclude from site scanner coverage; only syntax/UI checks apply. |
| `popup.html` | Extension popup UI, not a product personalization page. | Exclude from site scanner coverage; only syntax/UI checks apply. |
| `tests/fixtures/macorner/personalized-sample.html` | Macorner Customily sample with image/color swatches, text input, and select. | Auto must use the Customily contract: title cleanup, visual swatches as `icon`, text input/select as `text`. |
| `tests/fixtures/pawesomehouse/customily-dynamic-dependent.html` | Pawesomehouse Customily sample with dependent hidden groups and outside product variants. | Auto must scope to `#customily-options`, safely click/reveal dependent groups, and ignore outside variants. |
| `tests/fixtures/pawesomehouse/customily-real-snippet.html` | Pawesomehouse real Customily snippet with image radio swatches and dependent color/style labels. | Auto must keep image-backed radio options even when labels are generic or group-like. |
| `tests/fixtures/pawesomehouse/lazy-image-fixture.html` | Pawesomehouse lazy image sample using `data-src`, `srcset`, and CSS background image. | Auto must resolve all image source forms before falling back to screenshot capture. |
| `tests/fixtures/site-profiles/_template/group-basic.html` | Fixture template only. | Exclude from runtime requirements. |
| `tests/fixtures/site-profiles/etsy/group-basic.html` | Etsy/generic select personalization sample. | Auto should classify plain select options as `text`. |
| `tests/fixtures/site-profiles/geckocustom/group-basic.html` | GeckoCustom swatch/text markup using `sl-option-set-item`. | Auto needs GeckoCustom profile selectors and CSS image resolution from `--sl-image`. |
| `tests/fixtures/site-profiles/geckocustom/group-with-images.html` | GeckoCustom/Customily-like image swatches and text input. | Auto must preserve image swatches and text fields under the profile boundary. |
| `tests/fixtures/site-profiles/gossby/group-basic.html` | Gossby personalized form title sample. | Auto needs Gossby profile title detection before option coverage can be considered complete. |
| `tests/fixtures/site-profiles/interestpod/group-basic.html` | InterestPod Customily title sample. | Auto should use Customily-style title detection and not require options to mark a title candidate. |
| `tests/fixtures/site-profiles/macorner-customily/group-basic.html` | Minimal site-profile smoke fixture. | Auto coverage should be validated by richer Macorner fixture plus smoke routing for this marker. |
| `tests/fixtures/site-profiles/pawesomehouse-customily/group-basic.html` | Minimal site-profile smoke fixture. | Auto coverage should be validated by richer Pawesomehouse fixtures plus smoke routing for this marker. |
| `tests/fixtures/site-profiles/pawfecthouse-teeinblue/group-basic.html` | Minimal Pawfecthouse/Teeinblue smoke fixture. | Auto needs Teeinblue-specific fixture expansion before full accuracy can be claimed. |
| `tests/fixtures/site-profiles/personalfury/group-basic.html` | PersonalFury Customily title sample. | Auto should use Customily-style title detection and not require options to mark a title candidate. |
| `tests/fixtures/site-profiles/suzitee/group-basic.html` | Minimal Suzitee smoke fixture. | Auto needs Suzitee-specific fixture expansion before full accuracy can be claimed. |
| `tests/fixtures/site-profiles/trendingcustom/group-basic.html` | Minimal TrendingCustom smoke fixture. | Auto needs Ant Design/form-item fixture expansion before full accuracy can be claimed. |
| `tests/fixtures/site-profiles/wanderprints/group-basic.html` | Minimal Wanderprints smoke fixture. | Auto needs Wanderprints-specific fixture expansion before full accuracy can be claimed. |

## Three-phase roadmap

### Phase 1 — HTML contract audit

Goal: turn every raw F12 TXT source and derived HTML fixture into an explicit Manual/Auto contract.

- Separate extension UI/template files from product personalization references and fixtures.
- For every raw `HTML/*.txt` source and executable product fixture, record: profile owner, root boundary, title selector, option container selector, expand/click requirement, lazy image source forms, and expected option kind (`icon`, `item`, `text`).
- Replace generic smoke-only samples with richer minimal snippets when a site currently lacks enough option markup to verify Auto accuracy.
- Output: a fixture matrix and expected JSON/JS assertions for every supported site with sample HTML.

### Phase 2 — Profile-owned Auto collection

Goal: Auto must reuse the same profile-owned decisions that make Manual accurate.

- Route Auto through each canonical site profile first; do not let generic DOM scanning own supported sites.
- For each group, perform this order: find visible title, open/safely settle group, collect options inside the title's group boundary, resolve image/color/capture target, then evaluate text quality.
- Treat generic values (`Value N`, numeric IDs, repeated group titles, placeholders) as non-descriptive text, not as a reason to drop image/color/capturable options.
- Keep outside variants and unrelated controls out of the result by enforcing the profile root boundary.
- Output: Auto returns the same canonical groups/options as Manual for every fixture that already has real option markup.

### Phase 3 — Fixture-wide regression gate

Goal: prevent Auto regressions across all sample sites.

- Add one automated fixture runner that loads each product HTML sample, resolves the expected profile, runs Auto, and compares canonical group names, option counts, option kinds, and visual/text fields.
- Mark UI/template-only fixtures as excluded so the gate is precise instead of noisy.
- Require each new supported site or HTML sample to include an Auto expectation before merge.
- Output: `npm run test:unit` becomes the required confidence gate for Auto parity with the repository fixture set.

## Definition of done for Auto accuracy

Auto is considered complete for the current repository samples only when:

- Every product HTML fixture has an owner profile and Auto expectation.
- Auto and Manual agree on canonical group title, group boundary, option kind, and visual/text fields for the same fixture state.
- No supported site falls back to generic full-DOM scanning when a canonical profile exists.
- Generic text is never allowed to override visual evidence.
- Tests fail if an image/color/capturable swatch is dropped because its text is generic.

## Recommended ownership model

The model **one site - one HTML - one Manual profile - one Auto profile** is not ideal as a runtime architecture.

The better model is **one site - many HTML fixtures - one canonical site profile - shared Manual and Auto contracts inside that profile**.

Reasoning:

- **One site should have many HTML fixtures, not one.** A single storefront can render many product templates: simple select fields, image swatches, color swatches, text inputs, upload inputs, hidden dependent groups, lazy images, and mobile/desktop variants. One HTML sample is only a smoke fixture; it is not enough to prove Auto accuracy.
- **Manual and Auto should not be two separate site profiles.** Splitting them duplicates selectors and cleanup rules. That makes Manual drift from Auto: Manual may know the right title/root/option boundary while Auto uses a different implementation and fails on the same site.
- **The site profile should own site-specific knowledge once.** Selectors such as root boundary, title element, option container, option extraction, text cleanup, and kind classification belong in the canonical `scanner-profile-<site-id>.js` file.
- **Manual and Auto should be two entrypoints over the same contract.** Manual supplies the picked title/state. Auto supplies orchestration: enumerate titles, safely open/settle groups, then call the same profile collection and normalization path as Manual.
- **Auto-only behavior should be orchestration, not a second extraction model.** Click order, settling, dependency discovery, and fixture-wide regression gates can live in shared Auto modules, but the site profile remains the source of truth for what a valid group/option means on that site.

Use this target structure for each supported site:

| Layer | Recommended shape | Purpose |
| --- | --- | --- |
| Raw F12 TXT references | Many raw references per site | Preserve the original copied DOM that drives profile design. |
| Executable HTML fixtures | Many fixtures per site | Convert raw references into focused regression cases for observed DOM variants and edge cases. |
| Site profile | One canonical profile per site | Own root/title/group/option extraction, cleanup, and kind classification. |
| Manual entrypoint | Function(s) in the same site profile | Collect from the user-picked title/container. |
| Auto entrypoint | Shared Auto orchestration plus profile hooks | Enumerate/open groups, then reuse profile extraction. |
| Expected outputs | One expectation per fixture/state | Prove Auto and Manual parity through tests. |

Therefore, the roadmap should not create separate Manual profiles and Auto profiles per site. It should create stronger site-profile contracts and richer HTML fixture coverage, then make Auto reuse those contracts consistently.

## Final Auto parity goal

The final goal is: **Auto must produce the same result a user would get by using Manual and clicking each visible Title Group one by one.**

In practical terms, Auto is correct only when it behaves like this manual workflow:

1. The user visually finds every personalization Title Group on the product page.
2. The user opens each Title Group in the same order shown by the page.
3. The user waits for dependent/lazy content to appear after each click.
4. The user collects only the options inside that Title Group's personalization boundary.
5. The user ignores unrelated product variants, cart controls, upload buttons, and page decorations.
6. The user preserves the original option shape: image/color/visual swatches as `icon`, plain selector/input values as `text`, and other valid non-visual options as `item`.
7. The user repeats this until every reachable personalization group has been captured.

Auto must therefore do the same work programmatically:

- Enumerate the same title candidates that Manual would let the user pick.
- Open each title/group safely and wait for DOM settle/lazy images/dependent groups.
- Collect options from the same group-local scope used by Manual.
- Resolve visual evidence before rejecting generic text.
- Normalize into the same STS category payload that Manual would produce.
- Dedupe only true duplicates, never dependent groups or valid repeated option shapes.
- Record fixture expectations so every raw F12 TXT sample can be converted into reliable Auto/Manual parity tests.

The measurable target is:

| Metric | Target result |
| --- | --- |
| Group coverage | Auto returns every valid Title Group a user can manually click. |
| Group naming | Auto group names match the visible Manual-picked titles after profile cleanup. |
| Option coverage | Auto returns the same options Manual would collect within each title boundary. |
| Option kind | Auto preserves Manual-equivalent `icon`, `text`, or `item` classification. |
| Visual fidelity | Auto keeps image URLs, color backgrounds, lazy images, or capture-needed targets before considering text rejection. |
| Noise rejection | Auto excludes outside variants and non-personalization controls Manual would not pick. |
| Fixture gate | Each supported site's F12 TXT reference has focused HTML fixtures and assertions proving parity. |

This is the acceptance rule for future work: **if a user can achieve the correct group/option list by manually clicking each Title Group, Auto must be able to reproduce that same list without manual intervention.**
