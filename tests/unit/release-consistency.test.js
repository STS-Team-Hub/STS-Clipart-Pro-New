const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const read = (file) => fs.readFileSync(file, 'utf8');

assert.equal(pkg.version, '8.3.0', 'package version remains 8.3.0');
assert.equal(manifest.version, '8.3.0', 'manifest version remains 8.3.0');
assert.equal(manifest.version_name, '8.3', 'manifest version_name remains 8.3');
assert.equal(manifest.name, 'STS Clipart Pro 8.3', 'manifest name remains release-branded');
assert.equal(manifest.action.default_title, 'STS Clipart Pro 8.3', 'action title remains release-branded');
assert.deepEqual(manifest.host_permissions, ['<all_urls>'], '<all_urls> host permission remains unchanged');

[
  ['README.txt', 'STS Clipart Pro 8.3'],
  ['README.txt', 'Version synchronized to 8.3 / 8.3.0'],
  ['CHANGELOG.txt', '## 8.3.0'],
  ['Logs.txt', '## 8.3.0'],
  ['popup.html', 'STS Clipart Pro 8.3'],
  ['panel.html', 'STS Clipart Pro 8.3 Panel'],
  ['panel.js', 'STS Clipart Pro 8.3 Toolbar']
].forEach(([file, pattern]) => {
  assert.ok(read(file).includes(pattern), `${file} includes ${pattern}`);
});

const scripts = manifest.content_scripts[0].js;
assert.ok(scripts.indexOf('content_modules/sanitize.js') < scripts.indexOf('content_modules/clipart/scanner-utils.js'), 'sanitize loads before scanner modules');
assert.ok(scripts.includes('content_modules/clipart/scanner-sync.js'), 'scanner sync module is packaged');
assert.ok(scripts.includes('content_modules/clipart/scanner-render.js'), 'scanner render module is packaged');
assert.ok(manifest.web_accessible_resources[0].resources.includes('panel.html'), 'panel html is packaged');
assert.ok(manifest.web_accessible_resources[0].resources.includes('panel.js'), 'panel js is packaged');

const syncSandbox = { window: {} };
vm.createContext(syncSandbox);
vm.runInContext(read('content_modules/sync-payload.js'), syncSandbox);
const validate = syncSandbox.window.STSSyncPayload.validateSyncPayloadShape;
assert.deepEqual(validate({ url: 'https://example.test/p', title: 'Product', platform: 'shopify', categories: [{ title: 'Color', options: [] }] }), { ok: true });
assert.equal(validate({ url: 'https://example.test/p', title: 'Product', platform: 'shopify', categories: {} }).ok, false, 'sync payload rejects non-array categories');
assert.equal(validate({ title: 'Product', platform: 'shopify', categories: [] }).ok, false, 'sync payload requires url');

console.log('release consistency test passed.');
