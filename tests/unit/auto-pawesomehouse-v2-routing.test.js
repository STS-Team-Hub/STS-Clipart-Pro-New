const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function makeCtx({ host = 'pawesomehouse.com', hasRoot = true, hasGroup = true, profileId = 'pawesomehouse', v2Result, v2Throws } = {}) {
  const root = {
    id: 'customily-options',
    querySelector(sel) { return sel === '.customily_option' && hasGroup ? { className: 'customily_option' } : null; }
  };
  const document = {
    title: 'Product',
    documentElement: { setAttribute() {}, getAttribute() { return ''; } },
    querySelector(sel) {
      if (sel === '#customily-options') return hasRoot ? root : null;
      if (sel === '[data-shopify]') return null;
      return null;
    }
  };
  const calls = { legacy: 0, v2: 0, panel: 0 };
  const CLIPART = { categories: [], capturedData: null };
  const windowMock = {
    location: { hostname: host, href: 'https://' + host + '/p/1' },
    document,
    STSClipartScanner: {
      autoDefaultV2: {
        async runAutoV2() {
          calls.v2++;
          if (v2Throws) throw new Error('boom');
          return v2Result || { groups: [], trace: { engine: 'default-v2', rootSelectorUsed: '#customily-options', fallbackUsed: false, groupsBeforeDedup: 0, groupsAfterDedup: 0, snapshotsCount: 0, clickedTriggers: [], targetGroups: [] } };
        }
      }
    }
  };
  const sandbox = vm.createContext({ window: windowMock, document, console, setTimeout, clearTimeout, Date });
  vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-auto.js', 'utf8'), sandbox);
  const mod = windowMock.STSClipartScanner.auto;
  const ctx = {
    location: windowMock.location,
    document,
    window: windowMock,
    CLIPART,
    getCurrentProfile: () => ({ id: profileId }),
    showClipartPanel() { calls.panel++; },
    coreFns: { scanClipartsLegacy() { calls.legacy++; return { categories: ['legacy'] }; } }
  };
  return { mod, ctx, calls };
}

(async function() {
  const v2Groups = [
    { label: "Man's Body Type", options: [{ imageUrl: 'https://i/body.png', capturedImage: 'https://i/body.png', textContent: 'YOUNG', value: '1', name: "Man's Body Type", optionType: 'image', sourceKind: 'customily-swatch', rect: { w: 20, h: 20 } }] },
    { label: "Man's Skin Color", options: [{ imageUrl: 'https://i/skin.png', textContent: 'Light', optionType: 'image', sourceKind: 'customily-swatch', rect: { w: 20, h: 20 } }] },
    { label: 'black', options: [{ imageUrl: 'https://i/black.png', optionType: 'image', sourceKind: 'customily-swatch', rect: { w: 20, h: 20 } }] },
    { label: 'Choose The Title', options: [{ value: 'Dad', textContent: 'Dad', name: 'Choose The Title', optionType: 'text', sourceKind: 'select', rect: { w: 10, h: 10 } }] }
  ];

  const good = makeCtx({ profileId: 'pawesomehouse', v2Result: { groups: v2Groups, trace: { engine: 'default-v2', rootSelectorUsed: '#customily-options', fallbackUsed: false, groupsBeforeDedup: 4, groupsAfterDedup: 4, snapshotsCount: 1, clickedTriggers: [], targetGroups: [] } } });
  const res = await good.mod.scanCliparts(good.ctx);
  assert.equal(good.calls.v2, 1);
  assert.equal(good.calls.legacy, 0);
  assert.equal(good.calls.panel, 1);
  assert.ok(res.url && res.title !== undefined && res.platform && res.scannedAt);
  assert.equal(good.ctx.CLIPART.categories.length, 4);
  assert.ok(good.ctx.CLIPART.capturedData && good.ctx.CLIPART.capturedData.categories.length === res.categories.length);

  const body = res.categories.find(c => c.name === "Man's Body Type");
  assert.equal(body.options[0].optionType, 'image');
  assert.ok(body.options[0].imageUrl && body.options[0].capturedImage);

  const skin = res.categories.find(c => c.name === "Man's Skin Color");
  assert.equal(skin.options[0].optionType, 'image');

  const black = res.categories.find(c => c.name === 'black');
  assert.equal(black.options[0].optionType, 'image');

  const title = res.categories.find(c => c.name === 'Choose The Title');
  assert.equal(title.options[0].optionType, 'text');

  ['imageUrl', 'capturedImage', 'optionType', 'sourceKind', 'textContent', 'value', 'name'].forEach(k => assert.ok(Object.prototype.hasOwnProperty.call(body.options[0], k), k));

  const names = res.categories.map(c => c.name);
  ['Color', 'White', 'Style', 'Size'].forEach(n => assert.ok(!names.includes(n)));

  const zero = makeCtx({ profileId: 'pawesomehouse', v2Result: { groups: [], trace: { engine: 'default-v2', rootSelectorUsed: '#customily-options', fallbackUsed: false, groupsBeforeDedup: 0, groupsAfterDedup: 0, snapshotsCount: 0, clickedTriggers: [], targetGroups: [] } } });
  const zeroRes = await zero.mod.scanCliparts(zero.ctx);
  assert.equal(zero.calls.legacy, 0);
  assert.equal(zeroRes.blockedLegacyFallback, true);
  assert.equal(zeroRes.categories.length, 0);

  const traceProbeDoc = {
    documentElement: {
      _v: '',
      setAttribute(k, v) { if (k === 'data-sts-last-auto-trace') this._v = String(v); },
      getAttribute(k) { return k === 'data-sts-last-auto-trace' ? this._v : ''; }
    },
    querySelector(sel) { return sel === '#customily-options' ? { querySelector(){ return { className: 'customily_option' }; }, querySelectorAll(){ return []; } } : null; }
  };
  const traceWin = { STSClipartScanner: {}, getComputedStyle(){ return { backgroundImage: 'none' }; } };
  const traceSandbox = vm.createContext({ window: traceWin, document: traceProbeDoc, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-auto-default-v2.js', 'utf8'), traceSandbox);
  await traceWin.STSClipartScanner.autoDefaultV2.runAutoV2({ document: traceProbeDoc, window: traceWin }, { rootSelector: '#customily-options', resolvedProfileId: 'pawesomehouse', maxClicks: 0 });
  assert.equal(typeof traceWin.__STS_DEBUG_DUMP_AUTO_RESULT, 'function');
  const traceDump = traceWin.__STS_DEBUG_DUMP_AUTO_RESULT();
  assert.equal(traceDump.engine, 'default-v2');
  assert.equal(traceDump.rootSelectorUsed, '#customily-options');
  assert.equal(traceDump.fallbackUsed, false);
  assert.ok(traceProbeDoc.documentElement.getAttribute('data-sts-last-auto-trace').includes('default-v2'));

  const nonTarget = makeCtx({ host: 'example.com', hasRoot: true });
  const legacyRes = await nonTarget.mod.scanCliparts(nonTarget.ctx);
  assert.equal(nonTarget.calls.v2, 0);
  assert.equal(nonTarget.calls.legacy, 1);
  assert.deepEqual(legacyRes, { categories: ['legacy'] });

  console.log('auto pawesomehouse v2 routing test passed');
})();
