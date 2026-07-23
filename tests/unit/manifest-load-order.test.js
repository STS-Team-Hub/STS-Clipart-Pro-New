const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const scripts = (((manifest || {}).content_scripts || [])[0] || {}).js || [];

const v2Idx = scripts.indexOf('content_modules/clipart/scanner-auto-default-v2.js');
const autoIdx = scripts.indexOf('content_modules/clipart/scanner-auto.js');
const coreIdx = scripts.indexOf('content_modules/clipart/scanner-core.js');
const bridgeIdx = scripts.indexOf('content_modules/clipart/scanner-profile-site-v2-bridge.js');
const canonicalIds = ['personalfury', 'interestpod', 'gossby'];
const canonicalIdxs = canonicalIds.map((id) => scripts.indexOf(`content_modules/clipart/scanner-profile-${id}.js`));
const consolidatedIdx = scripts.indexOf('content_modules/clipart/scanner-profile-site-v2-consolidated.js');
const adaptersIdx = scripts.indexOf('content_modules/clipart/scanner-profile-adapters.js');

assert.ok(v2Idx >= 0, 'scanner-auto-default-v2.js missing');
assert.ok(autoIdx >= 0, 'scanner-auto.js missing');
assert.ok(coreIdx >= 0, 'scanner-core.js missing');
assert.ok(bridgeIdx >= 0, 'scanner-profile-site-v2-bridge.js missing');
canonicalIds.forEach((id, idx) => assert.ok(canonicalIdxs[idx] >= 0, `scanner-profile-${id}.js missing`));
assert.ok(consolidatedIdx >= 0, 'scanner-profile-site-v2-consolidated.js shim missing');
assert.ok(adaptersIdx >= 0, 'scanner-profile-adapters.js missing');
assert.ok(v2Idx < autoIdx, 'V2 must load before scanner-auto.js');
assert.ok(v2Idx < coreIdx, 'V2 must load before scanner-core.js');
assert.ok(bridgeIdx < adaptersIdx, 'Phase 7 V2 bridge must load before generic V2 adapters');
canonicalIds.forEach((id, idx) => assert.ok(canonicalIdxs[idx] < adaptersIdx, `Phase 7 canonical ${id} profile must load before generic V2 adapters`));
assert.ok(consolidatedIdx < adaptersIdx, 'Phase 7 consolidated shim must load before generic V2 adapters for compatibility');

console.log('manifest load order test passed');
