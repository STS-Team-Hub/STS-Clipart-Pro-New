const assert = require('assert');
const fs = require('fs');

const core = fs.readFileSync('content_modules/clipart/scanner-core.js', 'utf8');

assert.ok(core.includes('function getEffectiveScannerProfileForCurrentPage()'), 'core must resolve effective scanner profile for picker collectors');
assert.ok(core.includes('profile.collectOptionsInRegion(region'), 'screenshot region collection must route through effective profile first');
assert.ok(core.includes('profile.collectOptionsInContainer(container'), 'manual/container collection must route through effective profile first');
assert.ok(core.includes('profile.detectNearestGroupTitleFromOption(optionEl'), 'screenshot auto-name must route through effective profile first');
assert.ok(core.indexOf('profile.collectOptionsInRegion(region') < core.indexOf('m.collectOptionsInRegion(region)'), 'collector fallback must run after profile method');
assert.ok(core.indexOf('profile.detectNearestGroupTitleFromOption(optionEl') < core.indexOf('m.detectNearestGroupTitleFromOption(optionEl)'), 'title fallback must run after profile method');

console.log('screenshot profile contract routing test passed');
