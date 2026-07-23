const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ns = {};
const legacyTitle = { textContent: 'Choose Number Of Balls *' };
const legacyOptionEl = { tagName: 'BUTTON' };
const legacyProfiles = [{
  id: 'legacy-manual-site',
  name: 'Legacy Manual Site',
  domains: ['example.com'],
  match: (host) => host === 'example.com',
  autoScan: () => [{
    title: 'Choose Number Of Balls',
    items: [
      { value: '1', rawValue: 'ball-1', label: '1', image: null, element: legacyOptionEl },
      { value: '2', rawValue: 'ball-2', label: '2', image: 'https://cdn.example/2.png', element: legacyOptionEl }
    ]
  }],
  scanManualGroupFromTitle: (titleEl) => ({
    title: titleEl.textContent.replace(/\s*\*\s*$/, ''),
    items: [
      { value: '1', rawValue: 'ball-1', label: '1', image: null, element: legacyOptionEl },
      { value: '2', rawValue: 'ball-2', label: '2', image: 'https://cdn.example/2.png', element: legacyOptionEl }
    ]
  }),
  getRoot: (doc) => doc.root,
  getGroups: (root) => root.groups,
  getTitleElement: (group) => group.title
}];

const documentMock = { root: { groups: [] }, documentElement: { getAttribute: () => '' } };
const windowMock = {
  STSClipartScanner: ns,
  STSSiteProfilesV2: { list: () => legacyProfiles },
  document: documentMock,
  location: { hostname: 'example.com', href: 'https://example.com/products/test' }
};

const ctx = vm.createContext({ window: windowMock, document: documentMock, location: windowMock.location, console });
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-schema.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-registry.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-default.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-adapters.js', 'utf8'), ctx);

const resolved = windowMock.STSClipartScanner.profiles.resolve({ document: documentMock, location: windowMock.location, window: windowMock });
assert.equal(resolved.id, 'legacy-manual-site');
assert.equal(typeof resolved.getRoot, 'function', 'adapter preserves manual highlighter root helper');
assert.equal(typeof resolved.getGroups, 'function', 'adapter preserves manual highlighter group helper');
assert.equal(typeof resolved.getTitleElement, 'function', 'adapter preserves manual highlighter title helper');

const manualRaw = resolved.scanManualGroupFromTitle(legacyTitle, { document: documentMock, location: windowMock.location, window: windowMock });
const manualNormalized = resolved.normalizeGroup(manualRaw, { schema: windowMock.STSClipartScanner.schema });
assert.equal(manualNormalized.name, 'Choose Number Of Balls');
assert.equal(manualNormalized.options.length, 2, 'legacy title/items manual output survives default normalization');
assert.deepEqual(manualNormalized.options.map((opt) => opt.value), ['1', '2']);
assert.equal(manualNormalized.options[1].imageUrl, 'https://cdn.example/2.png');

const autoRaw = resolved.scanPage({ document: documentMock, location: windowMock.location, window: windowMock });
const autoNormalized = resolved.normalizeGroup(autoRaw[0], { schema: windowMock.STSClipartScanner.schema });
assert.equal(autoNormalized.options.length, 2, 'legacy title/items auto output survives default normalization');
assert.deepEqual(autoNormalized.options.map((opt) => opt.textContent), ['1', '2']);

console.log('manual legacy site profile adapter test passed.');
