const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function E(tag, props = {}) {
  const el = {
    tagName: tag.toUpperCase(),
    textContent: props.textContent || '',
    attrs: props.attrs || {},
    clicked: 0,
    style: {},
    scrollIntoViewCalled: 0,
    getAttribute(name) { return this.attrs[name] || ''; },
    scrollIntoView() { this.scrollIntoViewCalled++; },
    click() { this.clicked++; if (typeof this.onClick === 'function') this.onClick(); }
  };
  return el;
}

function loadAuto() {
  const document = { title: 'Manual Auto Product', querySelector() { return null; } };
  const windowMock = { location: { hostname: 'example.com', href: 'https://example.com/p/1' }, STSClipartScanner: {} };
  const sandbox = vm.createContext({ window: windowMock, document, console, setTimeout, clearTimeout, Date, Promise });
  vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-auto.js', 'utf8'), sandbox);
  return { mod: windowMock.STSClipartScanner.auto, document, windowMock };
}

async function runWith({ titles, resolver, legacy, hasCandidates = true }) {
  const { mod, document, windowMock } = loadAuto();
  const calls = { legacyAuto: 0, panel: 0, notify: 0 };
  const CLIPART = { categories: [], capturedData: null };
  const ctx = {
    document,
    window: windowMock,
    CLIPART,
    showProgress() {},
    clipNotify() { calls.notify++; },
    showClipartPanel() { calls.panel++; },
    coreFns: {
      hasManualDrivenAutoCandidatesLegacy: () => hasCandidates,
      getManualTitleCandidatesLegacy: () => ({ source: 'manual-profile', profile: { id: 'test-manual', matchedProfileId: 'test-manual' }, titles }),
      collectManualGroupViaResolverLegacy: resolver,
      collectManualGroupViaLegacyContainerLegacy: legacy,
      scanClipartsLegacy() { calls.legacyAuto++; return { categories: ['legacy'] }; }
    }
  };
  return { result: await mod.scanCliparts(ctx), calls, CLIPART };
}

(async function() {
  const first = E('div', { textContent: 'Size' });
  const second = E('div', { textContent: 'Color' });
  const multi = await runWith({
    titles: [first, second],
    resolver: (title) => ({ fallback: false, group: { label: title.textContent, options: [{ textContent: title.textContent + ' 1', rect: { w: 1, h: 1 } }] } })
  });
  assert.equal(multi.result.trace.engine, 'manual-driven-auto');
  assert.deepEqual(multi.result.categories.map((c) => c.name), ['Size', 'Color']);
  assert.equal(multi.calls.legacyAuto, 0);
  assert.equal(multi.calls.panel, 1);
  assert.equal(first.scrollIntoViewCalled, 1);

  const single = E('div', { textContent: 'Material' });
  const manualSingle = await runWith({
    titles: [single],
    resolver: (title) => ({ fallback: false, group: { label: title.textContent, options: [{ textContent: 'Cotton', rect: { w: 2, h: 2 } }] } })
  });
  assert.equal(manualSingle.result.categories[0].name, 'Material');
  assert.equal(manualSingle.result.categories[0].options[0].textContent, 'Cotton');

  const collapsed = E('div', { textContent: 'Collapsed' });
  let opened = false;
  collapsed.onClick = () => { opened = true; };
  const collapsedRes = await runWith({
    titles: [collapsed],
    resolver: () => opened
      ? { fallback: false, group: { label: 'Collapsed', options: [{ textContent: 'Opened option', rect: { w: 3, h: 3 } }] } }
      : { fallback: false, group: { label: 'Collapsed', options: [] } }
  });
  assert.equal(collapsed.clicked, 1);
  assert.equal(collapsedRes.result.categories[0].options[0].textContent, 'Opened option');

  const dupA = E('div', { textContent: 'Duplicate' });
  const dupB = E('div', { textContent: 'Duplicate' });
  const deduped = await runWith({
    titles: [dupA, dupB],
    resolver: () => ({ fallback: false, group: { label: 'Duplicate', options: [{ textContent: 'Same', rect: { w: 1, h: 1 } }] } })
  });
  assert.equal(deduped.result.categories.length, 1);

  const fallback = await runWith({ titles: [], hasCandidates: false, resolver: () => ({ fallback: true }) });
  assert.deepEqual(fallback.result.categories, ['legacy']);
  assert.equal(fallback.calls.legacyAuto, 1);

  console.log('manual-driven auto test passed');
})();
