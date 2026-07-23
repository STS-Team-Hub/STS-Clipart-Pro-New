const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const windowMock = {
  document: { querySelector() { return null; }, documentElement: { getAttribute() { return ''; }, setAttribute() {} } },
  location: { hostname: 'example.com', href: 'https://example.com/' },
  getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; }
};
const ctx = vm.createContext({ window: windowMock, document: windowMock.document, location: windowMock.location, console });
[
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-suzitee.js',
  'content_modules/clipart/scanner-profile-trendingcustom.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-etsy.js'
].forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }));

const registry = windowMock.STSClipartScanner.profiles;
['suzitee', 'trendingcustom', 'wanderprints', 'etsy'].forEach((id) => {
  const profile = registry.get(id);
  assert.ok(profile, `${id} registers as a dedicated scanner profile`);
  assert.equal(profile.scanHints.phase8Native, true, `${id} records Phase 8 native ownership`);
  assert.equal(typeof profile.scanPage, 'function', `${id} owns scanner scanPage`);
  assert.equal(typeof profile.scanVisibleState, 'function', `${id} owns scanner visible-state scan`);
  const resolved = registry.resolve({ document: windowMock.document, location: { hostname: `${id === 'etsy' ? 'www.etsy.com' : `www.${id}.com`}`, href: 'https://example.test/products/demo' } });
  assert.equal(resolved.matchedProfileId, id, `${id} resolves through scanner registry without V2 adapter`);
});

console.log('phase8 native site profiles test passed');
