# STS Clipart Pro 8.3 — Real Domain Test Cases

## Required Test Domains
1. https://pawesomehouse.com
2. https://www.suzitee.com
3. https://wanderprints.com
4. https://gossby.com
5. https://macorner.co
6. https://www.etsy.com
7. Generic Shopify product page
8. Generic Shopify collection page
9. Unknown custom personalization page

## Smoke Test Checklist Per Domain
Run the following checks for each supported domain:

- Extension loads without console fatal error.
- Popup opens normally.
- Debug toggle can be enabled and disabled.
- Auto Scan starts.
- Manual Scan starts.
- Panel iframe appears and can be resized/closed.
- Groups/options are detected when available.
- Screenshot Pick can select a region.
- Manual Pick can select a highlighted group title.
- Append current visible state does not duplicate existing groups incorrectly.
- Mockup picker opens and selected images render safely.
- Export / render flow works after scan.
- Sync action still sends expected payload shape.
- Page scrolling and normal website interaction are not blocked after closing panel.

## Required Regression Checks
- `<all_urls>` permission remains unchanged by user request.
- Supabase RLS work is intentionally excluded by user request.
- Version is synchronized as 8.3 / 8.3.0 in manifest, package, popup, panel, README, and logs.
- `content.js` runtime is split into ordered content modules in manifest.
- Sanitization helpers are loaded before scanner modules.
- STS diagnostic logs are hidden unless Debug logs are enabled.
