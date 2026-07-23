const assert = require('assert');
const fs = require('fs');

const core = fs.readFileSync('content_modules/clipart/scanner-core.js', 'utf8');
assert.ok(core.includes('async function collectVisibleStateGroupsViaResolver()'), 'append visible-state resolver helper exists');
assert.ok(core.includes('profile.scanVisibleState(ctx)'), 'append route calls effective profile scanVisibleState');
assert.ok(core.includes('profile.normalizeGroup(rawGroup, ctx)'), 'append route uses shared profile normalization path');
assert.ok(core.includes('if (!scanned || !scanned.length) scanned = await scanDOM() || [];'), 'append route falls back to legacy scanDOM when resolver has no groups');

const adapters = fs.readFileSync('content_modules/clipart/scanner-profile-adapters.js', 'utf8');
assert.ok(adapters.includes('adapter.scanVisibleState = function(ctx)'), 'legacy V2 adapters expose scanVisibleState');
assert.ok(adapters.includes('return (legacyProfile.autoScan(doc) || []).map(legacyGroupToScannerGroup).filter(Boolean);'), 'adapter visible-state output keeps legacy V2 group mapping');

console.log('append visible resolver route test passed.');
