const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const phase4CustomilyProfiles = [
  { id: 'macorner-customily', host: 'macorner.co', file: 'content_modules/clipart/scanner-profile-macorner-customily.js' },
  { id: 'pawesomehouse-customily-manual', host: 'pawesomehouse.com', file: 'content_modules/clipart/scanner-profile-pawesomehouse-customily.js' },
  { id: 'personalfury', host: 'personalfury.com', file: 'content_modules/clipart/scanner-profile-personalfury.js' },
  { id: 'interestpod', host: 'interestpod.co', file: 'content_modules/clipart/scanner-profile-interestpod.js' },
  { id: 'wanderprints', host: 'wanderprints.com', file: 'content_modules/clipart/scanner-profile-wanderprints.js' },
  { id: 'suzitee', host: 'suzitee.com', file: 'content_modules/clipart/scanner-profile-suzitee.js' }
];

phase4CustomilyProfiles.forEach(({ file }) => {
  assert.ok(fs.existsSync(file), `${file} exists for Phase 4 Customily rollout`);
  assert.ok(fs.readFileSync(file, 'utf8').includes('phase4CustomilyRollout'), `${file} records Phase 4 Customily rollout ownership`);
});

const documentMock = {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  documentElement: { getAttribute() { return ''; }, setAttribute() {} }
};
const windowMock = {
  document: documentMock,
  location: { hostname: 'example.com', href: 'https://example.com/products/demo' },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; }
};
const ctx = vm.createContext({ window: windowMock, document: documentMock, location: windowMock.location, console });
ctx.window = windowMock;

[
  'content_modules/site_profiles/index.js',
  'content_modules/site_profiles/shared/cleanup.js',
  'content_modules/site_profiles/shared/dom.js',
  'content_modules/site_profiles/shared/values.js',
  'content_modules/site_profiles/personalfury.js',
  'content_modules/site_profiles/interestpod.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-native-adapter.js',
  'content_modules/clipart/scanner-profile-site-v2-bridge.js',
  'content_modules/clipart/scanner-profile-macorner-customily.js',
  'content_modules/clipart/scanner-profile-pawesomehouse-customily.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-suzitee.js'
].forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }));

const registry = windowMock.STSClipartScanner.profiles;
phase4CustomilyProfiles.forEach(({ id, host }) => {
  const profile = registry.get(id);
  assert.ok(profile, `${id} registers in scanner profile registry`);
  assert.equal(profile.scanHints && profile.scanHints.source, 'customily', `${id} declares Customily source`);
  assert.equal(profile.scanHints && profile.scanHints.phase4CustomilyRollout, true, `${id} declares Phase 4 rollout`);
  assert.equal(typeof profile.getRoot, 'function', `${id} scopes collection through getRoot`);
  assert.equal(typeof profile.getGroups, 'function', `${id} scopes collection through Customily groups`);
  assert.equal(typeof profile.getTitleElement, 'function', `${id} exposes title resolver`);
  const resolved = registry.resolve({ document: documentMock, location: { hostname: host, href: `https://${host}/products/demo` }, window: windowMock });
  assert.equal(resolved.matchedProfileId || resolved.id, id, `${id} resolves for ${host}`);
});

console.log('phase4 customily profile rollout test passed.');
