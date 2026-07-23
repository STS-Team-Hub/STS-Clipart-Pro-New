(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function getCtx(ctx) {
    if (ctx) return ctx;
    if (ns.profileContext && typeof ns.profileContext.create === 'function') return ns.profileContext.create();
    return { schema: ns.schema || {}, collectors: ns.collectors || {}, state: ns.state || {} };
  }

  function normalizeOption(rawOption, ctx) {
    var c = getCtx(ctx);
    if (c.schema && typeof c.schema.createOption === 'function') return c.schema.createOption(rawOption || {});
    return rawOption || {};
  }

  function normalizeGroup(rawGroup, ctx) {
    var c = getCtx(ctx);
    var group = rawGroup || {};
    if (!Array.isArray(group.options)) group.options = [];
    group.options = group.options.map(function(opt) { return normalizeOption(opt, c); });
    if (c.schema && typeof c.schema.createCategory === 'function') return c.schema.createCategory(group, 0);
    return group;
  }

  function findGenericManualContainerFromTitle(titleEl) {
    if (!titleEl || !titleEl.closest) return null;
    var container = titleEl.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"], .ant-form-item, .product-form__input, fieldset, .tib-field, [class*="tib-option"], [class*="option-group"], [class*="option-wrap"], [class*="personalization-option"], .form-group, .product-option, [class*="product-option"]');
    if (container) return container;

    var el = titleEl.parentElement;
    for (var depth = 0; depth < 10 && el && el !== document.body; depth++) {
      var swatches = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="swatch-item"], [class*="option-item"]').length;
      var images = el.querySelectorAll('img').length;
      if ((swatches >= 2 && swatches <= 80) || (images >= 2 && images <= 80)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function truncOuter(el) {
    var html = (el && el.outerHTML) ? String(el.outerHTML) : '';
    return html.length > 200 ? html.slice(0, 200) + '…' : html;
  }

  function findManualOptionRegionFromTitle(titleEl) {
    if (!titleEl || !titleEl.parentElement) return null;
    var titleParent = titleEl.parentElement;
    var groupTitleSelector = '.sts-highlight-title, .group-title, .ant-form-item-label label, .by-customization-form__label, [class*="form__label"], [class*="option-label"], [class*="field-label"], .tib-label, label, legend, h3, h4, h5, strong';
    var optionLikeSelector = '.options, [class*="options"], button, input[type="radio"], input[type="checkbox"], select, img, [class*="swatch"], [class*="option-item"], [class*="tib-item"], [style*="background-image"], [style*="background-color"]';
    var optionControlLikeSelector = '.ant-radio-button-wrapper, .ant-radio-wrapper, .ant-segmented-item, .ant-segmented-item-label, button, input[type="radio"], input[type="checkbox"], [role="button"], [role="radio"], [role="option"], [data-value], [data-label], [data-title], [class*="radio-button"], [class*="radio-wrapper"], [class*="option"], [class*="choice"], [class*="variant"], [class*="value"], [class*="swatch"]';

    function safeText(el) {
      return String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
    }

    function isOptionControlLike(el) {
      if (!el || !el.matches) return false;
      if (el.matches(optionControlLikeSelector)) return true;
      var role = el.getAttribute ? String(el.getAttribute('role') || '').toLowerCase() : '';
      if (role === 'button' || role === 'radio' || role === 'option') return true;
      var className = String(el.className || '').toLowerCase();
      if (/(radio-button|radio-wrapper|option|choice|variant|value|swatch)/.test(className)) return true;
      if (el.querySelector && el.querySelector('img, button, input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], [data-value], [data-label], [data-title], [class*="option"], [class*="swatch"]')) return true;
      return false;
    }

    function isNextGroupTitle(el) {
      if (!el || el === titleEl) return false;
      if (isOptionControlLike(el)) return false;
      if (el.matches && el.matches('.sts-highlight-title, .group-title')) return true;
      if (!el.matches || !el.matches(groupTitleSelector)) return false;
      if (el.querySelector && el.querySelector(optionLikeSelector)) return false;
      return true;
    }

    var elements = [];
    var boundaryNode = null;
    var inspected = 0;
    var startNode = titleParent.nextElementSibling;
    var cursor = startNode;
    while (cursor) {
      inspected++;
      var firstChildBoundary = !!(cursor.firstElementChild && isNextGroupTitle(cursor.firstElementChild));
      var boundary = isNextGroupTitle(cursor) || firstChildBoundary;
      if (window.__STS_CLIPART_DEBUG_MANUAL_PICK && inspected <= 5) {
        console.log('[STS ManualPick Debug] sibling probe:', {
          idx: inspected,
          tag: cursor.tagName,
          className: cursor.className || '',
          role: cursor.getAttribute ? (cursor.getAttribute('role') || '') : '',
          text: safeText(cursor).slice(0, 120),
          dataValue: cursor.getAttribute ? (cursor.getAttribute('data-value') || '') : '',
          dataLabel: cursor.getAttribute ? (cursor.getAttribute('data-label') || '') : '',
          dataTitle: cursor.getAttribute ? (cursor.getAttribute('data-title') || '') : '',
          optionControlLike: isOptionControlLike(cursor),
          isNextGroupTitle: !!boundary
        });
      }
      if (boundary) { boundaryNode = cursor; break; }
      elements.push(cursor);
      cursor = cursor.nextElementSibling;
    }

    if (!elements.length) {
      startNode = titleEl.nextElementSibling;
      cursor = startNode;
      while (cursor) {
        inspected++;
        var inlineBoundary = isNextGroupTitle(cursor);
        if (window.__STS_CLIPART_DEBUG_MANUAL_PICK && inspected <= 5) {
          console.log('[STS ManualPick Debug] inline sibling probe:', {
            idx: inspected,
            tag: cursor.tagName,
            className: cursor.className || '',
            role: cursor.getAttribute ? (cursor.getAttribute('role') || '') : '',
            text: safeText(cursor).slice(0, 120),
            dataValue: cursor.getAttribute ? (cursor.getAttribute('data-value') || '') : '',
            dataLabel: cursor.getAttribute ? (cursor.getAttribute('data-label') || '') : '',
            dataTitle: cursor.getAttribute ? (cursor.getAttribute('data-title') || '') : '',
            optionControlLike: isOptionControlLike(cursor),
            isNextGroupTitle: !!inlineBoundary
          });
        }
        if (inlineBoundary) { boundaryNode = cursor; break; }
        elements.push(cursor);
        cursor = cursor.nextElementSibling;
      }
    }

    return { elements: elements, startNode: startNode || null, boundaryNode: boundaryNode || null, siblingsInspected: inspected, isLiveRange: true, regionType: 'live-range', usedClone: false, usedMovedNodes: false, debugTitleHtml: truncOuter(titleEl), debugParentHtml: truncOuter(titleParent) };
  }

  function collectOptionsInElements(elements, ctx) {
    var c = getCtx(ctx);
    var out = [];
    var seen = new Set();
    (elements || []).forEach(function(el) {
      if (!el || !c.collectors || typeof c.collectors.collectOptionsInContainer !== 'function') return;
      var collected = c.collectors.collectOptionsInContainer(el) || [];
      collected.forEach(function(opt) {
        var key = [String(opt.textContent||''), String(opt.value||''), String(opt.name||''), String(opt.imageUrl||opt.capturedImage||''), String(opt.bgColor||'')].join('|').trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(opt);
      });
    });
    return out;
  }

  var defaultProfile = {
    id: 'default',
    name: 'Default Generic Profile',
    isDefault: true,
    hosts: ['*'],
    detect: function() { return true; },
    scanPage: function() { return []; },
    scanVisibleState: function() { return []; },
    scanManualGroupFromTitle: function(titleEl, ctx) {
      var c = getCtx(ctx);
      var title = c.schema && typeof c.schema.normalizeText === 'function'
        ? c.schema.normalizeText(titleEl && titleEl.textContent)
        : String((titleEl && titleEl.textContent) || '').trim();
      var options = [];
      var rangeRegion = findManualOptionRegionFromTitle(titleEl, c);
      if (rangeRegion && rangeRegion.isLiveRange) {
        options = collectOptionsInElements(rangeRegion.elements, c);
      }
      if (!options.length) {
        var container = findGenericManualContainerFromTitle(titleEl);
        options = container && c.collectors && typeof c.collectors.collectOptionsInContainer === 'function'
          ? (c.collectors.collectOptionsInContainer(container) || [])
          : [];
      }
      if (window.__STS_CLIPART_DEBUG_MANUAL_PICK) {
        console.log('[STS ManualPick Debug] range start node:', rangeRegion && rangeRegion.startNode ? rangeRegion.startNode.tagName : null, 'siblings inspected count:', rangeRegion && rangeRegion.siblingsInspected || 0, 'boundary detected:', !!(rangeRegion && rangeRegion.boundaryNode), 'region type:', rangeRegion && rangeRegion.regionType || 'none', 'collector raw count:', Array.isArray(options) ? options.length : 0, 'sample raw option objects:', (options || []).slice(0, 3));
      }
      return { name: title || 'Manual Group', options: options };
    },
    collectOptionsInContainer: function(containerEl, ctx) {
      var c = getCtx(ctx);
      if (c.collectors && typeof c.collectors.collectOptionsInContainer === 'function') {
        return c.collectors.collectOptionsInContainer(containerEl);
      }
      return [];
    },
    collectOptionsInRegion: function(region, ctx) {
      var c = getCtx(ctx);
      if (c.collectors && typeof c.collectors.collectOptionsInRegion === 'function') {
        return c.collectors.collectOptionsInRegion(region);
      }
      return [];
    },
    detectNearestGroupTitleFromOption: function(optionEl, ctx) {
      var c = getCtx(ctx);
      if (c.collectors && typeof c.collectors.detectNearestGroupTitleFromOption === 'function') {
        return c.collectors.detectNearestGroupTitleFromOption(optionEl);
      }
      return '';
    },
    normalizeGroup: normalizeGroup,
    normalizeOption: normalizeOption
  };

  if (ns.profiles && typeof ns.profiles.register === 'function') {
    ns.profiles.register(defaultProfile);
  }
})();
