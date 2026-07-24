const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function makeCtx({ host = 'pawesomehouse.com', hasManualCandidates = false } = {}) {
  const document = { title: 'Product', querySelector() { return null; } };
  const calls = { legacy: 0, v2: 0, panel: 0, resolver: 0 };
  const CLIPART = { categories: [], capturedData: null };
  const windowMock = {
    location: { hostname: host, href: 'https://' + host + '/p/1' },
    document,
    STSClipartScanner: { autoDefaultV2: { async runAutoV2() { calls.v2++; return { groups: [] }; } } }
  };
  const title = { textContent: 'Mother Dress Color', scrollIntoViewCalled: 0, clicked: 0, scrollIntoView() { this.scrollIntoViewCalled++; }, click() { this.clicked++; } };
  const sandbox = vm.createContext({ window: windowMock, document, console, setTimeout, clearTimeout, Date, Promise });
  vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-auto.js', 'utf8'), sandbox);
  const mod = windowMock.STSClipartScanner.auto;
  const ctx = {
    location: windowMock.location,
    document,
    window: windowMock,
    CLIPART,
    getCurrentProfile: () => ({ id: 'pawesomehouse-customily-manual', manualDrivenAutoWaitMs: 0 }),
    showProgress() {},
    clipNotify() {},
    showClipartPanel() { calls.panel++; },
    coreFns: {
      hasManualDrivenAutoCandidatesLegacy() { return hasManualCandidates; },
      getManualTitleCandidatesLegacy() { return { source: 'manual-profile', profile: { id: 'pawesomehouse-customily-manual', manualDrivenAutoWaitMs: 0 }, candidates: [{ titleEl: title, label: 'Mother Dress Color', source: 'manual-profile' }] }; },
      collectManualGroupViaResolverLegacy(titleEl, extraCtx) {
        calls.resolver++;
        calls.extraCtx = extraCtx;
        return { fallback: false, group: { label: titleEl.textContent, options: [{ textContent: 'White', imageUrl: 'https://img/dress-white.png', capturedImage: 'https://img/dress-white.png', optionType: 'image', rect: { w: 20, h: 20 } }] } };
      },
      scanClipartsLegacy() { calls.legacy++; return { categories: ['legacy'] }; }
    }
  };
  return { mod, ctx, calls, title };
}

(async function() {
  const manual = makeCtx({ hasManualCandidates: true });
  const res = await manual.mod.scanCliparts(manual.ctx);
  assert.equal(manual.calls.v2, 0);
  assert.equal(manual.calls.legacy, 0);
  assert.equal(manual.calls.resolver, 1);
  assert.deepEqual(manual.calls.extraCtx, { includeFormInputs: true, manualDrivenAuto: true });
  assert.equal(manual.calls.panel, 1);
  assert.equal(manual.title.clicked, 1);
  assert.equal(res.trace.engine, 'manual-driven-auto');
  assert.equal(res.categories[0].name, 'Mother Dress Color');
  assert.equal(res.categories[0].options[0].optionType, 'image');

  const fallback = makeCtx({ hasManualCandidates: false });
  const fallbackRes = await fallback.mod.scanCliparts(fallback.ctx);
  assert.equal(fallback.calls.v2, 0);
  assert.equal(fallback.calls.legacy, 1);
  assert.deepEqual(fallbackRes, { categories: ['legacy'] });

  console.log('auto pawesomehouse v1 routing test passed');
})();
