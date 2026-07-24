const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function fail(message) { console.error('SMOKE CHECK FAILED:', message); process.exit(1); }
function runInContext(ctx, file) { vm.runInContext(read(file), ctx, { filename: file }); }

const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));

if (manifest.version !== '8.3.0') fail(`manifest version must be 8.3.0, got ${manifest.version}`);
if (pkg.version !== manifest.version) fail(`package version ${pkg.version} != manifest ${manifest.version}`);
if (!manifest.host_permissions || !manifest.host_permissions.includes('<all_urls>')) fail('host_permissions must keep <all_urls> by user request');

const contentFiles = (((manifest.content_scripts || [])[0] || {}).js || []);
const expectedContentFiles = [
  'content_modules/debug.js',
  'content_modules/sanitize.js',
  'content_modules/label-extraction.js',
  'content_modules/dropdown-detection.js',
  'content_modules/sync-payload.js',
  'content_modules/product-crawler.js',
  'content_modules/fab-manager.js',
  'content_modules/clipart/scanner-utils.js',
  'content_modules/clipart/scanner-schema.js',
  'content_modules/clipart/scanner-state.js',
  'content_modules/clipart/scanner-collectors.js',
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
  'content_modules/clipart/scanner-profile-gossby.js',
  'content_modules/clipart/scanner-site-router.js',
  'content_modules/clipart/scanner-ui.js',
  'content_modules/clipart/scanner-export.js',
  'content_modules/clipart/scanner-sync.js',
  'content_modules/clipart/scanner-render.js',
  'content_modules/clipart/scanner-auto-default-v2.js',
  'content_modules/clipart/scanner-auto.js',
  'content_modules/clipart/scanner-manual.js',
  'content_modules/clipart/scanner-screenshot.js',
  'content_modules/clipart/scanner-panel.js',
  'content_modules/clipart/scanner-core.js',
  'content_modules/clipart-scanner.js'
];
if (contentFiles.length !== expectedContentFiles.length) fail(`content script load order length changed: expected ${expectedContentFiles.length}, got ${contentFiles.length}`);
expectedContentFiles.forEach((file, idx) => {
  if (contentFiles[idx] !== file) fail(`content script load order changed at index ${idx}: expected ${file}, got ${contentFiles[idx] || 'missing'}`);
  if (!fs.existsSync(path.join(root, file))) fail(`missing content script file: ${file}`);
});

const removedRuntime = ['content_modules/site-profiles.js', 'content_modules/site_profiles/', 'content_modules/manual_profiles/', 'content_modules/clipart/scanner-profile-adapters.js', 'content_modules/clipart/scanner-profile-site-v2-bridge.js', 'content_modules/clipart/scanner-profile-site-v2-consolidated.js'];
contentFiles.forEach((file) => removedRuntime.forEach((entry) => {
  if (entry.endsWith('/') ? file.startsWith(entry) : file === entry) fail(`legacy profile runtime still loaded: ${file}`);
}));

const canonicalProfiles = ['pawesomehouse-customily', 'macorner-customily', 'geckocustom', 'pawfecthouse-teeinblue', 'personalfury', 'interestpod', 'gossby', 'suzitee', 'trendingcustom', 'wanderprints', 'etsy'];
const registryIds = { 'pawesomehouse-customily': 'pawesomehouse-customily-manual' };
canonicalProfiles.forEach((id) => {
  const file = `content_modules/clipart/scanner-profile-${id}.js`;
  if (contentFiles.filter((entry) => entry === file).length !== 1) fail(`${id} must have exactly one operational scanner profile`);
  if (!fs.existsSync(path.join(root, `tests/fixtures/site-profiles/${id}/expected.json`))) fail(`${id} missing canonical expected fixture`);
});

const runtimeSource = ['content_modules/clipart/scanner-site-router.js', 'content_modules/clipart/scanner-core.js', 'content_modules/clipart/scanner-auto.js', 'content_modules/clipart/scanner-manual.js', 'content_modules/clipart/scanner-screenshot.js'].map(read).join('\n');
['STSSiteProfilesV2', 'STSSiteProfiles.pickSiteProfile', 'STSManualProfiles', 'siteV2Bridge'].forEach((legacyRef) => {
  if (runtimeSource.includes(legacyRef)) fail(`operational scanner route depends on legacy profile global: ${legacyRef}`);
});

const doc = { querySelector() { return null; }, querySelectorAll() { return []; }, documentElement: { getAttribute() { return ''; }, setAttribute() {} } };
const windowMock = { document: doc, location: { hostname: 'unknown.example', href: 'https://unknown.example/' }, getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; } };
const ctx = vm.createContext({ window: windowMock, document: doc, location: windowMock.location, console });
ctx.window = windowMock;
[
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-native-adapter.js',
  ...canonicalProfiles.map((id) => `content_modules/clipart/scanner-profile-${id}.js`)
].forEach((file) => runInContext(ctx, file));
const registry = windowMock.STSClipartScanner && windowMock.STSClipartScanner.profiles;
if (!registry) fail('scanner profile registry missing');
canonicalProfiles.forEach((id) => {
  if (!registry.get(registryIds[id] || id)) fail(`canonical scanner profile not registered: ${id}`);
});
const unknownResolved = registry.resolve({ document: doc, location: { hostname: 'unknown.example', href: 'https://unknown.example/' }, window: windowMock });
if (!unknownResolved || unknownResolved.id !== 'default') fail('unknown host must resolve to default scanner profile');

console.log('Smoke check passed.');
