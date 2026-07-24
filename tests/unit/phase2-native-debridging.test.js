const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const debridgedSites = [
  { id: 'personalfury', host: 'personalfury.com' },
  { id: 'interestpod', host: 'interestpod.co' },
  { id: 'gossby', host: 'gossby.com' },
  { id: 'suzitee', host: 'suzitee.com' },
  { id: 'trendingcustom', host: 'trendingcustom.com' },
  { id: 'wanderprints', host: 'wanderprints.com' },
  { id: 'etsy', host: 'etsy.com', genericOnly: true }
];

const forbiddenRuntimeRefs = ['STSSiteProfilesV2', 'STSSiteProfiles', 'STSManualProfiles', 'siteV2Bridge', 'createScannerProfile'];

debridgedSites.forEach(({ id }) => {
  const file = `content_modules/clipart/scanner-profile-${id}.js`;
  const src = fs.readFileSync(file, 'utf8');
  forbiddenRuntimeRefs.forEach((ref) => {
    assert.ok(!src.includes(ref), `${id} canonical scanner profile no longer references ${ref}`);
  });
  assert.ok(src.includes('nativeAdapter.toScannerProfile'), `${id} registers through native adapter rather than V2 bridge`);
});

const documentMock = { querySelector() { return null; }, querySelectorAll() { return []; }, documentElement: { getAttribute() { return ''; }, setAttribute() {} } };
const windowMock = {
  document: documentMock,
  location: { hostname: 'example.com', href: 'https://example.com/products/demo' },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; }
};
const ctx = vm.createContext({ window: windowMock, document: documentMock, location: windowMock.location, console });
ctx.window = windowMock;

[
  'content_modules/site_profiles/shared/cleanup.js',
  'content_modules/site_profiles/shared/dom.js',
  'content_modules/site_profiles/shared/values.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-native-adapter.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-gossby.js',
  'content_modules/clipart/scanner-profile-suzitee.js',
  'content_modules/clipart/scanner-profile-trendingcustom.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-etsy.js'
].forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }));

const registry = windowMock.STSClipartScanner.profiles;
debridgedSites.forEach(({ id, host, genericOnly }) => {
  const profile = registry.get(id);
  assert.ok(profile, `${id} registered as canonical scanner profile`);
  assert.equal(profile.scanHints && profile.scanHints.phase2NativeDebridged, true, `${id} records Phase 2 native de-bridging`);
  assert.equal(typeof profile.scanPage, 'function', `${id} exposes scanPage`);
  assert.equal(typeof profile.scanVisibleState, 'function', `${id} exposes scanVisibleState`);
  if (!genericOnly) assert.equal(typeof profile.scanManualGroupFromTitle, 'function', `${id} exposes manual pick scanner`);
  assert.equal(typeof profile.collectOptionsInContainer, 'function', `${id} exposes container option collector`);
  const resolved = registry.resolve({ document: documentMock, location: { hostname: host, href: `https://${host}/products/demo` }, window: windowMock });
  assert.equal(resolved.matchedProfileId || resolved.id, id, `${id} resolves without V2/manual adapter`);
});

console.log('phase2 native de-bridging test passed.');
