(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function isPawesomehouseHost(host) {
    return /(^|\.)pawesomehouse\.com$/.test(String(host || '').toLowerCase());
  }

  function resolvePawesomehouseCustomilyRoot(ctx) {
    var doc = (ctx && ctx.document) || document;
    if (!doc || !doc.querySelector) return null;
    var root = doc.querySelector('#customily-options');
    if (!root || !root.querySelector || !root.querySelector('.customily_option')) return null;
    return root;
  }

  function isPawesomehouseCustomilyV2Target(ctx) {
    var loc = (ctx && ctx.location) || window.location || {};
    var host = String(loc.hostname || '').toLowerCase();
    if (!isPawesomehouseHost(host)) return false;
    return !!resolvePawesomehouseCustomilyRoot(ctx);
  }

  function sequentialPrefix(index) {
    if (index < 26) return String.fromCharCode(65 + index);
    var first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    var second = String.fromCharCode(65 + (index % 26));
    return first + second;
  }

  function mapV2GroupsToCategories(groups) {
    return (groups || []).map(function(group, idx) {
      var label = String((group && group.label) || '').trim();
      var pfx = sequentialPrefix(idx);
      var options = ((group && group.options) || []).map(function(opt, oIdx) {
        var imageUrl = (opt && opt.imageUrl) || null;
        var capturedImage = (opt && opt.capturedImage) || null;
        return {
          id: String(idx) + '-' + String(oIdx),
          label: pfx + String(oIdx + 1),
          text: opt && (opt.textContent || opt.value || opt.name) || '',
          value: opt && (opt.value || opt.textContent || opt.name) || '',
          name: opt && (opt.name || opt.value || opt.textContent) || '',
          textContent: opt && (opt.textContent || opt.value || opt.name) || '',
          imageUrl: imageUrl,
          capturedImage: capturedImage,
          optionType: (opt && opt.optionType) || (imageUrl ? 'image' : 'text'),
          sourceKind: (opt && opt.sourceKind) || '',
          rect: (opt && opt.rect) || { w: 0, h: 0 },
          width: (opt && opt.rect && opt.rect.w) || 0,
          height: (opt && opt.rect && opt.rect.h) || 0,
          bgColor: (opt && opt.bgColor) || null,
          visualKind: (opt && opt.visualKind) || '',
          hasVisual: !!(opt && opt.hasVisual),
          needsCapture: !!(opt && opt.needsCapture),
          classificationReason: (opt && opt.classificationReason) || '',
          candidateRejectReason: (opt && opt.candidateRejectReason) || '',
          captureDecision: (opt && opt.captureDecision) || '',
          captureSkipReason: (opt && opt.captureSkipReason) || '',
          groupLabel: (opt && opt.groupLabel) || label,
          optionText: (opt && opt.optionText) || (opt && (opt.textContent || opt.value || opt.name)) || '',
          element: (opt && opt.element) || null,
          captureTarget: (opt && opt.captureTarget) || null
        };
      });
      return {
        id: String(idx),
        name: label,
        label: label,
        prefix: pfx,
        optionCount: options.length,
        options: options,
        rect: (group && group.rect) || null
      };
    });
  }

  async function runPawesomehouseAutoV2(ctx) {
    var c = ctx || {};
    var doc = c.document || document;
    var win = c.window || window;
    var v2 = ns.autoDefaultV2;
    async function failure(trace) {
      var t = trace || {};
      t.engine = t.engine || 'default-v2';
      t.rootSelectorUsed = '#customily-options';
      t.fallbackUsed = false;
      t.entrypointId = c.entrypointId || null;
      var result = {
        url: (win.location && win.location.href) || '',
        title: doc && doc.title || '',
        platform: (win.Shopify || (doc && doc.querySelector && doc.querySelector('[data-shopify]'))) ? 'shopify' : ((win.location && win.location.hostname && String(win.location.hostname).includes('etsy')) ? 'etsy' : 'custom'),
        scannedAt: new Date().toISOString(),
        categories: []
      };
      if (c.coreFns && typeof c.coreFns.captureSingleGroupLegacy === 'function') {
        for (var ci = 0; ci < categories.length; ci++) {
          var cat = categories[ci];
          var needCapture = (cat.options || []).some(function(o) { return !!o.needsCapture && !o.capturedImage; });
          if (!needCapture) continue;
          try {
            await c.coreFns.captureSingleGroupLegacy(cat);
          } catch (capErr) {
            (cat.options || []).forEach(function(o) {
              if (o.needsCapture && !o.capturedImage) {
                o.captureSkipReason = 'capture-failed:' + (capErr && capErr.message ? capErr.message : String(capErr));
              }
            });
          }
        }
      }
      if (c.CLIPART) {
        c.CLIPART.categories = [];
        c.CLIPART.capturedData = result;
      }
      return Object.assign({ blockedLegacyFallback: true, trace: t }, result);
    }

    if (!v2 || typeof v2.runAutoV2 !== 'function') {
      return failure({ failureReason: 'v2-module-missing' });
    }

    try {
      if (typeof c.showProgress === 'function') c.showProgress(5, 'Running pawesomehouse/customily Auto V2...');
      var profile = c.getCurrentProfile && c.getCurrentProfile();
      var result = await v2.runAutoV2(
        { document: doc, window: win, location: win.location },
        {
          rootSelector: '#customily-options',
          resolvedProfileId: profile && profile.id || null,
          strategies: ['customily', 'select'],
          maxClicks: 8,
          entrypointId: c.entrypointId || null
        }
      );
      var groups = (result && result.groups) || [];
      var trace = (result && result.trace) || {};
      if (!trace.entrypointId) trace.entrypointId = c.entrypointId || null;
      if (!groups.length) {
        trace.failureReason = trace.failureReason || 'v2-zero-groups';
        return failure(trace);
      }

      var categories = mapV2GroupsToCategories(groups);
      var finalResult = {
        url: (win.location && win.location.href) || '',
        title: doc && doc.title || '',
        platform: (win.Shopify || (doc && doc.querySelector && doc.querySelector('[data-shopify]'))) ? 'shopify' : ((win.location && win.location.hostname && String(win.location.hostname).includes('etsy')) ? 'etsy' : 'custom'),
        scannedAt: new Date().toISOString(),
        categories: categories
      };

      if (c.CLIPART) {
        c.CLIPART.categories = categories;
        c.CLIPART.capturedData = finalResult;
      }
      if (typeof c.showProgress === 'function') c.showProgress(100, 'Done! ' + categories.length + ' groups');
      if (typeof c.clipNotify === 'function') {
        var totalOpts = categories.reduce(function(s, cat){ return s + (cat.optionCount || 0); }, 0);
        c.clipNotify('Scan complete! ' + categories.length + ' groups, ' + totalOpts + ' options', 'success');
      }
      if (typeof c.showClipartPanel === 'function') c.showClipartPanel(finalResult);
      return Object.assign({ blockedLegacyFallback: true, trace: trace }, finalResult);
    } catch (err) {
      return failure({ failureReason: 'v2-error:' + (err && err.message ? err.message : String(err)) });
    }
  }


  function waitForDomSettle(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, typeof ms === 'number' ? ms : 60); });
  }

  function textKey(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function optionKey(opt) {
    return textKey((opt && (opt.textContent || opt.value || opt.name || opt.imageUrl || opt.capturedImage || opt.bgColor)) || '');
  }

  function groupKey(group) {
    var opts = ((group && group.options) || []).map(optionKey).filter(Boolean).join('|');
    return textKey(group && (group.label || group.name)) + '::' + opts;
  }

  function safeManualAutoClick(titleEl) {
    if (!titleEl || typeof titleEl.click !== 'function') return false;
    var txt = textKey(titleEl.textContent || titleEl.getAttribute && titleEl.getAttribute('aria-label') || '');
    var unsafe = /\b(add to cart|buy now|checkout|upload|delete|remove|quantity|qty|cart|payment|pay now|submit order)\b/i;
    if (unsafe.test(txt)) return false;
    try { titleEl.click(); return true; } catch (err) { return false; }
  }

  function normalizeManualAutoGroup(group) {
    if (!group || !Array.isArray(group.options) || !group.options.length) return null;
    var label = String(group.label || group.name || group.title || '').trim();
    if (!label) return null;
    var opts = group.options.map(function(opt) {
      return Object.assign({}, opt || {}, {
        textContent: opt && (opt.textContent || opt.value || opt.name || '') || '',
        value: opt && (opt.value || opt.textContent || opt.name || '') || '',
        name: opt && (opt.name || opt.value || opt.textContent || '') || '',
        rect: opt && opt.rect || { w: 0, h: 0 }
      });
    }).filter(function(opt) { return !!(opt.textContent || opt.value || opt.name || opt.imageUrl || opt.capturedImage || opt.bgColor); });
    if (!opts.length) return null;
    return { label: label, options: opts, rect: group.rect || null };
  }

  async function runManualDrivenAuto(ctx) {
    var c = ctx || {};
    var core = c.coreFns || {};
    if (typeof core.getManualTitleCandidatesLegacy !== 'function' || typeof core.collectManualGroupViaResolverLegacy !== 'function') return null;
    var candidateResult = core.getManualTitleCandidatesLegacy();
    var titles = candidateResult && Array.isArray(candidateResult.titles) ? candidateResult.titles : [];
    var source = candidateResult && candidateResult.source || 'none';
    var profile = candidateResult && candidateResult.profile || null;
    if (!titles.length) return null;

    var seenTitleEls = new Set();
    var uniqueTitles = titles.filter(function(titleEl) {
      if (!titleEl || seenTitleEls.has(titleEl)) return false;
      seenTitleEls.add(titleEl);
      return true;
    });
    if (!uniqueTitles.length) return null;

    if (typeof c.showProgress === 'function') c.showProgress(8, 'Manual-driven Auto: ' + uniqueTitles.length + ' titles');
    var groups = [];
    var seenGroups = new Set();
    var warnings = [];

    for (var i = 0; i < uniqueTitles.length; i++) {
      var titleEl = uniqueTitles[i];
      if (titleEl && typeof titleEl.scrollIntoView === 'function') {
        try { titleEl.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { titleEl.scrollIntoView(); }
      }
      safeManualAutoClick(titleEl);
      await waitForDomSettle(80);

      var picked = core.collectManualGroupViaResolverLegacy(titleEl);
      var group = picked && !picked.fallback ? picked.group : null;
      if ((!group || !Array.isArray(group.options) || !group.options.length) && typeof core.collectManualGroupViaLegacyContainerLegacy === 'function') {
        group = core.collectManualGroupViaLegacyContainerLegacy(titleEl);
      }
      group = normalizeManualAutoGroup(group);
      if (!group) {
        warnings.push('empty:' + String((titleEl && titleEl.textContent) || '').trim());
        if (typeof console !== 'undefined' && console.warn) console.warn('[STS Clipart Pro 8.3 Clipart] Manual-driven Auto skipped empty group:', titleEl && titleEl.textContent);
        continue;
      }
      var key = groupKey(group);
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      groups.push(group);
      if (typeof c.showProgress === 'function') c.showProgress(8 + Math.round(((i + 1) / uniqueTitles.length) * 20), 'Manual-driven Auto: ' + groups.length + ' groups');
    }

    if (!groups.length) return null;
    var categories = mapV2GroupsToCategories(groups);
    var doc = c.document || document;
    var win = c.window || window;
    var result = {
      url: (win.location && win.location.href) || '',
      title: doc && doc.title || '',
      platform: (win.Shopify || (doc && doc.querySelector && doc.querySelector('[data-shopify]'))) ? 'shopify' : ((win.location && win.location.hostname && String(win.location.hostname).includes('etsy')) ? 'etsy' : 'custom'),
      scannedAt: new Date().toISOString(),
      categories: categories,
      trace: {
        engine: 'manual-driven-auto',
        source: source,
        resolvedProfileId: profile && profile.id || null,
        matchedProfileId: profile && profile.matchedProfileId || null,
        titleCandidates: uniqueTitles.length,
        groupsAfterDedup: categories.length,
        warnings: warnings
      }
    };
    if (c.CLIPART) {
      c.CLIPART.categories = categories;
      c.CLIPART.capturedData = result;
    }
    if (typeof c.showProgress === 'function') c.showProgress(100, 'Done! ' + categories.length + ' groups');
    if (typeof c.clipNotify === 'function') {
      var totalOpts = categories.reduce(function(s, cat){ return s + (cat.optionCount || 0); }, 0);
      c.clipNotify('Scan complete! ' + categories.length + ' groups, ' + totalOpts + ' options', 'success');
    }
    if (typeof c.showClipartPanel === 'function') c.showClipartPanel(result);
    return result;
  }

  // Wrapper contract markers: ctx.coreFns.scanClipartsLegacy, ctx.coreFns.scanDOMLegacy, ctx.coreFns.appendCurrentVisibleStateLegacy
  function scanCliparts(ctx) {
    var c = ctx || {};
    var core = c.coreFns || {};
    if (typeof core.hasManualDrivenAutoCandidatesLegacy === 'function' && core.hasManualDrivenAutoCandidatesLegacy()) {
      return runManualDrivenAuto(c).then(function(result) {
        if (result) return result;
        if (isPawesomehouseCustomilyV2Target(c)) return runPawesomehouseAutoV2(c);
        if (!core || typeof core.scanClipartsLegacy !== 'function') return null;
        return core.scanClipartsLegacy();
      });
    }
    if (isPawesomehouseCustomilyV2Target(c)) return runPawesomehouseAutoV2(c);
    if (!core || typeof core.scanClipartsLegacy !== 'function') return null;
    return core.scanClipartsLegacy();
  }

  function scanDOM(ctx) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.scanDOMLegacy !== 'function') return Promise.resolve([]);
    return ctx.coreFns.scanDOMLegacy();
  }

  function appendCurrentVisibleState(ctx, data, refreshPanel, triggerBtn) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.appendCurrentVisibleStateLegacy !== 'function') return Promise.resolve(data);
    return ctx.coreFns.appendCurrentVisibleStateLegacy(data, refreshPanel, triggerBtn);
  }

  ns.auto = ns.auto || {};
  ns.auto.scanCliparts = scanCliparts;
  ns.auto.scanDOM = scanDOM;
  ns.auto.appendCurrentVisibleState = appendCurrentVisibleState;

  ns.modules.auto = {
    name: 'auto',
    scanCliparts: scanCliparts,
    scanDOM: scanDOM,
    appendCurrentVisibleState: appendCurrentVisibleState,
    __runManualDrivenAutoForTest: runManualDrivenAuto,
    __mapV2GroupsToCategoriesForTest: mapV2GroupsToCategories,
    __isPawesomehouseCustomilyV2TargetForTest: isPawesomehouseCustomilyV2Target
  };
})();
