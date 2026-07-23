const assert = require('assert');
const fs = require('fs');

const core = fs.readFileSync('content_modules/clipart/scanner-core.js','utf8');
assert.ok(core.includes("default-empty-manual-group"), 'default-empty-manual-group marker exists');
assert.ok(core.includes("isDefaultManualMethodInherited(profile, profilesApi)"), 'default inherited manual check is used');
assert.ok(core.includes("profile.normalizeGroup(rawGroup, ctx)"), 'core normalizes manual raw group');
assert.ok(core.includes("scanManualGroupFromTitle(titleEl, ctx)"), 'manual scan invoked in resolver');
assert.ok(core.includes("dedicated pawesomehouse/customily selected"), 'auto debug includes dedicated profile marker');
assert.ok(core.includes("dedicated customily empty result; skip generic fallback"), 'dedicated auto empty-result guard marker exists');
console.log('manual core resolver fallback contract test passed.');
