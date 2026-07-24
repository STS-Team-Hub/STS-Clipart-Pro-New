(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanText(v) {
    return norm(v)
      .replace(/^\s*Option\s+\d+\s+of\s+\d+\s*/i, ' ')
      .replace(/\(\s*\d+\s*\|\s*\d+\s*\)/g, ' ')
      .replace(/\bRequired\b/ig, ' ')
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function hostMatch(host) {
    var h = String(host || '').toLowerCase();
    return h === 'macorner.co' || h.endsWith('.macorner.co');
  }
  function getRoot(doc) {
    if (!doc || !doc.querySelector) return null;
    var root = doc.querySelector('#customily-options');
    if (!root || !root.querySelector || !root.querySelector('.customily_option')) return null;
    return root;
  }
  function titleSignalAllows(root) {
    if (!root || !root.querySelector) return true;
    var t = root.querySelector('.title-customize');
    if (!t) return true;
    var txt = norm(t.textContent).toLowerCase();
    if (!txt) return true;
    if (/(personalized|personalised|custom|customize|customise|personalization|personalisation)/.test(txt)) return true;
    return false;
  }

  function getAccordionToggle(groupEl) {
    if (!groupEl || !groupEl.querySelector) return null;
    return groupEl.querySelector('label[role="tab"], [role="tab"], label[aria-controls]') || null;
  }
  function isUnsafeTitle(label) {
    return /\b(add to cart|buy now|checkout|upload|delete|remove|quantity|qty|cart|payment|pay now|submit order)\b/i.test(String(label || ''));
  }

  function extractGroupLabel(groupEl) {
    var titleEl = groupEl && groupEl.querySelector ? groupEl.querySelector('.option_name') : null;
    return cleanText(titleEl && titleEl.textContent);
  }
  function isPlaceholder(text, value) {
    var t = norm(text).toLowerCase();
    var v = norm(value).toLowerCase();
    return !t && !v || /^(select|choose|please select|pick one|--)/.test(t) || /^(select|choose|please select|pick one|--)/.test(v);
  }
  function swatchColor(el) {
    if (!el) return null;
    var inline = String((el.getAttribute && el.getAttribute('style')) || '');
    var m = inline.match(/background(?:-color)?:\s*([^;]+)/i);
    if (m && m[1]) return norm(m[1]);
    try {
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      var c = cs && cs.backgroundColor;
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') return c;
    } catch (e) {}
    return null;
  }
  function extractOptions(groupEl, groupLabel) {
    var out = [];
    var radios = Array.from(groupEl.querySelectorAll('input[type="radio"]'));
    radios.forEach(function(input) {
      var sw = (input.closest && (input.closest('.customily-swatch') || input.closest('.swatch-container') || input.closest('[class*="swatch"]'))) || input.parentElement;
      var label = null;
      var id = input.getAttribute && input.getAttribute('id');
      if (id) label = groupEl.querySelector('label[for="' + id + '"]');
      if (!label) label = input.nextElementSibling && String(input.nextElementSibling.tagName || '').toUpperCase() === 'LABEL' ? input.nextElementSibling : null;
      if (!label && sw && sw.querySelector) label = sw.querySelector('label');
      if (!label) label = sw || input;
      var img = label && label.querySelector ? label.querySelector('img') : null;
      var imageUrl = img ? (img.currentSrc || img.src || img.getAttribute('src') || '') : '';
      var text = cleanText((img && img.getAttribute('alt')) || (label && label.textContent) || input.value || '');
      var value = cleanText(input.value || text || '');
      var bgColor = imageUrl ? null : (swatchColor(label) || swatchColor(sw));
      if (!text && !value && !imageUrl && !bgColor) return;
      out.push({
        label: text || value || groupLabel || '',
        textContent: text || value || '',
        value: value || text || '',
        name: cleanText(input.getAttribute('name') || groupLabel || ''),
        imageUrl: imageUrl || null,
        capturedImage: imageUrl || null,
        bgColor: bgColor || null,
        optionType: imageUrl ? 'image' : (bgColor ? 'color' : 'text'),
        sourceKind: 'customily-swatch',
        hasVisual: !!(imageUrl || bgColor),
        needsCapture: false
      });
    });

    Array.from(groupEl.querySelectorAll('select')).forEach(function(selectEl) {
      var selName = cleanText(selectEl.getAttribute('name') || groupLabel || '');
      Array.from(selectEl.querySelectorAll('option')).forEach(function(opt) {
        if (!opt || opt.disabled) return;
        var text = cleanText(opt.textContent);
        var value = cleanText(opt.value || text);
        if (isPlaceholder(text, value)) return;
        out.push({
          label: text || value || selName || '',
          textContent: text || value || '',
          value: value || text || '',
          name: selName,
          imageUrl: null,
          capturedImage: null,
          bgColor: null,
          optionType: 'text',
          sourceKind: 'select',
          hasVisual: false,
          needsCapture: false
        });
      });
    });

    Array.from(groupEl.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])')).forEach(function(inputEl) {
      var inputType = String((inputEl.getAttribute('type') || 'text')).toLowerCase();
      var name = cleanText(inputEl.getAttribute('name') || '');
      var placeholder = cleanText(inputEl.getAttribute('placeholder') || '');
      var maxlength = inputEl.getAttribute('maxlength');
      var nearLabelEl = inputEl.closest && inputEl.closest('.cl-option-content, .customily_option') ? inputEl.closest('.cl-option-content, .customily_option').querySelector('label') : null;
      var fieldLabel = cleanText((nearLabelEl && nearLabelEl.textContent) || groupLabel || name || placeholder || 'Text');
      out.push({
        label: fieldLabel,
        textContent: fieldLabel,
        value: '',
        name: name || groupLabel || '',
        imageUrl: null,
        capturedImage: null,
        bgColor: null,
        optionType: 'text',
        sourceKind: 'text-input',
        hasVisual: false,
        needsCapture: false,
        placeholder: placeholder || '',
        maxlength: maxlength != null ? String(maxlength) : '',
        inputType: inputType
      });
    });

    return out;
  }

  var profile = {
    id: 'macorner-customily',
    name: 'Macorner Customily Profile',
    hosts: ['macorner.co', '*.macorner.co'],
    detect: function(ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      var loc = c.location || window.location;
      if (!hostMatch(loc && loc.hostname)) return false;
      var root = getRoot(doc);
      if (!root) return false;
      return titleSignalAllows(root);
    },
    scanPage: async function(ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      var root = getRoot(doc);
      if (!root) return [];
      var v2 = ns.autoDefaultV2;
      if (v2 && typeof v2.runAutoV2 === 'function') {
        var result = await v2.runAutoV2({ document: doc, window: c.window || window, location: c.location || window.location }, {
          rootSelector: '#customily-options',
          resolvedProfileId: 'macorner-customily',
          strategies: ['customily', 'select'],
          maxClicks: 8,
          entrypointId: c.entrypointId || null
        });
        var groups = (result && result.groups) || [];
        groups.forEach(function(g) {
          if (!g || !g.element || !g.element.querySelectorAll) return;
          var extra = extractOptions(g.element, cleanText(g.label || ''))
            .filter(function(o) { return o.sourceKind === 'text-input'; });
          g.options = (g.options || []).concat(extra);
        });
        return groups.map(function(g, idx) {
          var sortId = g && g.element && g.element.getAttribute ? g.element.getAttribute('sort-id') : null;
          var optId = g && g.element && g.element.getAttribute ? g.element.getAttribute('opt-id') : null;
          g.label = cleanText(g.label || '');
          g.name = g.label;
          g.sortId = sortId;
          g.optId = optId;
          g.__domIndex = idx;
          return g;
        }).sort(function(a, b) {
          var sa = parseInt(a.sortId, 10); var sb = parseInt(b.sortId, 10);
          var va = isFinite(sa); var vb = isFinite(sb);
          if (va && vb && sa !== sb) return sa - sb;
          if (va && !vb) return -1;
          if (!va && vb) return 1;
          return (a.__domIndex || 0) - (b.__domIndex || 0);
        });
      }
      return [];
    },
    scanManualGroupFromTitle: function(titleEl, ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      var root = getRoot(doc);
      if (!root || !titleEl || !titleEl.closest) {
        window.__STS_LAST_MANUAL_TRACE_REASON = 'outside-macorner-customily-root';
        return { name: 'Manual Group', options: [] };
      }
      var groupEl = titleEl.closest('.customily_option');
      if (!groupEl || !root.contains(groupEl)) {
        window.__STS_LAST_MANUAL_TRACE_REASON = 'outside-macorner-customily-root';
        return { name: 'Manual Group', options: [] };
      }
      var name = extractGroupLabel(groupEl) || 'Manual Group';
      return { name: name, options: extractOptions(groupEl, name), traceReason: '' };
    },
    getRoot: function(doc) {
      var d = doc || document;
      var root = getRoot(d);
      if (!root) return null;
      if (!root.querySelector || !root.querySelector('.customily_option')) return null;
      return root;
    },
    getGroups: function(root) {
      if (!root || !root.querySelectorAll) return [];
      return Array.from(root.querySelectorAll('.customily_option'));
    },
    getTitleElement: function(groupEl) {
      if (!groupEl || !groupEl.querySelector) return null;
      return groupEl.querySelector('.option_name');
    },
    cleanupTitle: function(text) {
      return cleanText(text || '');
    },
    getManualDrivenAutoTitleCandidates: function(ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      var root = getRoot(doc);
      if (!root) return [];
      return this.getGroups(root).map(function(groupEl) {
        var titleEl = profile.getTitleElement(groupEl);
        var label = extractGroupLabel(groupEl);
        if (!titleEl || !label || isUnsafeTitle(label)) return null;
        return {
          titleEl: titleEl,
          groupEl: groupEl,
          expandEl: getAccordionToggle(groupEl) || titleEl,
          label: label,
          source: 'macorner-customily-profile'
        };
      }).filter(Boolean).sort(function(a, b) {
        var sa = parseInt(a.groupEl && a.groupEl.getAttribute && a.groupEl.getAttribute('sort-id'), 10);
        var sb = parseInt(b.groupEl && b.groupEl.getAttribute && b.groupEl.getAttribute('sort-id'), 10);
        var va = isFinite(sa); var vb = isFinite(sb);
        if (va && vb && sa !== sb) return sa - sb;
        if (va && !vb) return -1;
        if (!va && vb) return 1;
        return 0;
      });
    },
    getAutoExpandTarget: function(titleEl) {
      var groupEl = titleEl && titleEl.closest ? titleEl.closest('.customily_option') : null;
      return getAccordionToggle(groupEl) || titleEl;
    },
    manualDrivenAutoWaitMs: 160,
    scanHints: { source: 'customily', phase3CustomilyRollout: true, phase4CustomilyRollout: true, phase5CustomilyRollout: true, preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true, supportsFileInputs: true, manualDrivenAutoPreferred: true },
    isValidGroup: function(groupEl) {
      if (!groupEl || !groupEl.querySelector || !groupEl.closest) return false;
      var root = groupEl.closest('#customily-options');
      if (!root) return false;
      return !!groupEl.querySelector('.option_name');
    }
  };

  if (ns.profiles && typeof ns.profiles.register === 'function') {
    ns.profiles.register(profile);
  }
})();
