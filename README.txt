STS Clipart Pro 8.3

Internal Chrome Extension for POD product crawl, clipart scan, manual pick, screenshot pick, mockup picker, render/export, and sync workflows.

Important release notes:
- Version synchronized to 8.3 / 8.3.0.
- Runtime content script is split into ordered modules in manifest.json.
- `<all_urls>` permission is intentionally kept unchanged.
- Supabase RLS review is intentionally excluded from this package.
- Debug logging can be toggled from popup.
- Sanitization helpers are loaded before scanner modules.

Run checks:
npm run check

Manual domain tests are listed in TEST_CASES.md.

Architecture docs:
- docs/clipart-profile-architecture.md
- docs/clipart-profile-contract.md
- docs/clipart-development-rules.md
- docs/clipart-roadmap.md

Current QA/release status:
- Automated checks are hardened: `npm run test:unit` discovers every `tests/unit/*.test.js` file.
- Release consistency coverage pins version, manifest permissions, popup/panel branding, scanner render/sync packaging, and sync payload shape.
- Manual Chrome domain verification remains in TEST_CASES.md as the external browser checklist.

Profile runtime status:
- Phase 3 removes legacy profile runtime loading from `manifest.json`.
- Each supported named site now loads exactly one canonical scanner profile file under `content_modules/clipart/`.
- Unknown or unsupported pages resolve through `content_modules/clipart/scanner-profile-default.js`.
