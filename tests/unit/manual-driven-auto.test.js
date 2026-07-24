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

async function runWith({ titles, resolver, legacy, hasCandidates = true, profile }) {
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
      getManualTitleCandidatesLegacy: () => ({ source: 'manual-profile', profile: profile || { id: 'test-manual', matchedProfileId: 'test-manual' }, titles }),
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
  assert.equal(multi.result.trace.roadmapGoal, 'Auto returns canonical title groups with origin-aware icon/item/text options');
  assert.equal(multi.result.trace.roadmapPhase, 'Phase 2 — Implementation phrases');
  assert.deepEqual(multi.result.trace.roadmapImplementationPhrases, ['Find Title', 'Open Group', 'Collect Options', 'Preserve Origin Kind', 'Normalize Output', 'Record Result']);
  assert.deepEqual(multi.result.categories.map((c) => c.name), ['Size', 'Color']);
  assert.equal(multi.calls.legacyAuto, 0);
  assert.equal(multi.calls.panel, 1);
  assert.equal(first.scrollIntoViewCalled, 1);


  assert.equal(multi.result.trace.perTitle.length, 2);
  assert.deepEqual(multi.result.trace.perTitle.map((entry) => entry.click), ['clicked', 'clicked']);
  assert.deepEqual(multi.result.trace.perTitle.map((entry) => entry.optionCount), [1, 1]);
  assert.equal(multi.result.trace.settleWaitMs, 100);

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

  assert.equal(deduped.result.trace.perTitle.length, 2);
  assert.equal(deduped.result.trace.perTitle[1].skipReason, 'duplicate-group');

  const emptyTitle = E('div', { textContent: 'Empty' });
  const emptyFallback = await runWith({
    titles: [emptyTitle],
    resolver: () => ({ fallback: false, group: { label: 'Empty', options: [] } })
  });
  assert.deepEqual(emptyFallback.result.categories, ['legacy']);
  assert.equal(emptyFallback.calls.legacyAuto, 1);

  const unsafeTitle = E('button', { textContent: 'Upload photo' });
  const unsafe = await runWith({
    titles: [unsafeTitle],
    resolver: () => ({ fallback: false, group: { label: 'Upload photo', options: [{ textContent: 'Keep existing', rect: { w: 1, h: 1 } }] } })
  });
  assert.equal(unsafeTitle.clicked, 0);
  assert.deepEqual(unsafe.result.categories, ['legacy']);
  assert.equal(unsafe.calls.legacyAuto, 1);

  const structuredTitle = E('div', { textContent: 'Raw ignored' });
  const structuredGroup = E('div', { textContent: 'Group text' });
  const structuredExpand = E('button', { textContent: 'Open structured' });
  const structured = await runWith({
    titles: [{ titleEl: structuredTitle, groupEl: structuredGroup, expandEl: structuredExpand, label: 'Structured Label', source: 'scanner-profile' }],
    resolver: (title) => ({ fallback: false, group: { label: title === structuredTitle ? 'Structured Label' : 'Wrong', options: [{ textContent: 'Structured option', rect: { w: 1, h: 1 } }] } })
  });
  assert.equal(structuredExpand.clicked, 1);
  assert.equal(structured.result.trace.source, 'manual-profile');
  assert.equal(structured.result.trace.perTitle[0].titleText, 'Structured Label');

  const titleWithTarget = E('div', { textContent: 'Profile Title' });
  const expandTarget = E('button', { textContent: 'Open profile title' });
  const profileTarget = await runWith({
    titles: [titleWithTarget],
    profile: {
      id: 'profile-target',
      matchedProfileId: 'profile-target',
      manualDrivenAutoWaitMs: 0,
      getAutoExpandTarget: (title) => title === titleWithTarget ? expandTarget : title
    },
    resolver: () => ({ fallback: false, resolverId: 'profile-resolver', group: { label: 'Profile Title', options: [{ textContent: 'Profile option', rect: { w: 1, h: 1 } }] } })
  });
  assert.equal(titleWithTarget.clicked, 0);
  assert.equal(expandTarget.clicked, 1);
  assert.equal(profileTarget.result.trace.resolvedProfileId, 'profile-target');
  assert.equal(profileTarget.result.trace.settleWaitMs, 0);
  assert.equal(profileTarget.result.trace.perTitle[0].resolverUsed, 'profile-resolver');

  const fallback = await runWith({ titles: [], hasCandidates: false, resolver: () => ({ fallback: true }) });
  assert.deepEqual(fallback.result.categories, ['legacy']);
  assert.equal(fallback.calls.legacyAuto, 1);

  console.log('manual-driven auto test passed');
})();
