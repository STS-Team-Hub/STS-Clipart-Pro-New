const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function run(file, ctx) { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }); }

const canonicalSites = [
  { id: 'personalfury', host: 'www.personalfury.com' },
  { id: 'interestpod', host: 'interestpod.co' },
  { id: 'gossby', host: 'gossby.com' }
];

canonicalSites.forEach(({ id }) => {
  assert.ok(fs.existsSync(`content_modules/clipart/scanner-profile-${id}.js`), `${id} owns a dedicated scanner profile file`);
  assert.ok(fs.existsSync(`tests/fixtures/site-profiles/${id}/group-basic.html`), `${id} owns a site-profile fixture`);
  const expected = JSON.parse(fs.readFileSync(`tests/fixtures/site-profiles/${id}/expected.json`, 'utf8'));
  assert.equal(expected.siteId, id, `${id} expected output pins siteId`);
  assert.equal(expected.canonical, true, `${id} expected output marks canonical Phase 7 ownership`);
});

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const scripts = manifest.content_scripts[0].js;
canonicalSites.forEach(({ id }) => {
  assert.ok(scripts.includes(`content_modules/clipart/scanner-profile-${id}.js`), `${id} scanner profile is registered in manifest load order`);
  assert.ok(scripts.indexOf(`content_modules/clipart/scanner-profile-${id}.js`) < scripts.indexOf('content_modules/clipart/scanner-profile-adapters.js'), `${id} canonical profile loads before generic V2 adapters`);
});

const windowMock = { getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }) };
const ctx = vm.createContext({
  window: windowMock,
  document: {},
  location: { hostname: 'personalfury.com', href: 'https://personalfury.com/products/example' },
  console
});
ctx.window = ctx;

[
  'content_modules/site_profiles/index.js',
  'content_modules/site_profiles/shared/cleanup.js',
  'content_modules/site_profiles/shared/dom.js',
  'content_modules/site_profiles/shared/values.js',
  'content_modules/site_profiles/personalfury.js',
  'content_modules/site_profiles/interestpod.js',
  'content_modules/site_profiles/gossby.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-site-v2-bridge.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-gossby.js',
  'content_modules/clipart/scanner-profile-site-v2-consolidated.js'
].forEach((file) => run(file, ctx));

canonicalSites.forEach(({ id, host }) => {
  const profile = ctx.window.STSClipartScanner.profiles.get(id);
  assert.ok(profile, `${id} registered as dedicated scanner profile`);
  assert.equal(profile.id, id, `${id} profile id is canonical`);
  assert.ok(profile.scanHints && profile.scanHints.phase7CanonicalBridge, `${id} scanner profile records Phase 7 canonical bridge ownership`);
  const resolved = ctx.window.STSClipartScanner.profiles.resolve({ document: {}, location: { hostname: host, href: `https://${host}/products/example` }, window: ctx.window });
  assert.equal(resolved.id, id, `${id} resolves directly before V2 adapters`);
});

const shim = ctx.window.STSClipartScanner.siteV2ConsolidatedShim;
assert.deepEqual(shim.migratedProfileIds, ['personalfury', 'interestpod', 'gossby'], 'consolidated shim documents migrated Phase 7 profiles');

console.log('phase7 canonical site profiles test passed.');
