const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const phase5CustomilyProfiles = [
  { id: 'macorner-customily', host: 'macorner.co', file: 'content_modules/clipart/scanner-profile-macorner-customily.js' },
  { id: 'pawesomehouse-customily-manual', host: 'pawesomehouse.com', file: 'content_modules/clipart/scanner-profile-pawesomehouse-customily.js' },
  { id: 'personalfury', host: 'personalfury.com', file: 'content_modules/clipart/scanner-profile-personalfury.js' },
  { id: 'interestpod', host: 'interestpod.co', file: 'content_modules/clipart/scanner-profile-interestpod.js' },
  { id: 'wanderprints', host: 'wanderprints.com', file: 'content_modules/clipart/scanner-profile-wanderprints.js' },
  { id: 'suzitee', host: 'suzitee.com', file: 'content_modules/clipart/scanner-profile-suzitee.js' }
];

phase5CustomilyProfiles.forEach(({ file }) => {
  assert.ok(fs.existsSync(file), `${file} exists for Phase 5 Customily profile rollout`);
  assert.ok(fs.readFileSync(file, 'utf8').includes('phase5CustomilyRollout'), `${file} records Phase 5 Customily rollout ownership`);
});

const documentMock = {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  documentElement: { getAttribute() { return ''; }, setAttribute() {} }
};
const windowMock = {
  document: documentMock,
  location: { hostname: 'example.com', href: 'https://example.com/products/demo' },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1', getPropertyValue() { return ''; } }; }
};
const ctx = vm.createContext({ window: windowMock, document: documentMock, location: windowMock.location, console });
ctx.window = windowMock;

[
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-native-adapter.js',
  'content_modules/clipart/scanner-profile-macorner-customily.js',
  'content_modules/clipart/scanner-profile-pawesomehouse-customily.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-suzitee.js'
].forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }));

const registry = windowMock.STSClipartScanner.profiles;
phase5CustomilyProfiles.forEach(({ id, host }) => {
  const profile = registry.get(id);
  assert.ok(profile, `${id} registers in scanner profile registry`);
  assert.equal(profile.scanHints && profile.scanHints.source, 'customily', `${id} declares Customily source`);
  assert.equal(profile.scanHints && profile.scanHints.phase5CustomilyRollout, true, `${id} declares Phase 5 rollout`);
  assert.equal(typeof profile.getRoot, 'function', `${id} scopes collection through getRoot`);
  assert.equal(typeof profile.getGroups, 'function', `${id} scopes collection through Customily groups`);
  assert.equal(typeof profile.getTitleElement, 'function', `${id} exposes title resolver`);
  const resolved = registry.resolve({ document: documentMock, location: { hostname: host, href: `https://${host}/products/demo` }, window: windowMock });
  assert.equal(resolved.matchedProfileId || resolved.id, id, `${id} resolves for ${host}`);
});

console.log('phase5 customily profile rollout test passed.');
