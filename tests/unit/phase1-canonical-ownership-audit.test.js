const assert = require('assert');
const fs = require('fs');

const supportedSites = [
  { id: 'pawesomehouse-customily', legacy: 'pawesomehouse', tests: ['tests/unit/manual-pawesomehouse-customily-profile.test.js', 'tests/unit/auto-pawesomehouse-v1-routing.test.js'] },
  { id: 'macorner-customily', legacy: 'macorner', tests: ['tests/unit/manual-macorner-customily-profile.test.js', 'tests/unit/auto-macorner-customily-profile.test.js'] },
  { id: 'geckocustom', legacy: 'geckocustom', tests: ['tests/unit/geckocustom-profile-contract.test.js'] },
  { id: 'pawfecthouse-teeinblue', legacy: 'pawfecthouse', tests: ['tests/unit/phase3-final-one-profile-runtime.test.js'] },
  { id: 'personalfury', legacy: 'personalfury', tests: ['tests/unit/phase7-canonical-site-profiles.test.js'] },
  { id: 'interestpod', legacy: 'interestpod', tests: ['tests/unit/phase7-canonical-site-profiles.test.js'] },
  { id: 'gossby', legacy: 'gossby', tests: ['tests/unit/phase7-canonical-site-profiles.test.js'] },
  { id: 'suzitee', legacy: 'suzitee', tests: ['tests/unit/phase8-native-site-profiles.test.js'] },
  { id: 'trendingcustom', legacy: 'trendingcustom', tests: ['tests/unit/phase8-native-site-profiles.test.js'] },
  { id: 'wanderprints', legacy: 'wanderprints', tests: ['tests/unit/phase8-native-site-profiles.test.js'] },
  { id: 'etsy', legacy: 'etsy', tests: ['tests/unit/phase8-native-site-profiles.test.js'] }
];

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const scripts = manifest.content_scripts[0].js;
const coreIndex = scripts.indexOf('content_modules/clipart/scanner-core.js');
assert.ok(coreIndex >= 0, 'manifest registers scanner core');

supportedSites.forEach((site) => {
  const profileFile = `content_modules/clipart/scanner-profile-${site.id}.js`;
  const fixtureDir = `tests/fixtures/site-profiles/${site.id}`;
  const expectedFile = `${fixtureDir}/expected.json`;

  assert.ok(fs.existsSync(profileFile), `${site.id} has one canonical scanner profile file`);
  assert.equal(scripts.filter((script) => script === profileFile).length, 1, `${site.id} profile is registered exactly once in manifest`);
  assert.ok(scripts.indexOf(profileFile) < coreIndex, `${site.id} profile loads before scanner routing/core`);
  assert.ok(fs.existsSync(fixtureDir), `${site.id} has a canonical fixture folder`);
  assert.ok(fs.existsSync(expectedFile), `${site.id} has expected output JSON`);

  const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
  assert.equal(expected.siteId, site.id, `${site.id} expected output pins canonical siteId`);
  assert.equal(expected.profileFile, profileFile, `${site.id} expected output pins canonical profile file`);
  assert.equal(expected.canonical, true, `${site.id} expected output marks canonical ownership`);

  site.tests.forEach((testFile) => assert.ok(fs.existsSync(testFile), `${site.id} route/profile unit coverage exists: ${testFile}`));
});

const duplicateOwnerFiles = supportedSites.flatMap((site) => [
  `content_modules/site_profiles/${site.legacy}.js`,
  `content_modules/manual_profiles/${site.legacy}.js`
]).concat([
  'content_modules/site-profiles.js',
  'content_modules/clipart/scanner-profile-site-v2-consolidated.js',
  'content_modules/clipart/scanner-profile-adapters.js'
]);

const duplicates = duplicateOwnerFiles.filter((file) => fs.existsSync(file));
assert.deepEqual(duplicates, [], 'legacy/V2/manual duplicate owner files have been removed after Phase 3 cleanup');

console.log('phase1 canonical ownership audit passed');
