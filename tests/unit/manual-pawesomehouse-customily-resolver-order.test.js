const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ns = {};
const legacyProfiles = [];

const doc = {
  querySelector: (sel) => ({
    '#customily-options': {
      querySelectorAll: () => [],
      querySelector: (inner) => ({
        '.customily_option': {},
        '.customily-swatch.swatch': {},
        'select[name^="properties["]': null,
        'input[name^="properties["]': null,
        'textarea[name^="properties["]': null,
        '.customily-swatch.swatch, select[name^="properties["], input[name^="properties["], textarea[name^="properties["]': {}
      }[inner] || null)
    },
    '.customily_option': {},
    '.cl-option-content': {},
    '.swatch-container': {}
  }[sel] || null),
  documentElement: { getAttribute: () => '' }
};

const windowMock = {
  STSClipartScanner: ns,
  STSSiteProfilesV2: {
    list: () => legacyProfiles
  },
  location: { hostname: 'pawesomehouse.com', href: 'https://pawesomehouse.com/p' },
  document: doc,
  getComputedStyle: () => ({ backgroundColor: 'transparent' })
};

const ctx = vm.createContext({ window: windowMock, document: doc, location: windowMock.location, console });
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-registry.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-default.js', 'utf8'), ctx);

legacyProfiles.push({
  id: 'pawesomehouse',
  name: 'legacy pawesomehouse',
  domains: ['pawesomehouse.com'],
  match: (host) => host === 'pawesomehouse.com',
  scanManualGroupFromTitle: () => ({ title: 'legacy', items: [] })
});

vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-pawesomehouse-customily.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-adapters.js', 'utf8'), ctx);

const profiles = windowMock.STSClipartScanner.profiles.list();
assert.ok(profiles.some((p) => p.id === 'pawesomehouse'), 'legacy adapter registered');
assert.ok(profiles.some((p) => p.id === 'pawesomehouse-customily-manual'), 'dedicated profile registered');

const resolved = windowMock.STSClipartScanner.profiles.resolve({ document: doc, location: windowMock.location, window: windowMock });
assert.equal(resolved.id, 'pawesomehouse-customily-manual', 'dedicated profile must win on customily pages');
assert.equal(typeof resolved.scanManualGroupFromTitle, 'function');

assert.equal(typeof resolved.scanPage, 'function', 'resolved profile has scanPage for auto path');
const autoRaw = resolved.scanPage({ document: doc, location: windowMock.location, window: windowMock });
assert.ok(Array.isArray(autoRaw), 'auto scanPage returns array');

console.log('manual pawesomehouse customily resolver order test passed.');
