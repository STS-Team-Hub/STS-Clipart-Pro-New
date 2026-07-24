(function(){
  var PHASE2_IMPLEMENTATION_PHRASES = [
    'Find Title',
    'Open Group',
    'Collect Options',
    'Preserve Origin Kind',
    'Normalize Output',
    'Record Result'
  ];

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

  function resolveOriginAwareOptionKind(opt, imageUrl, capturedImage) {
    if (opt && (opt.optionKind || opt.originalOptionKind)) return opt.optionKind || opt.originalOptionKind;
    if (imageUrl || capturedImage || (opt && (opt.bgColor || opt.hasVisual || opt.needsCapture))) return 'icon';
    var sourceKind = String((opt && opt.sourceKind) || '').toLowerCase();
    var optionType = String((opt && opt.optionType) || '').toLowerCase();
    if (/^(select|text-input|textarea|input|text-field|form-field)$/.test(sourceKind) || /text|select|textarea|input/.test(optionType)) return 'text';
    return 'item';
  }

  function mapV2GroupsToCategories(groups) {
    return (groups || []).map(function(group, idx) {
      var label = String((group && group.label) || '').trim();
      var pfx = sequentialPrefix(idx);
      var options = ((group && group.options) || []).map(function(opt, oIdx) {
        var imageUrl = (opt && opt.imageUrl) || null;
        var capturedImage = (opt && opt.capturedImage) || null;
        var originKind = resolveOriginAwareOptionKind(opt, imageUrl, capturedImage);
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
          captureTarget: (opt && opt.captureTarget) || null,
          originalOptionKind: (opt && opt.originalOptionKind) || originKind,
          optionKind: (opt && opt.optionKind) || (opt && opt.originalOptionKind) || originKind,
          displayKind: (opt && opt.displayKind) || (opt && opt.optionKind) || (opt && opt.originalOptionKind) || originKind
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


  function getManualAutoLabel(titleEl) {
    return String((titleEl && (titleEl.textContent || (titleEl.getAttribute && titleEl.getAttribute('aria-label')))) || '').replace(/\s+/g, ' ').trim();
  }

  function isUnsafeManualAutoText(value) {
    var unsafe = /\b(add to cart|buy now|checkout|upload|delete|remove|quantity|qty|cart|payment|pay now|submit order)\b/i;
    return unsafe.test(String(value || ''));
  }

  function resolveManualAutoExpandTarget(profile, titleEl, ctx) {
    if (profile && typeof profile.getAutoExpandTarget === 'function') {
      try {
        return profile.getAutoExpandTarget(titleEl, ctx || {}) || titleEl;
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[STS Clipart Pro 8.3 Clipart] Manual-driven Auto expand target failed:', err);
        return titleEl;
      }
    }
    return titleEl;
  }

  function safeManualAutoClick(titleEl) {
    if (!titleEl || typeof titleEl.click !== 'function') return false;
    var txt = getManualAutoLabel(titleEl);
    if (isUnsafeManualAutoText(txt)) return false;
    try { titleEl.click(); return true; } catch (err) { return false; }
  }


  function isMeaningfullyVisible(el) {
    if (!el) return false;
    if (el.offsetParent !== undefined && el.offsetParent !== null) return true;
    if (typeof el.getClientRects === 'function' && el.getClientRects().length) return true;
    if (typeof el.getBoundingClientRect === 'function') {
      var r = el.getBoundingClientRect();
      return !!(r && (r.width > 0 || r.height > 0));
    }
    return true;
  }

  function normalizeManualAutoCandidateList(candidateResult) {
    var raw = candidateResult && Array.isArray(candidateResult.candidates) ? candidateResult.candidates : (candidateResult && Array.isArray(candidateResult.titles) ? candidateResult.titles : []);
    var out = [];
    var seen = [];
    function samePair(a, b) { return a && b && a.titleEl === b.titleEl && (a.groupEl || null) === (b.groupEl || null); }
    raw.forEach(function(item) {
      var rec = (item && (item.titleEl || item.groupEl || item.expandEl || item.label || item.source)) ? item : { titleEl: item };
      var titleEl = rec && rec.titleEl;
      if (!titleEl) return;
      var groupEl = rec.groupEl || titleEl.__stsManualProfileGroup || null;
      var label = String(rec.label || getManualAutoLabel(titleEl) || '').replace(/\s+/g, ' ').trim();
      if (!label) return;
      if (isUnsafeManualAutoText(label)) return;
      if (!isMeaningfullyVisible(titleEl)) return;
      if (groupEl && !isMeaningfullyVisible(groupEl)) return;
      var normalized = { titleEl: titleEl, groupEl: groupEl, expandEl: rec.expandEl || null, label: label, source: rec.source || (candidateResult && candidateResult.source) || 'legacy' };
      for (var i = 0; i < seen.length; i++) if (samePair(seen[i], normalized)) return;
      seen.push(normalized);
      out.push(normalized);
    });
    return out;
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

  async function collectManualDrivenAutoGroups(ctx) {
    var c = ctx || {};
    var core = c.coreFns || {};
    if (typeof core.getManualTitleCandidatesLegacy !== 'function' || typeof core.collectManualGroupViaResolverLegacy !== 'function') return null;
    var candidateResult = core.getManualTitleCandidatesLegacy();
    var candidates = normalizeManualAutoCandidateList(candidateResult);
    var source = candidateResult && candidateResult.source || 'none';
    var profile = (candidateResult && candidateResult.profile) || (typeof c.getCurrentProfile === 'function' && c.getCurrentProfile()) || null;
    if (!candidates.length) return null;

    if (typeof c.showProgress === 'function') c.showProgress(8, 'Manual-driven Auto: ' + candidates.length + ' titles');
    var groups = [];
    var seenGroups = new Set();
    var warnings = [];
    var perTitleTrace = [];
    var waitMs = profile && typeof profile.manualDrivenAutoWaitMs === 'number' ? profile.manualDrivenAutoWaitMs : 100;

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var titleEl = candidate.titleEl;
      var titleText = candidate.label || getManualAutoLabel(titleEl);
      var traceEntry = {
        titleText: titleText,
        click: 'skipped-click',
        resolverUsed: 'manual-resolver',
        optionCount: 0,
        skipReason: ''
      };
      perTitleTrace.push(traceEntry);
      if (titleEl && typeof titleEl.scrollIntoView === 'function') {
        try { titleEl.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { titleEl.scrollIntoView(); }
      }
      var expandEl = candidate.expandEl || resolveManualAutoExpandTarget(profile, titleEl, c);
      if (isUnsafeManualAutoText(getManualAutoLabel(expandEl))) {
        traceEntry.skipReason = 'unsafe-click-text';
        warnings.push('unsafe-click:' + titleText);
      } else if (safeManualAutoClick(expandEl)) {
        traceEntry.click = 'clicked';
      } else {
        traceEntry.skipReason = 'click-failed';
      }
      await waitForDomSettle(waitMs);

      var picked = core.collectManualGroupViaResolverLegacy(titleEl, { includeFormInputs: true, manualDrivenAuto: true });
      var group = picked && !picked.fallback ? picked.group : null;
      if (picked && picked.resolverId) traceEntry.resolverUsed = picked.resolverId;
      if ((!group || !Array.isArray(group.options) || !group.options.length) && typeof core.collectManualGroupViaLegacyContainerLegacy === 'function') {
        traceEntry.resolverUsed = 'legacy-container';
        group = core.collectManualGroupViaLegacyContainerLegacy(titleEl);
      }
      group = normalizeManualAutoGroup(group);
      if (!group) {
        traceEntry.skipReason = traceEntry.skipReason || 'empty-group';
        warnings.push('empty:' + titleText);
        if (typeof console !== 'undefined' && console.warn) console.warn('[STS Clipart Pro 8.3 Clipart] Manual-driven Auto skipped empty group:', titleText);
        continue;
      }
      traceEntry.optionCount = (group.options || []).length;
      var key = groupKey(group);
      if (seenGroups.has(key)) {
        traceEntry.skipReason = 'duplicate-group';
        continue;
      }
      seenGroups.add(key);
      groups.push(group);
      if (typeof c.showProgress === 'function') c.showProgress(8 + Math.round(((i + 1) / candidates.length) * 20), 'Manual-driven Auto: ' + groups.length + ' groups');
    }

    return {
      groups: groups,
      trace: {
        engine: 'manual-driven-auto',
        source: source,
        resolvedProfileId: profile && profile.id || null,
        matchedProfileId: profile && profile.matchedProfileId || null,
        titleCandidates: candidates.length,
        groupsAfterDedup: groups.length,
        warnings: warnings,
        perTitle: perTitleTrace,
        settleWaitMs: waitMs,
        collectorOwner: 'scanner-auto.collectManualDrivenAutoGroups',
        roadmapGoal: 'Auto returns canonical title groups with origin-aware icon/item/text options',
        roadmapPhase: 'Phase 2 — Implementation phrases',
        roadmapImplementationPhrases: PHASE2_IMPLEMENTATION_PHRASES.slice()
      }
    };
  }

  async function runManualDrivenAuto(ctx) {
    var c = ctx || {};
    var collected = await collectManualDrivenAutoGroups(c);
    if (!collected || !collected.groups || !collected.groups.length) return null;
    var categories = mapV2GroupsToCategories(collected.groups);
    var doc = c.document || document;
    var win = c.window || window;
    var result = {
      url: (win.location && win.location.href) || '',
      title: doc && doc.title || '',
      platform: (win.Shopify || (doc && doc.querySelector && doc.querySelector('[data-shopify]'))) ? 'shopify' : ((win.location && win.location.hostname && String(win.location.hostname).includes('etsy')) ? 'etsy' : 'custom'),
      scannedAt: new Date().toISOString(),
      categories: categories,
      trace: Object.assign({}, collected.trace || {}, { groupsAfterDedup: categories.length })
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
        if (!core || typeof core.scanClipartsLegacy !== 'function') return null;
        return core.scanClipartsLegacy();
      });
    }
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
  ns.auto.collectManualDrivenAutoGroups = collectManualDrivenAutoGroups;
  ns.auto.scanCliparts = scanCliparts;
  ns.auto.scanDOM = scanDOM;
  ns.auto.appendCurrentVisibleState = appendCurrentVisibleState;

  ns.modules.auto = {
    name: 'auto',
    collectManualDrivenAutoGroups: collectManualDrivenAutoGroups,
    scanCliparts: scanCliparts,
    scanDOM: scanDOM,
    appendCurrentVisibleState: appendCurrentVisibleState,
    __collectManualDrivenAutoGroupsForTest: collectManualDrivenAutoGroups,
    __runManualDrivenAutoForTest: runManualDrivenAuto,
    __mapV2GroupsToCategoriesForTest: mapV2GroupsToCategories,
    __isPawesomehouseCustomilyV2TargetForTest: isPawesomehouseCustomilyV2Target
  };
})();
