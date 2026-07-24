(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  var PHASE2_IMPLEMENTATION_PHRASES = [
    'Find Title',
    'Open Group',
    'Collect Options',
    'Preserve Origin Kind',
    'Normalize Output',
    'Record Result'
  ];

  function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function normKey(v) { return norm(v).toLowerCase(); }
  function isVisible(el) {
    if (!el) return false;
    try {
      var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width <= 0 || r.height <= 0) return false;
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') <= 0)) return false;
      return true;
    } catch (e) { return false; }
  }
  function rect(el) {
    try {
      var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return { x: (r && r.x) || 0, y: (r && r.y) || 0, w: (r && r.width) || 0, h: (r && r.height) || 0 };
    } catch (e) { return { x: 0, y: 0, w: 0, h: 0 }; }
  }
  function firstUrlFromSrcset(srcset) {
    var raw = String(srcset || '').trim();
    if (!raw) return '';
    return raw.split(',')[0].trim().split(/\s+/)[0] || '';
  }
  function backgroundImageUrl(el) {
    if (!el) return '';
    var m = String((el.getAttribute && el.getAttribute('style')) || '').match(/background-image\s*:\s*url\(['\"]?([^'\")\s]+)['\"]?\)/i);
    if (m && m[1]) return m[1];
    try {
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      var bg = cs && cs.backgroundImage;
      var m2 = String(bg || '').match(/url\(['\"]?([^'\")\s]+)['\"]?\)/i);
      return m2 && m2[1] ? m2[1] : '';
    } catch (e) { return ''; }
  }

  function swatchLooksVisualTile(el) {
    if (!el) return false;
    try {
      var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      var w = (r && r.width) || 0;
      var h = (r && r.height) || 0;
      if (w < 14 || h < 14) return false;
    } catch (e) {}
    var cls = String(el.className || '').toLowerCase();
    if (cls.indexOf('swatch') >= 0 || cls.indexOf('tile') >= 0 || cls.indexOf('option') >= 0 || cls.indexOf('button') >= 0) return true;
    var role = String((el.getAttribute && el.getAttribute('role')) || '').toLowerCase();
    if (role === 'button' || role === 'radio' || role === 'option') return true;
    if (el.querySelector && el.querySelector('input[type="radio"],input[type="checkbox"]')) return true;
    return !!(typeof el.onclick === 'function');
  }

  function classifyVisualTextTileV2(opt, meta) {
    var sourceKind = String((meta && meta.sourceKind) || (opt && opt.sourceKind) || '').toLowerCase();
    var element = opt && opt.element;
    var text = norm(opt && opt.textContent || '');
    var hasImage = !!(opt && (opt.imageUrl || opt.capturedImage));
    var hasColor = !!(opt && opt.bgColor);
    if (sourceKind !== 'customily-swatch') return null;
    if (hasImage || hasColor) return null;
    if (!text) return null;
    if (!swatchLooksVisualTile(element)) return null;
    return {
      optionType: 'visual-text',
      visualKind: 'tile',
      hasVisual: true,
      needsCapture: true,
      classificationReason: 'customily-swatch-text-tile'
    };
  }

  function resolveImageUrlV2(el) {
    if (!el) return '';
    var img = (el.tagName === 'IMG' ? el : (el.querySelector ? el.querySelector('img') : null));
    if (img) {
      return img.currentSrc || img.src || (img.getAttribute && (img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src'))) || firstUrlFromSrcset(img.getAttribute && img.getAttribute('srcset')) || backgroundImageUrl(img) || backgroundImageUrl(el) || '';
    }
    return backgroundImageUrl(el) || '';
  }
  function bgColorOf(el) {
    if (!el) return '';
    try {
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      var c = String((cs && cs.backgroundColor) || '').trim();
      if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return '';
      return c;
    } catch (e) { return ''; }
  }

  function preferredText(visualTarget, input, groupLabel) {
    var debug = '';
    var t = norm((visualTarget && visualTarget.getAttribute && (visualTarget.getAttribute('aria-label') || visualTarget.getAttribute('title'))) || '');
    if (t) return { text: t, debug: 'target-aria-title' };
    var labelText = norm((visualTarget && visualTarget.textContent) || '');
    if (labelText) return { text: labelText, debug: 'target-visible-text' };
    var img = visualTarget && visualTarget.querySelector ? visualTarget.querySelector('img') : null;
    var alt = norm(img && (img.getAttribute && img.getAttribute('alt')));
    if (alt) return { text: alt, debug: 'target-img-alt' };
    var inputVal = norm(input && (input.value || (input.getAttribute && input.getAttribute('value'))));
    if (inputVal) debug = 'input-value-fallback';
    if (normKey(inputVal) === normKey(groupLabel || '')) return { text: '', debug: 'reject-equals-group-label' };
    return { text: inputVal, debug: debug || 'empty' };
  }

  function resolveOriginalOptionKindV2(opt, meta, normalized) {
    var sourceKind = String((meta && meta.sourceKind) || (opt && opt.sourceKind) || '').toLowerCase();
    var optionType = String((normalized && normalized.optionType) || (opt && opt.optionType) || '').toLowerCase();
    var hasVisual = !!(normalized && (normalized.imageUrl || normalized.capturedImage || normalized.bgColor || normalized.hasVisual || normalized.needsCapture));
    if (sourceKind.indexOf('swatch') >= 0 || optionType === 'image' || optionType === 'color' || optionType === 'visual-text' || hasVisual) return 'icon';
    if (sourceKind === 'select' || optionType === 'text') return 'text';
    return 'item';
  }

  function normalizeOptionV2(opt, meta) {
    var o = opt || {};
    var element = o.element || null;
    var imageUrl = o.imageUrl || resolveImageUrlV2(element) || '';
    var txt = norm(o.textContent || o.label || o.value || o.name || '');
    var value = norm(o.value || txt);
    var name = norm(o.name || value || txt);
    var optionType = imageUrl ? 'image' : (o.optionType || 'text');
    var normalized = {
      element: element,
      rect: o.rect || rect(element),
      imageUrl: imageUrl || null,
      capturedImage: o.capturedImage || null,
      bgColor: o.bgColor || null,
      textContent: txt,
      value: value,
      name: name,
      optionType: optionType,
      sourceKind: (meta && meta.sourceKind) || o.sourceKind || 'generic',
      isSelected: !!o.isSelected,
      visualKind: o.visualKind || '',
      hasVisual: !!o.hasVisual,
      needsCapture: !!o.needsCapture,
      classificationReason: o.classificationReason || '',
      groupLabel: o.groupLabel || '',
      optionText: txt,
      candidateRejectReason: o.candidateRejectReason || '',
      captureDecision: o.captureDecision || '',
      captureSkipReason: o.captureSkipReason || '',
      captureTarget: o.captureTarget || null,
      originalOptionKind: o.originalOptionKind || '',
      optionKind: o.optionKind || '',
      displayKind: o.displayKind || ''
    };
    var visualTextMeta = classifyVisualTextTileV2(normalized, meta);
    if (visualTextMeta) {
      normalized.optionType = visualTextMeta.optionType;
      normalized.visualKind = visualTextMeta.visualKind;
      normalized.hasVisual = visualTextMeta.hasVisual;
      normalized.needsCapture = visualTextMeta.needsCapture;
      normalized.classificationReason = visualTextMeta.classificationReason;
      normalized.capturedImage = null;
    }
    var originalKind = resolveOriginalOptionKindV2(o, meta, normalized);
    normalized.originalOptionKind = normalized.originalOptionKind || originalKind;
    normalized.optionKind = normalized.optionKind || originalKind;
    normalized.displayKind = normalized.displayKind || originalKind;
    return normalized;
  }

  function pathSig(el, root) {
    var parts = []; var node = el; var depth = 0;
    while (node && node !== root && depth < 5) {
      var idx = 0; var p = node;
      while (p && p.previousElementSibling) { idx++; p = p.previousElementSibling; }
      parts.push((node.tagName || 'X') + ':' + idx + ':' + normKey(node.className || '').slice(0, 40));
      node = node.parentElement; depth++;
    }
    return parts.join('>');
  }

  function dedupeGroupsV2(groups, strategy) {
    var root = strategy && strategy.root;
    var byKey = new Map();
    (groups || []).forEach(function(g) {
      if (!g || !g.label) return;
      var label = norm(g.label);
      var sourceKind = normKey((g.options && g.options[0] && g.options[0].sourceKind) || g.sourceKind || 'generic');
      var bucket = (g.options && g.options.length || 0) < 3 ? 's' : ((g.options && g.options.length || 0) < 8 ? 'm' : 'l');
      var key = [normKey(label), pathSig(g.element, root), sourceKind, bucket].join('|');
      if (!byKey.has(key)) { byKey.set(key, g); return; }
      var prev = byKey.get(key);
      if ((g.options || []).length > (prev.options || []).length) byKey.set(key, g);
    });
    return Array.from(byKey.values());
  }

  function isPlaceholderText(t) { return /^(select|choose|please select|pick one|--)/i.test(norm(t)); }
  function scanSelects(root) {
    var groups = [];
    (root.querySelectorAll ? root.querySelectorAll('select') : []).forEach(function(sel) {
      var label = norm((sel.getAttribute && (sel.getAttribute('aria-label') || sel.getAttribute('name'))) || '');
      var p = sel.closest && sel.closest('.customily_option');
      var l = p && p.querySelector ? p.querySelector('.option_name') : null;
      if (l) label = norm(l.textContent);
      if (!label) return;
      var options = [];
      Array.from(sel.children || []).forEach(function(op) {
        if (!op || String(op.tagName).toUpperCase() !== 'OPTION' || op.disabled) return;
        var text = norm(op.textContent);
        var val = norm(op.value);
        if ((!text && !val) || isPlaceholderText(text) || isPlaceholderText(val)) return;
        options.push(normalizeOptionV2({ element: op, textContent: text, value: val || text, name: label, optionType: 'text', imageUrl: null, isSelected: !!op.selected, rect: rect(sel) }, { sourceKind: 'select' }));
      });
      if (options.length >= 1) groups.push({ label: label, element: p || sel, rect: rect(p || sel), options: options });
    });
    return groups;
  }

  function scanCustomily(root) {
    var groups = [];
    (root.querySelectorAll ? root.querySelectorAll('.customily_option') : []).forEach(function(groupEl) {
      var titleEl = groupEl.querySelector('.option_name');
      var label = norm(titleEl && titleEl.textContent);
      if (!label) return;
      var uploadOnly = groupEl.querySelector('input[type="file"], textarea') && !groupEl.querySelector('.customily-swatch, select');
      if (uploadOnly) return;
      var options = [];
      var radios = [];
      function collectChoiceInputs(node) {
        if (!node) return;
        if (String(node.tagName || '').toUpperCase() === 'INPUT') {
          var type = String((node.getAttribute && node.getAttribute('type')) || '').toLowerCase();
          if ((type === 'radio' || type === 'checkbox') && radios.indexOf(node) < 0) radios.push(node);
        }
        Array.from(node.children || []).forEach(collectChoiceInputs);
      }
      collectChoiceInputs(groupEl);
      radios.forEach(function(input) {
        var candidate = (input.closest && (input.closest('.customily-swatch') || input.closest('.swatch') || input.closest('[class*="swatch"]'))) || null;
        if (!candidate || candidate === groupEl || (candidate.querySelector && candidate.querySelector('.option_name')) || !isVisible(candidate)) return;
        var swatchKids = candidate.querySelectorAll ? candidate.querySelectorAll('.customily-swatch, .swatch, [class*="swatch"]') : [];
        if (swatchKids && swatchKids.length > 1) return;
        var target = null;
        var inputId = input.getAttribute && input.getAttribute('id');
        if (inputId) target = groupEl.querySelector('label[for="' + inputId + '"]');
        if (!target) target = input.nextElementSibling && String(input.nextElementSibling.tagName || '').toUpperCase() === 'LABEL' ? input.nextElementSibling : null;
        if (!target) target = input.parentElement && input.parentElement.querySelector ? input.parentElement.querySelector('label') : null;
        if (!target) target = input.closest && input.closest('label,button,[role="radio"],[role="button"]');
        if (!target) target = candidate;
        if (!isVisible(target)) target = candidate;
        var txtMeta = preferredText(target, input, label);
        var text = norm(txtMeta.text || '');
        if (!text || normKey(text) === normKey(label) || text === '1' || text === '2') {
          var imgAlt = norm((target.querySelector && target.querySelector('img') && target.querySelector('img').getAttribute('alt')) || '');
          if (imgAlt) text = imgAlt;
        }
        if (!text || normKey(text) === normKey(label)) return;
        var imageUrl = resolveImageUrlV2(target) || resolveImageUrlV2(candidate) || '';
        var bgColor = bgColorOf(target) || bgColorOf(candidate) || '';
        var optionType = imageUrl ? 'image' : (bgColor ? 'color' : 'text');
        var hasVisual = !!(imageUrl || bgColor || swatchLooksVisualTile(target));
        var needsCapture = !imageUrl && !bgColor && hasVisual;
        if (needsCapture) optionType = 'visual-text';
        options.push(normalizeOptionV2({
          element: candidate,
          captureTarget: target,
          textContent: text,
          value: norm(text || (input && input.value) || ''),
          name: label,
          imageUrl: imageUrl || null,
          bgColor: bgColor || null,
          isSelected: !!(input && input.checked),
          optionType: optionType,
          hasVisual: hasVisual,
          needsCapture: needsCapture,
          groupLabel: label,
          classificationReason: needsCapture ? 'customily-swatch-text-tile' : (imageUrl ? 'customily-image' : (bgColor ? 'customily-color' : txtMeta.debug)),
          captureDecision: needsCapture ? 'capture-required' : 'no-capture'
        }, { sourceKind: 'customily-swatch' }));
      });
      if (!options.length) {
        groupEl.querySelectorAll('.customily-swatch, .swatch').forEach(function(sw) {
          if (!isVisible(sw) || sw === groupEl) return;
          var t = preferredText(sw, null, label);
          var text = norm(t.text || '');
          var imageUrl = resolveImageUrlV2(sw) || '';
          var bgColor = bgColorOf(sw) || '';
          if ((!text || normKey(text) === normKey(label)) && !imageUrl && !bgColor) return;
          if (normKey(text) === normKey(label)) text = '';
          options.push(normalizeOptionV2({ element: sw, captureTarget: sw, textContent: text, value: text, name: label, imageUrl: imageUrl || null, bgColor: bgColor || null, optionType: imageUrl ? 'image' : (bgColor ? 'color' : 'visual-text'), hasVisual: true, needsCapture: !imageUrl && !bgColor, groupLabel: label, classificationReason: 'customily-swatch-fallback' }, { sourceKind: 'customily-swatch' }));
        });
      }
      if (!options.length) {
        scanSelects(groupEl).forEach(function(g) { options = options.concat(g.options); });
      }
      options = options.filter(function(o) { return !(o.textContent && normKey(o.textContent) === normKey(label) && !o.imageUrl); });
      if (options.length) groups.push({ label: label, element: groupEl, rect: rect(groupEl), options: options });
    });
    return groups;
  }

  function scanDOMV2(root, strategies, trace) {
    var all = [];
    var run = Array.isArray(strategies) && strategies.length ? strategies : ['customily', 'select'];
    trace.scanStrategiesRun = run.slice();
    run.forEach(function(s) {
      if (s === 'customily') all = all.concat(scanCustomily(root));
      if (s === 'select') all = all.concat(scanSelects(root));
    });
    trace.groupsBeforeDedup = all.length;
    all = dedupeGroupsV2(all, { root: root });
    trace.groupsAfterDedup = all.length;
    return all;
  }

  async function settle() { await new Promise(function(r){ setTimeout(r, 30); }); }
  function isSafeTrigger(el, root) {
    if (!el || !root || !root.contains(el)) return false;
    var t = norm(((el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || el.textContent || '')).toLowerCase();
    if (/(add to cart|buy now|upload|select image|remove|delete|quantity|payment)/.test(t)) return false;
    return !!el.closest('.customily_option, .customily-swatch, [class*="swatch"]');
  }

  async function snapshotNowV2(ctx, state) {
    var newGroups = scanDOMV2(state.root, state.strategies, state.trace);
    state.groups = dedupeGroupsV2((state.groups || []).concat(newGroups), { root: state.root });
    state.trace.snapshotsCount = (state.trace.snapshotsCount || 0) + 1;
    return newGroups.length;
  }

  async function expandAndSnapshotV2(ctx, opts) {
    var state = { root: opts.root, strategies: opts.strategies, trace: opts.trace, groups: [] };
    await snapshotNowV2(ctx, state);
    var triggers = Array.from(state.root.querySelectorAll('.customily-swatch, .swatch, [class*="swatch"]')).filter(function(el){ return isSafeTrigger(el, state.root); });
    var max = Math.min((opts.maxClicks || 8), triggers.length);
    for (var i = 0; i < max; i++) {
      var tr = triggers[i];
      if (tr && typeof tr.click === 'function') tr.click();
      state.trace.clickedTriggers.push({ index: i, text: norm(tr && tr.textContent), className: String((tr && tr.className) || '') });
      await settle();
      await snapshotNowV2(ctx, state);
    }
    return dedupeGroupsV2(state.groups, { root: state.root });
  }

  async function runAutoV2(ctx, opts) {
    var c = ctx || {};
    var doc = c.document || document;
    var o = opts || {};
    var trace = {
      engine: 'default-v2',
      resolvedProfileId: o.resolvedProfileId || null,
      rootSelectorUsed: o.rootSelector || null,
      scanStrategiesRun: [],
      snapshotsCount: 0,
      clickedTriggers: [],
      groupsBeforeDedup: 0,
      groupsAfterDedup: 0,
      fallbackUsed: false,
      targetGroups: [],
      entrypointId: o.entrypointId || null,
      roadmapGoal: 'Auto returns canonical title groups with origin-aware icon/item/text options',
      roadmapPhase: 'Phase 2 — Implementation phrases',
      roadmapImplementationPhrases: PHASE2_IMPLEMENTATION_PHRASES.slice()
    };
    var root = o.root || (o.rootSelector && doc.querySelector ? doc.querySelector(o.rootSelector) : doc);
    if (!root) {
      trace.fallbackUsed = false;
      trace.failureReason = 'root-not-found';
      window.__STS_LAST_AUTO_TRACE = trace;
      window.__STS_DEBUG_DUMP_AUTO_RESULT = function() { return window.__STS_LAST_AUTO_TRACE; };
      if (doc.documentElement && doc.documentElement.setAttribute) doc.documentElement.setAttribute('data-sts-last-auto-trace', JSON.stringify(trace));
      return { groups: [], trace: trace };
    }
    var groups = await expandAndSnapshotV2(c, { root: root, strategies: o.strategies || ['customily', 'select'], maxClicks: o.maxClicks || 8, trace: trace });
    trace.targetGroups = groups.map(function(g) {
      return {
        groupName: g.label,
        optionCount: (g.options || []).length,
        options: (g.options || []).slice(0, 5).map(function(op) {
          return { imageUrl: op.imageUrl || null, capturedImage: op.capturedImage || null, sourceKind: op.sourceKind || '', optionType: op.optionType || '', optionKind: op.optionKind || '', originalOptionKind: op.originalOptionKind || '', displayKind: op.displayKind || '', visualKind: op.visualKind || '', hasVisual: !!op.hasVisual, needsCapture: !!op.needsCapture, classificationReason: op.classificationReason || '', textContent: op.textContent || '', value: op.value || '', hasImage: !!(op.imageUrl || op.capturedImage) };
        })
      };
    });
    window.__STS_LAST_AUTO_TRACE = trace;
    window.__STS_DEBUG_DUMP_AUTO_RESULT = function() { return window.__STS_LAST_AUTO_TRACE; };
    if (doc.documentElement && doc.documentElement.setAttribute) doc.documentElement.setAttribute('data-sts-last-auto-trace', JSON.stringify(trace));
    return { groups: groups, trace: trace };
  }

  ns.autoDefaultV2 = {
    runAutoV2: runAutoV2,
    scanDOMV2: scanDOMV2,
    expandAndSnapshotV2: expandAndSnapshotV2,
    snapshotNowV2: snapshotNowV2,
    dedupeGroupsV2: dedupeGroupsV2,
    normalizeOptionV2: normalizeOptionV2,
    resolveImageUrlV2: resolveImageUrlV2,
    resolveOriginalOptionKindV2: resolveOriginalOptionKindV2
  };
})();
