const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const scripts = (((manifest || {}).content_scripts || [])[0] || {}).js || [];

const indexOf = (file) => scripts.indexOf(file);
const requiredBeforeCore = [
  'content_modules/clipart/scanner-profile-context.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-pawesomehouse-customily.js',
  'content_modules/clipart/scanner-profile-macorner-customily.js',
  'content_modules/clipart/scanner-profile-geckocustom.js',
  'content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js',
  'content_modules/clipart/scanner-profile-native-adapter.js',
  'content_modules/clipart/scanner-profile-suzitee.js',
  'content_modules/clipart/scanner-profile-trendingcustom.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-etsy.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-gossby.js'
];
const removedRuntimePrefixes = [
  'content_modules/site-profiles.js',
  'content_modules/site_profiles/',
  'content_modules/manual_profiles/'
];
const removedRuntimeFiles = [
  'content_modules/clipart/scanner-profile-adapters.js',
  'content_modules/clipart/scanner-profile-site-v2-bridge.js',
  'content_modules/clipart/scanner-profile-site-v2-consolidated.js'
];
const coreIdx = indexOf('content_modules/clipart/scanner-core.js');

assert.ok(coreIdx >= 0, 'scanner-core.js missing');
requiredBeforeCore.forEach((file) => {
  assert.ok(indexOf(file) >= 0, `${file} missing`);
  assert.ok(indexOf(file) < coreIdx, `${file} must load before scanner-core.js`);
});
removedRuntimeFiles.forEach((file) => assert.equal(indexOf(file), -1, `${file} must not load in Phase 3 runtime`));
scripts.forEach((file) => {
  removedRuntimePrefixes.forEach((prefix) => {
    if (prefix.endsWith('/')) assert.ok(!file.startsWith(prefix), `${file} must not load in Phase 3 runtime`);
    else assert.notEqual(file, prefix, `${file} must not load in Phase 3 runtime`);
  });
});

console.log('manifest load order test passed');
