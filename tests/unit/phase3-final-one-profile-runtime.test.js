const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const scripts = (((manifest || {}).content_scripts || [])[0] || {}).js || [];
const supportedProfileFiles = [
  'content_modules/clipart/scanner-profile-pawesomehouse-customily.js',
  'content_modules/clipart/scanner-profile-macorner-customily.js',
  'content_modules/clipart/scanner-profile-geckocustom.js',
  'content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-gossby.js',
  'content_modules/clipart/scanner-profile-suzitee.js',
  'content_modules/clipart/scanner-profile-trendingcustom.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-etsy.js'
];

supportedProfileFiles.forEach((file) => {
  assert.equal(scripts.filter((entry) => entry === file).length, 1, `${file} must be the only operational owner for its supported site`);
});
assert.equal(scripts.filter((entry) => entry === 'content_modules/clipart/scanner-profile-default.js').length, 1, 'default profile must own unknown/unsupported pages once');

const runtimeSource = [
  'content_modules/clipart/scanner-site-router.js',
  'content_modules/clipart/scanner-core.js',
  'content_modules/clipart/scanner-auto.js',
  'content_modules/clipart/scanner-manual.js',
  'content_modules/clipart/scanner-screenshot.js'
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
['STSSiteProfilesV2', 'STSSiteProfiles.pickSiteProfile', 'STSManualProfiles', 'siteV2Bridge'].forEach((legacyRef) => {
  assert.ok(!runtimeSource.includes(legacyRef), `operational scanner route must not depend on ${legacyRef}`);
});

console.log('phase3 final one-profile runtime guard passed.');
