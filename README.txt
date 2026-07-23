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

Phase 5 legacy status:
- Scanner-profile-first routing is the target runtime model.
- `content_modules/site-profiles.js` remains a deprecated scanner-list compatibility fallback and warns when selected.
- `content_modules/manual_profiles/` remains deprecated compatibility fixtures for older manual fallback coverage and warns when resolved.
