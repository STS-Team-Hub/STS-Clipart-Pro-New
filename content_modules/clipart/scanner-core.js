

// ============================================================
// CLIPART SCANNER MODULE — STS Clipart Pro 8.3 v2.0
// Quét DOM trang sản phẩm, detect clipart options,
// capture screenshot, đánh label, sync về STS Clipart Pro 8.3
// ============================================================
(function() {
  'use strict';
  try {
  var STS_CLIPART_BUILD = '8.3.0';
  if (document && document.documentElement) {
    document.documentElement.setAttribute('data-sts-clipart-build', STS_CLIPART_BUILD);
  }
  console.log('[STS BUILD] scanner-core loaded ' + STS_CLIPART_BUILD);

  function stsEscAttr(value) {
    if (window.STSClipartScanner && window.STSClipartScanner.render && typeof window.STSClipartScanner.render.stsEscAttr === 'function') {
      return window.STSClipartScanner.render.stsEscAttr(value);
    }
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function stsUiIcon(name, size, color) {
    if (window.STSClipartScanner && window.STSClipartScanner.render && typeof window.STSClipartScanner.render.stsUiIcon === 'function') {
      return window.STSClipartScanner.render.stsUiIcon(name, size, color);
    }
    var s = size || 16;
    var c = color || 'currentColor';
    var common = 'fill="none" stroke="' + c + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
    var body = '';
    switch (name) {
      case 'sync':
        body = '<path d="M20 11a8 8 0 0 0-14.4-4.7"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.4 4.7"/><path d="M20 20v-5h-5"/>';
        break;
      case 'render':
        body = '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M7 15l2.6-2.6a1.5 1.5 0 0 1 2.1 0l1.3 1.3"/><path d="M12.8 14.1l1.5-1.5a1.5 1.5 0 0 1 2.1 0L19 15.2"/><circle cx="9" cy="9" r="1.2"/>';
        break;
      case 'all':
        body = '<rect x="4" y="4" width="5" height="5" rx="1.2"/><rect x="4" y="15" width="5" height="5" rx="1.2"/><rect x="15" y="4" width="5" height="5" rx="1.2"/><path d="M17.5 13v8"/><path d="M13.5 17h8"/>';
        break;
      case 'reset':
        body = '<path d="M9 7 5 11l4 4"/><path d="M5 11h9a5 5 0 1 1 0 10h-1"/>';
        break;
      case 'pick':
        body = '<path d="M7 4l9 9"/><path d="M7 4l2.3 11.1 2.6-5.7 5.7-2.6z"/><circle cx="18" cy="18" r="2.5"/>';
        break;
      case 'number':
        body = '<path d="M9 4L7 20"/><path d="M16 4l-2 16"/><path d="M5 9h14"/><path d="M4 15h14"/>';
        break;
      case 'camera':
        body = '<path d="M5 8h3l1.4-2h5.2L16 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.2"/>';
        break;
      case 'manual':
        body = '<path d="M12 21V10"/><path d="M8.5 12V7.8a1.4 1.4 0 1 1 2.8 0V11"/><path d="M14.7 11V7.4a1.4 1.4 0 1 1 2.8 0v6.3"/><path d="M12 11V6.8a1.4 1.4 0 1 1 2.8 0V11"/><path d="M8.4 12.2 7 10.8a1.5 1.5 0 0 0-2.1 2.1l2.9 2.9A4 4 0 0 0 10.7 17H16"/>';
        break;
      case 'append':
        body = '<rect x="4" y="5" width="11" height="11" rx="2"/><path d="M9 10h10"/><path d="M14 5v10"/><path d="M8 19h7"/>';
        break;
      case 'scan':
        body = '<path d="M8 5H6.8A1.8 1.8 0 0 0 5 6.8V8"/><path d="M16 5h1.2A1.8 1.8 0 0 1 19 6.8V8"/><path d="M8 19H6.8A1.8 1.8 0 0 1 5 17.2V16"/><path d="M16 19h1.2a1.8 1.8 0 0 0 1.8-1.8V16"/><rect x="8.3" y="8.3" width="7.4" height="7.4" rx="1.8"/><path d="M18.1 5.1v1.6"/><path d="M17.3 5.9h1.6"/>';
        break;
      case 'logo':
        return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true">' +
          '<rect x="2" y="2" width="20" height="20" rx="5.25" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>' +
          '<path d="M6 9V6.8C6 6.36 6.36 6 6.8 6H9" fill="none" stroke="#60A5FA" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M15 6H17.2C17.64 6 18 6.36 18 6.8V9" fill="none" stroke="#60A5FA" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M9 18H6.8C6.36 18 6 17.64 6 17.2V15" fill="none" stroke="#2563EB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M18 15V17.2C18 17.64 17.64 18 17.2 18H15" fill="none" stroke="#2563EB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<rect x="8" y="7.5" width="6.6" height="6.6" rx="1.6" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.6"/>' +
          '<rect x="10.4" y="9.9" width="6.6" height="6.6" rx="1.6" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.6"/>' +
          '<path d="M18.4 4.8v1.6M17.6 5.6h1.6" stroke="#60A5FA" stroke-width="1.4" stroke-linecap="round"/>' +
          '</svg>';
      default:
        body = '<circle cx="12" cy="12" r="8"/>';
    }
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + common + '>' + body + '</svg>';
  }

  function stsButtonHtml(iconName, label, iconColor) {
    if (window.STSClipartScanner && window.STSClipartScanner.render && typeof window.STSClipartScanner.render.stsButtonHtml === 'function') {
      return window.STSClipartScanner.render.stsButtonHtml(iconName, label, iconColor);
    }
    return '<span style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-width:0;white-space:nowrap;line-height:1.1;">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:0 0 20px;line-height:1;">' +
      stsUiIcon(iconName, 18, iconColor || 'currentColor') +
      '</span><span style="display:block;max-width:100%;font-size:10px;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + stsEscAttr(label) + '</span></span>';
  }

  const CLIPART = {
    isScanning: false,
    categories: [],
    capturedData: null,
  };
  window.__STS_DEBUG_DUMP_PANEL_DATA = function() { return CLIPART.capturedData; };
  var _panelVisibilityListeners = [];

  function isClipartPanelOpen() {
    return !!document.getElementById('sts-clip-panel');
  }

  function notifyClipartPanelVisibility(isVisible) {
    _panelVisibilityListeners.slice().forEach(function(cb) {
      try { cb(!!isVisible); } catch (e) {}
    });
  }

  function onClipartPanelVisibilityChange(callback) {
    if (typeof callback !== 'function') return function() {};
    _panelVisibilityListeners.push(callback);
    return function() {
      _panelVisibilityListeners = _panelVisibilityListeners.filter(function(fn) { return fn !== callback; });
    };
  }

  // ---- Label mapping ----
  const LABEL_MAP = {
    'age': 'I', 'age range': 'I',
    'skin': 'J', 'skin tone': 'J', 'skin color': 'J',
    'eye': 'K', 'eyes': 'K', 'eye color': 'K', 'eyes color': 'K',
    'hair color': 'L',
    'hair style': 'M', 'hair': 'M', 'hairstyle': 'M',
    'beard color': 'N',
    'beard style': 'O', 'beard': 'O',
    'outfit': 'P', 'shirt': 'P', 'top': 'P', 'clothing': 'P',
    'outfit style': 'PS',
    'pants': 'Q', 'bottom': 'Q',
    'glasses': 'R', 'eyewear': 'R',
    'shoes': 'S', 'footwear': 'S',
    'accessory': 'T', 'accessories': 'T',
    'hat': 'U', 'headwear': 'U',
    't-shirt': 'P', 'tshirt': 'P',
    'background color': 'BG', 'title': 'TT',
    'color': 'C', 'background': 'BG', 'frame': 'FR',
    'pet': 'PT', 'dog': 'DG', 'cat': 'CT',
  };

  function autoPrefix(label) {
    // v3.0.4: Use single letters A, B, C... Z, AA, AB... instead of abbreviations
    // This is just a fallback — actual prefix is assigned sequentially in scan
    return 'A';
  }

  // v3.0.4: Generate sequential prefix letter(s): A, B, C... Z, AA, AB...
  function sequentialPrefix(index) {
    if (window.STSLabelExtraction && window.STSLabelExtraction.sequentialPrefix) {
      return window.STSLabelExtraction.sequentialPrefix(index);
    }
    if (index < 26) return String.fromCharCode(65 + index); // A-Z
    const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    const second = String.fromCharCode(65 + (index % 26));
    return first + second; // AA, AB... AZ, BA...
  }


  function rectData(el) {
    if (window.STSClipartScanner && window.STSClipartScanner.utils && typeof window.STSClipartScanner.utils.rectData === 'function') {
      return window.STSClipartScanner.utils.rectData(el);
    }
    try {
      var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r) return { x: 0, y: 0, w: 0, h: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
      return { x: r.x || 0, y: r.y || 0, w: r.width || 0, h: r.height || 0, top: r.top || 0, left: r.left || 0, right: r.right || 0, bottom: r.bottom || 0, width: r.width || 0, height: r.height || 0 };
    } catch(e) {
      return { x: 0, y: 0, w: 0, h: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
  }

  function normScanText(v) {
    if (window.STSClipartScanner && window.STSClipartScanner.utils && typeof window.STSClipartScanner.utils.normScanText === 'function') {
      return window.STSClipartScanner.utils.normScanText(v);
    }
    if (window.STSLabelExtraction && window.STSLabelExtraction.normScanText) {
      return window.STSLabelExtraction.normScanText(v);
    }
    return String(v || '').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
  }

  function cssEscapeSafe(v) {
    if (window.STSClipartScanner && window.STSClipartScanner.utils && typeof window.STSClipartScanner.utils.cssEscapeSafe === 'function') {
      return window.STSClipartScanner.utils.cssEscapeSafe(v);
    }
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(v || ''));
    } catch(e) {}
    return String(v || '').replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
  }

  function isVisibleForScan(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (!r || (r.width < 1 && r.height < 1)) return false;
    try {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
    } catch(e) {}
    return true;
  }

  function isInPersonalizationScope(el) {
    if (!el || !el.closest) return false;
    return !!el.closest('.ctm-artwork-personalized-form, .ant-form, .product-form, form.personalization-form, .personalization-form, .by-customization-form, [class*="customizer-form"], [class*="personalization"], [class*="personalize"], .tib-container, [class*="tib-personalization"], [class*="product-customizer"], .product__info-container form, .product-single__form, .product__info, .product__info-wrapper, main');
  }

  function isChromeLikeLabel(label) {
    var t = normScanText(label).toLowerCase();
    if (!t) return true;
    return /^(search|sort|filter|currency|country|language|newsletter|email|quantity|shipping|delivery|tracking|track order)$/.test(t);
  }

  function groupFieldRoot(el) {
    if (!el || !el.closest) return null;
    return el.closest('.ant-form-item, .form-group, .product-form__input, fieldset, .by-customization-form__element, .by-customization-form_element, [class*="form__element"], [class*="personalization"], .product__info-block, .product__info-item') || el.parentElement || null;
  }

  function fieldHasImageSwatches(el) {
    var root = groupFieldRoot(el);
    if (!root || !root.querySelectorAll) return false;
    if (root.querySelectorAll('.swatch-container img, img.image-item, .customall-grid img').length >= 2) return true;
    if (root.querySelectorAll('[style*="background-color"], [class*="swatch"]').length >= 3) return true;
    return false;
  }

  function extractLabelFromControl(control) {
    if (!control) return '';
    var label = '';
    var id = control.id || '';
    var innerInput = control.querySelector ? control.querySelector('input[id], button[id], [role="combobox"][id]') : null;
    var lookupIds = [];
    if (id) lookupIds.push(id);
    if (innerInput && innerInput.id) lookupIds.push(innerInput.id);

    for (var li = 0; li < lookupIds.length && !label; li++) {
      var forEl = document.querySelector('label[for="' + cssEscapeSafe(lookupIds[li]) + '"]');
      if (forEl) label = normScanText(forEl.getAttribute('title') || forEl.textContent);
    }

    if (!label) {
      var labelledBy = (control.getAttribute && (control.getAttribute('aria-labelledby') || control.getAttribute('aria-describedby'))) || '';
      if (labelledBy && document.getElementById) {
        var ids = labelledBy.split(/\s+/).filter(Boolean);
        var parts = [];
        ids.forEach(function(refId) {
          var node = document.getElementById(refId);
          if (node && node !== control) {
            var txt = normScanText(node.textContent || (node.getAttribute ? (node.getAttribute('title') || '') : ''));
            if (txt) parts.push(txt);
          }
        });
        if (parts.length) label = normScanText(parts.join(' '));
      }
    }

    if (!label) {
      var field = groupFieldRoot(control);
      if (field) {
        var lEl = field.querySelector('.ant-form-item-label label, .by-customization-form__label, .by-customization-form label, label, legend, strong, h4, h5, [class*="form__label"], [class*="option-label"]');
        if (lEl) label = normScanText(lEl.getAttribute('title') || lEl.textContent);
      }
    }

    if (!label) {
      var prev = control.previousElementSibling;
      if (prev && ['LABEL','SPAN','STRONG','H4','H5'].indexOf(prev.tagName) >= 0) label = normScanText(prev.getAttribute('title') || prev.textContent);
    }

    if (!label && control.closest) {
      var parentLabel = control.closest('label');
      if (parentLabel) {
        var clone = parentLabel.cloneNode(true);
        var kill = clone.querySelector('select, input, button, [role="combobox"]');
        if (kill) kill.remove();
        label = normScanText(clone.textContent);
      }
    }

    if (!label) label = normScanText((control.getAttribute && (control.getAttribute('aria-label') || control.getAttribute('title') || control.getAttribute('name'))) || '');
    if (!label || label.length > 120 || isChromeLikeLabel(label)) return '';
    return label;
  }

  function normalizeDropdownControl(el) {
    if (!el || !el.closest) return el || null;
    if (el.tagName === 'SELECT') return el;
    var ant = el.closest('.ant-select');
    if (ant) return ant;
    var reactCtrl = el.closest('.react-select__control, [class*="react-select"][class*="-control"], [class*="select__control"]');
    if (reactCtrl) return reactCtrl;
    var combo = el.closest('[role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"][aria-expanded]');
    if (combo) return combo;
    return el;
  }

  function collectCustomDropdownControls() {
    if (window.STSDropdownDetection && window.STSDropdownDetection.collectCustomDropdownControls) {
      return window.STSDropdownDetection.collectCustomDropdownControls();
    }
    var raw = document.querySelectorAll(
      '.ant-select, input[role="combobox"], [role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"][aria-expanded], input[aria-controls][aria-expanded], input[aria-controls][role="combobox"], .react-select__control, [class*="react-select"][class*="-control"], [class*="select__control"]'
    );
    var seen = new Set();
    var out = [];
    raw.forEach(function(node) {
      var ctrl = normalizeDropdownControl(node);
      if (!ctrl || ctrl.tagName === 'SELECT' || seen.has(ctrl)) return;
      seen.add(ctrl);
      out.push(ctrl);
    });
    return out;
  }

  function getDropdownInput(control) {
    if (!control || !control.querySelector) return null;
    return control.querySelector('input[role="combobox"], input[aria-controls], .ant-select-selection-search-input') || null;
  }

  function getDropdownTrigger(control) {
    if (!control) return null;
    if (control.matches && control.matches('button, [role="combobox"], .react-select__control, [class*="react-select"][class*="-control"], [class*="select__control"]')) return control;
    if (control.querySelector) {
      return control.querySelector('.ant-select-selector, .react-select__control, [class*="react-select"][class*="-control"], [class*="select__control"], button[aria-haspopup="listbox"], [role="combobox"]') || control;
    }
    return control;
  }

  function dropdownExpanded(control) {
    if (!control) return false;
    if (control.classList && (control.classList.contains('ant-select-open') || control.classList.contains('react-select__control--menu-is-open'))) return true;
    if (control.getAttribute && control.getAttribute('aria-expanded') === 'true') return true;
    var input = getDropdownInput(control);
    return !!(input && input.getAttribute('aria-expanded') === 'true');
  }

  function dropdownListId(control) {
    if (!control) return '';
    if (control.getAttribute) {
      var direct = control.getAttribute('aria-controls') || control.getAttribute('aria-owns');
      if (direct) return direct;
    }
    var input = getDropdownInput(control);
    if (input) return input.getAttribute('aria-controls') || input.getAttribute('aria-owns') || '';
    return '';
  }

  function getPopupFromListId(listId) {
    if (!listId) return null;
    var node = document.getElementById(listId) || document.querySelector('#' + cssEscapeSafe(listId));
    if (!node) {
      node = document.querySelector('[id^="' + cssEscapeSafe(listId) + '"]');
    }
    if (!node) return null;
    return node.closest ? (node.closest('[role="listbox"], .ant-select-dropdown, .react-select-dropdown, .react-select__menu, .react-select__menu-list, .react-select__menu-portal, [data-radix-popper-content-wrapper], [data-radix-select-content], [id$="-listbox"]') || node) : node;
  }

  function listIdMatchesPopup(listId, popup) {
    if (!listId || !popup || !popup.querySelector) return false;
    if ((popup.id || '') === listId) return true;
    if (popup.querySelector('#' + cssEscapeSafe(listId))) return true;
    if (popup.querySelector('[id^="' + cssEscapeSafe(listId) + '"]')) return true;
    return false;
  }

  function getVisibleDropdownPopups() {
    return Array.from(document.querySelectorAll('.ant-select-dropdown, .react-select-dropdown, .react-select__menu, .react-select__menu-list, .react-select__menu-portal, [role="listbox"], [id$="-listbox"], [data-radix-popper-content-wrapper], [data-radix-select-content]'))
      .filter(isVisibleForScan);
  }

  function popupRectDistance(control, popup) {
    try {
      var cr = rectData(control);
      var pr = rectData(popup);
      if (!cr || !pr) return Number.MAX_SAFE_INTEGER;
      var cx = (cr.x || 0) + (cr.w || 0) / 2;
      var cy = (cr.y || 0) + (cr.h || 0) / 2;
      var px = (pr.x || 0) + (pr.w || 0) / 2;
      var py = (pr.y || 0) + (pr.h || 0) / 2;
      var dx = cx - px;
      var dy = cy - py;
      return Math.sqrt(dx * dx + dy * dy);
    } catch(e) {
      return Number.MAX_SAFE_INTEGER;
    }
  }

  function countPopupOptions(popup) {
    if (!popup || !popup.querySelectorAll) return 0;
    return popup.querySelectorAll('.ant-select-item-option, .react-select__option, [role="option"], [id*="-option-"], [data-radix-collection-item], [data-headlessui-state]').length;
  }

  function bestPopupForControl(control, popups, beforeSet) {
    if (!popups || !popups.length) return null;
    var listId = dropdownListId(control);
    var preferred = popups.filter(function(popup) { return listIdMatchesPopup(listId, popup); });
    if (!preferred.length && beforeSet && beforeSet.size) {
      preferred = popups.filter(function(popup) { return !beforeSet.has(popup); });
    }
    if (!preferred.length) preferred = popups.slice();

    preferred.sort(function(a, b) {
      var byNew = Number(!!(beforeSet && beforeSet.has(b))) - Number(!!(beforeSet && beforeSet.has(a)));
      if (byNew !== 0) return byNew;
      var byCount = countPopupOptions(b) - countPopupOptions(a);
      if (byCount !== 0) return byCount;
      return popupRectDistance(control, a) - popupRectDistance(control, b);
    });

    return preferred[0] || null;
  }

  function findDropdownPopup(control, beforeSet) {
    var listId = dropdownListId(control);
    var popup = getPopupFromListId(listId);
    if (popup && isVisibleForScan(popup)) return popup;

    var input = getDropdownInput(control);
    var activeDesc = input ? (input.getAttribute('aria-activedescendant') || '') : '';
    if (activeDesc) {
      var activeNode = document.getElementById(activeDesc);
      if (activeNode) {
        var activePopup = activeNode.closest('[role="listbox"], .ant-select-dropdown, .react-select-dropdown, .react-select__menu, .react-select__menu-list, .react-select__menu-portal, [data-radix-popper-content-wrapper], [data-radix-select-content]');
        if (activePopup && isVisibleForScan(activePopup)) return activePopup;
      }
    }

    var popups = getVisibleDropdownPopups();
    var best = bestPopupForControl(control, popups, beforeSet);
    if (best && countPopupOptions(best) > 0) {
      var dist = popupRectDistance(control, best);
      if (dropdownExpanded(control) || (beforeSet && !beforeSet.has(best)) || dist < 520) return best;
    }

    if (!dropdownExpanded(control)) return null;
    return best;
  }

  async function openDropdownForScan(control) {
    var trigger = getDropdownTrigger(control);
    if (!trigger) {
      logQuoteDebug('popup-open', { control: quoteDebugMeta(control), opened: false, reason: 'no-trigger' });
      return { openedByScanner: false, popup: null, beforeSet: new Set() };
    }

    var beforeList = getVisibleDropdownPopups();
    var beforeSet = new Set(beforeList);

    var existing = findDropdownPopup(control, beforeSet);
    if (existing) {
      logQuoteDebug('popup-open', { control: quoteDebugMeta(control), opened: true, openedByScanner: false, reason: 'already-open', popupOptions: countPopupOptions(existing) });
      return { openedByScanner: false, popup: existing, beforeSet: beforeSet };
    }

    try {
      trigger.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
    } catch(e) {}

    var input = getDropdownInput(control);
    if (input && input.focus) {
      try { input.focus({ preventScroll: true }); } catch(e) { try { input.focus(); } catch(_) {} }
    } else if (trigger.focus) {
      try { trigger.focus({ preventScroll: true }); } catch(e) { try { trigger.focus(); } catch(_) {} }
    }

    async function waitPopup() {
      for (var tries = 0; tries < 5; tries++) {
        await sleep(90);
        var popup = findDropdownPopup(control, beforeSet);
        if (popup) return popup;
      }
      return null;
    }

    var popup = await waitPopup();
    if (popup) {
      logQuoteDebug('popup-open', { control: quoteDebugMeta(control), opened: true, openedByScanner: false, reason: 'visible-after-focus', popupOptions: countPopupOptions(popup) });
      return { openedByScanner: false, popup: popup, beforeSet: beforeSet };
    }

    var openAttempts = [
      function() {
        try {
          trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, buttons: 1, view: window }));
        } catch(e) {}
        try {
          trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, buttons: 1, view: window }));
        } catch(e) {}
      },
      function() {
        try {
          trigger.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, view: window }));
        } catch(e) {}
        try {
          trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, view: window }));
        } catch(e) {}
        try {
          if (typeof trigger.click === 'function') trigger.click();
        } catch(e) {}
      },
      function() {
        var selector = control && control.querySelector ? control.querySelector('.ant-select-selector, .ant-select-selection-item, .ant-select-arrow, .react-select__control, [class*="select__control"]') : null;
        if (selector) {
          try { selector.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, buttons: 1, view: window })); } catch(e) {}
          try { selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, buttons: 1, view: window })); } catch(e) {}
          try { selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, view: window })); } catch(e) {}
          try { selector.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, view: window })); } catch(e) {}
          try { if (typeof selector.click === 'function') selector.click(); } catch(e) {}
        }
      },
      function() {
        var target = input || trigger;
        if (!target || !target.dispatchEvent) return;
        try { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })); } catch(e) {}
        try { target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })); } catch(e) {}
        try { target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true })); } catch(e) {}
        try { target.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true })); } catch(e) {}
        try { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true })); } catch(e) {}
        try { target.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true })); } catch(e) {}
      }
    ];

    for (var i = 0; i < openAttempts.length; i++) {
      openAttempts[i]();
      popup = await waitPopup();
      if (popup) {
        logQuoteDebug('popup-open', { control: quoteDebugMeta(control), opened: true, openedByScanner: true, reason: 'opened-by-scanner', popupOptions: countPopupOptions(popup) });
        return { openedByScanner: true, popup: popup, beforeSet: beforeSet };
      }
    }

    var failedPopup = findDropdownPopup(control, beforeSet);
    logQuoteDebug('popup-open', { control: quoteDebugMeta(control), opened: !!failedPopup, openedByScanner: false, reason: failedPopup ? 'popup-found-after-failed-open' : 'open-failed', popupOptions: failedPopup ? countPopupOptions(failedPopup) : 0, expanded: !!dropdownExpanded(control) });
    return { openedByScanner: false, popup: failedPopup, beforeSet: beforeSet };
  }

  async function closeDropdownForScan(control, openedByScanner) {
    if (!control || !openedByScanner) return;
    var target = getDropdownInput(control) || getDropdownTrigger(control) || control;
    if (target && target.dispatchEvent) {
      try { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true })); } catch(e) {}
      try { target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true })); } catch(e) {}
    }
    await sleep(60);
    if (dropdownExpanded(control)) {
      var trigger = getDropdownTrigger(control);
      if (trigger && trigger.dispatchEvent) {
        try { trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, buttons: 1, view: window })); } catch(e) {}
      }
      await sleep(60);
    }
  }

  
function readDropdownNodeText(node) {
    if (!node) return '';
    var raw = '';
    function readAttr(el, attr) {
      if (!el || !el.getAttribute) return '';
      return normScanText(el.getAttribute(attr) || '');
    }
    function readNodeText(el) {
      if (!el) return '';
      return normScanText(el.textContent || '');
    }

    if (node.querySelector) {
      var labelNode = node.querySelector('.name') || node.querySelector('span.name') || node.querySelector('[class~="name"]');
      raw = readNodeText(labelNode);
    }
    if (!raw && node.getAttribute) {
      raw = readAttr(node, 'data-label')
        || readAttr(node, 'data-name')
        || readAttr(node, 'data-title')
        || readAttr(node, 'title')
        || readAttr(node, 'aria-label')
        || readAttr(node, 'data-value')
        || readAttr(node, 'value');
    }
    if (!raw && node.dataset) {
      raw = normScanText(node.dataset.label || node.dataset.name || node.dataset.title || node.dataset.value || '');
    }
    if (!raw && node.querySelector) {
      var rich = node.querySelector('[data-label], [data-name], [data-title], [title], [aria-label], .ant-select-item-option-content, .ant-select-selection-item, .react-select__option, .react-select__single-value, .ant-radio-button-wrapper, span, div');
      if (rich && rich !== node) {
        raw = readNodeText(rich)
          || readAttr(rich, 'data-label')
          || readAttr(rich, 'data-name')
          || readAttr(rich, 'data-title')
          || readAttr(rich, 'title')
          || readAttr(rich, 'aria-label');
      }
    }
    raw = raw || readNodeText(node);
    return normScanText(raw);
  }

  function looksLikeChoicePlaceholder(text) {
    var t = normScanText(text).toLowerCase();
    if (!t) return true;
    return /^(select|choose|please choose|please select|pick|--|---|n\/a|none|null)$/i.test(t)
      || /^\d+\s*left$/i.test(t)
      || /^(live preview|preview|add to cart|wishlist|track order|sign in|cart)$/i.test(t)
      || /^(greeting card|add a greeting card to your gift|shipping|delivery|warranty|price)$/i.test(t);
  }

  function currentDropdownText(control) {
    if (!control) return '';
    var node = null;
    if (control.querySelector) {
      node = control.querySelector('.ant-select-selection-item, .react-select__single-value, [class*="singleValue"], [class*="selected"], [class*="value"]');
    }
    if (!node && control.matches && control.matches('button, [role="combobox"]')) node = control;
    return readDropdownNodeText(node);
  }

  function collectOptionsFromNativeSelect(sel, rect) {
    var opts = [];
    if (!sel || !sel.querySelectorAll) return opts;
    sel.querySelectorAll('option').forEach(function(optEl, idx) {
      var val = optEl.value;
      var text = readDropdownNodeText(optEl);
      if (!text || val === '' || looksLikeChoicePlaceholder(text)) return;
      opts.push({
        element: optEl,
        rect: rect || rectData(sel),
        imageUrl: null,
        bgColor: null,
        textContent: text,
        isSelected: !!optEl.selected,
        capturedImage: null,
        index: idx,
      });
    });
    return opts;
  }

  function labelLooksLikeQuoteField(label) {
    var t = normScanText(label).toLowerCase();
    return /\b(quote|quotes|message|messages|saying|verse|text|title)\b/.test(t);
  }

  function makeTextOnlyOption(text, element, idx, isSelected) {
    var clean = normScanText(text);
    if (!clean || looksLikeChoicePlaceholder(clean)) return null;
    return {
      element: element || null,
      rect: rectData(element || document.body),
      imageUrl: null,
      bgColor: null,
      textContent: clean,
      text: clean,
      label: clean,
      name: clean,
      title: clean,
      value: clean,
      isSelected: !!isSelected,
      capturedImage: null,
      index: idx || 0,
    };
  }

  function collectOptionsFromFieldRoot(control, label, currentText) {
    var out = [];
    var seen = new Set();
    if (!labelLooksLikeQuoteField(label)) return out;
    var field = groupFieldRoot(control) || control;
    if (!field || !field.querySelectorAll) return out;
    var labelKey = normScanText(label).toLowerCase();

    function pushText(text, node, isSelected) {
      var clean = normScanText(text);
      var key = clean.toLowerCase();
      if (!clean || seen.has(key) || looksLikeChoicePlaceholder(clean)) return;
      if (key === labelKey || key.replace(/\*+$/, '').trim() === labelKey.replace(/\*+$/, '').trim()) return;
      if (clean.length > 220 && !(node && node.matches && node.matches('[role="option"], [role="radio"], label, button, .ant-radio-button-wrapper, .ant-select-item-option, .ant-select-selection-item'))) return;
      var opt = makeTextOnlyOption(clean, node || field, out.length, !!isSelected || (!!currentText && clean === currentText));
      if (!opt) return;
      seen.add(key);
      out.push(opt);
    }

    if (currentText) pushText(currentText, control, true);

    var candidateSelectors = [
      '.ant-select-item-option',
      '.ant-select-item-option-content',
      '.ant-select-selection-item',
      '.ant-radio-button-wrapper',
      '.ant-radio-wrapper',
      '.ant-segmented-item',
      '.ant-segmented-item-label',
      '.react-select__option',
      '.react-select__single-value',
      '[role="option"]',
      '[role="radio"]',
      '[aria-selected]',
      'button',
      'label',
      '[data-value]',
      '[data-label]',
      '[title]'
    ].join(', ');

    Array.from(field.querySelectorAll(candidateSelectors)).forEach(function(node) {
      if (!node || node === field) return;
      if (node.closest && node.closest('.ant-form-item-label') === node) return;
      var r = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (r) {
        if (r.width < 16 || r.height < 14) return;
        if (r.width > Math.max(window.innerWidth * 0.98, 1200)) return;
      }
      if (!isVisibleForScan(node) && !(node.getAttribute && (node.getAttribute('aria-selected') === 'true' || node.getAttribute('aria-checked') === 'true'))) return;
      var text = readDropdownNodeText(node);
      if (!text) return;
      if (text.length > 160 && !(node.matches && node.matches('[role="option"], [role="radio"], label, button, .ant-radio-button-wrapper, .ant-select-item-option, .ant-select-selection-item'))) return;
      pushText(text, node, !!(node.getAttribute && (node.getAttribute('aria-selected') === 'true' || node.getAttribute('aria-checked') === 'true')) || (node.classList && (node.classList.contains('ant-radio-button-wrapper-checked') || node.classList.contains('selected'))));
    });

    Array.from(field.querySelectorAll('input[type="radio"], input[type="checkbox"]')).forEach(function(input, idx) {
      var txt = '';
      var lbl = null;
      if (input.id) lbl = field.querySelector('label[for="' + cssEscapeSafe(input.id) + '"]') || document.querySelector('label[for="' + cssEscapeSafe(input.id) + '"]');
      if (!lbl && input.closest) lbl = input.closest('label');
      if (lbl) txt = readDropdownNodeText(lbl);
      if (!txt && input.getAttribute) txt = input.getAttribute('value') || input.getAttribute('aria-label') || '';
      pushText(txt, lbl || input, !!input.checked);
    });

    if (out.length < 2) {
      var nearby = [];
      var fieldParent = field.parentElement;
      if (fieldParent && fieldParent.querySelectorAll) {
        nearby = Array.from(fieldParent.querySelectorAll('button, label, [role="option"], [role="radio"], [data-value], [data-label]'));
      }
      nearby.forEach(function(node) {
        if (!node || field.contains(node)) return;
        var text = readDropdownNodeText(node);
        if (!text) return;
        var r = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
        var fr = field.getBoundingClientRect ? field.getBoundingClientRect() : null;
        if (r && fr) {
          var near = Math.abs(r.top - fr.bottom) < 220 || Math.abs(r.bottom - fr.top) < 220;
          if (!near) return;
        }
        pushText(text, node, !!(node.getAttribute && node.getAttribute('aria-selected') === 'true'));
      });
    }

    return out;
  }

  function collectOptionsFromDescription(label, currentText) {
    var out = [];
    var seen = new Set();
    if (!labelLooksLikeQuoteField(label)) return out;

    function pushText(text, idx) {
      var clean = normScanText(text);
      if (!clean || seen.has(clean.toLowerCase()) || looksLikeChoicePlaceholder(clean)) return;
      var opt = makeTextOnlyOption(clean, document.body, idx, !!currentText && clean === currentText);
      if (!opt) return;
      seen.add(clean.toLowerCase());
      out.push(opt);
    }

    var headingCandidates = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, p, div, span'));
    headingCandidates.forEach(function(node) {
      var heading = normScanText(node.textContent || '');
      if (!/^(message|messages|quote|quotes|title|titles)\s*:?$/i.test(heading)) return;

      var parent = node.parentElement;
      if (!parent) return;

      var list = null;
      var probe = node.nextElementSibling;
      for (var hops = 0; hops < 4 && probe; hops++, probe = probe.nextElementSibling) {
        if (probe.matches && probe.matches('ul, ol')) { list = probe; break; }
        if (probe.querySelector) {
          var nested = probe.querySelector('ul, ol');
          if (nested) { list = nested; break; }
        }
      }
      if (!list && parent.querySelector) {
        list = parent.querySelector('ul, ol');
      }
      if (!list) return;

      Array.from(list.querySelectorAll('li')).forEach(function(li, idx) {
        pushText(readDropdownNodeText(li), idx);
      });
    });

    if (out.length < 2 && currentText) {
      pushText(currentText, out.length);
    }

    return out;
  }

  function collectOptionsFromPopup(control, popup) {
    var currentText = currentDropdownText(control);
    var opts = [];
    var seenText = new Set();

    function pushNode(node, fallbackNode, idx) {
      var target = node || fallbackNode;
      if (!target) return;
      var text = readDropdownNodeText(target) || readDropdownNodeText(fallbackNode);
      if (!text || looksLikeChoicePlaceholder(text)) return;
      var key = text.toLowerCase();
      if (seenText.has(key)) return;
      seenText.add(key);
      var hostRectNode = target.getBoundingClientRect && target.getBoundingClientRect().width > 0 ? target : (fallbackNode || target);
      opts.push({
        element: target,
        rect: rectData(hostRectNode || target),
        imageUrl: null,
        bgColor: null,
        textContent: text,
        isSelected: !!(target.getAttribute && (target.getAttribute('aria-selected') === 'true' || target.getAttribute('aria-checked') === 'true'))
          || !!(fallbackNode && fallbackNode.getAttribute && fallbackNode.getAttribute('aria-selected') === 'true')
          || (!!currentText && text === currentText),
        capturedImage: null,
        index: idx,
      });
    }

    if (popup && popup.querySelectorAll) {
      var selector = [
        '.ant-select-item-option',
        '.ant-select-item-option-content',
        '.react-select__option',
        '[role="option"]',
        '[id*="-option-"]',
        '[data-radix-collection-item]',
        '[data-headlessui-state]',
        '.ant-radio-button-wrapper',
        '.ant-radio-wrapper',
        '.dropdown-content .item',
        '.select-grid-div .item',
        '.item',
        'label',
        'button'
      ].join(', ');

      popup.querySelectorAll(selector).forEach(function(node, idx) {
        var host = node.matches && node.matches('.ant-select-item-option, .react-select__option, [role="option"], [data-radix-collection-item], .ant-radio-button-wrapper, .ant-radio-wrapper, label, button')
          ? node
          : (node.closest ? node.closest('.ant-select-item-option, .react-select__option, [role="option"], [data-radix-collection-item], .ant-radio-button-wrapper, .ant-radio-wrapper, label, button') : node);
        var target = host || node;
        if (!target) return;
        if (!isVisibleForScan(target) && !isVisibleForScan(node)) return;
        pushNode(target, node, idx);
      });
    }

    return opts;
  }

  function buildTextDropdownGroup(control, popup) {
    if (!control || !isInPersonalizationScope(control) || fieldHasImageSwatches(control)) return null;

    var fieldRoot = groupFieldRoot(control) || control;
    var label = extractLabelFromControl(control) || extractLabelFromControl(fieldRoot);
    if (!label) return null;

    if (labelLooksLikeQuoteField(label)) {
      return buildQuoteLikeFieldGroupSync(fieldRoot, control, popup);
    }

    var currentText = currentDropdownText(control);
    var options = collectOptionsFromPopup(control, popup);
    if (options.length < 2) {
      var fieldRootOptions = collectOptionsFromFieldRoot(control, label, currentText);
      if (fieldRootOptions.length > options.length) options = fieldRootOptions;
    }
    if (options.length < 2) {
      var shadowSelect = fieldRoot ? fieldRoot.querySelector('select') : null;
      if (shadowSelect) options = collectOptionsFromNativeSelect(shadowSelect, rectData(control));
    }
    if (options.length < 2) {
      var fromDescription = collectOptionsFromDescription(label, currentText);
      if (fromDescription.length > options.length) options = fromDescription;
    }
    if (!options.length && currentText) {
      var single = makeTextOnlyOption(currentText, control, 0, true);
      if (single) options = [single];
    }

    options = normalizeQuoteOptions(options, currentText);
    if (!options.length) return null;

    return {
      element: fieldRoot,
      label: label,
      options: options,
      rect: rectData(fieldRoot),
      isDropdown: true,
      isTextOnly: true
    };
  }

  function findQuoteFieldCandidates(scopeRoot) {
    var root = scopeRoot && scopeRoot.querySelectorAll ? scopeRoot : document;
    var seen = new Set();
    var out = [];

    function push(node) {
      if (!node || seen.has(node)) return;
      if (!isInPersonalizationScope(node)) return;
      var label = extractLabelFromControl(node);
      if (!label) {
        var field = groupFieldRoot(node) || node;
        label = extractLabelFromControl(field);
      }
      if (!labelLooksLikeQuoteField(label)) return;
      var fieldRoot = groupFieldRoot(node) || node;
      if (!fieldRoot || seen.has(fieldRoot)) return;
      if (fieldHasImageSwatches(fieldRoot)) return;
      logQuoteDebug('field-candidate', {
        label: label,
        field: quoteDebugMeta(fieldRoot),
        control: quoteDebugMeta(findQuoteDropdownControl(fieldRoot) || node || fieldRoot),
        node: quoteDebugMeta(node)
      });
      seen.add(fieldRoot);
      out.push(fieldRoot);
    }

    Array.from(root.querySelectorAll('.ant-form-item, .form-group, .product-form__input, fieldset, .by-customization-form__element, .by-customization-form_element, [class*="form__element"], [class*="personalization"], .product__info-block, .product__info-item')).forEach(push);
    Array.from(root.querySelectorAll('select, .ant-select, [role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"][aria-expanded], input[aria-controls][role="combobox"], input[type="radio"], input[type="checkbox"], [role="radio"], .ant-radio-group, .ant-segmented, [data-label], [data-value]')).forEach(push);
    return out;
  }

  function findQuoteDropdownControl(fieldRoot) {
    if (!fieldRoot) return null;
    if (fieldRoot.matches && fieldRoot.matches('select, .ant-select, [role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"][aria-expanded], input[aria-controls][role="combobox"]')) {
      return normalizeDropdownControl(fieldRoot);
    }
    var direct = fieldRoot.querySelector ? fieldRoot.querySelector('.ant-select, [role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"][aria-expanded], input[aria-controls][role="combobox"], .react-select__control, [class*="react-select"][class*="-control"], [class*="select__control"]') : null;
    return normalizeDropdownControl(direct);
  }

  function readSelectedQuoteText(fieldRoot, control) {
    var text = currentDropdownText(control || fieldRoot);
    if (text) return text;

    if (fieldRoot && fieldRoot.querySelector) {
      var selectedNode = fieldRoot.querySelector(
        '.ant-select-selection-item, .react-select__single-value, [role="radio"][aria-checked="true"], [aria-selected="true"], .ant-radio-button-wrapper-checked, .ant-radio-wrapper-checked, .selected, .active, input[type="radio"]:checked, input[type="checkbox"]:checked'
      );
      if (selectedNode) {
        if (selectedNode.matches && selectedNode.matches('input[type="radio"], input[type="checkbox"]')) {
          var lbl = null;
          if (selectedNode.id) {
            lbl = fieldRoot.querySelector('label[for="' + cssEscapeSafe(selectedNode.id) + '"]') || document.querySelector('label[for="' + cssEscapeSafe(selectedNode.id) + '"]');
          }
          if (!lbl && selectedNode.closest) lbl = selectedNode.closest('label');
          text = readDropdownNodeText(lbl || selectedNode);
        } else {
          text = readDropdownNodeText(selectedNode);
        }
      }
    }

    if (!text && control && control.getAttribute) {
      text = normScanText(control.getAttribute('value') || control.getAttribute('aria-label') || control.getAttribute('title') || '');
    }

    return normScanText(text);
  }

  function normalizeQuoteOptions(options, selectedText) {
    var out = [];
    var seen = new Map();
    var selectedKey = normScanText(selectedText).toLowerCase();

    (options || []).forEach(function(opt, idx) {
      if (!opt) return;
      var text = normScanText(opt.textContent || opt.label || opt.name || opt.title || opt.text || opt.value || '');
      if (!text || looksLikeChoicePlaceholder(text)) return;
      if (text.length > 1000) return;
      var key = text.toLowerCase();
      if (seen.has(key)) {
        var existing = seen.get(key);
        if (opt.isSelected || (!!selectedKey && key === selectedKey)) existing.isSelected = true;
        return;
      }
      var normalized = {
        element: opt.element || null,
        rect: opt.rect || rectData(opt.element || document.body),
        imageUrl: null,
        bgColor: opt.bgColor || null,
        textContent: text,
        text: text,
        label: text,
        name: text,
        title: text,
        value: text,
        isSelected: !!opt.isSelected || (!!selectedKey && key === selectedKey),
        capturedImage: null,
        index: typeof opt.index === 'number' ? opt.index : out.length
      };
      seen.set(key, normalized);
      out.push(normalized);
    });

    if (!out.length && selectedText) {
      var single = makeTextOnlyOption(selectedText, document.body, 0, true);
      if (single) out.push(single);
    }

    return out;
  }

  function collectQuoteFallbackDataOptions(fieldRoot, label, currentText) {
    var out = [];
    var seen = new Set();
    var labelKey = normScanText(label).toLowerCase();

    function pushText(text, node, isSelected) {
      var clean = normScanText(text);
      var key = clean.toLowerCase();
      if (!clean || seen.has(key) || looksLikeChoicePlaceholder(clean)) return;
      if (key === labelKey || key.replace(/\*+$/, '').trim() === labelKey.replace(/\*+$/, '').trim()) return;
      if (clean.length > 400) return;
      var opt = makeTextOnlyOption(clean, node || fieldRoot || document.body, out.length, !!isSelected || (!!currentText && clean === currentText));
      if (!opt) return;
      seen.add(key);
      out.push(opt);
    }

    if (!fieldRoot || !fieldRoot.querySelectorAll) return out;

    Array.from(fieldRoot.querySelectorAll('[title], [aria-label], [aria-description], [data-title], [data-label], [data-value], [value]')).forEach(function(node) {
      if (!node || node.closest && node.closest('.ant-form-item-label')) return;
      var text = '';
      if (node.getAttribute) {
        text = node.getAttribute('title')
          || node.getAttribute('aria-label')
          || node.getAttribute('aria-description')
          || node.getAttribute('data-title')
          || node.getAttribute('data-label')
          || node.getAttribute('data-value')
          || node.getAttribute('value')
          || '';
      }
      if (!text && node.dataset) text = node.dataset.title || node.dataset.label || node.dataset.value || '';
      if (!text) return;
      pushText(text, node, !!(node.getAttribute && (node.getAttribute('aria-selected') === 'true' || node.getAttribute('aria-checked') === 'true')));
    });

    var descriptionOptions = collectOptionsFromDescription(label, currentText);
    descriptionOptions.forEach(function(opt) {
      if (!opt) return;
      pushText(opt.textContent, opt.element || fieldRoot, !!opt.isSelected);
    });

    return out;
  }

  function buildQuoteLikeFieldGroupSync(fieldRoot, control, popup) {
    var root = fieldRoot || groupFieldRoot(control) || control;
    if (!root || !isInPersonalizationScope(root) || fieldHasImageSwatches(root)) return null;

    var dropdownControl = control || findQuoteDropdownControl(root);
    var label = extractLabelFromControl(dropdownControl || root) || extractLabelFromControl(root);
    if (!label || !labelLooksLikeQuoteField(label)) return null;

    var currentText = readSelectedQuoteText(root, dropdownControl || root);
    var options = [];
    var nativeCount = 0;
    var popupCount = 0;
    var inlineCount = 0;
    var fallbackCount = 0;
    var cacheCount = 0;
    var finalSource = 'none';
    var nativeSelect = root.querySelector ? root.querySelector('select') : null;
    if (nativeSelect) {
      options = normalizeQuoteOptions(collectOptionsFromNativeSelect(nativeSelect, rectData(root)), currentText);
      nativeCount = options.length;
      if (options.length >= 2) {
        options = storeQuoteCache(root, nativeSelect, label, options, 'native-sync', currentText);
        finalSource = 'native';
        logQuoteDebug('options-count', {
          label: label,
          currentText: currentText || '',
          counts: {
            native: nativeCount,
            popup: popupCount,
            inline: inlineCount,
            fallback: fallbackCount,
            cache: cacheCount,
            final: options.length
          },
          finalSource: finalSource,
          field: quoteDebugMeta(root),
          control: quoteDebugMeta(dropdownControl || root)
        });
        return buildQuoteGroup(root, label, options);
      }
    }

    var cachedOptions = readCachedQuoteOptions(root, dropdownControl || root, label, currentText);
    cacheCount = cachedOptions.length;
    if (cachedOptions.length > options.length) {
      options = cachedOptions;
      finalSource = 'cache';
    }

    if (popup) {
      var popupOptions = normalizeQuoteOptions(collectOptionsFromPopup(dropdownControl || root, popup), currentText);
      popupCount = popupOptions.length;
      if (popupOptions.length > options.length) {
        options = popupOptions;
        finalSource = 'popup';
      }
      if (popupOptions.length >= 2) {
        storeQuoteCache(root, dropdownControl || root, label, popupOptions, 'popup-sync', currentText);
      }
    }

    var inlineOptions = normalizeQuoteOptions(collectOptionsFromFieldRoot(dropdownControl || root, label, currentText), currentText);
    inlineCount = inlineOptions.length;
    if (inlineOptions.length > options.length) {
      options = inlineOptions;
      finalSource = 'inline';
    }
    if (inlineOptions.length >= 2) {
      storeQuoteCache(root, dropdownControl || root, label, inlineOptions, 'inline-sync', currentText);
    }

    var fallbackOptions = normalizeQuoteOptions(collectQuoteFallbackDataOptions(root, label, currentText), currentText);
    fallbackCount = fallbackOptions.length;
    if (fallbackOptions.length > options.length) {
      options = fallbackOptions;
      finalSource = 'fallback';
    }
    if (fallbackOptions.length >= 2) {
      storeQuoteCache(root, dropdownControl || root, label, fallbackOptions, 'fallback-sync', currentText);
    }

    if (!options.length && currentText) {
      var single = makeTextOnlyOption(currentText, dropdownControl || root, 0, true);
      if (single) {
        options = [single];
        finalSource = 'selected';
      }
    }

    options = normalizeQuoteOptions(options, currentText);
    if (!options.length) {
      logQuoteDebug('options-count', {
        label: label,
        currentText: currentText || '',
        counts: {
          native: nativeCount,
          popup: popupCount,
          inline: inlineCount,
          fallback: fallbackCount,
          cache: cacheCount,
          final: 0
        },
        finalSource: finalSource || 'none',
        field: quoteDebugMeta(root),
        control: quoteDebugMeta(dropdownControl || root)
      });
      return null;
    }

    if (!finalSource) finalSource = options.length === 1 && currentText ? 'selected' : 'unknown';
    logQuoteDebug('options-count', {
      label: label,
      currentText: currentText || '',
      counts: {
        native: nativeCount,
        popup: popupCount,
        inline: inlineCount,
        fallback: fallbackCount,
        cache: cacheCount,
        final: options.length
      },
      finalSource: finalSource,
      field: quoteDebugMeta(root),
      control: quoteDebugMeta(dropdownControl || root)
    });

    return buildQuoteGroup(root, label, options);
  }

  function findQuotePopupScrollContainer(popup) {
    if (!popup) return null;
    var direct = popup.querySelector ? popup.querySelector('.rc-virtual-list-holder, .ant-select-dropdown .rc-virtual-list-holder, .react-select__menu-list') : null;
    if (direct && direct.scrollHeight > direct.clientHeight + 4) return direct;

    var nodes = [popup];
    if (popup.querySelectorAll) {
      nodes = nodes.concat(Array.from(popup.querySelectorAll('*')));
    }
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || !node.scrollHeight || !node.clientHeight) continue;
      if (node.scrollHeight <= node.clientHeight + 4) continue;
      var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      var overflowY = style ? style.overflowY : '';
      if (/auto|scroll|overlay/i.test(overflowY || '')) return node;
    }
    return null;
  }

  async function collectAntPopupOptionsWithVirtualScroll(control, popup, currentText) {
    var merged = normalizeQuoteOptions(collectOptionsFromPopup(control, popup), currentText);
    var holder = findQuotePopupScrollContainer(popup);
    if (!holder) return merged;

    var startTop = holder.scrollTop || 0;
    var maxScroll = Math.max(0, holder.scrollHeight - holder.clientHeight);
    if (maxScroll <= 0) return merged;

    var step = Math.max(24, Math.floor(holder.clientHeight * 0.8));
    var noChangeRounds = 0;
    var lastCount = merged.length;
    var iterations = 0;

    while (iterations < 60 && noChangeRounds < 4) {
      iterations++;
      var nextTop = Math.min(maxScroll, (holder.scrollTop || 0) + step);
      if (nextTop === holder.scrollTop) break;
      holder.scrollTop = nextTop;
      try { holder.dispatchEvent(new Event('scroll', { bubbles: true })); } catch(e) {}
      await sleep(90);

      var activePopup = findDropdownPopup(control) || popup;
      var nextOptions = normalizeQuoteOptions(collectOptionsFromPopup(control, activePopup), currentText);
      if (nextOptions.length > merged.length) {
        merged = normalizeQuoteOptions(merged.concat(nextOptions), currentText);
      }

      if (merged.length === lastCount) noChangeRounds++;
      else {
        lastCount = merged.length;
        noChangeRounds = 0;
      }

      if ((holder.scrollTop || 0) >= maxScroll - 1) break;
    }

    holder.scrollTop = startTop;
    try { holder.dispatchEvent(new Event('scroll', { bubbles: true })); } catch(e) {}
    await sleep(30);

    return normalizeQuoteOptions(merged, currentText);
  }

  async function scanQuoteFieldWithTiers(fieldRoot, control, popup) {
    var root = fieldRoot || groupFieldRoot(control) || control;
    if (!root || !isInPersonalizationScope(root) || fieldHasImageSwatches(root)) return null;

    var dropdownControl = control || findQuoteDropdownControl(root);
    var label = extractLabelFromControl(dropdownControl || root) || extractLabelFromControl(root);
    if (!label || !labelLooksLikeQuoteField(label)) return null;

    var currentText = readSelectedQuoteText(root, dropdownControl || root);
    var nativeSelect = root.querySelector ? root.querySelector('select') : null;
    if (nativeSelect) {
      var nativeOptions = normalizeQuoteOptions(collectOptionsFromNativeSelect(nativeSelect, rectData(root)), currentText);
      if (nativeOptions.length >= 2) {
        nativeOptions = storeQuoteCache(root, nativeSelect, label, nativeOptions, 'native', currentText);
        return buildQuoteGroup(root, label, nativeOptions);
      }
    }

    var cachedOptions = readCachedQuoteOptions(root, dropdownControl || root, label, currentText);
    if (cachedOptions.length >= 2) {
      logQuoteDebug('options-count', {
        label: label,
        currentText: currentText || '',
        counts: { native: nativeSelect ? 1 : 0, popup: 0, inline: 0, fallback: 0, cache: cachedOptions.length, final: cachedOptions.length },
        finalSource: 'cache',
        field: quoteDebugMeta(root),
        control: quoteDebugMeta(dropdownControl || root)
      });
      return buildQuoteGroup(root, label, cachedOptions);
    }

    var ownScanState = null;
    var livePopup = popup || null;

    try {
      if (!livePopup && dropdownControl) {
        livePopup = findDropdownPopup(dropdownControl);
      }

      if (!livePopup && dropdownControl) {
        ownScanState = await openDropdownForScan(dropdownControl);
        livePopup = ownScanState && ownScanState.popup ? ownScanState.popup : findDropdownPopup(dropdownControl, ownScanState ? ownScanState.beforeSet : null);
      }

      if (livePopup && dropdownControl) {
        var antOptions = await collectAntPopupOptionsWithVirtualScroll(dropdownControl, livePopup, currentText);
        if (antOptions.length >= 2) {
          antOptions = storeQuoteCache(root, dropdownControl, label, antOptions, ownScanState && ownScanState.openedByScanner ? 'active-open' : 'popup', currentText);
          return buildQuoteGroup(root, label, antOptions);
        }
      }

      var inlineOptions = normalizeQuoteOptions(collectOptionsFromFieldRoot(dropdownControl || root, label, currentText), currentText);
      if (inlineOptions.length >= 2) {
        inlineOptions = storeQuoteCache(root, dropdownControl || root, label, inlineOptions, 'inline', currentText);
        return buildQuoteGroup(root, label, inlineOptions);
      }

      var fallbackOptions = normalizeQuoteOptions(collectQuoteFallbackDataOptions(root, label, currentText), currentText);
      if (fallbackOptions.length >= 2) {
        fallbackOptions = storeQuoteCache(root, dropdownControl || root, label, fallbackOptions, 'fallback', currentText);
        return buildQuoteGroup(root, label, fallbackOptions);
      }

      var cachedLate = readCachedQuoteOptions(root, dropdownControl || root, label, currentText);
      if (cachedLate.length >= 2) {
        return buildQuoteGroup(root, label, cachedLate);
      }

      if (currentText) {
        var single = makeTextOnlyOption(currentText, dropdownControl || root, 0, true);
        if (single) {
          return {
            element: root,
            label: label,
            options: [single],
            rect: rectData(root),
            isDropdown: true,
            isTextOnly: true
          };
        }
      }
      return null;
    } finally {
      if (ownScanState && ownScanState.openedByScanner) {
        await closeDropdownForScan(dropdownControl, true);
      }
    }
  }

  function dedupeGroups(groups) {
    var byKey = new Map();
    (groups || []).forEach(function(g) {
      if (!g || !g.label) return;
      var key = normScanText(g.label).toLowerCase();
      if (!key) return;
      if (!byKey.has(key)) {
        byKey.set(key, g);
        return;
      }
      var prev = byKey.get(key);
      var prevCount = prev && prev.options ? prev.options.length : 0;
      var nextCount = g && g.options ? g.options.length : 0;
      if (nextCount > prevCount) byKey.set(key, g);
    });
    return Array.from(byKey.values());
  }

  function isPawesomeHouseHost() {
    var host = String((location && location.hostname) || '').toLowerCase();
    return host === 'pawesomehouse.com' || host.endsWith('.pawesomehouse.com');
  }

  function isPawesomeHousePage() {
    return isPawesomeHouseHost();
  }

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, ' ')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[☑☒✅❌✔✖🗑️📋]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isShippingOrOrderText(text) {
    var t = normalizeText(text);
    if (!t) return false;
    if (/\b(ordered|order ready|order now|get it by|delivery|delivered|shipping|timeline|arriv|viet)\b/.test(t)) return true;
    if (/\b(may|jun|july|aug|sep|oct|nov|dec|jan|feb|mar|apr)\b/.test(t) && /\d/.test(t)) return true;
    if (/\b\d{1,2}\s*-\s*\d{1,2}\b/.test(t)) return true;
    return false;
  }

  function isSkuLikeValue(text) {
    var t = normalizeText(text);
    if (!t) return false;
    if (/^\d{3,6}-[a-z0-9]{2,12}-[a-z0-9-]{2,40}$/.test(t)) return true;
    if (/^\d+[a-z]*-[a-z0-9-]{2,40}$/.test(t)) return true;
    return false;
  }

  // pawesomehouse.com: extract real title from "Option X of Y <title> * Required".
  function cleanPawesomeHouseGroupTitle(rawTitle) {
    var title = String(rawTitle == null ? '' : rawTitle)
      .replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) return '';
    var hadOptionPrefix = /^\s*option\s+\d+\s+of\s+\d+\s*/i.test(title);
    title = title.replace(/^\s*option\s+\d+\s+of\s+\d+\s*/i, '');
    title = title.replace(/\s*\*\s*required\s*$/i, '');
    title = title.replace(/\s*\*\s*$/i, '');
    title = title.replace(/\s+required\s*$/i, '');
    title = title.replace(/\s+/g, ' ').trim();
    if (hadOptionPrefix && !title) return '';
    if (/^option\s+\d+\s+of\s+\d+$/i.test(title)) return '';
    return title;
  }

  function cleanPawesomeHouseItemValue(rawValue) {
    var cleaned = String(rawValue == null ? '' : rawValue)
      .replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[☑☒✅❌✔✖🗑️📋]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';
    if (cleaned === '*') return '';
    if (/^option\s+\d+\s+of\s+\d+$/i.test(cleaned)) return '';
    if (/please use standard english/i.test(cleaned) || /exclude emojis/i.test(cleaned)) return '';
    if (isShippingOrOrderText(cleaned)) return '';
    if (isSkuLikeValue(cleaned)) return '';
    if (/^\d{1,2}\s*[-/]\s*\d{1,2}(\s*[-/]\s*\d{2,4})?$/.test(cleaned)) return '';
    if (/^[a-z]\d+$/i.test(cleaned)) return '';
    if (/^(copy|delete|remove|edit|upload|choose image|select image|add image|add|clear|reset|checkbox|required|optional|select|choose)$/i.test(cleaned)) return '';
    return cleaned;
  }

  
  
  function getUnifiedSiteProfile() {
    if (window.STSClipartScanner && window.STSClipartScanner.siteRouter && typeof window.STSClipartScanner.siteRouter.resolve === 'function') {
      return window.STSClipartScanner.siteRouter.resolve((location && location.hostname) || '');
    }
    var reg = window.STSSiteProfilesV2;
    if (!reg || typeof reg.resolve !== 'function') return null;
    return reg.resolve((location && location.hostname) || '');
  }

  function mapNormalizedProfileGroup(group) {
    if (!group || !group.title || !Array.isArray(group.items) || !group.items.length) return null;
    var options = group.items.map(function(it){
      var txt = String((it && (it.label || it.value || it.rawValue)) || '').trim();
      if (!txt) return null;
      return { textContent: txt, value: txt, name: txt, imageUrl: it.image || null, element: it.element || null };
    }).filter(Boolean);
    if (!options.length) return null;
    return { label: String(group.title || '').trim(), options: options };
  }

  function scanFromUnifiedProfile(profile, doc) {
    if (!profile || typeof profile.autoScan !== 'function') return [];
    var raw = profile.autoScan(doc || document) || [];
    return raw.map(mapNormalizedProfileGroup).filter(Boolean);
  }
function getManualProfileForHost() {
    var ns = window.STSClipartScanner;
    if (ns && ns.profileContext && typeof ns.profileContext.create === 'function' && ns.profiles && typeof ns.profiles.resolve === 'function') {
      var ctx = ns.profileContext.create({ document: document, location: location, window: window });
      var resolved = ns.profiles.resolve(ctx);
      var hasManualHighlighter = !!(resolved && typeof resolved.getRoot === 'function' && typeof resolved.getGroups === 'function' && typeof resolved.getTitleElement === 'function');
      if (window.__STS_CLIPART_DEBUG_MANUAL_PICK) {
        console.log('[STS ManualPick Debug] highlight resolver profile.id:', resolved && resolved.id, 'matchedProfileId:', resolved && resolved.matchedProfileId, 'hasManualHighlighter:', hasManualHighlighter);
      }
      if (hasManualHighlighter) return resolved;
    }
    if (window.STSClipartScanner && window.STSClipartScanner.siteRouter && typeof window.STSClipartScanner.siteRouter.resolve === 'function') {
      return window.STSClipartScanner.siteRouter.resolve((location && location.hostname) || '');
    }
    var reg = window.STSSiteProfilesV2;
    if (!reg || typeof reg.resolve !== 'function') return null;
    return reg.resolve((location && location.hostname) || '');
  }

  function collectGroupFromManualProfile(profile, groupEl) {
    if (!profile || !groupEl) return null;
    var titleEl = profile.getTitleElement ? profile.getTitleElement(groupEl) : (profile.getTitle ? profile.getTitle(groupEl) : null);
    if (!titleEl || typeof profile.scanManualGroupFromTitle !== 'function') return null;
    return mapNormalizedProfileGroup(profile.scanManualGroupFromTitle(titleEl));
  }

  function isManualModeActive() {
    return !!document.getElementById('sts-pick-wrapper');
  }

  function isVisibleElement(element) {
    if (!element || element.nodeType !== 1) return false;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    var style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    if (!style) return true;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity || '1') <= 0) return false;
    var rect = element.getBoundingClientRect();
    return !!(rect && rect.width > 0 && rect.height > 0);
  }

  function isJunkControl(element) {
    if (!element || !element.matches) return true;
    if (!isVisibleElement(element)) return true;
    if (element.closest('#reviews, [id*=review], [class*=review], [class*=rating], [class*=sort], [class*=shipping], [class*=delivery], [class*=gallery], [class*=thumbnail]')) return true;
    if (element.matches('script, style, template, noscript, input[type="hidden"], [disabled], [aria-disabled="true"]')) return true;
    if (element.matches('[class*=copy], [class*=delete], [class*=remove], [class*=toolbar], [class*=arrow], [class*=carousel], [class*=thumb], [class*=helper]')) return true;
    if (element.querySelector && element.querySelector('svg') && !normalizeText(element.textContent || '') && !element.getAttribute('aria-label') && !element.getAttribute('title')) return true;
    return false;
  }

  function dedupeManualItems(items) {
    var seen = new Set();
    var out = [];
    (Array.isArray(items) ? items : []).forEach(function(item) {
      var raw = item && (item.textContent || item.label || item.value) || '';
      var key = normalizeText(raw);
      if (!key) return;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  function findPawesomeHouseOptionContainerFromTitle(titleElement) {
    if (!titleElement || !titleElement.closest) return null;
    var direct = titleElement.closest('fieldset, .product-form__input, .product__input, .by-customization-form__element, .by-customization-form_element, [class*=customization-form__element], [class*=customization-form_element], [class*=option-group], [class*=option-wrap], [class*=personalization-option], [class*=tib-option], .form-group, .product-option');
    if (direct) return direct;
    var current = titleElement.parentElement;
    while (current && current !== document.body) {
      var count = current.querySelectorAll('button, [role="radio"], [role="option"], [class*=swatch], input[type="radio"] + label, label[for], [data-value], [data-title], [data-name], img').length;
      if (count >= 2) return current;
      current = current.parentElement;
    }
    return null;
  }

  function isPawesomeHouseOptionTitle(element) {
    if (!isPawesomeHousePage() || !element || !element.closest) return false;
    var titleCandidate = element.closest('legend, label, .by-customization-form__label, [class*=option-title], [class*=field-label], [class*=form__label], [class*=option-label], h3, h4, h5, p, span, div');
    if (!titleCandidate) return false;
    if (!isVisibleElement(titleCandidate)) return false;
    var raw = titleCandidate.innerText || titleCandidate.textContent || '';
    var cleaned = cleanPawesomeHouseGroupTitle(raw);
    if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return false;
    if (isShippingOrOrderText(cleaned)) return false;
    var container = findPawesomeHouseOptionContainerFromTitle(titleCandidate);
    if (!container) return false;
    var items = extractPawesomeHouseVisibleItems(container);
    return items.length >= 2;
  }

  function extractPawesomeHouseVisibleItems(groupContainer) {
    if (!groupContainer) return [];
    var candidates = groupContainer.querySelectorAll('button, [role="button"], [role="radio"], [role="option"], input[type="radio"] + label, label[for], .swatch, .swatch-element, .option, .option-item, [class*=swatch], [data-value], [data-title], [data-name], li, img');
    var items = [];
    var seenNodes = new Set();
    candidates.forEach(function(el) {
      if (seenNodes.has(el)) return;
      seenNodes.add(el);
      if (isJunkControl(el)) return;
      if (el.closest && el.closest('legend, h1, h2, h3, h4, h5, h6, label.sts-highlight-title')) return;
      var value = extractPawesomeHouseItemValue(el, items.length);
      if (!value || isHelperValueText(value)) return;
      items.push({ textContent: value, value: value, label: value, element: el });
    });
    return items;
  }

  function scanPawesomeHouseGroupFromTitleClick(titleElement) {
    var title = cleanPawesomeHouseGroupTitle((titleElement && (titleElement.innerText || titleElement.textContent)) || '');
    var container = findPawesomeHouseOptionContainerFromTitle(titleElement);
    if (!title || !container) return null;
    var options = extractPawesomeHouseVisibleItems(container);
    if (!options.length) return null;
    return { label: title, options: options, element: container };
  }

  function dedupePawesomeHouseItems(items) {
    var seen = new Set();
    var out = [];
    (Array.isArray(items) ? items : []).forEach(function(opt) {
      var raw = opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '';
      var cleanedValue = cleanPawesomeHouseItemValue(raw);
      var normalized = normalizeText(cleanedValue);
      if (!normalized || isHelperValueText(normalized)) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      if (opt) {
        opt.textContent = cleanedValue;
        if (typeof opt.label === 'string' && opt.label.trim()) opt.label = cleanedValue;
        if (typeof opt.value === 'string' && opt.value.trim()) opt.value = cleanedValue;
      }
      out.push(opt);
    });
    return out;
  }

  function isNumericIdLike(value) {
    return /^\d{8,}$/.test(normalizeText(value || ''));
  }

  function isHelperValueText(value) {
    var t = normalizeText(value);
    if (!t) return true;
    if (isNumericIdLike(t)) return true;
    if (t === '*' || /^option\s+\d+\s+of\s+\d+$/.test(t)) return true;
    if (isShippingOrOrderText(t) || isSkuLikeValue(t)) return true;
    if (/please use standard english/.test(t) || /exclude emojis/.test(t)) return true;
    if (/^(yes|no)$/.test(t)) return true;
    return /^(copy|delete|remove|edit|upload|choose image|select image|add image|add|clear|reset|checkbox|required|optional|\+|-)$/.test(t);
  }

  function isRealOptionGroup(group) {
    if (!group || !group.label) return false;
    var label = normalizeText(group.label);
    if (!label || label.length < 3) return false;
    if (isNumericIdLike(label)) return false;

    var badLabel = /(style:\s*basic tee|thumbnail|preview|image|artwork|photo|helper|tool|button|id list|image list|gallery)/.test(label);
    if (badLabel) return false;
    if (/^option\s+\d+\s+of\s+\d+$/.test(label)) return false;
    if (isShippingOrOrderText(label)) return false;
    if (/please use standard english|exclude emojis|displayed publicly|sort|review|rating/.test(label)) return false;

    var options = Array.isArray(group.options) ? group.options : [];
    if (options.length < 2) return false;

    var meaningfulValues = 0;
    var readableValues = 0;
    var imageOnlyCount = 0;
    options.forEach(function(opt) {
      var raw = opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '';
      var txt = normalizeText(raw);
      if (txt) readableValues++;
      if (!txt && (opt && (opt.imageUrl || opt.capturedImage))) imageOnlyCount++;
      if (txt && !isHelperValueText(txt)) meaningfulValues++;
    });

    if (!readableValues && imageOnlyCount >= options.length) return false;
    if (meaningfulValues < 2) return false;
    if (readableValues > 0 && (meaningfulValues / readableValues) < 0.5) return false;
    return true;
  }

  function sanitizeGroupValues(group) {
    if (!group || !Array.isArray(group.options)) return group;
    group.options = dedupePawesomeHouseItems(group.options);
    return group;
  }

  function extractPawesomeHouseItemValue(element, fallbackIndex) {
    if (!element || !element.getAttribute) return '';
    var firstImage = element.matches('img') ? element : element.querySelector('img');
    var candidateValues = [
      cleanPawesomeHouseItemValue(element.innerText || element.textContent || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('aria-label') || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('title') || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('alt') || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('data-value') || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('data-title') || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('data-name') || ''),
      cleanPawesomeHouseItemValue(element.getAttribute('value') || ''),
      cleanPawesomeHouseItemValue(firstImage && (firstImage.getAttribute('alt') || firstImage.getAttribute('title')) || '')
    ];
    for (var i = 0; i < candidateValues.length; i++) {
      if (candidateValues[i]) return candidateValues[i];
    }
    return typeof fallbackIndex === 'number' ? ('Item ' + (fallbackIndex + 1)) : '';
  }

  function isPawesomeHouseOptionGroup(element) {
    if (!element || !element.querySelectorAll) return false;
    if (element.querySelector('[class*=review], [class*=rating], [class*=sort], [class*=gallery], [class*=thumbnail]')) return false;
    var hasTitle = !!(element.querySelector('legend, h1, h2, h3, h4, h5, h6, label, [class*=title], [class*=label], [class*=option-title]'));
    var optionCandidates = element.querySelectorAll('button, [role="button"], [role="radio"], [role="option"], input[type="radio"] + label, label[for], .swatch, .swatch-element, .option, .option-item, .value, span, div');
    var withValue = 0;
    optionCandidates.forEach(function(optEl) {
      var value = extractPawesomeHouseItemValue(optEl);
      if (value && !isHelperValueText(value)) withValue++;
    });
    return hasTitle && withValue >= 2;
  }

  // pawesomehouse.com specific scanner for visual swatches rendered as buttons/images/labels.
  function scanPawesomeHouseVisualOptions() {
    if (!isPawesomeHousePage()) return [];
    var groups = [];
    var root = document.querySelector('form[action*="/cart/add"], .product-form, .product__info-wrapper, main') || document;
    var candidateGroups = root.querySelectorAll('fieldset, .product-form__input, .product__input, [class*=personal], [class*=custom], [class*=option], [data-option], [data-property]');
    candidateGroups.forEach(function(groupEl) {
      if (!isPawesomeHouseOptionGroup(groupEl)) return;
      var titleEl = groupEl.querySelector('legend, [class*=option-title], [class*=title], [class*=label], label, h3, h4, h5');
      var title = cleanPawesomeHouseGroupTitle((titleEl && (titleEl.innerText || titleEl.textContent)) || '');
      if (!title) return;

      var optionEls = groupEl.querySelectorAll('button, [role="button"], [role="radio"], [role="option"], input[type="radio"] + label, label[for], .swatch, .swatch-element, .option, .option-item, .value, li, span, div');
      var options = [];
      optionEls.forEach(function(optEl) {
        if (optEl.querySelector && optEl.querySelector('svg') && !optEl.innerText.trim() && !optEl.getAttribute('aria-label')) return;
        var value = extractPawesomeHouseItemValue(optEl);
        if (!value || isHelperValueText(value)) return;
        options.push({ textContent: value, value: value, label: value, element: optEl });
      });
      options = dedupePawesomeHouseItems(options);
      if (options.length < 2) return;
      groups.push({ label: title, options: options, element: groupEl });
    });
    return cleanupPawesomeHouseGroups(groups);
  }

  function buildGroupContentSignature(group) {
    var label = normalizeText(group && group.label || '');
    var values = (Array.isArray(group && group.options) ? group.options : []).map(function(opt) {
      return normalizeText(opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '');
    }).filter(Boolean).sort();
    return label + '||' + values.join('|');
  }

  function isDuplicateGroup(existing, candidate) {
    if (!existing || !candidate) return false;
    var a = buildGroupContentSignature(existing);
    var b = buildGroupContentSignature(candidate);
    if (!a || !b) return false;
    if (a === b) return true;
    var aLabel = normalizeText(existing.label || '');
    var bLabel = normalizeText(candidate.label || '');
    if (!aLabel || !bLabel || aLabel !== bLabel) return false;
    var aVals = new Set((Array.isArray(existing.options) ? existing.options : []).map(function(opt) {
      return normalizeText(opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '');
    }).filter(Boolean));
    var bVals = new Set((Array.isArray(candidate.options) ? candidate.options : []).map(function(opt) {
      return normalizeText(opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '');
    }).filter(Boolean));
    var overlap = 0;
    aVals.forEach(function(v) { if (bVals.has(v)) overlap++; });
    var minSize = Math.min(aVals.size || 1, bVals.size || 1);
    return overlap > 0 && (overlap / minSize) >= 0.9;
  }

  function isPawesomeHouseJunkGroup(group) {
    if (!group) return false;
    var normalizedTitle = normalizeText(group.label || group.title || '');
    var rejectTitleTokens = [
      'displayed publicly like', 'sort dropdown', 'sort by', 'reviews', 'review', 'rating', 'filter',
      'ordered', 'delivery', 'delivered', 'order ready', 'order now', 'get it by',
      'shipping', 'viet', 'please use standard english', 'exclude emojis'
    ];
    if (normalizedTitle) {
      for (var i = 0; i < rejectTitleTokens.length; i++) {
        if (normalizedTitle.indexOf(rejectTitleTokens[i]) >= 0) return true;
      }
    }

    var rejectValueTokens = new Set([
      'last_initial', 'first_name_only', 'all_initials', 'anonymous',
      'most-recent', 'highest-rating', 'lowest-rating', 'with-pictures',
      'pictures-first', 'videos-first', 'most-helpful'
    ]);

    var options = Array.isArray(group.options) ? group.options : [];
    if (!options.length) return false;
    var junkValueMatches = 0;
    var nonEmptyValues = 0;
    options.forEach(function(opt) {
      var raw = opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '';
      var normalized = normalizeText(raw);
      if (!normalized) return;
      nonEmptyValues++;
      if (rejectValueTokens.has(normalized)) junkValueMatches++;
    });

    if (nonEmptyValues > 0 && (junkValueMatches / nonEmptyValues) >= 0.5) return true;
    if (nonEmptyValues > 0) {
      var shippingMatches = 0;
      options.forEach(function(opt) {
        var rawValue = opt && (opt.textContent || opt.label || opt.name || opt.title || opt.value) || '';
        if (isShippingOrOrderText(rawValue) || isSkuLikeValue(rawValue)) shippingMatches++;
      });
      if ((shippingMatches / nonEmptyValues) >= 0.5) return true;
    }

    var container = group.element;
    if (container && container.querySelector) {
      if (container.querySelector('[class*=review], [id*=review], [class*=rating], [id*=rating], [class*=filter], [id*=filter], [class*=sort], [id*=sort]')) return true;
      var role = normalizeText((container.getAttribute && (container.getAttribute('role') || '')) || '');
      if (role === 'listbox' || role === 'menu') return true;
    }

    return false;
  }

  function cleanupPawesomeHouseGroups(groups) {
    var cleaned = [];
    (groups || []).forEach(function(group) {
      if (!group) return;
      // pawesomehouse.com specific post-scan cleanup for labels and values.
      group.label = cleanPawesomeHouseGroupTitle(group.label || group.title || '');
      sanitizeGroupValues(group);
      if (isPawesomeHouseJunkGroup(group)) return;
      if (!isRealOptionGroup(group)) return;
      var duplicateIndex = -1;
      for (var i = 0; i < cleaned.length; i++) {
        if (isDuplicateGroup(cleaned[i], group)) {
          duplicateIndex = i;
          break;
        }
      }
      if (duplicateIndex < 0) {
        cleaned.push(group);
        return;
      }
      var prev = cleaned[duplicateIndex];
      var prevCount = Array.isArray(prev.options) ? prev.options.length : 0;
      var nextCount = Array.isArray(group.options) ? group.options.length : 0;
      if (nextCount > prevCount) cleaned[duplicateIndex] = group;
    });
    return cleaned;
  }

  function cleanupScannedGroups(groups) {
    if (!isPawesomeHousePage()) return dedupeGroups(groups);
    return dedupeGroups(cleanupPawesomeHouseGroups(groups));
  }

  function stsDebugOptionText(option) {
    return {
      label: option?.label,
      name: option?.name,
      title: option?.title,
      text: option?.text,
      value: option?.value,
      textContent: option?.textContent,
      alt: option?.alt,
      src: option?.src,
      image: option?.image,
      imageUrl: option?.imageUrl,
      thumb: option?.thumb,
      elementText: option?.element?.textContent,
      elementHtml: option?.element?.outerHTML ? option.element.outerHTML.slice(0, 300) : ''
    };
  }

  function stsDebugGroupSnapshot(groups) {
    return (groups || []).map(function(group) {
      var options = Array.isArray(group && group.options) ? group.options : [];
      return {
        label: group && group.label,
        optionCount: options.length,
        first5Options: options.slice(0, 5).map(stsDebugOptionText)
      };
    });
  }

  // ---- DOM scanning ----
  // Strategy 1: Customily / Ant Design (wrappiness, macorner, etc.)
  // Strategy 2: Standard Shopify (product-form__input, swatch)
  // Strategy 3: Generic (fieldset, radio groups)

  function isPhysicalProductOptionGroup(group) {
    if (!group) return false;
    var label = normScanText(group.label || '').toLowerCase();
    var opts = Array.isArray(group.options) ? group.options : [];
    var optText = opts.map(function(o) {
      return normScanText(o && (o.textContent || o.label || o.name || o.title || o.value) || '').toLowerCase();
    }).filter(Boolean);
    var full = (label + ' ' + optText.join(' ')).trim();

    // All/Append is for artwork/design-changing personalization choices only.
    // Physical product variants like Product/Size/Material must not win over the design section.
    // Keep character/avatar personalization sizes such as "Kid Size" (Big / Small / Baby).
    if (/\b(size|product size)\b/i.test(label)) {
      if (/\b(kid|child|baby|dad|mom|person|people|character|avatar|pet)\b/i.test(label + ' ' + full)) return false;
      return true;
    }
    if (/\b(product|material|quantity|pack|set|shipping|delivery|gift card|gift box|warranty)\b/i.test(label)) return true;
    if (/^\d+\s*(in|inch|inches|cm|mm|oz|ml)\b/i.test(label)) return true;
    if (optText.length >= 2 && optText.every(function(t) { return /^\d+\s*(in|inch|inches|cm|mm|oz|ml)\b/i.test(t); })) return true;
    if (/\b(acrylic light box|canvas|poster|mug|blanket|shirt|hoodie|cap|ornament)\b/i.test(full) && /\b(size|product|material)\b/i.test(full)) return true;
    return false;
  }

  // Gossby personalization app scanner
  // Handles groups rendered as form.at-product-personalized-form > .pt-4,
  // where labels use PersonalizedForm_option-title... and options are .at-item cards.
  function scanGossbyAtPersonalizedForm() {
    var groups = [];
    var form = document.querySelector('form.at-product-personalized-form, .at-product-personalized-form');
    if (!form) return groups;

    var sectionNodes = Array.from(form.querySelectorAll('.pt-4, .mb-4, .form-part'));
    var seenLabels = new Set();

    sectionNodes.forEach(function(section) {
      var titleEl = section.querySelector('[class*="PersonalizedForm_option-title"]') ||
        section.querySelector('.font-semibold span') ||
        section.querySelector('.font-semibold');
      if (!titleEl) return;

      var label = normScanText(titleEl.textContent || '').replace(/\*/g, '').trim();
      if (!label || label.length > 80) return;

      var key = label.toLowerCase();
      if (seenLabels.has(key)) return;

      var optionEls = Array.from(section.querySelectorAll('.at-item'));
      if (optionEls.length < 2 || optionEls.length > 120) return;

      var options = [];
      var imgSeen = new Set();
      optionEls.forEach(function(el, idx) {
        var img = el.querySelector('img');
        var r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 20 || r.width > 260 || r.height > 260) return;

        var imageUrl = '';
        if (img) {
          imageUrl = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (imageUrl && imgSeen.has(imageUrl)) return;
          if (imageUrl) imgSeen.add(imageUrl);
        }

        var cls = String(el.className || '');
        options.push({
          element: el,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height, width: r.width, height: r.height },
          imageUrl: imageUrl,
          bgColor: null,
          textContent: '',
          isSelected: cls.indexOf('option-selected') >= 0 || cls.indexOf('at-item-selected') >= 0 || el.getAttribute('aria-checked') === 'true'
        });
      });

      if (options.length < 2) return;
      seenLabels.add(key);
      groups.push({
        label: label,
        element: section,
        options: options,
        rect: section.getBoundingClientRect(),
        source: 'gossby-at-product-personalized-form'
      });
    });

    if (groups.length) {
      console.log('[STS Clipart Pro 8.3 Clipart] Gossby at-product-personalized-form:', groups.map(function(g) { return '"' + g.label + '" (' + g.options.length + ')'; }).join(', '));
    }
    return dedupeGroups(groups);
  }

  async function scanDOMForAllVisible() {
    var allGroups = [];
    function upsertByRichness(group) {
      if (!group || !group.label || !group.options || group.options.length < 2) return;
      if (isPhysicalProductOptionGroup(group)) return;
      var key = normScanText(group.label).toLowerCase();
      if (!key) return;
      for (var i = 0; i < allGroups.length; i++) {
        var existing = allGroups[i];
        var existingKey = normScanText(existing && existing.label || '').toLowerCase();
        if (existingKey !== key) continue;
        var existingCount = existing && existing.options ? existing.options.length : 0;
        var nextCount = group && group.options ? group.options.length : 0;
        if (nextCount > existingCount) allGroups[i] = group;
        return;
      }
      allGroups.push(group);
    }

    ensureQuotePipelineReady();

    scanCustomily().forEach(upsertByRichness);
    scanShopifyStandard().forEach(upsertByRichness);
    scanPersonalizationForm().forEach(upsertByRichness);
    scanGossbyAtPersonalizedForm().forEach(upsertByRichness);
    scanSelectDropdowns().forEach(upsertByRichness);
    scanTextDropdowns().forEach(upsertByRichness);
    (await scanQuoteLikeFieldsAsync()).forEach(upsertByRichness);
    (await scanCallieTextDropdowns()).forEach(upsertByRichness);
    if (isPawesomeHousePage()) scanPawesomeHouseVisualOptions().forEach(upsertByRichness);

    // Important: do not early-return here. Macorner pages can expose physical Size first,
    // while design-changing swatches are only found by the generic/deep passes.
    scanGeneric().forEach(upsertByRichness);
    scanDeep().forEach(upsertByRichness);

    return cleanupScannedGroups(allGroups);
  }

  async function scanDOM() {
    let allGroups = [];

    function upsertByRichness(group) {
      if (!group || !group.label) return;
      var key = normScanText(group.label).toLowerCase();
      if (!key) return;
      for (var i = 0; i < allGroups.length; i++) {
        var existing = allGroups[i];
        var existingKey = normScanText(existing && existing.label || '').toLowerCase();
        if (existingKey !== key) continue;
        var existingCount = existing && existing.options ? existing.options.length : 0;
        var nextCount = group && group.options ? group.options.length : 0;
        if (nextCount > existingCount) allGroups[i] = group;
        return;
      }
      allGroups.push(group);
    }

    ensureQuotePipelineReady();

    var unifiedProfile = getUnifiedSiteProfile();
    if (unifiedProfile && !unifiedProfile.useLegacyGeneric) {
      return cleanupScannedGroups(scanFromUnifiedProfile(unifiedProfile, document));
    }

    var activeProfile = (window.STSSiteProfiles && typeof window.STSSiteProfiles.pickSiteProfile === 'function')
      ? window.STSSiteProfiles.pickSiteProfile(location.hostname)
      : { key: 'default', scanners: ['customily','shopify','personalizationForm','gossby','select','textDropdown','quote','callieText','generic','deep'] };
    var activeScanners = Array.isArray(activeProfile.scanners) ? activeProfile.scanners : [];

    // v8.3.0: Enhanced debug logging
    console.log('[STS Clipart Pro 8.3 Clipart] scanDOM() — Detecting frameworks:',
      'Profile:', activeProfile.key || 'default',
      'Scanners:', activeScanners.join(','),
      'Customily:', !!document.querySelector('.customall-grid, .ant-form-item'),
      'Teeinblue:', !!document.querySelector('.tib-field, [class*="tib-"]'),
      'by-form:', !!document.querySelector('.by-customization-form__element'),
      'Shopify form:', !!document.querySelector('.product-form__input, fieldset'),
      'All forms:', document.querySelectorAll('form').length,
      'All imgs:', document.querySelectorAll('img').length,
      'Iframes:', document.querySelectorAll('iframe').length
    );

    if (activeScanners.indexOf('customily') >= 0) {
      const customily = scanCustomily();
      if (customily.length) {
        console.log('[STS Clipart Pro 8.3 Clipart] Customily detected:', customily.length, 'groups');
        customily.forEach(upsertByRichness);
      }
    }

    if (activeScanners.indexOf('shopify') >= 0) {
      const shopify = scanShopifyStandard();
      if (shopify.length) {
        console.log('[STS Clipart Pro 8.3 Clipart] Shopify standard:', shopify.length, 'groups');
        shopify.forEach(upsertByRichness);
      }
    }

    if (activeScanners.indexOf('personalizationForm') >= 0) {
      const wpGroups = scanPersonalizationForm();
      if (wpGroups.length) {
        console.log('[STS Clipart Pro 8.3 Clipart] Personalization-form detected:', wpGroups.length, 'groups');
        wpGroups.forEach(upsertByRichness);
      }
    }

    if (activeScanners.indexOf('gossby') >= 0) {
      const gossbyGroups = scanGossbyAtPersonalizedForm();
      if (gossbyGroups.length) {
        console.log('[STS Clipart Pro 8.3 Clipart] Gossby detected:', gossbyGroups.length, 'groups');
        gossbyGroups.forEach(upsertByRichness);
      }
    }

    var selectGroups = [];
    var textDropdownGroups = [];
    var quoteGroups = [];
    var callieTextGroups = [];
    if (activeScanners.indexOf('select') >= 0) selectGroups = scanSelectDropdowns();
    if (activeScanners.indexOf('textDropdown') >= 0) textDropdownGroups = scanTextDropdowns();
    if (activeScanners.indexOf('quote') >= 0) quoteGroups = await scanQuoteLikeFieldsAsync();
    if (activeScanners.indexOf('callieText') >= 0) callieTextGroups = await scanCallieTextDropdowns();
    if (selectGroups.length || textDropdownGroups.length || quoteGroups.length || callieTextGroups.length) {
      console.log('[STS Clipart Pro 8.3 Clipart] Text dropdowns:', 'native=', selectGroups.length, 'custom=', textDropdownGroups.length, 'quote=', quoteGroups.length, 'callie=', callieTextGroups.length);
      [].concat(selectGroups, textDropdownGroups, quoteGroups, callieTextGroups).forEach(upsertByRichness);
    }
    if (false && isPawesomeHousePage()) {
      scanPawesomeHouseVisualOptions().forEach(upsertByRichness);
    }

    if (allGroups.length) {
      allGroups = cleanupScannedGroups(allGroups);
      console.groupCollapsed('[STS DEBUG] scanDOM groups');
      console.log(stsDebugGroupSnapshot(allGroups));
      console.groupEnd();
      console.log('[STS Clipart Pro 8.3 Clipart] Combined scan result:', allGroups.length, 'groups total');
      return allGroups;
    }

    const generic = activeScanners.indexOf('generic') >= 0 ? scanGeneric() : [];
    if (generic.length) {
      console.log('[STS Clipart Pro 8.3 Clipart] Generic scan:', generic.length, 'groups');
      var genericGroups = cleanupScannedGroups(generic.concat(selectGroups).concat(textDropdownGroups).concat(quoteGroups).concat(callieTextGroups));
      console.groupCollapsed('[STS DEBUG] scanDOM groups');
      console.log(stsDebugGroupSnapshot(genericGroups));
      console.groupEnd();
      return genericGroups;
    }

    const deep = activeScanners.indexOf('deep') >= 0 ? scanDeep() : [];
    console.log('[STS Clipart Pro 8.3 Clipart] Deep scan:', deep.length, 'groups');
    var deepGroups = cleanupScannedGroups(deep.concat(selectGroups).concat(textDropdownGroups).concat(quoteGroups).concat(callieTextGroups));
    console.groupCollapsed('[STS DEBUG] scanDOM groups');
    console.log(stsDebugGroupSnapshot(deepGroups));
    console.groupEnd();
    return deepGroups;
  }

  // ---- Select dropdown scanner ----
  function scanSelectDropdowns() {
    var groups = [];
    document.querySelectorAll('select').forEach(function(sel) {
      var r = rectData(sel);
      var hiddenTiny = r.w < 30 || r.h < 10;
      if (hiddenTiny && !isInPersonalizationScope(sel)) return;

      var label = extractLabelFromControl(sel);
      if (!label) return;

      var opts = collectOptionsFromNativeSelect(sel, r);
      if (opts.length < 2) return;

      groups.push({
        element: sel,
        label: label,
        options: opts,
        rect: r,
        isDropdown: true,
        isTextOnly: true
      });
    });
    return dedupeGroups(groups);
  }

  // ---- Custom text dropdown scanner (Ant / Headless UI / Radix / React Select) ----
  function scanTextDropdowns() {
    var groups = [];
    collectCustomDropdownControls().forEach(function(control) {
      var grp = buildTextDropdownGroup(control, findDropdownPopup(control));
      if (grp) groups.push(grp);
    });
    return dedupeGroups(groups);
  }

  function cleanCallieTextChoiceLabel(label) {
    return normScanText(label || '').replace(/\s*\*+\s*$/, '').trim();
  }

  function isDesignChangingOptionGroup(label, block) {
    var t = cleanCallieTextChoiceLabel(label).toLowerCase();
    if (!t) return false;
    var context = '';
    if (block) {
      var ctxNode = block.closest ? (block.closest('.by-customization-form__element, .ant-form-item, .product__info-block, .product__info-item') || block) : block;
      context = normScanText((ctxNode && ctxNode.textContent) || '').toLowerCase();
    }
    var full = (t + ' ' + context).trim();
    if (/\b(size|product size|product color|material|base color|wood color|lamp color|light color|led color|plug type|voltage|quantity|pack|set|shipping|delivery|gift box|greeting card|warranty|add[\s-]?on|extra|package)\b/.test(full)) return false;
    if (/\b(name|your name|custom name|enter name)\b/.test(t)) return false;
    if (/\b(character|avatar|person|family|hair|skin|outfit|pet|animal|title|quote|message|text|font|relationship|occasion|design|version|theme|template|layout|art|pattern|graphic|visual|scene|background|border|shape|effect|icon|flower)\b/.test(full)) return true;
    if (/\b(color|style|version|design|theme|type|pattern|layout|shape|border|frame|effect)\b/.test(t)) {
      if (/\b(product|physical|material|base|lamp|mug|size|package|shipping|gift box)\b/.test(full)) return false;
      if (/\b(artwork|design|character|avatar|hair|skin|shirt|flower|quote|background|pet|scene)\b/.test(full)) return true;
    }
    return /\b(title|quote|message|text|saying|phrase|wording|caption|header|subheading|line|sentence|poem|verse|blessing|greeting|font|typography|style|version|design|theme|template|layout|artwork|pattern|graphic|option|visual|look|scene|background|backdrop|border|shape|effect)\b/.test(t);
  }

  function isFreeTextControlNode(control, fieldRoot, label) {
    var t = cleanCallieTextChoiceLabel(label).toLowerCase();
    if (/^(name|custom name)$/.test(t)) return true;
    var root = fieldRoot || groupFieldRoot(control) || control;
    if (!root || !root.querySelector) return false;
    if (root.querySelector('textarea,[contenteditable="true"],[contenteditable=""]')) return true;
    var textInput = root.querySelector('input[type="text"],input:not([type]),input[type="search"]');
    if (!textInput) return false;
    if (root.querySelector('select,[role="combobox"],[aria-haspopup="listbox"]')) return false;
    var placeholder = normScanText((textInput.getAttribute('placeholder') || textInput.getAttribute('aria-label') || '')).toLowerCase();
    return !placeholder || /name|enter|type|write|custom/.test(placeholder);
  }

  async function scanCallieTextDropdowns() {
    var groups = [];
    var seen = new Set();
    var controls = collectCustomDropdownControls();
    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      if (!control || !isInPersonalizationScope(control) || fieldHasImageSwatches(control)) continue;
      var fieldRoot = groupFieldRoot(control);
      var rawLabel = extractLabelFromControl(control) || extractLabelFromControl(fieldRoot);
      var label = cleanCallieTextChoiceLabel(rawLabel);
      if (!label || !isDesignChangingOptionGroup(label, fieldRoot || control)) continue;
      if (isFreeTextControlNode(control, fieldRoot, label)) continue;
      var key = label.toLowerCase();
      if (seen.has(key)) continue;
      var grp = buildTextDropdownGroup(control, findDropdownPopup(control));
      if (!grp || !grp.options || grp.options.length < 2) continue;
      grp.label = label;
      seen.add(key);
      groups.push(grp);
    }
    return dedupeGroups(groups);
  }

  
  var QUOTE_DEBUG_PREFIX = '[STS Clipart Pro 8.3 Quote Debug]';

  function quoteDebugMeta(node) {
    if (!node) return null;
    var cls = '';
    try {
      cls = (node.className && typeof node.className === 'string') ? node.className.trim().replace(/\s+/g, '.') : '';
    } catch(e) {}
    var tag = '';
    try { tag = (node.tagName || '').toLowerCase(); } catch(e) {}
    var text = '';
    try { text = normScanText(node.getAttribute && (node.getAttribute('title') || node.getAttribute('aria-label')) || node.textContent || ''); } catch(e) {}
    if (text && text.length > 120) text = text.slice(0, 117) + '...';
    return {
      tag: tag || '',
      id: node.id || '',
      cls: cls || '',
      text: text || ''
    };
  }

  function logQuoteDebug(stage, payload) {
    try {
      console.log(QUOTE_DEBUG_PREFIX, stage, payload || {});
    } catch(e) {}
  }


  var QUOTE_SCAN_CACHE = new Map();
  var QUOTE_CAPTURE_TIMERS = new Map();
  var _quotePipelineReady = false;
  var _quotePopupObserver = null;
  var _quoteScrollBound = false;

  function quoteLabelKey(label) {
    return normScanText(label || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function quoteControlType(control) {
    if (!control || !control.matches) return 'unknown';
    if (control.matches('select')) return 'native-select';
    if (control.matches('.ant-select, .ant-select *')) return 'ant-select';
    if (control.matches('[role="combobox"], input[role="combobox"]')) return 'combobox';
    if (control.matches('button[aria-haspopup="listbox"], [aria-haspopup="listbox"]')) return 'listbox-button';
    return (control.tagName || 'unknown').toLowerCase();
  }

  function quoteDomPath(node) {
    var parts = [];
    var cur = node;
    var depth = 0;
    while (cur && cur.nodeType === 1 && depth < 4) {
      var tag = (cur.tagName || '').toLowerCase();
      if (!tag) break;
      var part = tag;
      if (cur.id) {
        part += '#' + cur.id;
        parts.unshift(part);
        break;
      }
      var cls = '';
      try {
        cls = (cur.className && typeof cur.className === 'string') ? cur.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      } catch(e) {}
      if (cls) part += '.' + cls;
      var parent = cur.parentElement;
      if (parent && parent.children) {
        var idx = Array.prototype.indexOf.call(parent.children, cur);
        if (idx >= 0) part += ':nth(' + idx + ')';
      }
      parts.unshift(part);
      cur = cur.parentElement;
      depth++;
    }
    return parts.join('>');
  }

  function buildQuoteFieldSignature(fieldRoot, control, label) {
    var root = fieldRoot || groupFieldRoot(control) || control || document.body;
    var normalizedLabel = quoteLabelKey(label || extractLabelFromControl(control || root) || extractLabelFromControl(root) || '');
    var controlType = quoteControlType(control || root);
    var path = quoteDomPath(root);
    var pagePath = '';
    try { pagePath = (location && location.pathname) ? location.pathname : ''; } catch(e) {}
    return [normalizedLabel, controlType, path, pagePath].join('|');
  }

  function cloneQuoteOption(opt) {
    if (!opt) return null;
    var rect = opt.rect || rectData(opt.element || document.body);
    return {
      element: opt.element || null,
      rect: { x: rect.x || 0, y: rect.y || 0, w: rect.w || 0, h: rect.h || 0 },
      imageUrl: opt.imageUrl || null,
      bgColor: opt.bgColor || null,
      textContent: opt.textContent || opt.label || opt.text || '',
      isSelected: !!opt.isSelected,
      capturedImage: opt.capturedImage || opt.imageUrl || null,
      index: typeof opt.index === 'number' ? opt.index : 0
    };
  }

  function cloneQuoteOptions(options) {
    var out = [];
    (options || []).forEach(function(opt) {
      var cloned = cloneQuoteOption(opt);
      if (cloned) out.push(cloned);
    });
    return out;
  }

  function readCachedQuoteOptions(fieldRoot, control, label, currentText) {
    var signature = buildQuoteFieldSignature(fieldRoot, control, label);
    var exact = QUOTE_SCAN_CACHE.get(signature) || null;
    var normalizedLabel = quoteLabelKey(label);
    if (!exact && normalizedLabel) {
      QUOTE_SCAN_CACHE.forEach(function(entry) {
        if (exact) return;
        if (!entry || entry.labelKey !== normalizedLabel) return;
        exact = entry;
      });
    }
    if (!exact || !exact.options || !exact.options.length) return [];
    return normalizeQuoteOptions(cloneQuoteOptions(exact.options), currentText || exact.currentText || '');
  }

  function storeQuoteCache(fieldRoot, control, label, options, source, currentText) {
    var normalized = normalizeQuoteOptions(options || [], currentText || '');
    if (!normalized.length) return [];
    var signature = buildQuoteFieldSignature(fieldRoot, control, label);
    var entry = QUOTE_SCAN_CACHE.get(signature);
    if (entry && entry.options && entry.options.length > normalized.length) {
      return cloneQuoteOptions(entry.options);
    }
    QUOTE_SCAN_CACHE.set(signature, {
      signature: signature,
      label: label || '',
      labelKey: quoteLabelKey(label),
      controlType: quoteControlType(control || fieldRoot),
      currentText: currentText || '',
      source: source || 'unknown',
      options: cloneQuoteOptions(normalized),
      updatedAt: Date.now()
    });
    if (QUOTE_SCAN_CACHE.size > 80) {
      var keys = Array.from(QUOTE_SCAN_CACHE.keys()).slice(0, Math.max(0, QUOTE_SCAN_CACHE.size - 80));
      keys.forEach(function(key) { QUOTE_SCAN_CACHE.delete(key); });
    }
    logQuoteDebug('cache-store', {
      label: label || '',
      source: source || 'unknown',
      count: normalized.length,
      field: quoteDebugMeta(fieldRoot),
      control: quoteDebugMeta(control || fieldRoot)
    });
    return cloneQuoteOptions(normalized);
  }

  function buildQuoteGroup(root, label, options) {
    var normalized = normalizeQuoteOptions(options || [], readSelectedQuoteText(root, findQuoteDropdownControl(root) || root));
    if (!normalized.length) return null;
    return {
      element: root,
      label: label,
      options: normalized,
      rect: rectData(root),
      isDropdown: true,
      isTextOnly: true
    };
  }

  async function maybeCaptureQuotePopup(fieldRoot, control, popup, reason, useVirtualScroll) {
    var root = fieldRoot || groupFieldRoot(control) || control;
    if (!root || !control) return [];
    var label = extractLabelFromControl(control || root) || extractLabelFromControl(root) || '';
    if (!labelLooksLikeQuoteField(label)) return [];
    var currentText = readSelectedQuoteText(root, control);
    var livePopup = popup || findDropdownPopup(control);
    if (!livePopup) return [];
    var options = useVirtualScroll
      ? await collectAntPopupOptionsWithVirtualScroll(control, livePopup, currentText)
      : normalizeQuoteOptions(collectOptionsFromPopup(control, livePopup), currentText);
    if (options.length >= 2) {
      return storeQuoteCache(root, control, label, options, reason || 'popup', currentText);
    }
    return options;
  }

  async function captureQuoteFieldOptions(fieldRoot, control, reason, allowOpen) {
    var root = fieldRoot || groupFieldRoot(control) || control;
    if (!root || fieldHasImageSwatches(root)) return [];
    var dropdownControl = control || findQuoteDropdownControl(root);
    var label = extractLabelFromControl(dropdownControl || root) || extractLabelFromControl(root) || '';
    if (!label || !labelLooksLikeQuoteField(label)) return [];
    var currentText = readSelectedQuoteText(root, dropdownControl || root);

    var nativeSelect = root.querySelector ? root.querySelector('select') : null;
    if (nativeSelect) {
      var nativeOptions = normalizeQuoteOptions(collectOptionsFromNativeSelect(nativeSelect, rectData(root)), currentText);
      if (nativeOptions.length >= 2) {
        return storeQuoteCache(root, nativeSelect, label, nativeOptions, reason || 'native', currentText);
      }
    }

    if (dropdownControl) {
      var popupOptions = await maybeCaptureQuotePopup(root, dropdownControl, findDropdownPopup(dropdownControl), reason || 'popup', false);
      if (popupOptions.length >= 2) return popupOptions;
    }

    var inlineOptions = normalizeQuoteOptions(collectOptionsFromFieldRoot(dropdownControl || root, label, currentText), currentText);
    if (inlineOptions.length >= 2) {
      return storeQuoteCache(root, dropdownControl || root, label, inlineOptions, reason || 'inline', currentText);
    }

    var fallbackOptions = normalizeQuoteOptions(collectQuoteFallbackDataOptions(root, label, currentText), currentText);
    if (fallbackOptions.length >= 2) {
      return storeQuoteCache(root, dropdownControl || root, label, fallbackOptions, reason || 'fallback', currentText);
    }

    if (allowOpen && dropdownControl) {
      var ownScanState = null;
      try {
        ownScanState = await openDropdownForScan(dropdownControl);
        var livePopup = ownScanState && ownScanState.popup ? ownScanState.popup : findDropdownPopup(dropdownControl, ownScanState ? ownScanState.beforeSet : null);
        if (livePopup) {
          var openedOptions = await maybeCaptureQuotePopup(root, dropdownControl, livePopup, reason || 'active-open', true);
          if (openedOptions.length >= 2) return openedOptions;
        }
      } finally {
        if (ownScanState && ownScanState.openedByScanner) {
          await closeDropdownForScan(dropdownControl, true);
        }
      }
    }

    return readCachedQuoteOptions(root, dropdownControl || root, label, currentText);
  }

  function scheduleQuoteCapture(fieldRoot, control, reason, allowOpen) {
    var root = fieldRoot || groupFieldRoot(control) || control;
    if (!root) return;
    var label = extractLabelFromControl(control || root) || extractLabelFromControl(root) || '';
    if (!labelLooksLikeQuoteField(label)) return;
    var key = buildQuoteFieldSignature(root, control || root, label);
    clearTimeout(QUOTE_CAPTURE_TIMERS.get(key));
    QUOTE_CAPTURE_TIMERS.set(key, setTimeout(function() {
      QUOTE_CAPTURE_TIMERS.delete(key);
      captureQuoteFieldOptions(root, control || root, reason || 'scheduled', !!allowOpen).catch(function(err) {
        logQuoteDebug('capture-error', {
          reason: reason || 'scheduled',
          label: label,
          error: err && err.message ? err.message : String(err)
        });
      });
    }, allowOpen ? 80 : 40));
  }

  function watchVisibleQuotePopups() {
    findQuoteFieldCandidates(document).forEach(function(fieldRoot) {
      var control = findQuoteDropdownControl(fieldRoot) || fieldRoot.querySelector && fieldRoot.querySelector('select') || fieldRoot;
      if (!control) return;
      var popup = findDropdownPopup(control);
      if (popup) {
        scheduleQuoteCapture(fieldRoot, control, 'observer-visible-popup', false);
      }
    });
  }

  function bindQuoteActivityListeners() {
    if (_quoteScrollBound) return;
    _quoteScrollBound = true;
    var handler = function(event) {
      var target = event && event.target;
      if (!target || !target.closest) return;
      var fieldRoot = target.closest('.ant-form-item, .form-group, .product-form__input, fieldset, .by-customization-form__element, .by-customization-form_element, [class*="form__element"], [class*="personalization"], .product__info-block, .product__info-item');
      if (!fieldRoot) return;
      var control = findQuoteDropdownControl(fieldRoot) || fieldRoot.querySelector && fieldRoot.querySelector('select') || fieldRoot;
      var label = extractLabelFromControl(control || fieldRoot) || extractLabelFromControl(fieldRoot) || '';
      if (!labelLooksLikeQuoteField(label)) return;
      scheduleQuoteCapture(fieldRoot, control, event.type === 'click' ? 'user-click' : 'user-focus', false);
    };
    document.addEventListener('focusin', handler, true);
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('click', handler, true);
  }

  function ensureQuotePipelineReady() {
    if (_quotePipelineReady) return;
    _quotePipelineReady = true;
    bindQuoteActivityListeners();

    var startObserver = function() {
      if (_quotePopupObserver || !document.body || !window.MutationObserver) return;
      _quotePopupObserver = new MutationObserver(function(mutations) {
        var sawQuotePopup = false;
        for (var i = 0; i < mutations.length; i++) {
          var mut = mutations[i];
          var nodes = [];
          if (mut.type === 'attributes' && mut.target) nodes.push(mut.target);
          if (mut.addedNodes && mut.addedNodes.length) nodes = nodes.concat(Array.from(mut.addedNodes));
          for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            if (!node || node.nodeType !== 1) continue;
            if ((node.matches && node.matches('.ant-select-dropdown, [role="listbox"], .rc-virtual-list-holder')) ||
                (node.querySelector && node.querySelector('.ant-select-dropdown, [role="listbox"], .rc-virtual-list-holder'))) {
              sawQuotePopup = true;
              break;
            }
          }
          if (sawQuotePopup) break;
        }
        if (sawQuotePopup) watchVisibleQuotePopups();
      });
      _quotePopupObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-expanded']
      });
      watchVisibleQuotePopups();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    } else {
      startObserver();
    }

    setTimeout(function() {
      findQuoteFieldCandidates(document).forEach(function(fieldRoot) {
        var control = findQuoteDropdownControl(fieldRoot) || fieldRoot.querySelector && fieldRoot.querySelector('select') || fieldRoot;
        scheduleQuoteCapture(fieldRoot, control, 'initial-passive-warm', false);
      });
    }, 500);
  }

  async function scanQuoteLikeFieldsAsync() {
    ensureQuotePipelineReady();
    var groups = [];
    var candidates = findQuoteFieldCandidates(document);
    for (var i = 0; i < candidates.length; i++) {
      var fieldRoot = candidates[i];
      var control = findQuoteDropdownControl(fieldRoot) || fieldRoot.querySelector && fieldRoot.querySelector('select') || fieldRoot;
      var grp = await scanQuoteFieldWithTiers(fieldRoot, control || fieldRoot, control ? findDropdownPopup(control) : null);
      if (grp) groups.push(grp);
    }
    return dedupeGroups(groups);
  }

  ensureQuotePipelineReady();


function scanQuoteLikeFieldsSync() {
    var groups = [];
    findQuoteFieldCandidates(document).forEach(function(fieldRoot, idx) {
      var control = findQuoteDropdownControl(fieldRoot) || fieldRoot.querySelector && fieldRoot.querySelector('select') || fieldRoot;
      var popup = control ? findDropdownPopup(control) : null;
      var label = extractLabelFromControl(control || fieldRoot) || extractLabelFromControl(fieldRoot) || '';
      var popupOptionCount = popup ? countPopupOptions(popup) : 0;
      logQuoteDebug('popup-check', {
        index: idx,
        label: label,
        field: quoteDebugMeta(fieldRoot),
        control: quoteDebugMeta(control || fieldRoot),
        popupFound: !!popup,
        popupOptions: popupOptionCount,
        expanded: !!(control && dropdownExpanded(control)),
        syncPath: true,
        note: popup ? 'sync quote scanner found an existing popup' : 'sync quote scanner did not open popup; it only reads existing popup/current value'
      });
      var grp = buildQuoteLikeFieldGroupSync(fieldRoot, control || fieldRoot, popup);
      if (grp) groups.push(grp);
    });
    return dedupeGroups(groups);
  }


  // ---- Customily / Ant Design scanner ----

  // Scan ALL .customall-grid elements in DOM order (preserves website layout order)
  // Labeled grids get their label, unlabeled grids infer from previous labeled grid
  function scanCustomily() {
    var groups = [];
    
    // Strategy: iterate ALL .customall-grid in DOM order
    var allGrids = document.querySelectorAll('.customall-grid');
    if (allGrids.length === 0) {
      // Fallback: try .ant-form-item approach
      return scanCustomilyFallback();
    }
    
    var lastLabel = '';
    var lastLabelFormItem = null;
    allGrids.forEach(function(grid) {
      // Find parent .ant-form-item and its label
      var parent = grid.closest('.ant-form-item');
      var labelEl = parent ? parent.querySelector('.ant-form-item-label label') : null;
      var label = labelEl ? labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ') : '';
      
      // Collect options from this grid (images OR color swatches)
      var opts = [];
      
      // Strategy 1: Images
      grid.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg')) return;
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wrapper = img.parentElement;
        var wr = wrapper ? wrapper.getBoundingClientRect() : r;
        opts.push({
          element: wrapper || img,
          rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
          imageUrl: img.src,
          bgColor: null,
          textContent: img.alt || '',
          isSelected: false,
        });
      });
      
      // Strategy 2: Color swatch divs (Skin Tone uses background-color divs, no imgs)
      if (opts.length < 2) {
        var swatchDivs = grid.querySelectorAll('[class*="image-item"], [style*="background-color"], [style*="background"]');
        if (swatchDivs.length < 2) swatchDivs = grid.children;
        for (var ci = 0; ci < swatchDivs.length; ci++) {
          var child = swatchDivs[ci];
          var r = child.getBoundingClientRect();
          if (r.width < 15 || r.height < 15 || r.width > 200) continue;
          
          // Find element with background-color
          var bgEl = child.querySelector('[style*="background"]') || child;
          var bgStyle = bgEl.style.backgroundColor || '';
          if (!bgStyle) {
            try { bgStyle = getComputedStyle(bgEl).backgroundColor; } catch(e) {}
          }
          
          if (bgStyle && bgStyle !== 'transparent' && bgStyle !== 'rgba(0, 0, 0, 0)') {
            opts.push({
              element: child,
              rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null,
              bgColor: bgStyle,
              textContent: '',
              isSelected: child.classList.contains('active') || child.classList.contains('selected'),
            });
          }
        }
      }
      
      // If no imgs, check for COLOR SWATCHES (divs with background-color)
      if (opts.length < 2) {
        var directKids = grid.children;
        for (var dk = 0; dk < directKids.length; dk++) {
          var kid = directKids[dk];
          var r = kid.getBoundingClientRect();
          if (r.width < 15 || r.height < 15 || r.width > 300) continue;
          var colorEl = kid.querySelector('[style*="background"]') || kid;
          var bgColor = '';
          var inlineStyle = colorEl.getAttribute('style') || '';
          var bgMatch = inlineStyle.match(/background-color:\s*([^;]+)/);
          if (bgMatch) bgColor = bgMatch[1].trim();
          if (!bgColor) {
            try {
              var comp = window.getComputedStyle(colorEl);
              bgColor = comp.backgroundColor || '';
              if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') bgColor = '';
            } catch(e) {}
          }
          var kidImg = kid.querySelector('img');
          if (kidImg && kidImg.src && !kidImg.src.startsWith('data:image/svg')) {
            opts.push({ element: kid, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: kidImg.src, bgColor: null, textContent: kidImg.alt || '', isSelected: false });
          } else if (bgColor) {
            opts.push({ element: kid, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null, bgColor: bgColor, textContent: '', isSelected: false });
          }
        }
      }
      
      if (opts.length < 2) return;
      
      if (label) {
        // Labeled grid — use as-is
        lastLabel = label;
        lastLabelFormItem = parent;
        
        // Skip text input groups
        if (label.toLowerCase().includes('type ') || label.toLowerCase().includes('name initial')) return;
        
        groups.push({ element: parent || grid, label: label, options: opts, rect: grid.getBoundingClientRect() });
      } else {
        // Unlabeled grid — infer name from previous labeled grid
        // Also check which option is currently SELECTED in the parent trigger group
        var inferredLabel = '';
        var ll = lastLabel.toLowerCase();
        
        // Get the last clicked option text for naming
        var selectedText = '';
        var lastClick = window.__stsLastClick;
        if (lastClick && lastClick.groupName === lastLabel) {
          selectedText = lastClick.optionText || '';
        }
        // Fallback: check DOM for selected state
        if (!selectedText && lastLabelFormItem) {
          var allOpts = lastLabelFormItem.querySelectorAll('.ant-form-item-children img');
          allOpts.forEach(function(si) {
            var w = si.parentElement;
            if (w && (w.classList.contains('selected') || w.classList.contains('active'))) {
              selectedText = si.alt || si.title || w.textContent.trim() || '';
            }
          });
        }
        
        if (ll.includes('hair color')) {
          inferredLabel = lastLabel.replace(/Hair Color/i, 'Hair Style');
        } else if (ll.includes('beard color')) {
          inferredLabel = lastLabel.replace(/Beard Color/i, 'Beard Style');
        } else if (ll.includes('outfit') || ll.includes('t-shirt') || ll.includes('tshirt')) {
          if (selectedText && selectedText.length < 20) {
            // "Dad's Outfit" + "SWEATSHIRT" → "Dad's Sweatshirt"
            var personPrefix = lastLabel.match(/^[\w']+(?:'s)?\s*/);
            var cleanText = selectedText.replace(/[^a-zA-Z\s]/g, '').trim();
            inferredLabel = (personPrefix ? personPrefix[0] : '') + cleanText.charAt(0).toUpperCase() + cleanText.slice(1).toLowerCase();
          } else {
            inferredLabel = lastLabel.replace(/Outfit|T-Shirt|Tshirt/i, 'Outfit Style');
            if (!inferredLabel.includes('Style')) inferredLabel = lastLabel + ' Style';
          }
        } else if (ll.includes('drink')) {
          inferredLabel = lastLabel + ' Detail';
        } else {
          inferredLabel = lastLabel + ' Detail';
        }
        
        groups.push({ element: grid, label: inferredLabel, options: opts, rect: grid.getBoundingClientRect() });
      }
    });
    
    // Also scan .ant-form-item that DON'T have .customall-grid (text-based options like Age Range with text)
    document.querySelectorAll('.ant-form-item').forEach(function(formItem) {
      var labelEl = formItem.querySelector('.ant-form-item-label label');
      if (!labelEl) return;
      var label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (!label || label.length > 60) return;
      
      // Skip if already captured via grid scan (by checking label match)
      var alreadyCaptured = false;
      for (var gc = 0; gc < groups.length; gc++) {
        if (groups[gc].label === label) { alreadyCaptured = true; break; }
      }
      if (alreadyCaptured) return;
      
      // Skip text inputs
      var hasTextInput = formItem.querySelector('input[type="text"], textarea, .ant-input');
      if (hasTextInput && !formItem.querySelector('img')) return;
      
      var children = formItem.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
      if (!children) return;
      
      var opts = [];
      
      // Images
      children.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg')) return;
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wrapper = img.parentElement;
        var wr = wrapper ? wrapper.getBoundingClientRect() : r;
        opts.push({
          element: wrapper || img,
          rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
          imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false,
        });
      });
      
      // Text-based options (WIFE, YOUNG MAN, etc.)
      if (opts.length === 0) {
        var directChildren = children.querySelector('div')?.children;
        if (directChildren) {
          Array.from(directChildren).forEach(function(el) {
            var r = el.getBoundingClientRect();
            if (r.width < 20 || r.height < 20 || r.width > 200) return;
            var text = el.textContent.trim();
            if (!text || text.length > 30) return;
            opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null, bgColor: null, textContent: text, isSelected: false });
          });
        }
      }
      
      if (opts.length >= 2) {
        // Insert in correct DOM order based on vertical position
        var y = formItem.getBoundingClientRect().top;
        var insertIdx = groups.length;
        for (var gi = 0; gi < groups.length; gi++) {
          if (groups[gi].rect.top > y) { insertIdx = gi; break; }
        }
        groups.splice(insertIdx, 0, { element: formItem, label: label, options: opts, rect: formItem.getBoundingClientRect() });
      }
    });
    
    // Dedup: remove groups with same BASE label (strip #N, trailing numbers, etc.)
    // "Choose An Option #1" and "Choose An Option #2" → same base → keep only first
    // "Girl's Skin Tone #1" and "Girl's Skin Tone #2" → same base → keep only first  
    // BUT "Dad's Sweatshirt" vs "Dad's Pajamas" → different base → keep both
    var seenBaseLabels = {};
    groups = groups.filter(function(g) {
      // Strip trailing: #N, #N suffix, numbered suffix patterns
      var base = g.label
        .replace(/\s*#\d+\s*$/i, '')           // "Choose An Option #1" → "Choose An Option"
        .replace(/\s*\(\d+\)\s*$/i, '')         // "Skin Tone (2)" → "Skin Tone"
        .replace(/\s+\d+\s*$/i, '')             // "Woman's Hair Color 2" → "Woman's Hair Color"
        .replace(/\s*#\d+\s*/g, ' ')            // "Girl's Skin Tone #1" → "Girl's Skin Tone"
        .replace(/\s+/g, ' ').trim();
      
      var key = base + '|' + g.options.length;
      if (seenBaseLabels[key]) return false;
      seenBaseLabels[key] = true;
      return true;
    });
    
    return groups;
  }
  function scanCustomilyFallback() {
    var groups = [];
    document.querySelectorAll('.ant-row.ant-form-item, .ant-form-item').forEach(function(formItem) {
      var labelEl = formItem.querySelector('.ant-form-item-label label, .ant-form-item-label span');
      if (!labelEl) return;
      var label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (!label || label.length > 60) return;
      var hasTextInput = formItem.querySelector('input[type="text"], textarea, .ant-input');
      if (hasTextInput && !formItem.querySelector('img')) return;
      var children = formItem.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
      if (!children) return;
      var opts = [];
      children.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg')) return;
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wrapper = img.parentElement;
        var wr = wrapper ? wrapper.getBoundingClientRect() : r;
        opts.push({ element: wrapper || img, rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
          imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false });
      });
      if (opts.length === 0) {
        var directChildren = children.querySelector('div')?.children;
        if (directChildren) {
          Array.from(directChildren).forEach(function(el) {
            var r = el.getBoundingClientRect();
            if (r.width < 20 || r.height < 20 || r.width > 200) return;
            var text = el.textContent.trim();
            if (!text || text.length > 30) return;
            opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null, bgColor: null, textContent: text, isSelected: false });
          });
        }
      }
      if (opts.length >= 2) {
        groups.push({ element: formItem, label: label, options: opts, rect: formItem.getBoundingClientRect() });
      }
    });
    return groups;
  }

  // ---- Standard Shopify scanner ----
  function scanShopifyStandard() {
    const groups = [];
    // v8.0.8: Extended selectors for macorner.co, wrappiness.com, pawfecthouse.com, etc.
    const GROUP_SELS = [
      '.product-form__input', '.swatch', 'fieldset', '[data-option-index]',
      '.product__option', '.variant-wrapper',
      // Teeinblue / other personalizers
      '.tib-field', '.tib-option', '[class*="tib-"]',
      // Generic personalization wrappers
      '.personalization-option', '[class*="personalization"]',
      '.option-selector', '.option-group', '.form-field',
      '[class*="option-wrap"]', '[class*="customizer"]',
      // Macorner / Pawfecthouse patterns
      '.product-single__option', '[class*="product-option"]',
    ];
    const LABEL_SELS = [
      'label', 'legend', '.product-form__input-label', '.swatch__label',
      '.option-name', '.form__label', 'h5', 'h4',
      '.tib-label', '[class*="field-label"]', '[class*="option-label"]',
      'strong', '.label',
    ];
    const ITEM_SELS = [
      'label:has(input[type="radio"])', '.swatch__value', '.color-swatch',
      '[data-value]', '.option-value', '.product-form__radio-label',
      // Extended: image-based options
      '[class*="swatch-item"]', '[class*="option-item"]',
      '[class*="color-option"]', '[class*="image-option"]',
      '.tib-item', '[class*="tib-option-item"]',
    ];
    const tried = new Set();

    for (const gSel of GROUP_SELS) {
      try {
        document.querySelectorAll(gSel).forEach(el => {
          if (tried.has(el)) return;
          tried.add(el);
          let label = '';
          for (const lSel of LABEL_SELS) {
            const lEl = el.querySelector(lSel);
            if (lEl) { label = lEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' '); if (label.length > 0 && label.length < 60) break; label = ''; }
          }
          if (!label) return;
          const opts = [];
          const optTried = new Set();
          for (const iSel of ITEM_SELS) {
            try {
              el.querySelectorAll(iSel).forEach(item => {
                if (optTried.has(item)) return; optTried.add(item);
                const r = item.getBoundingClientRect();
                if (r.width < 15 || r.height < 15 || r.width > 300) return;
                const img = item.querySelector('img');
                const bgc = getComputedStyle(item).backgroundColor;
                opts.push({
                  element: item, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                  imageUrl: img?.src || null, bgColor: (bgc && bgc !== 'rgba(0, 0, 0, 0)') ? bgc : null,
                  textContent: item.textContent.trim().substring(0, 30), isSelected: false,
                });
              });
            } catch(e) {}
          }
          if (opts.length >= 2) groups.push({ element: el, label, options: opts, rect: el.getBoundingClientRect() });
        });
      } catch(e) {}
    }
    return groups.filter((g, i) => !groups.some((o, j) => i !== j && o.element.contains(g.element) && o.options.length >= g.options.length));
  }

  // ---- v3.0.4: Wanderprints / by-customization-form scanner ----
  // Structure: .by-customization-form__label (SPAN) inside .by-customization-form_element (DIV)
  // Swatches: .by-image-swatch__swatch inside same parent DIV
  function scanPersonalizationForm() {
    const groups = [];
    
    // Find all labels with this specific class
    const labels = document.querySelectorAll('.by-customization-form__label');
    if (!labels.length) {
      // Fallback: try form.personalization-form approach
      const form = document.querySelector('form.personalization-form, .personalization-form');
      if (!form) return groups;
      // Look for any labeled sections with swatches
      form.querySelectorAll('[class*="customization-form_element"], [class*="form_element"]').forEach(el => {
        const labelEl = el.querySelector('[class*="form__label"], label, strong, h4, h5');
        if (!labelEl) return;
        const swatches = el.querySelectorAll('[class*="swatch__swatch"], [class*="image-swatch"]');
        if (swatches.length < 2) return;
        const label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '');
        const options = [];
        swatches.forEach((sw, i) => {
          const img = sw.querySelector('img');
          options.push({
            element: sw,
            textContent: sw.textContent?.trim()?.replace(/\s+/g, ' ') || `Option ${i+1}`,
            imageUrl: img?.src || img?.dataset?.src || '',
            bgColor: '',
            rect: sw.getBoundingClientRect(),
          });
        });
        groups.push({ label, element: el, options, rect: el.getBoundingClientRect() });
      });
      return groups;
    }
    
    console.log('[STS Clipart Pro 8.3 Clipart] Found', labels.length, 'by-customization-form__label elements');
    
    labels.forEach((labelEl, idx) => {
      const label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (!label || label.length > 80 || label.length < 2) return;
      
      // v3.0.6: Parent is .by-customization-form_element or __element — handle both patterns
      const parent = labelEl.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form_element"], [class*="customization-form__element"]') || labelEl.parentElement;
      if (!parent) return;
      
      // v3.0.5: Find swatches — search ALL descendants, not just direct children
      const swatches = parent.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="image-swatch__swatch"]');
      if (swatches.length < 2) return; // Skip text inputs (0 swatches) and single options
      
      const options = [];
      swatches.forEach((sw, i) => {
        const img = sw.querySelector('img');
        const text = sw.textContent?.trim()?.replace(/\s+/g, ' ') || '';
        
        // v3.0.7: Capture background-color from .by-image-swatch__color span (Skin Tone, Hair Color, etc.)
        let bgColor = '';
        if (!img) {
          const colorSpan = sw.querySelector('.by-image-swatch__color, [class*="swatch__color"], [style*="background-color"]');
          if (colorSpan) {
            bgColor = colorSpan.style.backgroundColor || window.getComputedStyle(colorSpan).backgroundColor || '';
          }
          // Fallback: check swatch element itself
          if (!bgColor) {
            const swBg = sw.style.backgroundColor || window.getComputedStyle(sw).backgroundColor;
            if (swBg && swBg !== 'rgba(0, 0, 0, 0)' && swBg !== 'transparent') bgColor = swBg;
          }
        }
        
        // v8.0.5: Skip empty placeholder swatches — stricter check
        const imgSrc = img?.src || img?.dataset?.src || '';
        const isEmptyImg = !img || !imgSrc || imgSrc === '' || imgSrc === 'about:blank' || imgSrc.includes('data:image/gif') || imgSrc.includes('data:image/svg+xml') || imgSrc.endsWith('undefined') || imgSrc.endsWith('null');
        const hasVisibleImg = !isEmptyImg && img.complete && img.naturalWidth > 5 && img.naturalHeight > 5;
        const hasContent = text.length > 0;
        // Also check: is the swatch visually empty? (no visible bg, no img, no text)
        const swBg = window.getComputedStyle(sw).backgroundColor;
        const hasSwatchBg = swBg && swBg !== 'rgba(0, 0, 0, 0)' && swBg !== 'transparent' && swBg !== 'rgb(255, 255, 255)';
        if (!hasVisibleImg && !bgColor && !hasContent && !hasSwatchBg) return; // Skip empty placeholder

        options.push({
          element: sw,
          textContent: text || `Option ${i+1}`,
          imageUrl: imgSrc,
          bgColor: bgColor,
          rect: sw.getBoundingClientRect(),
        });
      });

      // v8.0.4: Only add group if it has at least 2 non-empty options
      if (options.length < 2) return;

      groups.push({
        label: label,
        element: parent,
        options: options,
        rect: parent.getBoundingClientRect(),
      });
    });

    console.log('[STS Clipart Pro 8.3 Clipart] personalization-form groups:', groups.map(g => `"${g.label}" (${g.options.length})`).join(', '));
    return groups;
  }

  // ---- Generic scanner ----
  // v8.0.8: Enhanced for broader compatibility (macorner.co, wrappiness.com, pawfecthouse.com, etc.)
  function scanGeneric() {
    const groups = [];
    const seen = new Set();
    // Extended container selectors for maximum coverage
    const CONTAINER_SELS = [
      'fieldset', '.form-group', '.product-option',
      '[class*="option-group"]', '[class*="option-wrap"]',
      '[class*="personalization"]', '[class*="customizer"]',
      '[class*="product-option"]', '[class*="form-field"]',
      '.tib-field', '[class*="tib-"]',
    ];
    // Also try: any div with a label AND multiple images/swatches
    for (const sel of CONTAINER_SELS) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (seen.has(el)) return;
          seen.add(el);
          const labelEl = el.querySelector('label, legend, h4, h5, strong, [class*="label"]');
          if (!labelEl) return;
          const label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
          if (!label || label.length > 60 || label.length < 2) return;
          // Collect images
          const imgs = el.querySelectorAll('img');
          const opts = [];
          const imgSeen = new Set();
          imgs.forEach(img => {
            if (!img.src || img.src.startsWith('data:image/svg') || imgSeen.has(img.src)) return;
            imgSeen.add(img.src);
            const r = img.getBoundingClientRect();
            if (r.width < 15 || r.height < 15 || r.width > 300) return;
            const w = img.parentElement;
            opts.push({
              element: w || img, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false,
            });
          });
          // Also check for color swatches (divs with background-color)
          if (opts.length < 2) {
            el.querySelectorAll('[style*="background-color"], [class*="swatch"], [class*="color"]').forEach(sw => {
              const r = sw.getBoundingClientRect();
              if (r.width < 15 || r.height < 15 || r.width > 100) return;
              const bg = sw.style.backgroundColor || getComputedStyle(sw).backgroundColor;
              if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') return;
              opts.push({
                element: sw, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                imageUrl: null, bgColor: bg, textContent: sw.textContent?.trim() || '', isSelected: false,
              });
            });
          }
          if (opts.length >= 2) groups.push({ element: el, label, options: opts, rect: el.getBoundingClientRect() });
        });
      } catch(e) {}
    }

    // v8.0.8: Fallback — scan for ANY section that has label + grid of images (catches unknown personalization apps)
    if (groups.length === 0) {
      var allLabels = document.querySelectorAll('label, legend, h4, h5, strong, [class*="label"]');
      allLabels.forEach(function(labelEl) {
        var text = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        if (!text || text.length > 60 || text.length < 3) return;
        // Look at next sibling or parent for images
        var container = labelEl.parentElement;
        if (!container || seen.has(container)) return;
        var imgs = container.querySelectorAll('img');
        if (imgs.length < 2 || imgs.length > 100) return;
        seen.add(container);
        var opts = [];
        imgs.forEach(function(img) {
          if (!img.src || img.src.startsWith('data:image/svg')) return;
          var r = img.getBoundingClientRect();
          if (r.width < 15 || r.height < 15 || r.width > 300) return;
          opts.push({
            element: img.parentElement || img,
            rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false,
          });
        });
        if (opts.length >= 2) groups.push({ element: container, label: text, options: opts, rect: container.getBoundingClientRect() });
      });
    }

    // Remove nested duplicates
    return groups.filter((g, i) => !groups.some((o, j) => i !== j && o.element.contains(g.element) && o.options.length >= g.options.length));
  }

  // ---- v8.3.0: Deep scanner for unknown personalization frameworks ----
  // Uses SIBLING-based approach: for each label, look at next siblings for image/swatch grids
  // This correctly handles multiple groups in the same page section (e.g. pawfecthouse.com)
  function scanDeep() {
    const groups = [];
    const usedImages = new Set(); // Track images already assigned to a group

    console.log('[STS Clipart Pro 8.3 Clipart] Deep scan starting...');

    var LABEL_KEYWORDS = /^(choose|select|pick|chọn)\s/i;
    var LABEL_KEYWORDS_2 = /(background\s*color|clothes\s*color|skin\s*tone|hair\s*(color|style)|eye|number\s*of|gender|pet\s*(breed|type)|font|text\s*color|design|style|pattern|theme|variant|option)/i;

    // Collect ALL potential label elements (broad search)
    var allEls = document.querySelectorAll('label, legend, h1, h2, h3, h4, h5, h6, strong, b, p, span, div, td, th, dt, [class*="label"], [class*="title"], [class*="heading"], [class*="name"]');
    var labelCandidates = [];

    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      var directText = '';
      for (var cn = 0; cn < el.childNodes.length; cn++) {
        if (el.childNodes[cn].nodeType === 3) directText += el.childNodes[cn].textContent;
      }
      directText = directText.trim().replace(/\s+/g, ' ');
      var fullText = el.textContent.trim().replace(/\s+/g, ' ');
      var text = directText.length >= 3 ? directText : (fullText.length <= 80 ? fullText : '');
      if (!text || text.length < 3 || text.length > 80) continue;
      if (LABEL_KEYWORDS.test(text) || LABEL_KEYWORDS_2.test(text)) {
        labelCandidates.push({ el: el, text: text.replace(/\s*[*:]\s*$/, '').trim() });
      }
    }

    // Dedup labels that share the same text (keep first/outermost only)
    var dedupLabels = [];
    var seenTexts = new Set();
    for (var di = 0; di < labelCandidates.length; di++) {
      var key = labelCandidates[di].text.toLowerCase();
      if (seenTexts.has(key)) continue;
      seenTexts.add(key);
      dedupLabels.push(labelCandidates[di]);
    }
    labelCandidates = dedupLabels;

    console.log('[STS Clipart Pro 8.3 Clipart] Deep scan: found', labelCandidates.length, 'label candidates');

    // Helper: collect valid images from an element, excluding already-used ones
    function collectImages(container) {
      var imgs = container.querySelectorAll('img');
      var valid = [];
      for (var ii = 0; ii < imgs.length; ii++) {
        var img = imgs[ii];
        if (!img.src || img.src.startsWith('data:image/svg') || img.src.startsWith('data:image/gif')) continue;
        if (usedImages.has(img)) continue;
        var r = img.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 300) continue;
        if (r.width > 200 && r.height > 200) continue; // Skip main product image
        valid.push(img);
      }
      return valid;
    }

    // Helper: collect color swatches from an element
    function collectSwatches(container) {
      var swatches = container.querySelectorAll('[style*="background-color"], [class*="swatch"], [class*="color"]');
      var valid = [];
      for (var si = 0; si < swatches.length; si++) {
        var sw = swatches[si];
        var sr = sw.getBoundingClientRect();
        if (sr.width < 15 || sr.height < 15 || sr.width > 100) continue;
        var bg = sw.style.backgroundColor || '';
        try { if (!bg) bg = getComputedStyle(sw).backgroundColor; } catch(e) {}
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') continue;
        valid.push({ el: sw, bg: bg });
      }
      return valid;
    }

    // Helper: build option array from images
    function buildImageOpts(imgs) {
      var opts = [];
      var seen = new Set();
      for (var fi = 0; fi < imgs.length; fi++) {
        var fimg = imgs[fi];
        if (seen.has(fimg.src)) continue;
        seen.add(fimg.src);
        usedImages.add(fimg);
        var fr = fimg.getBoundingClientRect();
        opts.push({
          element: fimg.parentElement || fimg,
          rect: { x: fr.x, y: fr.y, w: fr.width, h: fr.height },
          imageUrl: fimg.src, bgColor: null, textContent: fimg.alt || '', isSelected: false,
        });
      }
      return opts;
    }

    // Helper: build option array from swatches
    function buildSwatchOpts(swatches) {
      var opts = [];
      for (var ski = 0; ski < swatches.length; ski++) {
        var swo = swatches[ski];
        var swr = swo.el.getBoundingClientRect();
        opts.push({
          element: swo.el, rect: { x: swr.x, y: swr.y, w: swr.width, h: swr.height },
          imageUrl: null, bgColor: swo.bg, textContent: swo.el.textContent?.trim() || '', isSelected: false,
        });
      }
      return opts;
    }

    // Strategy 1: SIBLING-BASED — for each label, check next siblings for images/swatches
    for (var li = 0; li < labelCandidates.length; li++) {
      var lc = labelCandidates[li];
      var found = false;

      // Strategy 1a: Check label's next siblings
      var sibling = lc.el.nextElementSibling;
      for (var sCount = 0; sCount < 5 && sibling && !found; sCount++) {
        var sImgs = collectImages(sibling);
        if (sImgs.length >= 2) {
          var opts = buildImageOpts(sImgs);
          if (opts.length >= 2) {
            groups.push({ element: sibling, label: lc.text, options: opts, rect: sibling.getBoundingClientRect() });
            console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ SIBLING-IMG: "' + lc.text + '" (' + opts.length + ' images)');
            found = true;
          }
        }
        if (!found) {
          var sSw = collectSwatches(sibling);
          if (sSw.length >= 2) {
            var swOpts = buildSwatchOpts(sSw);
            if (swOpts.length >= 2) {
              groups.push({ element: sibling, label: lc.text, options: swOpts, rect: sibling.getBoundingClientRect() });
              console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ SIBLING-SW: "' + lc.text + '" (' + swOpts.length + ' swatches)');
              found = true;
            }
          }
        }
        sibling = sibling.nextElementSibling;
      }

      // Strategy 1b: Check parent's next siblings (label might be wrapped in a div)
      if (!found) {
        var parentSib = lc.el.parentElement?.nextElementSibling;
        for (var psCount = 0; psCount < 3 && parentSib && !found; psCount++) {
          var pImgs = collectImages(parentSib);
          if (pImgs.length >= 2) {
            var pOpts = buildImageOpts(pImgs);
            if (pOpts.length >= 2) {
              groups.push({ element: parentSib, label: lc.text, options: pOpts, rect: parentSib.getBoundingClientRect() });
              console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ PARENT-SIB: "' + lc.text + '" (' + pOpts.length + ' images)');
              found = true;
            }
          }
          parentSib = parentSib.nextElementSibling;
        }
      }

      // Strategy 1c: Check parent itself (label + images in same container)
      if (!found) {
        var parent = lc.el.parentElement;
        if (parent) {
          // Only use parent if it doesn't contain OTHER label candidates
          var othersInParent = 0;
          for (var lj = 0; lj < labelCandidates.length; lj++) {
            if (lj !== li && parent.contains(labelCandidates[lj].el)) othersInParent++;
          }
          if (othersInParent === 0) {
            var parImgs = collectImages(parent);
            if (parImgs.length >= 2) {
              var parOpts = buildImageOpts(parImgs);
              if (parOpts.length >= 2) {
                groups.push({ element: parent, label: lc.text, options: parOpts, rect: parent.getBoundingClientRect() });
                console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ PARENT: "' + lc.text + '" (' + parOpts.length + ' images)');
                found = true;
              }
            }
            if (!found) {
              var parSw = collectSwatches(parent);
              if (parSw.length >= 2) {
                var parSwOpts = buildSwatchOpts(parSw);
                if (parSwOpts.length >= 2) {
                  groups.push({ element: parent, label: lc.text, options: parSwOpts, rect: parent.getBoundingClientRect() });
                  console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ PARENT-SW: "' + lc.text + '" (' + parSwOpts.length + ' swatches)');
                  found = true;
                }
              }
            }
          }
        }
      }

      // Strategy 1d: Walk up 2-4 levels (grandparent) but ONLY if no other labels inside
      if (!found) {
        var ancestor = lc.el.parentElement?.parentElement;
        for (var lev = 0; lev < 3 && ancestor && ancestor !== document.body && !found; lev++) {
          var othersInAncestor = 0;
          for (var lk = 0; lk < labelCandidates.length; lk++) {
            if (lk !== li && ancestor.contains(labelCandidates[lk].el)) othersInAncestor++;
          }
          if (othersInAncestor === 0) {
            var ancImgs = collectImages(ancestor);
            if (ancImgs.length >= 2) {
              var ancOpts = buildImageOpts(ancImgs);
              if (ancOpts.length >= 2) {
                groups.push({ element: ancestor, label: lc.text, options: ancOpts, rect: ancestor.getBoundingClientRect() });
                console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ ANCESTOR: "' + lc.text + '" (' + ancOpts.length + ' images)');
                found = true;
              }
            }
          }
          ancestor = ancestor.parentElement;
        }
      }
    }

    // Strategy 2: Scan same-origin iframes
    try {
      var iframes = document.querySelectorAll('iframe');
      for (var ifi = 0; ifi < iframes.length; ifi++) {
        try {
          var iframeDoc = iframes[ifi].contentDocument || iframes[ifi].contentWindow?.document;
          if (!iframeDoc) continue;
          console.log('[STS Clipart Pro 8.3 Clipart] Deep scan: checking iframe', ifi, iframes[ifi].src?.substring(0, 80));
          var iLabels = iframeDoc.querySelectorAll('label, legend, h4, h5, strong, [class*="label"]');
          for (var ili = 0; ili < iLabels.length; ili++) {
            var iLabel = iLabels[ili];
            var iText = iLabel.textContent.trim().replace(/\s+/g, ' ');
            if (!iText || iText.length < 3 || iText.length > 80) continue;
            if (!LABEL_KEYWORDS.test(iText) && !LABEL_KEYWORDS_2.test(iText)) continue;
            var iSib = iLabel.nextElementSibling;
            while (iSib) {
              var iImgs = iSib.querySelectorAll('img');
              var iValid = [];
              for (var iii = 0; iii < iImgs.length; iii++) {
                var iir = iImgs[iii].getBoundingClientRect();
                if (iImgs[iii].src && !iImgs[iii].src.startsWith('data:image/svg') && iir.width >= 15 && iir.width <= 300 && iir.height >= 15) iValid.push(iImgs[iii]);
              }
              if (iValid.length >= 2) {
                var iOpts = []; var iSeen = new Set();
                for (var iv = 0; iv < iValid.length; iv++) {
                  if (iSeen.has(iValid[iv].src)) continue; iSeen.add(iValid[iv].src);
                  var ivr = iValid[iv].getBoundingClientRect();
                  iOpts.push({ element: iValid[iv].parentElement || iValid[iv], rect: { x: ivr.x, y: ivr.y, w: ivr.width, h: ivr.height }, imageUrl: iValid[iv].src, bgColor: null, textContent: iValid[iv].alt || '', isSelected: false });
                }
                if (iOpts.length >= 2) {
                  groups.push({ element: iSib, label: iText, options: iOpts, rect: iSib.getBoundingClientRect() });
                  console.log('[STS Clipart Pro 8.3 Clipart] Deep scan ✅ IFRAME: "' + iText + '" (' + iOpts.length + ' images)');
                }
                break;
              }
              iSib = iSib.nextElementSibling;
            }
          }
        } catch(e) {
          console.log('[STS Clipart Pro 8.3 Clipart] Deep scan: iframe', ifi, 'cross-origin, skipped');
        }
      }
    } catch(e) {}

    console.log('[STS Clipart Pro 8.3 Clipart] Deep scan result:', groups.length, 'groups');
    return groups;
  }

  // ---- Capture screenshot for a single category ----
  async function captureSingleGroup(cat) {
    // Scroll first option into view
    if (cat.options[0]?.element) {
      cat.options[0].element.scrollIntoView({ block: 'center', behavior: 'instant' });
      await sleep(400);
    }

    // Update rects after scroll
    for (const opt of cat.options) {
      if (opt.element) {
        const r = opt.element.getBoundingClientRect();
        opt.rect = { x: r.x, y: r.y, w: r.width, h: r.height };
      }
    }

    // Capture tab screenshot
    const screenshot = await captureTab();
    if (!screenshot) return;

    const img = await loadImage(screenshot);
    if (!img) return;

    const dpr = window.devicePixelRatio || 1;

    // Crop each option — capture at original res for display, cap max dimension to 200px
    for (const opt of cat.options) {
      // Skip text-only options (no image, no bgColor) — keep them as text, don't screenshot
      var optionType = String(opt.optionType || '').toLowerCase();
      var hasVisualHint = !!(opt.needsCapture || opt.hasVisual || optionType === 'visual-text');
      if (!hasVisualHint && !opt.imageUrl && !opt.bgColor && opt.textContent && opt.textContent.trim().length > 0) continue;
      const { x, y, w, h } = opt.rect;
      if (w <= 0 || h <= 0) continue;
      try {
        // First crop at full resolution
        const cropW = Math.ceil(w * dpr);
        const cropH = Math.ceil(h * dpr);
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW; cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(img, x * dpr, y * dpr, cropW, cropH, 0, 0, cropW, cropH);

        // Resize if too large (max 200px) and save as JPEG for smaller size
        const maxDim = 200;
        const ratio = Math.min(maxDim / cropW, maxDim / cropH, 1);
        if (ratio < 1) {
          const rw = Math.round(cropW * ratio);
          const rh = Math.round(cropH * ratio);
          const resizeCanvas = document.createElement('canvas');
          resizeCanvas.width = rw; resizeCanvas.height = rh;
          const resizeCtx = resizeCanvas.getContext('2d');
          resizeCtx.drawImage(cropCanvas, 0, 0, rw, rh);
          opt.capturedImage = resizeCanvas.toDataURL('image/jpeg', 0.8);
        } else {
          opt.capturedImage = cropCanvas.toDataURL('image/jpeg', 0.8);
        }
      } catch(e) {}
    }
  }

  function captureTab() {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, res => {
          if (chrome.runtime.lastError || !res?.dataUrl) resolve(null);
          else resolve(res.dataUrl);
        });
      } catch(e) { resolve(null); }
    });
  }

  function loadImage(src) {
    return new Promise(resolve => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = src;
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


  function normalizeClipGroupName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\s*#\d+\s*$/g, '')
      .replace(/\s*\(\d+\)\s*$/g, '')
      .trim();
  }

  function clipRectVisible(rect) {
    if (!rect) return true;
    if ((rect.width || 0) <= 2 || (rect.height || 0) <= 2) return false;
    if ((rect.bottom || 0) < 0) return false;
    if ((rect.right || 0) < 0) return false;
    if ((rect.top || 0) > window.innerHeight + 8) return false;
    if ((rect.left || 0) > window.innerWidth + 8) return false;
    return true;
  }

  function optionProbablyVisible(opt) {
    if (!opt) return false;

    if (opt.rect && clipRectVisible(opt.rect)) return true;

    var el = opt.element;
    if (!el || typeof el.getBoundingClientRect !== 'function') return true;

    try {
      var style = window.getComputedStyle(el);
      if (!style) return true;
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
        return false;
      }
      return clipRectVisible(el.getBoundingClientRect());
    } catch (e) {
      return true;
    }
  }

  function optionSignature(opt) {
    var text = String(opt && (opt.textContent || opt.label) || '').trim().toLowerCase();
    var img = String(opt && (opt.imageUrl || opt.capturedImage) || '').slice(0, 180);
    var color = String(opt && opt.bgColor || '').trim().toLowerCase();
    var rect = opt && opt.rect || {};
    var size = [
      Math.round(rect.width || 0),
      Math.round(rect.height || 0)
    ].join('x');

    return [text, img, color, size].join('|');
  }

  function cloneScannedOption(opt) {
    var cloned = Object.assign({}, opt);
    delete cloned.element;

    if (!cloned.capturedImage && cloned.imageUrl) {
      cloned.capturedImage = cloned.imageUrl;
    }
    if (!cloned.bgColor) {
      cloned.bgColor = '';
    }
    if (!cloned.textContent) {
      cloned.textContent = '';
    }

    return cloned;
  }

  function findExistingCategoryIndex(categories, groupLabel) {
    var target = normalizeClipGroupName(groupLabel);
    if (!target) return -1;

    for (var i = 0; i < categories.length; i++) {
      if (normalizeClipGroupName(categories[i] && categories[i].name) === target) return i;
    }

    return -1;
  }

  function mergeVisibleGroupsIntoData(data, scannedGroups) {
    var summary = {
      addedGroups: 0,
      addedOptions: 0,
      skippedGroups: 0,
      skippedOptions: 0
    };

    if (!data || !Array.isArray(data.categories) || !Array.isArray(scannedGroups)) {
      return summary;
    }

    scannedGroups.forEach(function (grp) {
      if (!grp || !grp.label || !Array.isArray(grp.options)) return;

      var visibleOptions = grp.options.filter(optionProbablyVisible);
      if (!visibleOptions.length) {
        summary.skippedGroups += 1;
        return;
      }

      var existingIdx = findExistingCategoryIndex(data.categories, grp.label);

      if (existingIdx === -1) {
        var prefix = getNextAvailableCategoryPrefix(data.categories);
        var newOptions = visibleOptions.map(function (opt, i) {
          var item = cloneScannedOption(opt);
          item.label = prefix + (i + 1);
          return item;
        });

        data.categories.push({
          name: grp.label,
          prefix: prefix,
          options: newOptions,
          optionCount: newOptions.length
        });

        summary.addedGroups += 1;
        summary.addedOptions += newOptions.length;
        return;
      }

      var category = data.categories[existingIdx];
      if (!Array.isArray(category.options)) category.options = [];

      var seen = new Set(category.options.map(optionSignature));
      var appended = 0;

      visibleOptions.forEach(function (opt) {
        var sig = optionSignature(opt);
        if (!sig || seen.has(sig)) {
          summary.skippedOptions += 1;
          return;
        }

        seen.add(sig);

        var item = cloneScannedOption(opt);
        item.label = category.prefix + (category.options.length + 1);
        category.options.push(item);
        appended += 1;
      });

      category.optionCount = category.options.length;

      if (appended > 0) {
        summary.addedOptions += appended;
      } else {
        summary.skippedGroups += 1;
      }
    });

    return summary;
  }

  async function appendCurrentVisibleState(data, refreshPanel, triggerBtn) {
    if (!data || !Array.isArray(data.categories)) {
      clipNotify('Không có panel clipart để append', 'error');
      return;
    }

    var btn = triggerBtn || null;
    var oldText = btn ? btn.textContent : '';
    var oldDisabled = btn ? !!btn.disabled : false;

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Appending...';
      }

      await sleep(120);

      var scanned = await scanDOM() || [];
      if (!scanned.length) {
        clipNotify('Không thấy nhóm clipart nào trong state hiện tại', 'warning');
        return;
      }

      var result = mergeVisibleGroupsIntoData(data, scanned);

      if (result.addedGroups === 0 && result.addedOptions === 0) {
        clipNotify('Không có group/option mới để append', 'warning');
        return;
      }

      if (typeof refreshPanel === 'function') refreshPanel();

      var msg = [];
      if (result.addedGroups > 0) msg.push('+' + result.addedGroups + ' nhóm');
      if (result.addedOptions > 0) msg.push('+' + result.addedOptions + ' option');
      if (result.skippedOptions > 0) msg.push('bỏ qua ' + result.skippedOptions + ' trùng');

      clipNotify('Append xong: ' + msg.join(' · '), 'success');
    } catch (error) {
      console.error('[STS Append Visible State] Failed:', error);
      clipNotify('Append thất bại: ' + (error && error.message ? error.message : 'unknown error'), 'error');
    } finally {
      if (btn) {
        btn.disabled = oldDisabled;
        btn.textContent = oldText || '↳ Append';
      }
    }
  }

  function buildEmptyClipartDataFrom(data) {
    if (window.STSClipartScanner && window.STSClipartScanner.export && typeof window.STSClipartScanner.export.buildEmptyClipartDataFrom === 'function') {
      return window.STSClipartScanner.export.buildEmptyClipartDataFrom(data);
    }
    return {
      url: (data && data.url) || window.location.href,
      title: (data && data.title) || document.title,
      platform: (data && data.platform) || ((window.Shopify || document.querySelector('[data-shopify]')) ? 'shopify' : window.location.hostname.includes('etsy') ? 'etsy' : 'custom'),
      scannedAt: new Date().toISOString(),
      categories: [],
    };
  }

  function resetClipartPanelData(data) {
    if (!data || !Array.isArray(data.categories)) {
      clipNotify('Không có panel clipart để reset', 'error');
      return;
    }

    var ok = window.confirm('Reset panel hiện tại? Toàn bộ group/item trong panel sẽ được xóa về trạng thái rỗng.');
    if (!ok) return;

    var emptyData = buildEmptyClipartDataFrom(data);
    data.url = emptyData.url;
    data.title = emptyData.title;
    data.platform = emptyData.platform;
    data.scannedAt = emptyData.scannedAt;
    data.categories = [];
    CLIPART.categories = [];
    CLIPART.capturedData = data;

    document.querySelectorAll('.sts-clip-label').forEach(function(e) { e.remove(); });
    cleanupAllPickModes();

    clipNotify('Đã reset panel về trạng thái rỗng', 'success');

    if (typeof showClipartPanel === 'function') {
      showClipartPanel(data);
    }
  }



  // ---- Progress indicator ----
  function showProgress(percent, text) {
    if (window.STSClipartScanner && window.STSClipartScanner.ui && typeof window.STSClipartScanner.ui.showProgress === 'function') {
      return window.STSClipartScanner.ui.showProgress(percent, text);
    }
    let bar = document.getElementById('sts-clip-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sts-clip-progress';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999999;height:36px;background:#FFFFFF;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;padding:0 16px;gap:10px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:12px;color:#333;';
      document.body.appendChild(bar);
    }
    bar.innerHTML = `
      <span style="font-weight:700;color:#2563EB;">🏷️</span>
      <div style="flex:1;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;">
        <div style="width:${percent}%;height:100%;background:linear-gradient(90deg,#1565C0,#2F7D57);border-radius:3px;transition:width 0.3s;"></div>
      </div>
      <span style="min-width:36px;text-align:right;font-weight:700;color:#2563EB;">${percent}%</span>
      <span style="color:#64748B;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${text}</span>
    `;
    if (percent >= 100) {
      setTimeout(() => bar.remove(), 2000);
    }
  }

  // v3.0.7: Clear stale progress bar
  function clearProgress() {
    if (window.STSClipartScanner && window.STSClipartScanner.ui && typeof window.STSClipartScanner.ui.clearProgress === 'function') {
      return window.STSClipartScanner.ui.clearProgress();
    }
    const bar = document.getElementById('sts-clip-progress');
    if (bar) bar.remove();
  }

  // ---- Notification ----
  function clipNotify(msg, type) {
    if (window.STSClipartScanner && window.STSClipartScanner.ui && typeof window.STSClipartScanner.ui.clipNotify === 'function') {
      return window.STSClipartScanner.ui.clipNotify(msg, type);
    }
    const old = document.getElementById('sts-clip-notif');
    if (old) old.remove();
    const colors = { success: '#2F7D57', error: '#E8453C', warning: '#E65100', info: '#1565C0' };
    const n = document.createElement('div');
    n.id = 'sts-clip-notif';
    // v8.0.8: top:52px to sit below blue banner, z-index max to always show on top
    var pickActive = !!document.getElementById('sts-pick-wrapper');
    var topPos = pickActive ? '52px' : '16px';
    n.style.cssText = `position:fixed;top:${topPos};left:50%;transform:translateX(-50%);z-index:2147483647;background:${colors[type]||colors.info};color:#fff;padding:10px 20px;border-radius:8px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;animation:stsSlide .3s ease;`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  function getStoredClipartAuth() {
    if (window.STSClipartScanner && window.STSClipartScanner.sync && typeof window.STSClipartScanner.sync.getStoredClipartAuth === 'function') {
      return window.STSClipartScanner.sync.getStoredClipartAuth();
    }
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get(['stsClipartProUser', 'stsAuthUser', 'stsAuthToken'], function(data) {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }

          var clipartUser = data && data.stsClipartProUser;
          var legacyUser = data && data.stsAuthUser;
          var sourceUser = clipartUser || legacyUser;
          var token = (clipartUser && clipartUser.token) || (data && data.stsAuthToken) || '';

          if (!sourceUser) {
            resolve(null);
            return;
          }

          var normalizedUser = {
            id: String(sourceUser.id || sourceUser.userId || sourceUser.uid || sourceUser.username || sourceUser.name || ''),
            email: String(sourceUser.email || ''),
            name: String(sourceUser.name || sourceUser.username || ''),
            username: String(sourceUser.username || sourceUser.name || ''),
            role: String(sourceUser.role || 'user'),
            token: String(token)
          };

          if (normalizedUser.id || normalizedUser.username) {
            resolve(normalizedUser);
            return;
          }

          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  async function ensureClipartLoggedIn() {
    var user = await getStoredClipartAuth();
    if (user) return true;
    clipNotify('Vui lòng đăng nhập STS Clip Art Pro Pro', 'warning');
    return false;
  }

  async function isClipartAuthenticated() {
    var user = await getStoredClipartAuth();
    return !!(user && (user.id || user.username || user.name || user.email));
  }

  function cleanupInjectedClipartUi() {
    try { clearProgress(); } catch (e) {}
    try { clearHL(); } catch (e) {}
    try { hideProductPanel(); } catch (e) {}
    ['sts-clip-panel', 'sts-clip-progress', 'sts-clip-notif', 'sts-notif', 'sts-scan-mode-popup', 'sts-clip-fab', 'sts-pick-wrapper', 'sts-screenshot-wrapper', 'sts-mockup-picker-overlay'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    notifyClipartPanelVisibility(false);
    ['.sts-screenshot-overlay', '.sts-screenshot-sel', '.sts-pick-overlay', '.sts-pick-banner', '.sts-title-highlight'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) { el.remove(); });
    });
    var host = document.getElementById(STS_UI_IDS.host); if (host) host.remove();
    var anchor = document.getElementById(STS_UI_IDS.anchor); if (anchor) anchor.remove();
    var frame = document.getElementById(STS_UI_IDS.frame); if (frame) frame.remove();
    _uiFrame = null;
    _uiHost = null;
    _uiAnchor = null;
    _toolbarVisible = false;
    _panelVisible = false;
    _uiReady = false;
    isActive = false;
    currentMode = null;
  }


  // ---- Auto-expand: click options to trigger Customily rendering ----
  async function autoExpandSections() {
    let expanded = 0;
    let prevCount = 0;
    let retries = 0;
    const maxRetries = 5;

    // Customily renders sub-options ONLY after clicking a parent option (img)
    // Strategy: find all groups with imgs, click first img in each, wait for new groups
    var clickedLabels = {};
    while (retries < maxRetries) {
      var groups = document.querySelectorAll('.ant-form-item');
      var currentCount = groups.length;

      if (currentCount === prevCount && retries > 0) {
        // No new groups appeared — we're done
        break;
      }
      prevCount = currentCount;

      // Find groups that have imgs and haven't been clicked yet
      var clicked = 0;
      groups.forEach(function(el) {
        var label = el.querySelector('.ant-form-item-label label');
        if (!label) return;
        var name = label.textContent.trim();

        // Skip text inputs and already-clicked groups
        if (name.toLowerCase().includes('type ') || name.toLowerCase().includes('name initial')) return;
        if (clickedLabels[name]) return;

        var children = el.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
        if (!children) return;

        var imgs = children.querySelectorAll('img');
        if (imgs.length < 2) return;

        // Click first img to trigger sub-options rendering
        var firstImg = imgs[0];
        if (firstImg && firstImg.offsetParent !== null) {
          console.log('[STS Clipart Pro 8.3 Clipart] Auto-clicking: ' + name + ' (first of ' + imgs.length + ' imgs)');
          firstImg.click();
          clickedLabels[name] = true;
          clicked++;
          expanded++;
        }
      });

      if (clicked === 0) break;

      // Wait for Customily to render new options
      showProgress(5 + retries * 3, 'Đang mở options... (' + (retries + 1) + ')');
      await sleep(2500);
      retries++;
    }

    // Also handle standard collapse/accordion (non-Customily)
    var collapseSelectors = [
      'details:not([open])',
      '[aria-expanded="false"]',
      '.collapsed:not(.show)',
      '.accordion-button.collapsed',
    ];
    for (var si = 0; si < collapseSelectors.length; si++) {
      try {
        document.querySelectorAll(collapseSelectors[si]).forEach(function(el) {
          var parent = el.closest('.product-form, .product__info, [class*="product"], [class*="personalized"], main');
          if (!parent) return;
          if (el.tagName === 'DETAILS') el.setAttribute('open', '');
          else el.click();
          expanded++;
        });
      } catch(e) {}
    }

    if (expanded > 0) {
      console.log('[STS Clipart Pro 8.3 Clipart] Auto-expanded ' + expanded + ' sections');
      // Scroll through form to trigger lazy loading
      var form = document.querySelector('.ctm-artwork-personalized-form, .ant-form, .product-form');
      if (form) {
        var formRect = form.getBoundingClientRect();
        var formTop = formRect.top + window.scrollY;
        var formBottom = formRect.bottom + window.scrollY;
        var scrollPos = formTop;
        while (scrollPos < formBottom) {
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
          await sleep(200);
          scrollPos += window.innerHeight * 0.6;
        }
        window.scrollTo({ top: formTop - 100, behavior: 'instant' });
        await sleep(300);
      }
    }
  }

  // ---- HYBRID SCAN: Auto-snapshot + Manual continue ----
  async function expandAndSnapshot() {
    var allGroups = [];
    var clickedKeys = new Set();
    var totalClicks = 0;
    
    // Helper: normalize label for dedup (strip #N, trailing numbers)
    function baseLabel(label) {
      return label
        .replace(/\s*#\d+\s*$/i, '')
        .replace(/\s*\(\d+\)\s*$/i, '')
        .replace(/\s+\d+\s*$/i, '')
        .replace(/\s*#\d+\s*/g, ' ')
        .replace(/\s+/g, ' ').trim();
    }
    
    async function snapshotNow() {
      var groups = await scanDOM();
      var added = 0;
      for (var g = 0; g < groups.length; g++) {
        var grp = groups[g];
        
        // Dedup: same base label + similar count = duplicate.
        // If the same label later appears with a meaningfully richer option set, update it instead.
        var grpBase = baseLabel(grp.label);
        var isDuplicate = false;
        var existingIndex = -1;
        for (var eg = 0; eg < allGroups.length; eg++) {
          var existBase = baseLabel(allGroups[eg].label);
          if (existBase !== grpBase) continue;
          if (Math.abs(allGroups[eg].options.length - grp.options.length) <= 2) {
            isDuplicate = true;
            break;
          }
          existingIndex = eg;
          break;
        }
        if (isDuplicate) continue;
        
        var savedOpts = grp.options.map(function(o) {
          return {
            element: o.element,
            rect: { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h },
            imageUrl: o.imageUrl || null,
            bgColor: o.bgColor || null,
            textContent: o.textContent || '',
            isSelected: o.isSelected || false,
            capturedImage: o.capturedImage || o.imageUrl || null,
          };
        });
        var grpRect = grp.rect || (grp.element ? grp.element.getBoundingClientRect() : {top:0});
        if (existingIndex >= 0) {
          var existing = allGroups[existingIndex];
          var existingCount = existing && existing.options ? existing.options.length : 0;
          if (existingCount >= grp.options.length) continue;
          allGroups[existingIndex] = { element: grp.element, label: grp.label, options: savedOpts, 
            rect: {top: grpRect.top||0, left: grpRect.left||0, x: grpRect.x||0, y: grpRect.y||0} };
          added++;
          console.log('[STS Clipart Pro 8.3 Clipart] ♻️ UPDATE: "' + grp.label + '" (' + existingCount + ' → ' + grp.options.length + ' opts)');
          continue;
        }
        allGroups.push({ element: grp.element, label: grp.label, options: savedOpts, 
          rect: {top: grpRect.top||0, left: grpRect.left||0, x: grpRect.x||0, y: grpRect.y||0} });
        added++;
        console.log('[STS Clipart Pro 8.3 Clipart] ✅ NEW: "' + grp.label + '" (' + grp.options.length + ' opts)');
      }
      return added;
    }

    async function sweepTextDropdowns(stageLabel) {
      var controls = collectCustomDropdownControls();
      var opened = 0;
      var localSeen = new Set();

      function upsertScannedGroup(grp) {
        if (!grp || !grp.label || !grp.options || !grp.options.length) return false;

        var grpBase = baseLabel(grp.label);
        for (var eg = 0; eg < allGroups.length; eg++) {
          var existing = allGroups[eg];
          var existBase = baseLabel(existing.label);
          if (existBase !== grpBase) continue;
          if ((existing.options || []).length >= grp.options.length) return false;

          var savedOpts = grp.options.map(function(o) {
            return {
              element: o.element,
              rect: { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h },
              imageUrl: o.imageUrl || null,
              bgColor: o.bgColor || null,
              textContent: o.textContent || '',
              isSelected: o.isSelected || false,
              capturedImage: o.capturedImage || o.imageUrl || null,
            };
          });
          var grpRect = grp.rect || (grp.element ? grp.element.getBoundingClientRect() : {top:0});
          allGroups[eg] = {
            element: grp.element,
            label: grp.label,
            options: savedOpts,
            rect: { top: grpRect.top || 0, left: grpRect.left || 0, x: grpRect.x || 0, y: grpRect.y || 0 }
          };
          return true;
        }

        var newOpts = grp.options.map(function(o) {
          return {
            element: o.element,
            rect: { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h },
            imageUrl: o.imageUrl || null,
            bgColor: o.bgColor || null,
            textContent: o.textContent || '',
            isSelected: o.isSelected || false,
            capturedImage: o.capturedImage || o.imageUrl || null,
          };
        });
        var newRect = grp.rect || (grp.element ? grp.element.getBoundingClientRect() : {top:0});
        allGroups.push({
          element: grp.element,
          label: grp.label,
          options: newOpts,
          rect: { top: newRect.top || 0, left: newRect.left || 0, x: newRect.x || 0, y: newRect.y || 0 }
        });
        return true;
      }

      for (var di = 0; di < controls.length; di++) {
        var control = controls[di];
        if (!control || !isInPersonalizationScope(control)) continue;
        if (fieldHasImageSwatches(control)) continue;

        var label = extractLabelFromControl(control);
        if (!label) continue;

        var base = baseLabel(label);
        var clickKey = 'textdd|' + base;
        if (clickedKeys.has(clickKey) || localSeen.has(base)) continue;

        var trigger = getDropdownTrigger(control);
        if (!trigger || (trigger.offsetParent === null && !isVisibleForScan(trigger))) continue;

        localSeen.add(base);

        var scanState = await openDropdownForScan(control);
        var popup = scanState && scanState.popup ? scanState.popup : findDropdownPopup(control);
        var grp = labelLooksLikeQuoteField(label)
          ? await scanQuoteFieldWithTiers(groupFieldRoot(control) || control, control, popup)
          : buildTextDropdownGroup(control, popup);

        if (grp) {
          clickedKeys.add(clickKey);
          opened++;
          console.log('[STS Clipart Pro 8.3 Clipart] Text dropdown capture (' + stageLabel + '): "' + label + '" (' + grp.options.length + ' opts)');
          showProgress(10 + Math.min(10, opened), 'Dropdown: ' + label);
          upsertScannedGroup(grp);
          await snapshotNow();
          await sleep(80);
        }

        await closeDropdownForScan(control, !!(scanState && scanState.openedByScanner));
      }

      if (opened) await snapshotNow();
      return opened;
    }

    // ---- PHASE 1: Auto-scan ----

    // Scroll entire form to trigger lazy loading
    showProgress(5, 'Scanning...');
    // v8.0.8: Extended form selectors for macorner.co, wrappiness.com, pawfecthouse.com, etc.
    var FORM_SELS = '.ctm-artwork-personalized-form, .ant-form, .product-form, form.personalization-form, .personalization-form, .by-customization-form, [class*="customizer-form"], [class*="personalization"], .tib-container, [class*="tib-personalization"], [class*="product-customizer"], .product__info-container form, .product-single__form';
    var form = document.querySelector(FORM_SELS);
    // Fallback: find the biggest form or section that contains images
    if (!form) {
      var candidates = document.querySelectorAll('form, [class*="product"] section, .product__info, main');
      var maxImgs = 0;
      candidates.forEach(function(c) {
        var ic = c.querySelectorAll('img').length;
        if (ic > maxImgs) { maxImgs = ic; form = c; }
      });
    }
    if (form) {
      var fRect = form.getBoundingClientRect();
      var pos = fRect.top + window.scrollY;
      var fBottom = fRect.bottom + window.scrollY;
      while (pos < fBottom) {
        window.scrollTo({ top: pos, behavior: 'instant' });
        await sleep(300);
        pos += window.innerHeight * 0.7;
      }
      window.scrollTo({ top: (fRect.top + window.scrollY) - 50, behavior: 'instant' });
      await sleep(500);
    }

    // Scroll to empty grids to force lazy load
    var emptyGrids = document.querySelectorAll('.customall-grid');
    for (var eg = 0; eg < emptyGrids.length; eg++) {
      if (emptyGrids[eg].querySelectorAll('img').length === 0) {
        emptyGrids[eg].scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(1000);
      }
    }
    
    // Initial snapshot
    await snapshotNow();
    await sweepTextDropdowns('initial');
    showProgress(8, allGroups.length + ' groups found');
    
    // Auto-click: only click FIRST occurrence of each base label trigger
    // This avoids clicking "Choose An Option #1", #2, #3... (all same)
    var clickedBaseLabels = new Set();
    var round = 0;
    var maxRounds = 40;
    
    while (round < maxRounds) {
      round++;
      var target = null;
      var items = document.querySelectorAll('.ant-form-item');
      
      for (var i = 0; i < items.length && !target; i++) {
        var el = items[i];
        var labelEl = el.querySelector('.ant-form-item-label label');
        if (!labelEl) continue;
        var name = labelEl.textContent.trim();
        var nameLower = name.toLowerCase();
        if (nameLower.includes('type ') || nameLower.includes('name initial') || nameLower.includes('add-on') || nameLower.includes('combo') || nameLower.includes('gift box')) continue;
        
        // Skip if we already clicked a group with same base label
        var nameBase = baseLabel(name);
        if (clickedBaseLabels.has(nameBase)) continue;
        
        var children = el.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
        if (!children) continue;
        var imgs = children.querySelectorAll('img');

        // v8.0.8: Also detect TEXT-based clickable options (e.g. "1","2","3" or "BOY","GIRL")
        // These are common on pawfecthouse.com, macorner.co for "Choose Number Of Kids", "Choose Gender", etc.
        var clickableItems = [];
        if (imgs.length >= 2) {
          // Image-based options
          for (var ci2 = 0; ci2 < imgs.length; ci2++) clickableItems.push(imgs[ci2]);
        } else {
          // Look for text-based clickable options (divs/spans inside the control area)
          var textOpts = children.querySelectorAll('[class*="image-item"], [class*="option"], .customall-grid > div, [role="button"], [style*="cursor"]');
          if (textOpts.length < 2) {
            // Broader: any direct children of a grid-like container
            var grid = children.querySelector('.customall-grid, [class*="grid"], [style*="grid"], [style*="flex"]');
            if (grid) textOpts = grid.children;
          }
          // Filter: must be visible, clickable-sized items
          for (var ti = 0; ti < textOpts.length; ti++) {
            var topt = textOpts[ti];
            var tr = topt.getBoundingClientRect();
            if (tr.width >= 20 && tr.height >= 20 && tr.width <= 200 && topt.offsetParent) {
              clickableItems.push(topt);
            }
          }
        }

        if (clickableItems.length < 2) continue;

        var isTrigger = clickableItems.length <= 8;
        var maxClick = isTrigger ? clickableItems.length : 1;

        for (var j = 0; j < maxClick; j++) {
          var clickEl = clickableItems[j];
          if (!clickEl || !clickEl.offsetParent) continue;
          var clickKey = name + '|' + j;
          if (clickedKeys.has(clickKey)) continue;

          target = { name: name, nameBase: nameBase, img: clickEl, clickKey: clickKey, imgIdx: j, totalImgs: clickableItems.length, isTrigger: isTrigger };
          break;
        }

        // If all clicks for this label are done, mark base as done
        if (!target) {
          var allDone = true;
          for (var k = 0; k < maxClick; k++) {
            if (!clickedKeys.has(name + '|' + k)) { allDone = false; break; }
          }
          if (allDone) clickedBaseLabels.add(nameBase);
        }
      }
      
      if (!target) break;
      
      // Get clicked option text for naming
      var clickedText = target.img.alt || target.img.title || '';
      if (!clickedText) {
        var wrapper = target.img.parentElement;
        if (wrapper) {
          clickedText = wrapper.textContent.trim();
          if (!clickedText || clickedText.length > 30) {
            var gp = wrapper.parentElement;
            if (gp) { var t = gp.textContent.trim(); if (t && t.length <= 30) clickedText = t; }
          }
        }
      }
      clickedText = clickedText.replace(/^[A-Z]\d+\s*/, '').replace(/\s*[A-Z]\d+$/, '').trim();
      window.__stsLastClick = { groupName: target.name, optionText: clickedText, imgIdx: target.imgIdx };
      
      console.log('[STS Clipart Pro 8.3 Clipart] Click: "' + target.name + '" [' + target.imgIdx + '] text="' + clickedText + '"');
      target.img.click();
      clickedKeys.add(target.clickKey);
      
      // Mark base label as having been clicked (for dedup of #1, #2, #3...)
      if (target.isTrigger) {
        // After ALL options of this trigger are clicked, mark base
        var allClicksDone = true;
        for (var ac = 0; ac < target.totalImgs; ac++) {
          if (!clickedKeys.has(target.name + '|' + ac)) { allClicksDone = false; break; }
        }
        if (allClicksDone) clickedBaseLabels.add(target.nameBase);
      } else {
        clickedBaseLabels.add(target.nameBase);
      }
      
      totalClicks++;
      showProgress(8 + Math.min(15, Math.round(totalClicks * 0.5)), 
        'Click ' + totalClicks + ': ' + target.name);
      
      if (target.isTrigger) {
        await sleep(3000);
        // Scroll to empty grids
        var egs = document.querySelectorAll('.customall-grid');
        for (var egi = 0; egi < egs.length; egi++) {
          if (egs[egi].querySelectorAll('img').length === 0) {
            egs[egi].scrollIntoView({ behavior: 'instant', block: 'center' });
            await sleep(800);
          }
        }
        await sleep(1000);
        await snapshotNow();
        await sleep(1000);
      } else {
        await sleep(1500);
      }
      await snapshotNow();
    }

    // ---- PHASE 1b: Wanderprints / personalization-form auto-expand ----
    // v8.0.3: CRITICAL FIX — Wanderprints sections (Skin Tone, Eyes Color, Hair, etc.)
    // only render AFTER Customily clicks (e.g. Gender=WOMAN). Must wait for DOM to settle,
    // then re-query, scroll to trigger lazy-load, and repeat until no new sections appear.

    // Wait for any pending DOM rendering after Phase 1 Customily clicks
    await sleep(1500);

    // Scroll through ENTIRE page to trigger lazy-load of all Wanderprints sections
    var wpForm = document.querySelector('form.personalization-form, .personalization-form, .by-customization-form') || form;
    if (wpForm) {
      var wpfRect = wpForm.getBoundingClientRect();
      var wpPos = wpfRect.top + window.scrollY;
      var wpBottom = wpfRect.bottom + window.scrollY;
      while (wpPos < wpBottom) {
        window.scrollTo({ top: wpPos, behavior: 'instant' });
        await sleep(300);
        wpPos += window.innerHeight * 0.6;
      }
      window.scrollTo({ top: (wpfRect.top + window.scrollY) - 50, behavior: 'instant' });
      await sleep(500);
    }

    // Re-snapshot after scroll (picks up newly visible Wanderprints sections)
    await snapshotNow();

    // Now query Wanderprints elements — they should be in DOM after Customily clicks + scroll
    var wpRound = 0;
    var wpMaxRounds = 3;
    while (wpRound < wpMaxRounds) {
      wpRound++;
      var wpElements = document.querySelectorAll('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"]');
      if (wpElements.length === 0) {
        console.log('[STS Clipart Pro 8.3 Clipart] Wanderprints: no form elements found (round ' + wpRound + ')');
        break;
      }
      console.log('[STS Clipart Pro 8.3 Clipart] Wanderprints round ' + wpRound + ': found ' + wpElements.length + ' form elements');
      showProgress(20 + wpRound, 'Wanderprints: scanning ' + wpElements.length + ' sections (round ' + wpRound + ')...');

      var wpClickedThisRound = 0;

      // Scroll through each element to trigger lazy loading + click first swatch
      for (var wi = 0; wi < wpElements.length; wi++) {
        var wpEl = wpElements[wi];
        wpEl.scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(500);

        // Check if this section has swatches
        var wpSwatches = wpEl.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="image-swatch__swatch"]');
        var wpLabel = wpEl.querySelector('.by-customization-form__label, [class*="form__label"]');
        var wpLabelText = wpLabel ? wpLabel.textContent.trim() : 'Section ' + (wi + 1);

        if (wpSwatches.length >= 2) {
          // Click first swatch to trigger sub-option rendering
          var firstSwatch = wpSwatches[0];
          var wpClickKey = 'wp|' + wpLabelText;
          if (firstSwatch && firstSwatch.offsetParent !== null && !clickedKeys.has(wpClickKey)) {
            console.log('[STS Clipart Pro 8.3 Clipart] Wanderprints auto-click: "' + wpLabelText + '" (first of ' + wpSwatches.length + ' swatches)');
            firstSwatch.click();
            clickedKeys.add(wpClickKey);
            totalClicks++;
            wpClickedThisRound++;
            await sleep(1500);
          }
        }

        // Snapshot after each section to capture any newly rendered content
        await snapshotNow();
      }

      // Wait for DOM to settle after all clicks in this round
      await sleep(1000);

      // Final snapshot for this round
      var wpNewGroups = await snapshotNow();
      console.log('[STS Clipart Pro 8.3 Clipart] Wanderprints round ' + wpRound + ': ' + wpClickedThisRound + ' clicks, ' + wpNewGroups + ' new groups');

      // If no new clicks were made, we're done
      if (wpClickedThisRound === 0) break;
    }

    // Scroll back to top of form
    if (wpForm) {
      var wpFormRect2 = wpForm.getBoundingClientRect();
      window.scrollTo({ top: wpFormRect2.top + window.scrollY - 50, behavior: 'instant' });
      await sleep(300);
    }
    await snapshotNow();
    await sweepTextDropdowns('post-click');

    // ---- PHASE 1c: Generic collapse/accordion expand ----
    var collapseSelectors = [
      'details:not([open])',
      '[aria-expanded="false"]',
      '.collapsed:not(.show)',
      '.accordion-button.collapsed',
    ];
    var genericExpanded = 0;
    for (var csi = 0; csi < collapseSelectors.length; csi++) {
      try {
        document.querySelectorAll(collapseSelectors[csi]).forEach(function(cel) {
          var cParent = cel.closest('.product-form, .product__info, [class*="product"], [class*="personalized"], [class*="customization"], main, form.personalization-form, .personalization-form');
          if (!cParent) return;
          if (cel.tagName === 'DETAILS') cel.setAttribute('open', '');
          else cel.click();
          genericExpanded++;
        });
      } catch(e) {}
    }
    if (genericExpanded > 0) {
      console.log('[STS Clipart Pro 8.3 Clipart] Generic expanded ' + genericExpanded + ' collapsed sections');
      await sleep(1000);
      await snapshotNow();
    }

    // ---- PHASE 1d: v8.3.0 Unknown framework auto-expand ----
    // Run when NO known framework was detected (Customily/Shopify/Wanderprints all found 0)
    // Even if deep scanner found some groups, there may be more behind trigger clicks
    var knownFrameworkFound = !!document.querySelector('.customall-grid, .ant-form-item, .by-customization-form__element, .product-form__input, .tib-field');
    if (!knownFrameworkFound) {
      console.log('[STS Clipart Pro 8.3 Clipart] Phase 1d: No known framework, trying auto-expand triggers...');

      // Find text labels matching "Choose X" pattern, then look for clickable siblings
      var LABEL_KW = /^(choose|select|pick|chọn)\s/i;
      var allTextEls = document.querySelectorAll('label, legend, h1, h2, h3, h4, h5, h6, strong, b, p, span, div, [class*="label"], [class*="title"]');
      var triggerLabels = [];

      for (var tli = 0; tli < allTextEls.length; tli++) {
        var tlEl = allTextEls[tli];
        var tlText = '';
        for (var tcn = 0; tcn < tlEl.childNodes.length; tcn++) {
          if (tlEl.childNodes[tcn].nodeType === 3) tlText += tlEl.childNodes[tcn].textContent;
        }
        tlText = tlText.trim().replace(/\s+/g, ' ');
        if (!tlText) tlText = tlEl.textContent.trim().replace(/\s+/g, ' ');
        if (tlText.length < 5 || tlText.length > 80) continue;
        if (!LABEL_KW.test(tlText)) continue;
        triggerLabels.push({ el: tlEl, text: tlText });
      }

      console.log('[STS Clipart Pro 8.3 Clipart] Phase 1d: found', triggerLabels.length, 'trigger labels');

      for (var tgi = 0; tgi < triggerLabels.length; tgi++) {
        var tg = triggerLabels[tgi];
        // Look for clickable items near this label (siblings, parent's children)
        var searchArea = tg.el.parentElement;
        if (!searchArea) continue;

        // Walk up to find area with clickable items
        for (var tLev = 0; tLev < 4 && searchArea; tLev++) {
          var clickables = searchArea.querySelectorAll('img, [role="button"], [class*="option"], [class*="item"], [class*="swatch"], button:not([type="submit"]), [style*="cursor: pointer"], [style*="cursor:pointer"]');
          // Filter to small, uniform clickable items (not navigation buttons)
          var triggerItems = [];
          for (var tci = 0; tci < clickables.length; tci++) {
            var tc = clickables[tci];
            var tcr = tc.getBoundingClientRect();
            if (tcr.width >= 20 && tcr.width <= 150 && tcr.height >= 20 && tcr.height <= 150 && tc.offsetParent) {
              triggerItems.push(tc);
            }
          }

          if (triggerItems.length >= 2 && triggerItems.length <= 12) {
            // Click each trigger item to expand sub-options
            console.log('[STS Clipart Pro 8.3 Clipart] Phase 1d: clicking', triggerItems.length, 'triggers for "' + tg.text + '"');
            for (var tti = 0; tti < Math.min(triggerItems.length, 8); tti++) {
              var trigItem = triggerItems[tti];
              var trigKey = 'deep|' + tg.text + '|' + tti;
              if (clickedKeys.has(trigKey)) continue;

              console.log('[STS Clipart Pro 8.3 Clipart] Phase 1d click: "' + tg.text + '" [' + tti + ']');
              trigItem.click();
              clickedKeys.add(trigKey);
              totalClicks++;

              await sleep(2500);

              // Scroll down to reveal any newly rendered content
              var trigRect = searchArea.getBoundingClientRect();
              window.scrollTo({ top: trigRect.bottom + window.scrollY, behavior: 'instant' });
              await sleep(500);
              window.scrollTo({ top: trigRect.top + window.scrollY - 50, behavior: 'instant' });
              await sleep(500);

              await snapshotNow();
              showProgress(20 + Math.round(tti * 2), 'Expanding "' + tg.text + '" [' + (tti + 1) + '/' + triggerItems.length + ']...');
            }
            break; // Found triggers for this label, move to next label
          }
          searchArea = searchArea.parentElement;
        }
      }

      // Final snapshot after all Phase 1d clicks
      if (totalClicks > 0) {
        await sleep(1500);
        await snapshotNow();
      }
    }

    // Final empty grid check
    for (var retry = 0; retry < 2; retry++) {
      var empties = [];
      document.querySelectorAll('.customall-grid').forEach(function(g) {
        if (g.querySelectorAll('img').length === 0) empties.push(g);
      });
      if (empties.length === 0) break;
      for (var ei = 0; ei < empties.length; ei++) {
        empties[ei].scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(1200);
      }
      await sleep(1500);
      await snapshotNow();
    }
    
    // ---- PHASE 2: Manual continue (watch for DOM changes) ----
    showProgress(25, allGroups.length + ' groups. Click options trên trang để thêm...');
    
    // Set up MutationObserver to detect when user clicks options
    var manualDone = false;
    var manualPromise = new Promise(function(resolve) {
      // Add "Done" button to progress area
      var progressEl = document.getElementById('sts-scan-progress');
      if (progressEl) {
        var doneBtn = document.createElement('button');
        doneBtn.textContent = '✓ Đã đủ — Tiếp tục';
        doneBtn.style.cssText = 'margin-top:8px;padding:8px 16px;background:#2F7D57;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;width:100%;font-family:var(--sts-font);';
        doneBtn.onclick = function() { manualDone = true; resolve(); };
        progressEl.appendChild(doneBtn);
      }
      
      // Watch DOM for changes (user clicking options)
      // v8.3.0: Debounce to prevent infinite loop when observing body
      var _observerTimer = null;
      var _observerBusy = false;
      var observer = new MutationObserver(function() {
        if (manualDone || _observerBusy) return;
        clearTimeout(_observerTimer);
        _observerTimer = setTimeout(async function() {
          if (manualDone) return;
          _observerBusy = true;
          try {
            var newAdded = await snapshotNow();
            if (newAdded > 0) {
              showProgress(25, allGroups.length + ' groups. Click thêm hoặc bấm "Đã đủ"...');
            }
          } finally {
            // Release guard after a short delay to ignore mutations caused by our own scan
            setTimeout(function() { _observerBusy = false; }, 500);
          }
        }, 800);
      });
      
      var formEl = document.querySelector('.ctm-artwork-personalized-form, .ant-form, .product-form, form.personalization-form, .personalization-form, .by-customization-form, [class*="customizer-form"], [class*="personalization"], .tib-container, [class*="tib-personalization"], [class*="product-customizer"], .product-single__form');
      if (formEl) {
        observer.observe(formEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
      }
      // Also observe Wanderprints form if separate from main form
      if (!formEl || !formEl.querySelector('.by-customization-form__element')) {
        var wpForm = document.querySelector('.by-customization-form, form.personalization-form, .personalization-form');
        if (wpForm && wpForm !== formEl) {
          observer.observe(wpForm, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        }
      }
      // v8.3.0: Fallback — if no known form found, observe main product area or body
      if (!formEl) {
        var productArea = document.querySelector('main, [role="main"], .product, [class*="product"], #MainContent');
        if (productArea) {
          observer.observe(productArea, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        } else {
          observer.observe(document.body, { childList: true, subtree: true });
        }
      }
      
      // Auto-timeout after 60s
      setTimeout(function() {
        if (!manualDone) {
          manualDone = true;
          observer.disconnect();
          resolve();
        }
      }, 60000);
      
      // Also resolve when done button clicked
      window.__stsManualDone = function() { manualDone = true; observer.disconnect(); resolve(); };
    });
    
    await manualPromise;
    
    // ---- SORT ----
    var bodyOrder = ['choose', 'title', 'number', 'gender', 'age', 'option', 'skin', 'eyes', 'hair color', 'hair style', 
      'beard color', 'beard style', 'outfit', 'sweatshirt', 'pajama', 'tank', 't-shirt', 'outfit style',
      'pants', 'glasses', 'accessory', 'drink', 'background'];
    
    var personOrder = [];
    allGroups.forEach(function(g) {
      var prefix = (g.label.match(/^([\w\']+(?:\'s)?)\s/i) || ['', ''])[1].toLowerCase();
      if (!prefix) prefix = g.label.toLowerCase().split(' ')[0];
      if (personOrder.indexOf(prefix) === -1) personOrder.push(prefix);
    });
    
    allGroups.sort(function(a, b) {
      var aL = a.label.toLowerCase();
      var bL = b.label.toLowerCase();
      var aPrefix = (aL.match(/^([\w\']+(?:\'s)?)\s/i) || ['', ''])[1];
      var bPrefix = (bL.match(/^([\w\']+(?:\'s)?)\s/i) || ['', ''])[1];
      if (!aPrefix) aPrefix = aL.split(' ')[0];
      if (!bPrefix) bPrefix = bL.split(' ')[0];
      
      var aPersonIdx = personOrder.indexOf(aPrefix);
      var bPersonIdx = personOrder.indexOf(bPrefix);
      if (aPersonIdx !== bPersonIdx) return aPersonIdx - bPersonIdx;
      
      var aOrder = bodyOrder.length;
      var bOrder = bodyOrder.length;
      for (var i = 0; i < bodyOrder.length; i++) {
        if (aOrder === bodyOrder.length && aL.includes(bodyOrder[i])) aOrder = i;
        if (bOrder === bodyOrder.length && bL.includes(bodyOrder[i])) bOrder = i;
      }
      return aOrder - bOrder;
    });
    
    console.log('[STS Clipart Pro 8.3 Clipart] ===== RESULT: ' + allGroups.length + ' groups, ' + totalClicks + ' auto-clicks =====');
    allGroups.forEach(function(g, i) { console.log('  ' + (i+1) + '. "' + g.label + '" → ' + g.options.length + ' opts'); });
    
    return allGroups;
  }




  function isAutoDebugEnabled(doc) {
    var d = doc || document;
    if (!d || !d.documentElement) return !!window.__STS_CLIPART_DEBUG_MANUAL_PICK;
    return d.documentElement.getAttribute('data-sts-clipart-debug-manual-pick') === '1' || !!window.__STS_CLIPART_DEBUG_MANUAL_PICK;
  }

  function hasOutsideVariantTerms(groups) {
    if (!Array.isArray(groups) || !groups.length) return false;
    var re = /\b(style|square|circle|lace square|lace circle)\b/i;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i] || {};
      if (re.test(String(g.label || g.name || g.title || ''))) return true;
      var options = Array.isArray(g.options) ? g.options : [];
      for (var j = 0; j < options.length; j++) {
        var o = options[j] || {};
        var blob = [o.label, o.textContent, o.value, o.name].join(' ');
        if (re.test(String(blob))) return true;
      }
    }
    return false;
  }

  function mapResolvedProfileOption(rawOption) {
    var opt = rawOption || {};
    var text = String(opt.textContent || opt.value || opt.name || '').trim();
    var value = String(opt.value || text || '').trim();
    var name = String(opt.name || value || text || '').trim();
    var imageUrl = opt.imageUrl || opt.image || null;
    var capturedImage = opt.capturedImage || imageUrl || null;
    var mapped = {
      textContent: text,
      value: value,
      name: name,
      imageUrl: imageUrl,
      capturedImage: capturedImage,
      bgColor: opt.bgColor || '',
      optionType: opt.optionType || '',
      sourceKind: opt.sourceKind || '',
      element: opt.element || null,
      rect: opt.rect || { x: 0, y: 0, w: 0, h: 0 }
    };
    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      console.log('[STS AUTO DEBUG] MAPPED_OPTION', {
        textContent: mapped.textContent || '',
        value: mapped.value || '',
        name: mapped.name || '',
        imageUrl: mapped.imageUrl || null,
        capturedImage: mapped.capturedImage || null,
        bgColor: mapped.bgColor || '',
        optionType: mapped.optionType || '',
        sourceKind: mapped.sourceKind || '',
        hasImage: !!(mapped.capturedImage || mapped.imageUrl)
      });
    }
    return mapped;
  }

  function mapResolvedProfileGroup(rawGroup, ctx, profile) {
    if (!rawGroup || typeof rawGroup !== 'object') return null;
    var group = rawGroup;
    if (profile && typeof profile.normalizeGroup === 'function') {
      group = profile.normalizeGroup(rawGroup, ctx) || rawGroup;
    }
    var title = String(group.label || group.name || group.title || '').trim();
    var options = Array.isArray(group.options) ? group.options : (Array.isArray(group.items) ? group.items : []);
    if (!title || !options.length) return null;
    var mapped = options.map(mapResolvedProfileOption).filter(function(opt) {
      return !!(String(opt.textContent || opt.value || opt.name || '').trim() || opt.imageUrl || opt.capturedImage || opt.bgColor);
    });
    if (!mapped.length) return null;
    return { label: title, options: mapped, rect: group.rect || null };
  }


  async function collectAutoScanGroupsViaResolver() {
    var ns = window.STSClipartScanner;
    var profileContextApi = ns && ns.profileContext;
    var profilesApi = ns && ns.profiles;
    if (!profileContextApi || typeof profileContextApi.create !== 'function') {
      console.warn('[STS Clipart Pro 8.3 Clipart] Auto Scan fallback: profileContext.create unavailable');
      return null;
    }
    if (!profilesApi || typeof profilesApi.resolve !== 'function') {
      console.warn('[STS Clipart Pro 8.3 Clipart] Auto Scan fallback: profiles.resolve unavailable');
      return null;
    }

    var ctx = profileContextApi.create({ document: document, location: location, window: window });
    var host = String((ctx && ctx.location && ctx.location.hostname) || (location && location.hostname) || '');
    var trace = {
      build: STS_CLIPART_BUILD,
      host: host,
      resolvedProfileId: null,
      matchedProfileId: null,
      dedicatedPawesomehouseSelected: false,
      scanPageEntered: false,
      scanPageFunctionOwner: null,
      customilyRootFound: false,
      customilyGroupCount: 0,
      fallbackToExpandAndSnapshot: false,
      fallbackReason: '',
      groups: []
    };
    var profile = profilesApi.resolve(ctx);
    var profileIdForGuard = String((profile && profile.id) || '').toLowerCase();
    var matchedIdForGuard = String((profile && profile.matchedProfileId) || '').toLowerCase();
    var isDedicatedPawesomehouse = profileIdForGuard === 'pawesomehouse-customily-manual' || matchedIdForGuard === 'pawesomehouse-customily-manual';
    trace.resolvedProfileId = profile && profile.id ? profile.id : null;
    trace.matchedProfileId = profile && profile.matchedProfileId ? profile.matchedProfileId : null;
    trace.dedicatedPawesomehouseSelected = isDedicatedPawesomehouse;
    trace.scanPageFunctionOwner = (profile && profile.id === 'pawesomehouse-customily-manual') ? 'pawesomehouse-customily-dedicated' : (profile && profile.id ? 'profile:' + profile.id : 'unknown');
    var customilyRoot = document && document.querySelector ? document.querySelector('#customily-options') : null;
    trace.customilyRootFound = !!customilyRoot;
    trace.customilyGroupCount = customilyRoot && customilyRoot.querySelectorAll ? customilyRoot.querySelectorAll('.customily_option').length : 0;
    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      var profileId = profile && profile.id ? profile.id : 'none';
      var matchedId = profile && profile.matchedProfileId ? profile.matchedProfileId : 'none';
      var hasCustomScanPage = !!(profile && typeof profile.scanPage === 'function');
      var ownerMarker = (profile && profile.id === 'pawesomehouse-customily-manual') ? 'pawesomehouse-customily-dedicated' : (profile && profile.id ? 'profile:' + profile.id : 'unknown');
      console.log('[STS AUTO DEBUG] resolver profile id', profileId);
      console.log('[STS AUTO DEBUG] resolver matchedProfileId', matchedId);
      console.log('[STS AUTO DEBUG] resolver host', host);
      console.log('[STS AUTO DEBUG] dedicated pawesomehouse/customily selected', isDedicatedPawesomehouse ? 'yes' : 'no');
      console.log('[STS AUTO DEBUG] has custom scanPage', hasCustomScanPage);
      console.log('[STS AUTO DEBUG] scanPage owner/source marker', ownerMarker);
    }
    if (/(\.|^)pawesomehouse\.com$/i.test(host) && trace.customilyRootFound && !isDedicatedPawesomehouse) {
      trace.fallbackToExpandAndSnapshot = false;
      trace.fallbackReason = 'pawesomehouse-root-present-but-dedicated-profile-not-selected';
      return { groups: null, trace: trace };
    }
    if (!profile || typeof profile.scanPage !== 'function') {
      var matchedId = profile && profile.matchedProfileId ? profile.matchedProfileId : 'none';
      console.warn('[STS Clipart Pro 8.3 Clipart] Auto Scan fallback: invalid effective profile (matched=' + matchedId + ')');
      trace.fallbackReason = 'invalid-effective-profile';
      return { groups: null, trace: trace };
    }

    trace.scanPageEntered = true;
    var rawGroups = profile.scanPage(ctx);
    if (rawGroups && typeof rawGroups.then === 'function') rawGroups = await rawGroups;
    if (!Array.isArray(rawGroups)) rawGroups = [];
    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      rawGroups.forEach(function(group) {
        var gname = String((group && (group.label || group.name || group.title)) || '');
        var options = Array.isArray(group && group.options) ? group.options : [];
        options.forEach(function(opt) {
          console.log('[STS AUTO DEBUG] RAW_PROFILE_AUTO', {
            group: gname,
            textContent: opt && opt.textContent || '',
            value: opt && opt.value || '',
            name: opt && opt.name || '',
            imageUrl: opt && opt.imageUrl || null,
            capturedImage: opt && opt.capturedImage || null,
            bgColor: opt && opt.bgColor || '',
            optionType: opt && opt.optionType || '',
            sourceKind: opt && opt.sourceKind || '',
            hasImage: !!(opt && (opt.capturedImage || opt.imageUrl))
          });
        });
      });
    }
    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      console.log('[STS AUTO DEBUG] scanPage returned group count', rawGroups.length);
      var firstImageBeforeNormalize = null;
      for (var rgi = 0; rgi < rawGroups.length && !firstImageBeforeNormalize; rgi++) {
        var ropts = Array.isArray(rawGroups[rgi] && rawGroups[rgi].options) ? rawGroups[rgi].options : [];
        for (var roi = 0; roi < ropts.length; roi++) {
          if (ropts[roi] && (ropts[roi].imageUrl || ropts[roi].capturedImage)) {
            firstImageBeforeNormalize = {
              group: rawGroups[rgi] && (rawGroups[rgi].name || rawGroups[rgi].label || rawGroups[rgi].title),
              value: ropts[roi].value || '',
              textContent: ropts[roi].textContent || '',
              imageUrl: ropts[roi].imageUrl || null,
              capturedImage: ropts[roi].capturedImage || null
            };
            break;
          }
        }
      }
      console.log('[STS AUTO DEBUG] first image option before normalize', firstImageBeforeNormalize);
    }
    if (!rawGroups.length && isDedicatedPawesomehouse) {
      if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
        console.log('[STS AUTO DEBUG] dedicated customily empty result; skip generic fallback');
      }
      return { groups: [], trace: trace };
    }
    var mappedGroups = rawGroups.map(function(rawGroup) {
      return mapResolvedProfileGroup(rawGroup, ctx, profile);
    }).filter(Boolean);
    var targetNames = {
      "man's body type": true,
      "man's skin color": true,
      "man's hair color": true,
      "black": true,
      "man's beard color": true,
      "color: white": true
    };
    trace.groups = mappedGroups.filter(function(group) {
      var n = String((group && group.label) || '').trim().toLowerCase();
      return !!targetNames[n];
    }).map(function(group) {
      var opts = Array.isArray(group.options) ? group.options : [];
      return {
        name: group.label,
        swatchCandidateCount: opts.filter(function(o) { return String(o.sourceKind || '').indexOf('swatch') >= 0; }).length,
        selectCount: opts.filter(function(o) { return String(o.sourceKind || '').indexOf('select') >= 0; }).length,
        rawOptions: opts,
        mappedOptions: opts,
        normalizedOptions: opts,
        panelOptions: opts
      };
    });
    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      var firstImageAfterNormalize = null;
      for (var mgi = 0; mgi < mappedGroups.length && !firstImageAfterNormalize; mgi++) {
        var mopts = Array.isArray(mappedGroups[mgi] && mappedGroups[mgi].options) ? mappedGroups[mgi].options : [];
        for (var moi = 0; moi < mopts.length; moi++) {
          if (mopts[moi] && (mopts[moi].imageUrl || mopts[moi].capturedImage)) {
            firstImageAfterNormalize = {
              group: mappedGroups[mgi] && mappedGroups[mgi].label,
              value: mopts[moi].value || '',
              textContent: mopts[moi].textContent || '',
              imageUrl: mopts[moi].imageUrl || null,
              capturedImage: mopts[moi].capturedImage || null
            };
            break;
          }
        }
      }
      console.log('[STS AUTO DEBUG] normalized group labels', mappedGroups.map(function(g) { return g && g.label; }));
      console.log('[STS AUTO DEBUG] first image option after normalize', firstImageAfterNormalize);
      console.log('[STS AUTO DEBUG] contains outside variant labels', hasOutsideVariantTerms(mappedGroups) ? 'yes' : 'no');
    }
    return { groups: mappedGroups, trace: trace };
  }


  function isDefaultManualMethodInherited(profile, profilesApi) {
    if (!profile || typeof profile.scanManualGroupFromTitle !== 'function') return false;
    var defaultProfile = profilesApi && typeof profilesApi.getDefault === 'function' ? profilesApi.getDefault() : null;
    if (!defaultProfile || typeof defaultProfile.scanManualGroupFromTitle !== 'function') return false;
    return profile.scanManualGroupFromTitle === defaultProfile.scanManualGroupFromTitle;
  }

  function truncManualHtml(el) {
    var html = (el && el.outerHTML) ? String(el.outerHTML) : '';
    return html.length > 200 ? html.slice(0, 200) + '…' : html;
  }

  function getManualTitleCandidates() {
    var activeProfile = getManualProfileForHost();
    var titles = [];
    var seen = new Set();
    function addTitle(titleEl, groupEl) {
      if (!titleEl || seen.has(titleEl)) return;
      var ttl = activeProfile && activeProfile.cleanupTitle ? activeProfile.cleanupTitle(titleEl.textContent || '') : (titleEl.textContent || '').trim();
      ttl = String(ttl || '').replace(/\s+/g, ' ').trim();
      if (!ttl) return;
      if (groupEl) titleEl.__stsManualProfileGroup = groupEl;
      seen.add(titleEl);
      titles.push(titleEl);
    }

    if (activeProfile && !activeProfile.useLegacyGeneric && typeof activeProfile.getRoot === 'function' && typeof activeProfile.getGroups === 'function' && (typeof activeProfile.getTitleElement === 'function' || typeof activeProfile.getTitle === 'function')) {
      var root = activeProfile.getRoot(document) || document;
      var groups = activeProfile.getGroups(root) || [];
      groups.forEach(function(group) {
        if (activeProfile.isValidGroup && !activeProfile.isValidGroup(group)) return;
        var titleEl = activeProfile.getTitleElement ? activeProfile.getTitleElement(group) : activeProfile.getTitle(group);
        addTitle(titleEl, group);
      });
      return { profile: activeProfile, titles: titles, source: 'manual-profile' };
    }

    var GROUP_SELS = [
      '.by-customization-form__element',
      '.by-customization-form_element',
      '[class*="customization-form__element"]',
      '[class*="customization-form_element"]',
      '.ant-form-item',
      '.product-form__input',
      'fieldset',
      '.tib-field', '[class*="tib-option"]',
      '[class*="option-group"]', '[class*="option-wrap"]',
      '[class*="personalization-option"]', '[class*="personalization"]',
      '.form-group', '.product-option', '[class*="product-option"]',
      '[class*="customizer"]',
    ];
    var LABEL_SELS = '.ant-form-item-label label, .by-customization-form__label, [class*="form__label"], [class*="option-label"], [class*="field-label"], .tib-label';
    var containers = [];
    var seenContainers = new Set();
    GROUP_SELS.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        if (seenContainers.has(el)) return;
        var swc = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"]').length;
        var imc = el.querySelectorAll('img').length;
        if (swc >= 2 || (imc >= 2 && imc <= 100)) {
          seenContainers.add(el);
          containers.push(el);
        }
      });
    });
    containers.forEach(function(container) {
      var labelEl = container.querySelector(LABEL_SELS) || container.querySelector('label, legend, strong, h4, h5, [class*="label"]');
      if (!labelEl) return;
      var labelText = labelEl.textContent.trim();
      if (labelText.length < 2 || labelText.length > 60) return;
      addTitle(labelEl, container);
    });
    return { profile: activeProfile || null, titles: titles, source: 'legacy-generic-manual' };
  }

  function hasManualDrivenAutoCandidates() {
    var candidates = getManualTitleCandidates();
    return !!(candidates && candidates.titles && candidates.titles.length);
  }

  function collectManualGroupViaLegacyContainer(titleEl) {
    if (!titleEl) return null;
    var formItem = titleEl.closest && titleEl.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"], .ant-form-item, .product-form__input, fieldset, .tib-field, [class*="tib-option"], [class*="option-group"], [class*="option-wrap"], [class*="personalization-option"], .form-group, .product-option, [class*="product-option"]');
    if (!formItem) {
      var el = titleEl.parentElement;
      for (var d = 0; d < 10 && el && el !== document.body; d++) {
        var swc = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="swatch-item"], [class*="option-item"]').length;
        var imc = el.querySelectorAll('img').length;
        if (swc >= 2 && swc <= 80) { formItem = el; break; }
        if (imc >= 2 && imc <= 80) { formItem = el; break; }
        el = el.parentElement;
      }
    }
    if (!formItem) return null;
    var label = titleEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
    if (label.length > 60) label = label.substring(0, 60);
    if (!label) label = 'Unknown Group';
    var opts = collectOptionsInContainer(formItem);
    if (!opts || !opts.length) return null;
    return { label: label, options: opts, rect: formItem.getBoundingClientRect ? formItem.getBoundingClientRect() : null };
  }

  function collectManualGroupViaResolver(titleEl) {
    var ns = window.STSClipartScanner;
    var profileContextApi = ns && ns.profileContext;
    var profilesApi = ns && ns.profiles;
    if (!profileContextApi || typeof profileContextApi.create !== 'function') {
      console.warn('[STS Clipart Pro 8.3 Clipart] Manual Pick fallback: profileContext.create unavailable');
      return { fallback: true, reason: 'no-profile-context' };
    }
    if (!profilesApi || typeof profilesApi.resolve !== 'function') {
      console.warn('[STS Clipart Pro 8.3 Clipart] Manual Pick fallback: profiles.resolve unavailable');
      return { fallback: true, reason: 'no-profiles-resolve' };
    }
    var ctx = profileContextApi.create({ document: document, location: location, window: window });
    var profile = profilesApi.resolve(ctx);
    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      var host = String((ctx && ctx.location && ctx.location.hostname) || (location && location.hostname) || '');
      var profileId = profile && profile.id ? profile.id : 'none';
      var matchedId = profile && profile.matchedProfileId ? profile.matchedProfileId : 'none';
      var hasCustomScanPage = !!(profile && typeof profile.scanPage === 'function');
      var ownerMarker = (profile && profile.id === 'pawesomehouse-customily-manual') ? 'pawesomehouse-customily-dedicated' : (profile && profile.id ? 'profile:' + profile.id : 'unknown');
      console.log('[STS AUTO DEBUG] resolver profile id', profileId);
      console.log('[STS AUTO DEBUG] resolver matchedProfileId', matchedId);
      console.log('[STS AUTO DEBUG] resolver host', host);
      console.log('[STS AUTO DEBUG] has custom scanPage', hasCustomScanPage);
      console.log('[STS AUTO DEBUG] scanPage owner/source marker', ownerMarker);
    }
    if (!profile || typeof profile.scanManualGroupFromTitle !== 'function' || typeof profile.normalizeGroup !== 'function') {
      var matchedId = profile && profile.matchedProfileId ? profile.matchedProfileId : 'none';
      console.warn('[STS Clipart Pro 8.3 Clipart] Manual Pick fallback: invalid effective profile (matched=' + matchedId + ')');
      return { fallback: true, reason: 'invalid-effective-profile' };
    }

    var defaultInheritedManual = isDefaultManualMethodInherited(profile, profilesApi);
    var rawGroup = profile.scanManualGroupFromTitle(titleEl, ctx);
    if (isAutoDebugEnabled(document) && rawGroup && Array.isArray(rawGroup.options)) {
      rawGroup.options.forEach(function(opt) {
        console.log('[STS AUTO DEBUG] RAW_PROFILE_MANUAL', {
          group: rawGroup.name || rawGroup.label || rawGroup.title || '',
          textContent: opt && opt.textContent || '',
          value: opt && opt.value || '',
          name: opt && opt.name || '',
          imageUrl: opt && opt.imageUrl || null,
          capturedImage: opt && opt.capturedImage || null,
          bgColor: opt && opt.bgColor || '',
          optionType: opt && opt.optionType || '',
          sourceKind: opt && opt.sourceKind || '',
          hasImage: !!(opt && (opt.capturedImage || opt.imageUrl))
        });
      });
    }
    var normalizedGroup = profile.normalizeGroup(rawGroup, ctx);
    var mapped = mapResolvedProfileGroup(normalizedGroup, ctx, null);
    var mappedCount = mapped && Array.isArray(mapped.options) ? mapped.options.length : 0;
    if (window.__STS_CLIPART_DEBUG_MANUAL_PICK) {
      var rawOptions = rawGroup && Array.isArray(rawGroup.options) ? rawGroup.options.length : 0;
      var normalizedOptions = normalizedGroup && Array.isArray(normalizedGroup.options) ? normalizedGroup.options.length : 0;
      console.log('[STS ManualPick Debug] profile.id:', profile && profile.id, 'matchedProfileId:', profile && profile.matchedProfileId, 'manual method:', defaultInheritedManual ? 'default-inherited' : 'custom-override');
      console.log('[STS ManualPick Debug] rawGroup option count:', rawOptions, 'normalizedGroup option count:', normalizedOptions, 'mapped picked.options count:', mappedCount);
    }
    var matchedId = String((profile && profile.matchedProfileId) || '').toLowerCase();
    var effectiveId = String((profile && profile.id) || '').toLowerCase();
    var isDefaultProfile = matchedId === 'default' || effectiveId === 'default' || matchedId === 'generic' || effectiveId === 'generic';
    if ((!mapped || !Array.isArray(mapped.options) || mapped.options.length < 1) && (isDefaultProfile || defaultInheritedManual)) {
      if (window.__STS_CLIPART_DEBUG_MANUAL_PICK) {
        console.log('[STS ManualPick Debug] fallback reason used: default-empty-manual-group');
      }
      return { fallback: true, reason: 'default-empty-manual-group', profile: profile, ctx: ctx };
    }
    return { fallback: false, group: mapped, profile: profile, ctx: ctx };
  }

  // ---- Main scan function ----
  async function scanCliparts() {
    if (CLIPART.isScanning) return null;
    CLIPART.isScanning = true;
    clearProgress(); // v3.0.7: Clear any stale progress bar from previous scan
    showProgress(5, 'Đang expand tất cả options...');

    try {
      if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
        console.log('[STS AUTO DEBUG] core Auto entered');
      }
      // Resolve scan path through profile resolver, fallback to legacy expansion if unavailable
      var resolverResult = await collectAutoScanGroupsViaResolver();
      var groups = resolverResult && resolverResult.groups ? resolverResult.groups : null;
      var autoTrace = resolverResult && resolverResult.trace ? resolverResult.trace : { build: STS_CLIPART_BUILD, groups: [] };
      if (!groups) {
        autoTrace.fallbackToExpandAndSnapshot = true;
        groups = await expandAndSnapshot();
      }
      try {
        if (document && document.documentElement) {
          document.documentElement.setAttribute('data-sts-last-auto-trace', JSON.stringify(autoTrace));
        }
        window.__STS_LAST_AUTO_TRACE = autoTrace;
        window.__STS_DEBUG_DUMP_AUTO_RESULT = function() { return window.__STS_LAST_AUTO_TRACE; };
      } catch (e) {}
      
      if (!groups || !groups.length) {
        showProgress(100, 'Không tìm thấy options');
        clipNotify('Không tìm thấy clipart options trên trang này', 'warning');
        CLIPART.isScanning = false;
        return null;
      }
      showProgress(28, groups.length + ' nhóm phát hiện');

      // Assign prefixes — v3.0.4: Use A, B, C... sequential letters
      const cats = groups.map((g, idx) => {
        const pfx = sequentialPrefix(idx);
        return {
          name: g.label,
          prefix: pfx,
          options: g.options.map((o, i) => ({ ...o, label: `${pfx}${i + 1}` })),
          optionCount: g.options.length,
          rect: g.rect,
        };
      });
      showProgress(30, 'Đang capture ảnh...');

      // Capture screenshots (30→90%)
      const totalCats = cats.length;
      for (let ci = 0; ci < totalCats; ci++) {
        const cat = cats[ci];
        const pct = 30 + Math.round(((ci + 1) / totalCats) * 60);
        showProgress(pct, 'Capture: ' + cat.name + ' (' + (ci + 1) + '/' + totalCats + ')');
        
        // Check if elements are still in DOM & visible
        if (cat.options[0]?.element?.offsetParent) {
          await captureSingleGroup(cat);
        } else {
          // Not visible — use imageUrl fallback
          for (var oi = 0; oi < cat.options.length; oi++) {
            if (cat.options[oi].imageUrl && !cat.options[oi].capturedImage) {
              cat.options[oi].capturedImage = cat.options[oi].imageUrl;
            }
          }
        }
      }

      showProgress(92, 'Đang xử lý kết quả...');

      // Build result
      const result = {
        url: window.location.href,
        title: document.title,
        platform: (window.Shopify || document.querySelector('[data-shopify]')) ? 'shopify' : window.location.hostname.includes('etsy') ? 'etsy' : 'custom',
        scannedAt: new Date().toISOString(),
        categories: cats.map(c => ({
          name: c.name,
          prefix: c.prefix,
          optionCount: c.optionCount,
          options: c.options.map(o => ({
            label: o.label,
            imageUrl: o.imageUrl,
            capturedImage: o.capturedImage || null,
            bgColor: o.bgColor,
            textContent: o.textContent,
            width: o.rect.w,
            height: o.rect.h,
          })),
        })),
      };

      CLIPART.categories = cats;
      CLIPART.capturedData = result;
      CLIPART.isScanning = false;

      const totalOpts = cats.reduce((s, c) => s + c.optionCount, 0);
      showProgress(100, `Xong! ${cats.length} nhóm · ${totalOpts} options`);
      clipNotify(`Quét xong! ${cats.length} nhóm, ${totalOpts} options`, 'success');
      if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
        console.log('[STS AUTO DEBUG] final panel group count', cats.length);
      }

      // v8.0.4: Removed page overlay labels (đè lên clipart trên trang)
      // Show panel
      showClipartPanel(result);

      return result;
    } catch(err) {
      console.error('[STS Clipart Pro 8.3 Clipart]', err);
      showProgress(100, 'Lỗi: ' + err.message);
      clipNotify('Lỗi: ' + err.message, 'error');
      CLIPART.isScanning = false;
      return null;
    }
  }

  // ---- Show labels on page ----
  function showLabelsOnPage(cats) {
    document.querySelectorAll('.sts-clip-label').forEach(e => e.remove());
    const colors = ['#1B5E20','#B71C1C','#0D47A1','#4A148C','#E65100','#006064','#880E4F','#33691E','#1A237E','#3E2723'];
    cats.forEach((cat, ci) => {
      const color = colors[ci % colors.length];
      cat.options.forEach(opt => {
        if (!opt.element) return;
        const r = opt.element.getBoundingClientRect();
        const lbl = document.createElement('div');
        lbl.className = 'sts-clip-label';
        lbl.style.cssText = `position:fixed;left:${r.right-28}px;top:${r.bottom-16}px;background:${color};color:#fff;font-size:10.5px;font-weight:700;line-height:1.15;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);padding:1px 4px;border-radius:3px;z-index:99999;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.4);line-height:13px;`;
        lbl.textContent = opt.label;
        document.body.appendChild(lbl);
      });
    });
  }

  // ---- Preview panel ----
  window.__stsPickActive = false;

  // ---- v8.0.6: Screenshot Pick Mode ----
  // Full-screen overlay with highest z-index captures drag → scan elements beneath
  function activateScreenshotPick(data, onRefresh) {
    cleanupAllPickModes();
    var ZMAX = 2147483647;

    // v8.0.8: Highlight group titles (same as manual mode)
    highlightGroupTitles();

    var wrapper = document.createElement('div');
    wrapper.id = 'sts-pick-wrapper';

    // Banner
    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:' + ZMAX + ';height:44px;background:#D97706;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    banner.innerHTML = '📸 SCREENSHOT — Kéo chuột chọn vùng clipart &nbsp;<button id="sts-pick-cancel-btn" style="padding:5px 14px;background:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;color:#D97706;">Hủy</button>';
    wrapper.appendChild(banner);

    // v8.0.8+: Full-screen capture overlay — use !important + high z-index to beat page's own elements
    var capture = document.createElement('div');
    capture.id = 'sts-screenshot-capture';
    wrapper.appendChild(capture);

    // Selection box
    var selBox = document.createElement('div');
    selBox.id = 'sts-screenshot-selbox';
    wrapper.appendChild(selBox);

    // v8.0.8+: Inject styles via <style> tag with !important to prevent page CSS override
    var pickStyle = document.createElement('style');
    pickStyle.id = 'sts-pick-capture-style';
    pickStyle.textContent = [
      '#sts-screenshot-capture { position:fixed !important; top:44px !important; left:0 !important; right:0 !important; bottom:0 !important; z-index:' + (ZMAX - 1) + ' !important; cursor:crosshair !important; background:rgba(0,0,0,0.05) !important; pointer-events:auto !important; user-select:none !important; -webkit-user-select:none !important; touch-action:none !important; }',
      '#sts-screenshot-selbox { position:fixed !important; border:3px dashed #D97706 !important; background:rgba(217,119,6,0.15) !important; z-index:' + ZMAX + ' !important; pointer-events:none !important; display:none; border-radius:4px !important; }',
    ].join('\n');
    document.head.appendChild(pickStyle);

    document.body.appendChild(wrapper);

    var startX = 0, startY = 0, isDragging = false;

    wrapper.querySelector('#sts-pick-cancel-btn').onclick = function(e) { e.stopPropagation(); cleanupAllPickModes(); };

    bindEscapeKeyHandler(cleanupAllPickModes);

    // v8.0.8+: Use addEventListener with CAPTURE phase to beat page's event handlers
    // NOTE: e.target is the REAL page element (not our overlay), so we check coordinates instead
    function isInCaptureZone(e) {
      // Above banner (44px) = not ours. On cancel button = not ours. Everything else = ours.
      if (e.clientY < 44) return false;
      if (e.target && e.target.id === 'sts-pick-cancel-btn') return false;
      // Don't capture on the left panel
      var panel = document.getElementById('sts-clip-panel');
      if (panel) {
        var pr = panel.getBoundingClientRect();
        if (e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom) return false;
      }
      return true;
    }
    function onCaptureMouseDown(e) {
      if (!isInCaptureZone(e)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      startX = e.clientX; startY = e.clientY;
      isDragging = true;
      selBox.style.display = 'block';
      selBox.style.left = startX + 'px'; selBox.style.top = startY + 'px';
      selBox.style.width = '0'; selBox.style.height = '0';
      console.log('[STS Clipart Pro 8.3 Screenshot] Drag start:', startX, startY);
    }
    function onCaptureMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var x = Math.min(startX, e.clientX), y = Math.min(startY, e.clientY);
      selBox.style.left = x + 'px'; selBox.style.top = y + 'px';
      selBox.style.width = Math.abs(e.clientX - startX) + 'px';
      selBox.style.height = Math.abs(e.clientY - startY) + 'px';
    }
    function onCaptureMouseUp(e) {
      if (!isDragging) return;
      e.preventDefault(); e.stopImmediatePropagation();
      isDragging = false;
      var x1 = Math.min(startX, e.clientX), y1 = Math.min(startY, e.clientY);
      var w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY);
      selBox.style.display = 'none';
      console.log('[STS Clipart Pro 8.3 Screenshot] Drag end:', {x1, y1, w, h});
      if (w < 30 || h < 30) { clipNotify('Kéo rộng hơn', 'warning'); return; }

      var region = { left: x1, top: y1, right: x1 + w, bottom: y1 + h };
      // Hide entire wrapper momentarily to scan elements beneath (not just capture div)
      wrapper.style.display = 'none';

      var opts = collectOptionsInRegion(region);
      // Restore wrapper
      wrapper.style.display = '';
      if (opts.length < 1) { clipNotify('Không tìm thấy clipart trong vùng', 'warning'); return; }
      var autoName = detectNearestGroupTitleFromOption(opts[0] && opts[0].element);
      var groupName = normScanText(autoName || prompt('Tên nhóm clipart:', '') || '');
      if (!groupName) { clipNotify('Không xác định được tên nhóm hợp lệ', 'warning'); return; }

      // v8.0.8: Always add at bottom + scroll panel to new group
      var newIdx = data.categories.length;
      var pfx = getNextAvailableCategoryPrefix(data.categories);
      data.categories.push({ name: groupName, prefix: pfx, options: opts.map(function(o, i) { return Object.assign({}, o, { label: pfx + (i + 1) }); }), optionCount: opts.length });

      // v8.0.8: Mark the title in the region as "picked" (green + ✓)
      document.querySelectorAll('.sts-highlight-title').forEach(function(ht) {
        var t = ht.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        if (t === groupName) {
          ht.classList.add('sts-picked');
          ht.style.background = '#22C55E';
          ht.style.color = '#fff';
          ht.style.border = '2px solid #22C55E';
        }
      });

      // Stay in screenshot mode — show overlay again for more picks
      capture.style.display = 'block';

      if (onRefresh) onRefresh();

      // v8.0.8: Scroll panel to bottom + highlight new group
      setTimeout(function() {
        var panel = document.getElementById('sts-clip-panel');
        if (panel) {
          var scrollArea = panel.querySelector('div[style*="overflow-y"]');
          if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
          var newCard = panel.querySelector('.sts-clip-cat[data-cat-idx="' + newIdx + '"]');
          if (newCard) {
            newCard.style.background = '#EAF6EF';
            newCard.style.border = '2px solid #22C55E';
            newCard.style.transition = 'all 0.3s ease';
            setTimeout(function() {
              newCard.style.background = '#F9FAFB';
              newCard.style.border = '1px solid #E5E7EB';
            }, 3000);
          }
        }
      }, 100);

      clipNotify('✅ "' + groupName + '" (' + opts.length + ' opts) đã thêm ở cuối', 'success');
    }

    // v8.0.8+: Register events on DOCUMENT with capture phase — this beats any page event handlers
    document.addEventListener('mousedown', onCaptureMouseDown, true);
    document.addEventListener('mousemove', onCaptureMouseMove, true);
    document.addEventListener('mouseup', onCaptureMouseUp, true);

    // Store references for cleanup
    wrapper.__screenshotHandlers = {
      mousedown: onCaptureMouseDown,
      mousemove: onCaptureMouseMove,
      mouseup: onCaptureMouseUp,
    };
  }

  // ---- v8.0.6: Manual Click Pick Mode ----
  // Full-screen transparent overlay, click → elementFromPoint beneath → detect group
  function activateManualPick(data, onRefresh) {
    cleanupAllPickModes();
    var ZMAX = 2147483647;

    // v8.0.8: Highlight all available group titles on the page
    highlightGroupTitles();

    var wrapper = document.createElement('div');
    wrapper.id = 'sts-pick-wrapper';

    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:' + ZMAX + ';height:44px;background:#2F7D57;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    banner.innerHTML = '👆 MANUAL — Click vào title được highlight &nbsp;<button id="sts-pick-cancel-btn" style="padding:5px 14px;background:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;color:#2563EB;">Hủy</button>';
    wrapper.appendChild(banner);

    // v8.0.8: NO full-screen overlay — let user scroll naturally
    // Instead, use delegated click handler on document
    document.body.appendChild(wrapper);

    wrapper.querySelector('#sts-pick-cancel-btn').onclick = function(e) { e.stopPropagation(); cleanupAllPickModes(); };

    bindEscapeKeyHandler(cleanupAllPickModes);

    // v8.0.8: Click handler on highlighted titles directly (no overlay blocking scroll)
    function handleManualClick(e) {
      var target = e.target;
      // Only respond to clicks on highlighted titles or their children
      var highlightedTitle = target.closest('.sts-highlight-title');
      if (!highlightedTitle) return;
      if (!isManualModeActive()) return;

      e.preventDefault();
      e.stopPropagation();

      var resolverPicked = collectManualGroupViaResolver(highlightedTitle);
      var manualDebug = !!window.__STS_CLIPART_DEBUG_MANUAL_PICK;
      if (manualDebug) {
        var parentEl = highlightedTitle && highlightedTitle.parentElement;
        var inMacornerRoot = !!(highlightedTitle && highlightedTitle.closest && highlightedTitle.closest('#customily-options'));
        console.log('[STS ManualPick Debug] clicked title:', {
          text: normScanText(highlightedTitle && highlightedTitle.textContent),
          tag: highlightedTitle && highlightedTitle.tagName,
          className: highlightedTitle && highlightedTitle.className,
          outerHTML: truncManualHtml(highlightedTitle),
          parentTag: parentEl && parentEl.tagName,
          parentClass: parentEl && parentEl.className,
          parentOuterHTML: truncManualHtml(parentEl),
          insideCustomilyOptionsRoot: inMacornerRoot,
          resolverFallback: !!(resolverPicked && resolverPicked.fallback),
          fallbackReason: resolverPicked && resolverPicked.reason
        });
      }
      if (!resolverPicked.fallback) {
        var picked = resolverPicked.group;
        if (!picked || !Array.isArray(picked.options) || picked.options.length < 1) { clipNotify('Không tìm thấy options trong nhóm vừa chọn', 'warning'); return; }
        highlightedTitle.style.background = '#22C55E';
        highlightedTitle.style.color = '#fff';
        highlightedTitle.classList.add('sts-picked');
        highlightedTitle.style.border = '2px solid #22C55E';
        var pfxP = getNextAvailableCategoryPrefix(data.categories);
        data.categories.push({ name: picked.label, prefix: pfxP, options: picked.options.map(function(o, i) { return Object.assign({}, o, { label: pfxP + (i + 1) }); }), optionCount: picked.options.length });
        if (onRefresh) onRefresh();
        clipNotify('✅ "' + picked.label + '" (' + picked.options.length + ' opts) đã thêm ở cuối', 'success');
        return;
      }

      // Legacy manual path only when resolver/profile infrastructure is unavailable or invariant-broken.
      // Find the group container that this title belongs to
      // v8.0.8: Extended selectors for all supported platforms
      var formItem = highlightedTitle.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"], .ant-form-item, .product-form__input, fieldset, .tib-field, [class*="tib-option"], [class*="option-group"], [class*="option-wrap"], [class*="personalization-option"], .form-group, .product-option, [class*="product-option"]');

      if (!formItem) {
        // Walk up from title to find container with swatches/images
        var el = highlightedTitle.parentElement;
        for (var d = 0; d < 10 && el && el !== document.body; d++) {
          var swc = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="swatch-item"], [class*="option-item"]').length;
          var imc = el.querySelectorAll('img').length;
          if (swc >= 2 && swc <= 80) { formItem = el; break; }
          if (imc >= 2 && imc <= 80) { formItem = el; break; }
          el = el.parentElement;
        }
      }

      if (!formItem) { clipNotify('Không tìm thấy nhóm swatches', 'warning'); return; }
      if (manualDebug) {
        var childCount = formItem && formItem.children ? formItem.children.length : 0;
        var outer = formItem && formItem.outerHTML ? formItem.outerHTML : '';
        console.log('[STS ManualPick Debug] range region:', { childCount: childCount, outerHTML: outer.slice(0, 600) });
      }

      // Get label from the highlighted title
      var label = highlightedTitle.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (label.length > 60) label = label.substring(0, 60);
      if (!label) label = 'Unknown Group';

      console.log('[STS Clipart Pro 8.3 Manual Pick] Title click:', label, 'Container:', formItem.tagName);

      var opts = collectOptionsInContainer(formItem);
      if (manualDebug) {
        console.log('[STS ManualPick Debug] collectOptionsInContainer raw count:', Array.isArray(opts) ? opts.length : 0, 'sample:', (opts || []).slice(0, 5));
      }
      if (opts.length < 1) { clipNotify('Không tìm thấy options trong "' + label + '"', 'warning'); return; }

      // v8.0.8: Flash the title green + mark as "picked"
      highlightedTitle.style.background = '#22C55E';
      highlightedTitle.style.color = '#fff';
      highlightedTitle.classList.add('sts-picked');
      highlightedTitle.style.border = '2px solid #22C55E';
      // Don't revert to yellow — keep green to show it's been picked

      // v8.0.8: ALWAYS add at bottom (never replace existing) so user can see it
      var pfx = getNextAvailableCategoryPrefix(data.categories);
      var newIdx = data.categories.length;
      data.categories.push({ name: label, prefix: pfx, options: opts.map(function(o, i) { return Object.assign({}, o, { label: pfx + (i + 1) }); }), optionCount: opts.length });
      if (onRefresh) onRefresh();

      // v8.0.8: Scroll panel to bottom + highlight the new group
      setTimeout(function() {
        var panel = document.getElementById('sts-clip-panel');
        if (panel) {
          var scrollArea = panel.querySelector('div[style*="overflow-y"]');
          if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight; // scroll to bottom
          }
          // Highlight the new category card
          var newCard = panel.querySelector('.sts-clip-cat[data-cat-idx="' + newIdx + '"]');
          if (newCard) {
            newCard.style.background = '#EAF6EF';
            newCard.style.border = '2px solid #22C55E';
            newCard.style.transition = 'all 0.3s ease';
            setTimeout(function() {
              newCard.style.background = '#F9FAFB';
              newCard.style.border = '1px solid #E5E7EB';
            }, 3000);
          }
        }
      }, 100);

      clipNotify('✅ "' + label + '" (' + opts.length + ' opts) đã thêm ở cuối', 'success');
    }

    document.addEventListener('click', handleManualClick, true);
    // Store reference for cleanup
    wrapper.__manualClickHandler = handleManualClick;
  }

  // v8.0.8: Highlight all detectable group titles on the page
  function highlightGroupTitles() {
    removeHighlights(); // Clear any old ones

    var manualCandidates = getManualTitleCandidates();
    var activeProfile = manualCandidates && manualCandidates.profile;
    if (manualCandidates && manualCandidates.source === 'manual-profile') {
      if (window.__STS_CLIPART_DEBUG_MANUAL_PICK) {
        console.log('[STS ManualPick Debug] highlighter active profile id:', activeProfile && activeProfile.id, 'matchedProfileId:', activeProfile && activeProfile.matchedProfileId, 'groupsFound:', manualCandidates.titles.length);
      }
      manualCandidates.titles.forEach(function(titleEl) {
        titleEl.classList.add('sts-highlight-title');
        titleEl.style.cssText += ';background:#FEF3C7 !important;color:#92400E !important;padding:4px 10px !important;border-radius:6px !important;border:2px dashed #F59E0B !important;cursor:pointer !important;display:inline-block !important;transition:all 0.2s !important;';
      });
      var styleP = document.createElement('style');
      styleP.id = 'sts-highlight-style';
      styleP.textContent = '.sts-highlight-title:hover { background:#FDE68A !important; border-color:#D97706 !important; transform:scale(1.03); box-shadow:0 2px 8px rgba(245,158,11,0.3) !important; } .sts-highlight-title.sts-picked { background:#DCFCE7 !important; color:#166534 !important; border-color:#22C55E !important; } .sts-highlight-title.sts-picked::after { content:" ✓"; font-weight:700; }';
      document.head.appendChild(styleP);
      return;
    }

    // v8.0.8: Extended selectors for all platforms (macorner, wrappiness, wanderprints, pawfecthouse, etc.)
    var GROUP_SELS = [
      '.by-customization-form__element',
      '.by-customization-form_element',
      '[class*="customization-form__element"]',
      '[class*="customization-form_element"]',
      '.ant-form-item',
      '.product-form__input',
      'fieldset',
      '.tib-field', '[class*="tib-option"]',
      '[class*="option-group"]', '[class*="option-wrap"]',
      '[class*="personalization-option"]', '[class*="personalization"]',
      '.form-group', '.product-option', '[class*="product-option"]',
      '[class*="customizer"]',
    ];

    var allContainers = [];
    var seen = new Set();
    for (var si = 0; si < GROUP_SELS.length; si++) {
      document.querySelectorAll(GROUP_SELS[si]).forEach(function(el) {
        if (seen.has(el)) return;
        // Must have >=2 swatches or images (real group)
        var swc = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"]').length;
        var imc = el.querySelectorAll('img').length;
        if (swc >= 2 || (imc >= 2 && imc <= 100)) {
          seen.add(el);
          allContainers.push(el);
        }
      });
    }

    // v8.0.8: Extended label selectors for all platforms
    var LABEL_SELS = '.ant-form-item-label label, .by-customization-form__label, [class*="form__label"], [class*="option-label"], [class*="field-label"], .tib-label';
    allContainers.forEach(function(container) {
      var labelEl = container.querySelector(LABEL_SELS);
      if (!labelEl) labelEl = container.querySelector('label, legend, strong, h4, h5, [class*="label"]');
      if (!labelEl) return;
      // Skip if label text is too short or too long
      var labelText = labelEl.textContent.trim();
      if (labelText.length < 2 || labelText.length > 60) return;
      // Add highlight class + style
      labelEl.classList.add('sts-highlight-title');
      labelEl.style.cssText += ';background:#FEF3C7 !important;color:#92400E !important;padding:4px 10px !important;border-radius:6px !important;border:2px dashed #F59E0B !important;cursor:pointer !important;display:inline-block !important;transition:all 0.2s !important;';
    });

    if (false && isPawesomeHousePage()) {
      // pawesomehouse.com manual mode: broaden title detection to custom title wrappers.
      document.querySelectorAll('legend, label, .by-customization-form__label, [class*=option-title], [class*=field-label], [class*=form__label], [class*=option-label], h3, h4, h5, p').forEach(function(el) {
        if (!isPawesomeHouseOptionTitle(el)) return;
        if (el.classList.contains('sts-highlight-title')) return;
        el.classList.add('sts-highlight-title');
        el.style.cssText += ';background:#FEF3C7 !important;color:#92400E !important;padding:4px 10px !important;border-radius:6px !important;border:2px dashed #F59E0B !important;cursor:pointer !important;display:inline-block !important;transition:all 0.2s !important;';
      });
    }

    // Add hover effect + picked state via style tag
    var style = document.createElement('style');
    style.id = 'sts-highlight-style';
    style.textContent = '.sts-highlight-title:hover { background:#FDE68A !important; border-color:#D97706 !important; transform:scale(1.03); box-shadow:0 2px 8px rgba(245,158,11,0.3) !important; } .sts-highlight-title.sts-picked { background:#DCFCE7 !important; color:#166534 !important; border-color:#22C55E !important; } .sts-highlight-title.sts-picked::after { content:" ✓"; font-weight:700; }';
    document.head.appendChild(style);
  }

  var activePickEscapeHandler = null;

  function bindEscapeKeyHandler(onEscape) {
    unbindEscapeKeyHandler();
    if (typeof onEscape !== 'function') return;
    activePickEscapeHandler = function(e) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onEscape();
    };
    document.addEventListener('keydown', activePickEscapeHandler, true);
  }

  function unbindEscapeKeyHandler() {
    if (!activePickEscapeHandler) return;
    document.removeEventListener('keydown', activePickEscapeHandler, true);
    activePickEscapeHandler = null;
  }

  function removeHighlights() {
    document.querySelectorAll('.sts-highlight-title').forEach(function(el) {
      el.classList.remove('sts-highlight-title');
      // Remove our inline styles (approximate cleanup)
      el.style.background = '';
      el.style.color = '';
      el.style.padding = '';
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.cursor = '';
      el.style.display = '';
      el.style.transition = '';
      el.style.transform = '';
      el.style.boxShadow = '';
    });
    var hs = document.getElementById('sts-highlight-style');
    if (hs) hs.remove();
  }

  // ---- v8.0.6: Shared helpers ----
  function cleanupAllPickModes() {
    unbindEscapeKeyHandler();
    var w = document.getElementById('sts-pick-wrapper');
    if (w) {
      // v8.0.8: Remove manual click handler if exists
      if (w.__manualClickHandler) {
        document.removeEventListener('click', w.__manualClickHandler, true);
      }
      // v8.0.8+: Remove screenshot drag handlers if exists
      if (w.__screenshotHandlers) {
        document.removeEventListener('mousedown', w.__screenshotHandlers.mousedown, true);
        document.removeEventListener('mousemove', w.__screenshotHandlers.mousemove, true);
        document.removeEventListener('mouseup', w.__screenshotHandlers.mouseup, true);
      }
      w.remove();
    }
    // v8.0.8: Remove title highlights
    removeHighlights();
    // v8.0.8+: Remove capture style tag
    var cs = document.getElementById('sts-pick-capture-style');
    if (cs) cs.remove();
    var pickBtn = document.querySelector('#sts-clip-pick');
    if (pickBtn) { pickBtn.style.background = '#FFFBEB'; pickBtn.style.color = '#D97706'; pickBtn.innerHTML = stsButtonHtml('pick', 'Pick', '#D97706'); }
    window.__stsPickActive = false;
  }

  function collectOptionsInRegion(region) {
    var m = window.STSClipartScanner && window.STSClipartScanner.collectors;
    if (m && typeof m.collectOptionsInRegion === 'function') return m.collectOptionsInRegion(region);
    return [];
  }

  function collectOptionsInContainer(container) {
    var m = window.STSClipartScanner && window.STSClipartScanner.collectors;
    if (m && typeof m.collectOptionsInContainer === 'function') return m.collectOptionsInContainer(container);
    return [];
  }

  function detectNearestGroupTitleFromOption(optionEl) {
    var m = window.STSClipartScanner && window.STSClipartScanner.collectors;
    if (m && typeof m.detectNearestGroupTitleFromOption === 'function') return m.detectNearestGroupTitleFromOption(optionEl);
    return '';
  }



  function moveArrayItem(arr, fromIdx, toIdx) {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    if (fromIdx === toIdx) return false;
    if (fromIdx < 0 || fromIdx >= arr.length) return false;
    var clampedTo = Math.max(0, Math.min(toIdx, arr.length));
    var item = arr.splice(fromIdx, 1)[0];
    if (typeof item === 'undefined') return false;
    if (fromIdx < clampedTo) clampedTo -= 1;
    arr.splice(clampedTo, 0, item);
    return true;
  }

  function isTextItemOption(opt) {
    return !!(opt && opt.kind === 'text-item');
  }

  function hasSourceKindImageIntent(sourceKind) {
    var kind = String(sourceKind || '').toLowerCase();
    if (!kind) return false;
    return kind.indexOf('swatch') >= 0 || kind.indexOf('image') >= 0 || kind.indexOf('customily') >= 0;
  }

  function isImageBackedOption(opt) {
    if (!opt || typeof opt !== 'object') return false;
    if (opt.imageUrl || opt.capturedImage || opt.bgColor) return true;
    var optionType = String(opt.optionType || '').toLowerCase();
    var sourceKind = String(opt.sourceKind || '').toLowerCase();
    if ((sourceKind === 'select' || sourceKind === 'customily-select') && !opt.imageUrl && !opt.capturedImage && !opt.bgColor) return false;
    if (optionType === 'visual-text') return true;
    if (optionType === 'text' && !opt.imageUrl && !opt.capturedImage && !opt.bgColor && !opt.hasVisual && !opt.needsCapture) return false;
    if (optionType === 'image') return true;
    return hasSourceKindImageIntent(sourceKind);
  }

  function isTextOnlyCategory(cat) {
    var options = (cat && Array.isArray(cat.options)) ? cat.options : [];
    if (!options.length) return false;
    return options.every(function(o) {
      if (isImageBackedOption(o)) return false;
      var txt = (o && (o.textContent || o.label || o.name || o.title || o.text || o.value) ? String(o.textContent || o.label || o.name || o.title || o.text || o.value) : '').trim();
      return txt.length > 0;
    });
  }

  function makeStsUid(prefix) {
    return String(prefix || 'sts') + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function sanitizeGroupPrefix(value, fallback) {
    var clean = String(value == null ? '' : value).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (clean) return clean;
    var fallbackClean = String(fallback == null ? '' : fallback).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    return fallbackClean || 'A';
  }

  function ensureClipartCategoryId(cat) {
    if (!cat || typeof cat !== 'object') return '';
    if (!cat._stsId) cat._stsId = makeStsUid('cat');
    return cat._stsId;
  }

  function ensureClipartOptionId(opt) {
    if (!opt || typeof opt !== 'object') return '';
    if (!opt._stsId) opt._stsId = makeStsUid('opt');
    return opt._stsId;
  }

  function getNextAvailableCategoryPrefix(categories) {
    if (window.STSClipartScanner && window.STSClipartScanner.schema && typeof window.STSClipartScanner.schema.getNextAvailableCategoryPrefix === 'function') {
      return window.STSClipartScanner.schema.getNextAvailableCategoryPrefix(categories);
    }
    var used = Object.create(null);
    (Array.isArray(categories) ? categories : []).forEach(function(cat) {
      if (!cat || isStandaloneTitleCategory(cat)) return;
      var prefix = String(cat.prefix || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      if (prefix) used[prefix] = true;
    });

    var seq = 0;
    while (seq < 2048) {
      var next = sequentialPrefix(seq++);
      if (!used[next]) return next;
    }
    return sequentialPrefix((Array.isArray(categories) ? categories.length : 0) || 0);
  }

  function normalizeClipartOption(opt) {
    if (!opt || typeof opt !== 'object') opt = {};
    ensureClipartOptionId(opt);
    if (typeof opt.textContent !== 'string') opt.textContent = '';
    if (typeof opt.label !== 'string') opt.label = '';
    if (typeof opt.bgColor !== 'string') opt.bgColor = opt.bgColor ? String(opt.bgColor) : '';
    if (!('capturedImage' in opt)) opt.capturedImage = opt.imageUrl || null;
    if (!('imageUrl' in opt)) opt.imageUrl = opt.capturedImage || null;
    if (!opt.capturedImage && opt.imageUrl) opt.capturedImage = opt.imageUrl;
    if (!opt.imageUrl && opt.capturedImage) opt.imageUrl = opt.capturedImage;

    if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
      console.log('[STS AUTO DEBUG] NORMALIZED_OPTION', {
        textContent: opt.textContent || '',
        value: opt.value || '',
        name: opt.name || '',
        imageUrl: opt.imageUrl || null,
        capturedImage: opt.capturedImage || null,
        bgColor: opt.bgColor || '',
        optionType: opt.optionType || '',
        sourceKind: opt.sourceKind || '',
        hasImage: !!(opt.capturedImage || opt.imageUrl)
      });
    }

    if (isTextItemOption(opt)) {
      opt.capturedImage = null;
      opt.imageUrl = null;
      opt.bgColor = '';
      if (!opt.textStyle || typeof opt.textStyle !== 'object') opt.textStyle = {};
      if (!opt.textStyle.color) opt.textStyle.color = '#111827';
      if (!opt.textStyle.background) opt.textStyle.background = '#FFFFFF';
      if (!opt.textStyle.align) opt.textStyle.align = 'left';
    }

    return opt;
  }


function isStandaloneTitleCategory(cat) {
  return !!(cat && cat.kind === 'title-only');
}

  function relabelCategoryOptions(cat) {
    if (!cat) return;
    ensureClipartCategoryId(cat);
    if (!Array.isArray(cat.options)) cat.options = [];
    cat.prefix = sanitizeGroupPrefix(cat.prefix, cat.prefix || 'A');
    cat.optionCount = cat.options.length;
    cat.options = cat.options.map(function(opt) { return normalizeClipartOption(opt); });
    cat.options.forEach(function(opt, idx) {
      ensureClipartOptionId(opt);
      opt.label = cat.prefix + (idx + 1);
    });
  }

  function updateCategoryPrefix(cat, nextPrefix) {
    if (!cat || isStandaloneTitleCategory(cat)) return '';
    cat.prefix = sanitizeGroupPrefix(nextPrefix, cat.prefix || 'A');
    relabelCategoryOptions(cat);
    return cat.prefix;
  }

  function renumberClipartCategories(categories, orderedStates) {
    var ordered = [];
    if (Array.isArray(orderedStates) && orderedStates.length) {
      orderedStates.forEach(function(entry) {
        if (entry && entry.cat) ordered.push(entry.cat);
        else if (entry && typeof entry.idx === 'number' && categories && categories[entry.idx]) ordered.push(categories[entry.idx]);
      });
    } else {
      ordered = Array.isArray(categories) ? categories.slice() : [];
    }

    var seq = 0;
    ordered.forEach(function(cat, idx) {
      normalizeClipartCategory(cat, idx);
      if (!cat || isStandaloneTitleCategory(cat)) {
        if (cat) {
          cat.prefix = '';
          cat.optionCount = 0;
          cat.options = [];
        }
        return;
      }
      updateCategoryPrefix(cat, sequentialPrefix(seq++));
      if (cat.kind === 'text-frame' && (!cat.name || /^Text\b/i.test(cat.name))) {
        cat.name = 'Text ' + cat.prefix;
      }
    });

    if (Array.isArray(categories)) {
      categories.forEach(function(cat, idx) {
        normalizeClipartCategory(cat, idx);
      });
    }

    return true;
  }

  function createTextItemOption(seedText) {
    return normalizeClipartOption({
      kind: 'text-item',
      textContent: typeof seedText === 'string' && seedText.trim() ? seedText : 'New text item',
      capturedImage: null,
      imageUrl: null,
      bgColor: '',
      textStyle: {
        color: '#111827',
        background: '#FFFFFF',
        align: 'left'
      }
    });
  }

  function addTextItemToCategory(data, catIdx, insertIdx) {
    if (!data || !Array.isArray(data.categories)) return false;
    var cat = data.categories[catIdx];
    if (!cat || cat.kind === 'text-frame' || isStandaloneTitleCategory(cat)) return false;
    if (!Array.isArray(cat.options)) cat.options = [];
    var idx = typeof insertIdx === 'number' ? Math.max(0, Math.min(insertIdx, cat.options.length)) : cat.options.length;
    cat.options.splice(idx, 0, createTextItemOption('New text item'));
    relabelCategoryOptions(cat);
    return true;
  }

  function cloneClipartOption(opt) {
    if (!opt || typeof opt !== 'object') return { label: '', textContent: '', capturedImage: null, bgColor: '' };
    var copy = {};
    Object.keys(opt).forEach(function(key) {
      var value = opt[key];
      if (Array.isArray(value)) copy[key] = value.slice();
      else if (value && typeof value === 'object') copy[key] = Object.assign({}, value);
      else copy[key] = value;
    });
    ensureClipartOptionId(copy);
    return copy;
  }

  function duplicateOptionInCategory(data, catIdx, optIdx) {
    if (!data || !Array.isArray(data.categories)) return false;
    var cat = data.categories[catIdx];
    if (!cat || !Array.isArray(cat.options)) return false;
    if (optIdx < 0 || optIdx >= cat.options.length) return false;

    var duplicated = cloneClipartOption(cat.options[optIdx]);
    cat.options.splice(optIdx + 1, 0, duplicated);
    relabelCategoryOptions(cat);
    return true;
  }

  function removeOptionInCategory(data, catIdx, optIdx) {
    if (!data || !Array.isArray(data.categories)) return false;
    var cat = data.categories[catIdx];
    if (!cat || !Array.isArray(cat.options)) return false;
    if (optIdx < 0 || optIdx >= cat.options.length) return false;
    if (cat.options.length <= 1) return false;

    cat.options.splice(optIdx, 1);
    relabelCategoryOptions(cat);
    return true;
  }

  function getClipartSelection(data) {
    if (!data || typeof data !== 'object') return { groups: {}, items: {} };
    if (!data._selection || typeof data._selection !== 'object') data._selection = {};
    if (!data._selection.groups || typeof data._selection.groups !== 'object') data._selection.groups = {};
    if (!data._selection.items || typeof data._selection.items !== 'object') data._selection.items = {};
    return data._selection;
  }

  function clearClipartSelection(data) {
    var selection = getClipartSelection(data);
    selection.groups = {};
    selection.items = {};
  }

  function isGroupSelected(data, cat) {
    var id = ensureClipartCategoryId(cat);
    return !!getClipartSelection(data).groups[id];
  }

  function setGroupSelected(data, cat, selected) {
    var id = ensureClipartCategoryId(cat);
    var selection = getClipartSelection(data);
    if (selected) selection.groups[id] = true;
    else delete selection.groups[id];
  }

  function isOptionSelected(data, opt) {
    var id = ensureClipartOptionId(opt);
    return !!getClipartSelection(data).items[id];
  }

  function setOptionSelected(data, opt, selected) {
    var id = ensureClipartOptionId(opt);
    var selection = getClipartSelection(data);
    if (selected) selection.items[id] = true;
    else delete selection.items[id];
  }

  function pruneClipartSelection(data) {
    if (!data || !Array.isArray(data.categories)) {
      clearClipartSelection(data);
      return;
    }

    var selection = getClipartSelection(data);
    var liveGroups = Object.create(null);
    var liveItems = Object.create(null);

    data.categories.forEach(function(cat, ci) {
      normalizeClipartCategory(cat, ci);
      if (cat) liveGroups[ensureClipartCategoryId(cat)] = true;
      if (cat && Array.isArray(cat.options)) {
        cat.options.forEach(function(opt) {
          if (opt) liveItems[ensureClipartOptionId(opt)] = true;
        });
      }
    });

    Object.keys(selection.groups).forEach(function(id) {
      if (!liveGroups[id]) delete selection.groups[id];
    });
    Object.keys(selection.items).forEach(function(id) {
      if (!liveItems[id]) delete selection.items[id];
    });
  }

  function getClipartSelectionSummary(data) {
    pruneClipartSelection(data);
    var selection = getClipartSelection(data);
    var groupCount = Object.keys(selection.groups).length;
    var itemCount = Object.keys(selection.items).length;
    return {
      groupCount: groupCount,
      itemCount: itemCount,
      total: groupCount + itemCount
    };
  }

  function moveSelectedEntriesIntoCategory(data, targetCatIdx) {
    if (!data || !Array.isArray(data.categories)) return { ok: false, reason: 'missing-data' };
    var targetCat = data.categories[targetCatIdx];
    if (!targetCat || isStandaloneTitleCategory(targetCat) || targetCat.kind === 'text-frame') {
      return { ok: false, reason: 'invalid-target' };
    }

    pruneClipartSelection(data);
    var selection = getClipartSelection(data);
    var groupIds = Object.keys(selection.groups);
    var itemIds = Object.keys(selection.items);
    if (!groupIds.length && !itemIds.length) return { ok: false, reason: 'empty-selection' };

    normalizeClipartCategory(targetCat, targetCatIdx);

    var removedGroups = [];
    var removedLookup = Object.create(null);
    var movedGroupCount = 0;
    var movedItemCount = 0;

    data.categories.forEach(function(cat, ci) {
      if (!cat || ci === targetCatIdx || isStandaloneTitleCategory(cat) || cat.kind === 'text-frame') return;
      normalizeClipartCategory(cat, ci);
      if (!isGroupSelected(data, cat)) return;

      if (Array.isArray(cat.options) && cat.options.length) {
        cat.options.forEach(function(opt) {
          targetCat.options.push(cloneClipartOption(opt));
        });
        movedItemCount += cat.options.length;
      }

      removedGroups.push(ci);
      removedLookup[ci] = true;
      movedGroupCount += 1;
    });

    data.categories.forEach(function(cat, ci) {
      if (!cat || ci === targetCatIdx || removedLookup[ci] || !Array.isArray(cat.options)) return;
      var kept = [];
      cat.options.forEach(function(opt) {
        if (isOptionSelected(data, opt)) {
          targetCat.options.push(cloneClipartOption(opt));
          movedItemCount += 1;
        } else {
          kept.push(opt);
        }
      });
      if (kept.length !== cat.options.length) {
        cat.options = kept;
        relabelCategoryOptions(cat);
      }
    });

    removedGroups.sort(function(a, b) { return b - a; }).forEach(function(idx) {
      data.categories.splice(idx, 1);
    });

    relabelCategoryOptions(targetCat);
    clearClipartSelection(data);
    pruneClipartSelection(data);

    return {
      ok: movedGroupCount > 0 || movedItemCount > 0,
      movedGroups: movedGroupCount,
      movedItems: movedItemCount
    };
  }


function normalizeClipartCategory(cat, idx) {
  if (!cat || typeof cat !== 'object') cat = {};
  ensureClipartCategoryId(cat);
  if (!Array.isArray(cat.options)) cat.options = [];
  cat.options = cat.options.map(function(opt) { return normalizeClipartOption(opt); });
  if (isStandaloneTitleCategory(cat)) {
    cat.prefix = '';
    if (!cat.name) cat.name = 'Tiêu đề lớn';
    if (!cat.titleLine || typeof cat.titleLine !== 'object') cat.titleLine = {};
    if (typeof cat.titleLine.text !== 'string' || cat.titleLine.text === 'Woman') cat.titleLine.text = 'Personalized-Option';
    if (!cat.titleLine.color) cat.titleLine.color = '#0F172A';
    if (!cat.titleLine.background) cat.titleLine.background = '#FFF7ED';
    if (!cat.titleLine.fontSize || cat.titleLine.fontSize === 30) cat.titleLine.fontSize = 40;
    if (!cat.titleLine.align) cat.titleLine.align = 'center';
    cat.options = [];
    cat.optionCount = 0;
    return cat;
  }
  if (!cat.prefix) cat.prefix = sequentialPrefix(idx || 0);
  cat.prefix = sanitizeGroupPrefix(cat.prefix, sequentialPrefix(idx || 0));
  if (!cat.name) cat.name = (cat.kind === 'text-frame') ? ('Text ' + cat.prefix) : ('Group ' + ((idx || 0) + 1));
  if (cat.kind === 'text-frame') {
    if (!cat.textFrame || typeof cat.textFrame !== 'object') cat.textFrame = {};
    if (typeof cat.textFrame.text !== 'string') cat.textFrame.text = '';
    if (!cat.textFrame.color) cat.textFrame.color = '#111827';
    if (!cat.textFrame.background) cat.textFrame.background = '#FFFFFF';
    if (!cat.textFrame.fontSize) cat.textFrame.fontSize = 30;
    if (!cat.textFrame.align) cat.textFrame.align = 'center';
  }
  relabelCategoryOptions(cat);
  return cat;
}

  function normalizeClipartData(data) {
    if (window.STSClipartScanner && window.STSClipartScanner.schema && typeof window.STSClipartScanner.schema.normalizeClipartData === 'function') {
      window.STSClipartScanner.schema.normalizeClipartData(data);
      pruneClipartSelection(data);
      return;
    }
    if (!data || !Array.isArray(data.categories)) return;
    data.categories = data.categories.map(function(cat, idx) { return normalizeClipartCategory(cat, idx); });
    pruneClipartSelection(data);
  }

  function createEmptyCategory(idx) {
    var prefix = sequentialPrefix(idx || 0);
    return normalizeClipartCategory({
      name: 'Group ' + prefix,
      prefix: prefix,
      options: [],
      optionCount: 0
    }, idx || 0);
  }

  function createTextFrameCategory(idx) {
    var prefix = sequentialPrefix(idx || 0);
    return normalizeClipartCategory({
      kind: 'text-frame',
      name: 'Text ' + prefix,
      prefix: prefix,
      options: [],
      optionCount: 0,
      textFrame: {
        text: 'Custom Text',
        color: '#111827',
        background: '#FFFFFF',
        fontSize: 30,
        align: 'center'
      }
    }, idx || 0);
  }


function createStandaloneTitleCategory() {
  return normalizeClipartCategory({
    kind: 'title-only',
    name: 'Tiêu đề lớn',
    prefix: '',
    options: [],
    optionCount: 0,
    titleLine: {
      text: 'Woman',
      color: '#0F172A',
      background: '#FFF7ED',
      fontSize: 30,
      align: 'center'
    }
  }, 0);
}


function insertCategoryAt(data, insertIdx, cat) {
  if (!data || !Array.isArray(data.categories)) return false;
  data.categories.forEach(function(category, ci) {
    normalizeClipartCategory(category, ci);
  });

  var idx = Math.max(0, Math.min(insertIdx, data.categories.length));
  var nextCat = normalizeClipartCategory(cat || createEmptyCategory(data.categories.length), idx);
  var hasPrefixConflict = !isStandaloneTitleCategory(nextCat) && data.categories.some(function(existing) {
    return existing && !isStandaloneTitleCategory(existing) && sanitizeGroupPrefix(existing.prefix || '', '') === sanitizeGroupPrefix(nextCat.prefix || '', '');
  });
  if (!isStandaloneTitleCategory(nextCat) && (!nextCat.prefix || hasPrefixConflict)) {
    nextCat.prefix = getNextAvailableCategoryPrefix(data.categories);
    relabelCategoryOptions(nextCat);
  }
  if (nextCat.kind === 'text-frame' && (!nextCat.name || /^Text\b/i.test(nextCat.name))) {
    nextCat.name = 'Text ' + nextCat.prefix;
  }
  data.categories.splice(idx, 0, nextCat);
  pruneClipartSelection(data);
  return true;
}

  function hexToRgba(hex, alpha) {
    var color = String(hex || '').trim();
    if (!color) return 'rgba(15,23,42,' + alpha + ')';
    if (color.indexOf('rgba(') === 0 || color.indexOf('rgb(') === 0) return color;
    if (color[0] === '#') color = color.slice(1);
    if (color.length === 3) color = color.split('').map(function(ch) { return ch + ch; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(color)) return 'rgba(15,23,42,' + alpha + ')';
    var r = parseInt(color.slice(0, 2), 16);
    var g = parseInt(color.slice(2, 4), 16);
    var b = parseInt(color.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }


  function moveOptionBetweenCategories(data, sourceCatIdx, sourceOptIdx, targetCatIdx, targetOptIdx) {
    if (!data || !Array.isArray(data.categories)) return false;
    var sourceCat = data.categories[sourceCatIdx];
    var targetCat = data.categories[targetCatIdx];
    if (!sourceCat || !targetCat) return false;
    if (!Array.isArray(sourceCat.options) || !Array.isArray(targetCat.options)) return false;
    if (sourceOptIdx < 0 || sourceOptIdx >= sourceCat.options.length) return false;

    var moved = sourceCat.options.splice(sourceOptIdx, 1)[0];
    if (!moved) return false;

    var insertIdx = Math.max(0, Math.min(targetOptIdx, targetCat.options.length));
    if (sourceCatIdx === targetCatIdx && sourceOptIdx < insertIdx) insertIdx -= 1;
    targetCat.options.splice(insertIdx, 0, moved);

    relabelCategoryOptions(sourceCat);
    if (targetCat !== sourceCat) relabelCategoryOptions(targetCat);
    return true;
  }

  function getOptionDropSide(e, el) {
    var r = el.getBoundingClientRect();
    var isTall = r.height > r.width * 1.2;
    if (isTall) return e.clientY < (r.top + r.height / 2) ? 'before' : 'after';

    var relX = e.clientX - r.left;
    var relY = e.clientY - r.top;
    if (relY < r.height * 0.33) return 'before';
    if (relY > r.height * 0.66) return 'after';
    return relX < r.width / 2 ? 'before' : 'after';
  }

  function clearClipartDragMarkers(panel) {
    if (!panel) return;
    panel.querySelectorAll('.sts-clip-cat').forEach(function(el) {
      el.style.borderTop = '';
      el.style.borderBottom = '';
    });
    panel.querySelectorAll('.sts-clip-opt').forEach(function(el) {
      el.style.borderTop = '';
      el.style.borderBottom = '';
      el.style.outline = '';
      el.style.background = '';
    });
    panel.querySelectorAll('.sts-clip-grid, .sts-clip-list').forEach(function(el) {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
  }

  function bindClipartPanelDrag(panel, data, refreshPanel) {
    var dragKind = null;
    var dragCatIdx = null;
    var dragOpt = null;

    function resetDragState() {
      dragKind = null;
      dragCatIdx = null;
      dragOpt = null;
      clearClipartDragMarkers(panel);
    }

    panel.querySelectorAll('.sts-clip-cat').forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        if (e.target && e.target.closest('.sts-clip-opt')) return;
        dragKind = 'cat';
        dragCatIdx = parseInt(card.getAttribute('data-cat-idx'), 10);
        card.style.opacity = '0.4';
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', 'cat:' + dragCatIdx);
        }
      });

      card.addEventListener('dragend', function() {
        card.style.opacity = '1';
        resetDragState();
      });

      card.addEventListener('dragover', function(e) {
        if (dragKind !== 'cat' || dragCatIdx === null) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

        clearClipartDragMarkers(panel);

        var overIdx = parseInt(card.getAttribute('data-cat-idx'), 10);
        if (isNaN(overIdx) || overIdx === dragCatIdx) return;

        var r = card.getBoundingClientRect();
        var before = e.clientY < (r.top + r.height / 2);
        if (before) card.style.borderTop = '2px solid #4ADE80';
        else card.style.borderBottom = '2px solid #4ADE80';
      });

      card.addEventListener('drop', function(e) {
        if (dragKind !== 'cat' || dragCatIdx === null) return;
        e.preventDefault();

        var dropIdx = parseInt(card.getAttribute('data-cat-idx'), 10);
        if (isNaN(dropIdx) || dropIdx === dragCatIdx) {
          resetDragState();
          return;
        }

        var r = card.getBoundingClientRect();
        var before = e.clientY < (r.top + r.height / 2);
        var insertIdx = before ? dropIdx : dropIdx + 1;

        var moved = moveArrayItem(data.categories, dragCatIdx, insertIdx);
        resetDragState();
        if (moved) refreshPanel();
      });
    });

    panel.querySelectorAll('.sts-clip-opt').forEach(function(optEl) {
      optEl.addEventListener('dragstart', function(e) {
        e.stopPropagation();
        dragKind = 'opt';
        dragOpt = {
          catIdx: parseInt(optEl.getAttribute('data-cat-idx'), 10),
          optIdx: parseInt(optEl.getAttribute('data-opt-idx'), 10),
        };
        optEl.style.opacity = '0.45';
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', 'opt:' + dragOpt.catIdx + ':' + dragOpt.optIdx);
        }
      });

      optEl.addEventListener('dragend', function(e) {
        e.stopPropagation();
        optEl.style.opacity = '1';
        resetDragState();
      });

      optEl.addEventListener('dragover', function(e) {
        if (dragKind !== 'opt' || !dragOpt) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

        clearClipartDragMarkers(panel);

        var side = getOptionDropSide(e, optEl);
        optEl.style.background = 'rgba(74,124,89,0.05)';
        if (side === 'before') optEl.style.borderTop = '2px solid #4ADE80';
        else optEl.style.borderBottom = '2px solid #4ADE80';
      });

      optEl.addEventListener('drop', function(e) {
        if (dragKind !== 'opt' || !dragOpt) return;
        e.preventDefault();
        e.stopPropagation();

        var targetCatIdx = parseInt(optEl.getAttribute('data-cat-idx'), 10);
        var targetOptIdx = parseInt(optEl.getAttribute('data-opt-idx'), 10);
        var side = getOptionDropSide(e, optEl);
        var insertIdx = side === 'before' ? targetOptIdx : targetOptIdx + 1;

        var changed = moveOptionBetweenCategories(
          data,
          dragOpt.catIdx,
          dragOpt.optIdx,
          targetCatIdx,
          insertIdx
        );

        resetDragState();
        if (changed) refreshPanel();
      });
    });

    panel.querySelectorAll('.sts-clip-grid, .sts-clip-list').forEach(function(zone) {
      zone.addEventListener('dragover', function(e) {
        if (dragKind !== 'opt' || !dragOpt) return;
        e.preventDefault();
        e.stopPropagation();
        zone.style.outline = '2px dashed #4ADE80';
        zone.style.outlineOffset = '4px';
      });

      zone.addEventListener('dragleave', function(e) {
        if (!zone.contains(e.relatedTarget)) {
          zone.style.outline = '';
          zone.style.outlineOffset = '';
        }
      });

      zone.addEventListener('drop', function(e) {
        if (dragKind !== 'opt' || !dragOpt) return;
        e.preventDefault();
        e.stopPropagation();

        var targetCatIdx = parseInt(zone.getAttribute('data-idx'), 10);
        var targetCat = data.categories[targetCatIdx];
        zone.style.outline = '';
        zone.style.outlineOffset = '';

        if (!targetCat || !Array.isArray(targetCat.options)) {
          resetDragState();
          return;
        }

        var changed = moveOptionBetweenCategories(
          data,
          dragOpt.catIdx,
          dragOpt.optIdx,
          targetCatIdx,
          targetCat.options.length
        );

        resetDragState();
        if (changed) refreshPanel();
      });
    });
  }

  function deactivateManualPick() { cleanupAllPickModes(); }

  function legacyShowClipartPanelImpl(data) {
    try {
      var debugCats = data && Array.isArray(data.categories) ? data.categories : [];
      console.groupCollapsed('[STS DEBUG] panel receive/render groups');
      console.log(stsDebugGroupSnapshot(debugCats.map(function(cat) {
        return { label: cat && cat.name, options: cat && cat.options };
      })));
      console.groupEnd();
    } catch (e) {}

    const old = document.getElementById('sts-clip-panel');
    if (old) old.remove();

    if (!document.getElementById('sts-clip-style')) {
      const s = document.createElement('style');
      s.id = 'sts-clip-style';
      s.textContent = '@keyframes stsPanelSlide{from{transform:translateX(-420px)}to{transform:translateX(0)}} #sts-clip-panel,#sts-clip-panel *{box-sizing:border-box;} #sts-clip-panel *{writing-mode:horizontal-tb!important;text-orientation:mixed!important;max-inline-size:none;} .sts-clip-cat:hover{background:rgba(0,0,0,0.03)!important} #sts-clip-panel > div:first-child:hover{background:rgba(74,124,89,0.08)!important} .sts-resize-handle{height:6px;cursor:ns-resize;background:transparent;display:flex;align-items:center;justify-content:center;margin-top:4px;border-radius:3px;transition:background .15s;} .sts-resize-handle:hover{background:rgba(74,124,89,0.12);} .sts-resize-handle::after{content:"";display:block;width:30px;height:3px;border-radius:2px;background:#BDD4C4;transition:background .15s;} .sts-resize-handle:hover::after{background:#2F7D57;} .sts-ht-row{display:none;padding:6px 8px;background:#F0F0FF;border-radius:4px;margin-bottom:6px;gap:6px;align-items:center;} .sts-ht-row.active{display:flex;} .sts-clip-group-wrap{display:flex;flex-direction:column;gap:6px;margin:0 0 14px 0;} .sts-clip-actions-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-height:28px;padding:0 2px;} .sts-clip-actions-row .sts-clip-action-btn,.sts-clip-actions-row .sts-insert-group-btn{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:28px;height:28px;padding:0 8px;line-height:1;font-size:12px;font-weight:700;border-radius:8px;white-space:nowrap;flex:0 0 auto;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.06);background:#FFFFFF;border:1px solid #E2E8F0;color:#475569;} .sts-clip-actions-row .sts-clip-action-btn:hover,.sts-clip-actions-row .sts-insert-group-btn:hover{transform:translateY(-1px);} .sts-clip-actions-row .sts-clip-del-left{border-radius:999px;border-color:#FECACA;color:#EF4444;background:#FFFFFF;} .sts-clip-actions-row .sts-clip-up,.sts-clip-actions-row .sts-clip-down{color:#64748B;} .sts-clip-actions-row .sts-clip-ht-btn{font-family:var(--sts-font);font-size:13px;font-weight:700;line-height:1.25;} .sts-clip-actions-row .sts-clip-add-text-item{color:#2563EB;background:#EAF6EF;border-color:#BFE1CB;} .sts-clip-group-wrap .sts-clip-ht-display{margin:0;} .sts-clip-group-wrap .sts-ht-row{margin:0;} .sts-clip-group-wrap .sts-clip-cat{margin:0;} .sts-clip-group-wrap .sts-resize-handle{margin-top:6px;} .sts-insert-group-btn{border-radius:999px;border:1px solid #BFE1CB;background:#EAF6EF;color:#2563EB;font-weight:700;font-size:13px;line-height:1.25;box-shadow:0 2px 8px rgba(37,99,235,0.12);} .sts-screenshot-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999999;cursor:crosshair;background:rgba(0,0,0,0.15);} .sts-screenshot-sel{position:absolute;border:2px dashed #2F7D57;background:rgba(74,124,89,0.08);} .sts-clip-cat{position:relative;overflow:visible!important;} .sts-clip-actions-row{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px!important;margin:0 0 8px 0!important;} .sts-clip-toolbar{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;column-gap:6px;row-gap:4px;margin-bottom:6px;padding-right:4px;} .sts-clip-dot{align-self:start;margin-top:3px;} .sts-clip-name{min-width:0;display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden!important;text-overflow:ellipsis;white-space:normal!important;line-height:1.25!important;word-break:normal!important;overflow-wrap:normal!important;max-width:100%;} .sts-clip-ht-btn{grid-column:4;justify-self:start;} .sts-clip-meta{grid-column:5;justify-self:end;white-space:nowrap;} .sts-clip-del-left{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;border:1px solid #FECACA;background:#FFFFFF;color:#EF4444;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.08);z-index:2;} .sts-clip-del-left:hover{background:#FEF2F2;border-color:#FCA5A5;}';
      document.head.appendChild(s);
    }

    const panel = document.createElement('div');
    panel.id = 'sts-clip-panel';
    // v3.0.7: Panel on LEFT side (clipart options usually on left of product page)
    panel.style.cssText = 'position:fixed;top:0;left:0;bottom:0;width:min(520px,calc(100vw - 28px));max-width:calc(100vw - 18px);min-width:300px;background:#FFFFFF;color:#333;z-index:9999999;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);box-shadow:4px 0 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:visible;line-height:1.35;letter-spacing:normal;text-transform:none;';

    // v3.0.7: Drag handle on RIGHT edge of panel (kéo phải = thu nhỏ, kéo trái = mở rộng)
    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = 'position:absolute;right:-8px;top:0;bottom:0;width:16px;cursor:ew-resize;z-index:99999999;background:transparent;display:flex;align-items:center;justify-content:center;';
    const gripDots = document.createElement('div');
    gripDots.style.cssText = 'width:4px;height:48px;border-radius:3px;background:rgba(74,124,89,0.3);transition:background .2s,height .2s;box-shadow:0 0 4px rgba(74,124,89,0.1);';
    dragHandle.appendChild(gripDots);
    dragHandle.addEventListener('mouseenter', function() { gripDots.style.background = 'rgba(74,124,89,0.7)'; gripDots.style.height = '70px'; });
    dragHandle.addEventListener('mouseleave', function() { gripDots.style.background = 'rgba(74,124,89,0.3)'; gripDots.style.height = '48px'; });
    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startW = panel.offsetWidth;
      gripDots.style.background = 'rgba(74,124,89,1)';
      // Overlay prevents iframe/content stealing mouse events during drag
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999998;cursor:ew-resize;';
      document.body.appendChild(overlay);
      function onMove(ev) {
        // v3.0.7: LEFT panel — drag right = wider, drag left = narrower
        var delta = ev.clientX - startX;
        var newW = Math.max(280, Math.min(window.innerWidth - 50, startW + delta));
        panel.style.width = newW + 'px';
      }
      function onUp() {
        gripDots.style.background = 'rgba(74,124,89,0.3)';
        gripDots.style.height = '48px';
        overlay.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    panel.appendChild(dragHandle);

    const colors = ['#1B5E20','#B71C1C','#0D47A1','#4A148C','#E65100','#006064','#880E4F','#33691E','#1A237E','#3E2723'];
    pruneClipartSelection(data);
    const countableCats = data.categories.filter(c => !isStandaloneTitleCategory(c));
    const totalOpts = countableCats.reduce((s, c) => s + (c.optionCount || 0), 0);
    const selectionSummary = getClipartSelectionSummary(data);
    const selectionText = selectionSummary.total ? ` · chọn ${selectionSummary.groupCount} group / ${selectionSummary.itemCount} item` : '';

    let html = `
      <div style="padding:14px 18px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:15px;font-weight:700;color:#0F172A;display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;">${stsUiIcon('logo', 18)}</span><span>STS Clipart Pro 8.3</span></div>
          <div id="sts-clip-header-count" style="font-size:11.5px;font-weight:500;line-height:1.45;color:#64748B;margin-top:2px;">${countableCats.length} nhóm · ${totalOpts} options${selectionText}</div>
        </div>
        <span id="sts-clip-close" style="color:#64748B;font-size:18px;cursor:pointer;padding:4px 8px;">✕</span>
      </div>
      <div style="flex:1;overflow-y:auto;padding:14px 18px;">
    `;

    // Track per-category thumb scale (default 1.0)
    if (!data._thumbScales) data._thumbScales = {};

    function getActionRowInlineStyle() {
      return 'all:unset!important;display:grid!important;grid-auto-flow:column!important;grid-auto-columns:max-content!important;justify-content:start!important;align-items:center!important;column-gap:6px!important;row-gap:0!important;grid-template-rows:32px!important;grid-auto-rows:32px!important;width:auto!important;min-width:0!important;max-width:100%!important;margin:0 0 8px 0!important;padding:0!important;border:0!important;background:transparent!important;box-sizing:border-box!important;white-space:nowrap!important;overflow:visible!important;';
    }

    function getActionButtonInlineStyle(kind) {
      var map = {
        insert: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;border-radius:999px!important;border:1px solid #BFDBFE!important;background:linear-gradient(180deg,#EFF6FF 0%,#DBEAFE 100%)!important;color:#1D4ED8!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;text-align:center!important;vertical-align:middle!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(37,99,235,0.12)!important;flex:none!important;float:none!important;clear:none!important;position:relative!important;inset:auto!important;transform:none!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;',
        del: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;border-radius:999px!important;border:1px solid #FECACA!important;background:linear-gradient(180deg,#FFF7F7 0%,#FEE2E2 100%)!important;color:#DC2626!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;text-align:center!important;vertical-align:middle!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(0,0,0,0.08)!important;flex:none!important;float:none!important;clear:none!important;position:relative!important;inset:auto!important;transform:none!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;',
        move: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;border-radius:10px!important;border:1px solid #CBD5E1!important;background:linear-gradient(180deg,#FFFFFF 0%,#F8FAFC 100%)!important;color:#475569!important;font-family:var(--sts-font)!important;font-size:12.5px!important;font-weight:600!important;line-height:1.25!important;text-align:center!important;vertical-align:middle!important;cursor:pointer!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.85)!important,0 1px 0 rgba(148,163,184,0.55)!important,0 4px 8px rgba(15,23,42,0.06)!important;flex:none!important;float:none!important;clear:none!important;position:relative!important;inset:auto!important;transform:none!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;',
        merge: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:52px!important;min-width:52px!important;max-width:52px!important;height:32px!important;margin:0!important;padding:0!important;border-radius:8px!important;border:1px solid #BFDBFE!important;background:linear-gradient(180deg,#EFF6FF 0%,#DBEAFE 100%)!important;color:#1D4ED8!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;letter-spacing:0!important;text-align:center!important;cursor:pointer!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.85)!important,0 1px 0 rgba(148,163,184,0.55)!important,0 4px 8px rgba(15,23,42,0.06)!important;',
        ht: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;border-radius:10px!important;border:1px solid #CBD5E1!important;background:linear-gradient(180deg,#FFFFFF 0%,#F8FAFC 100%)!important;color:#475569!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;text-align:center!important;vertical-align:middle!important;cursor:pointer!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.85)!important,0 1px 0 rgba(148,163,184,0.55)!important,0 4px 8px rgba(15,23,42,0.06)!important;flex:none!important;float:none!important;clear:none!important;position:relative!important;inset:auto!important;transform:none!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;',
        htActive: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;border-radius:8px!important;border:1px solid #BFDBFE!important;background:linear-gradient(180deg,#EFF6FF 0%,#DBEAFE 100%)!important;color:#2563EB!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;text-align:center!important;vertical-align:middle!important;cursor:pointer!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.85)!important,0 1px 0 rgba(148,163,184,0.55)!important,0 4px 8px rgba(15,23,42,0.06)!important;flex:none!important;float:none!important;clear:none!important;position:relative!important;inset:auto!important;transform:none!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;',
        text: 'all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:32px!important;min-height:32px!important;max-height:32px!important;margin:0!important;padding:0!important;border-radius:8px!important;border:1px solid #BFDBFE!important;background:linear-gradient(180deg,#EFF6FF 0%,#DBEAFE 100%)!important;color:#1D4ED8!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;text-align:center!important;vertical-align:middle!important;cursor:pointer!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.85)!important,0 1px 0 rgba(148,163,184,0.55)!important,0 4px 8px rgba(15,23,42,0.06)!important;flex:none!important;float:none!important;clear:none!important;position:relative!important;inset:auto!important;transform:none!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;'
      };
      return map[kind] || map.move;
    }

    function renderInsertButtonHtml(insertIdx, variant) {
      variant = variant || 'row';
      if (variant === 'bottom') {
        return `<button type="button" class="sts-insert-group-btn sts-insert-group-btn-bottom" data-insert-idx="${insertIdx}" aria-label="Thêm block" title="Thêm block" style="all:unset!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;height:44px!important;min-height:44px!important;margin:0!important;padding:0 12px!important;border-radius:999px!important;border:1px solid #BFDBFE!important;background:linear-gradient(180deg,#EFF6FF 0%,#DBEAFE 100%)!important;color:#1D4ED8!important;font-family:var(--sts-font)!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;text-align:center!important;cursor:pointer!important;box-shadow:0 2px 8px rgba(37,99,235,0.12)!important;appearance:none!important;-webkit-appearance:none!important;text-decoration:none!important;">+</button>`;
      }
      return `<button type="button" class="sts-insert-group-btn" data-insert-idx="${insertIdx}" aria-label="Thêm block" title="Thêm block" style="${getActionButtonInlineStyle('insert')}">+</button>`;
    }

    data.categories.forEach((cat, ci) => {
      normalizeClipartCategory(cat, ci);
      const color = colors[ci % colors.length];
      const scale = data._thumbScales[ci] || 1.0;
      const hasHT = !!(cat.headerText && cat.headerText.trim());
      const isTitleOnly = isStandaloneTitleCategory(cat);
      const isTitleGroupDebug = /title/i.test(String(cat && cat.name || ''));
      const groupSelected = isGroupSelected(data, cat);


if (isTitleOnly) {
  var titleLine = cat.titleLine || {};
  html += `<div class="sts-clip-group-wrap" data-group-idx="${ci}">
    <div class="sts-clip-actions-row" data-idx="${ci}" style="${getActionRowInlineStyle()}">
      ${renderInsertButtonHtml(ci)}
      <button class="sts-clip-del sts-clip-del-left sts-clip-action-btn" data-idx="${ci}" type="button" title="Xóa tiêu đề này" style="${getActionButtonInlineStyle('del')}">✕</button>
      <button class="sts-clip-up sts-clip-action-btn" data-idx="${ci}" type="button" title="Di chuyển lên" style="${getActionButtonInlineStyle('move')}">▲</button>
      <button class="sts-clip-down sts-clip-action-btn" data-idx="${ci}" type="button" title="Di chuyển xuống" style="${getActionButtonInlineStyle('move')}">▼</button>
    </div>
    <div class="sts-clip-cat sts-clip-title-only" data-cat-idx="${ci}" draggable="true" style="padding:12px;border-radius:12px;background:linear-gradient(180deg,#FFFDF8 0%,#FFF7ED 100%);border:1px solid #FED7AA;cursor:grab;position:relative;overflow:visible;box-shadow:0 8px 22px rgba(249,115,22,0.08);">
      <div class="sts-clip-main" style="min-width:0;">
        <div class="sts-clip-toolbar" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;column-gap:6px;row-gap:4px;margin-bottom:8px;padding-right:4px;">
          <div class="sts-clip-dot" style="width:10px;height:10px;border-radius:999px;background:#F97316;flex-shrink:0;margin-top:3px;"></div>
          <span style="font-weight:800;font-size:13px;color:#9A3412;min-width:0;">Tiêu đề lớn</span>
          <span style="font-size:10px;color:#C2410C;white-space:nowrap;">Toàn ảnh</span>
        </div>
        <div class="sts-title-only-card" data-idx="${ci}" style="display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:12px;background:${hexToRgba(titleLine.background || '#FFF7ED',0.96)};border:1px dashed #FDBA74;">
          <div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.82);border:1px solid rgba(251,146,60,0.28);text-align:${titleLine.align || 'center'};">
            <div style="font-size:${Math.max(18, Math.round((parseInt(titleLine.fontSize, 10) || 30) * 0.45))}px;font-weight:900;line-height:1.2;color:${titleLine.color || '#0F172A'};word-break:break-word;">${stsEscAttr(titleLine.text || 'Woman')}</div>
          </div>
          <textarea class="sts-title-line-text" data-idx="${ci}" style="width:100%;min-height:72px;resize:vertical;padding:10px 12px;border:1px solid #FDBA74;border-radius:10px;font-size:12px;line-height:1.45;font-weight:700;box-sizing:border-box;">${(titleLine.text || '').replace(/</g,'&lt;')}</textarea>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:end;">
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#9A3412;margin-bottom:4px;">Cỡ chữ</div><input class="sts-title-line-size" data-idx="${ci}" type="number" min="12" max="160" step="1" value="${parseInt(titleLine.fontSize,10)||42}" style="width:100%;padding:8px;border:1px solid #FDBA74;border-radius:8px;font-size:12px;font-weight:700;"></label>
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#9A3412;margin-bottom:4px;">Màu chữ</div><input class="sts-title-line-color" data-idx="${ci}" type="color" value="${titleLine.color || '#0F172A'}" style="width:100%;height:34px;padding:0;border:1px solid #FDBA74;border-radius:8px;"></label>
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#9A3412;margin-bottom:4px;">Màu nền</div><input class="sts-title-line-bg" data-idx="${ci}" type="color" value="${titleLine.background || '#FFF7ED'}" style="width:100%;height:34px;padding:0;border:1px solid #FDBA74;border-radius:8px;"></label>
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#9A3412;margin-bottom:4px;">Căn chữ</div><select class="sts-title-line-align" data-idx="${ci}" style="width:100%;padding:8px;border:1px solid #FDBA74;border-radius:8px;font-size:12px;font-weight:700;"><option value="left"${(titleLine.align||'center')==='left'?' selected':''}>Trái</option><option value="center"${(titleLine.align||'center')==='center'?' selected':''}>Giữa</option><option value="right"${(titleLine.align||'center')==='right'?' selected':''}>Phải</option></select></label>
          </div>
        </div>
      </div>
      <div class="sts-resize-handle" data-idx="${ci}" title="Kéo để thay đổi kích thước"></div>
    </div>
  </div>`;
  return;
}

      html += `<div class="sts-clip-group-wrap" data-group-idx="${ci}">
        <div class="sts-clip-actions-row" data-idx="${ci}" style="${getActionRowInlineStyle()}">
          ${renderInsertButtonHtml(ci)}
          <label title="Chọn cả group để gộp vào group khác" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid ${groupSelected ? '#BFDBFE' : '#CBD5E1'};background:${groupSelected ? '#EFF6FF' : '#FFFFFF'};cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <input class="sts-clip-group-select" data-idx="${ci}" type="checkbox" ${groupSelected ? 'checked' : ''} style="width:14px;height:14px;accent-color:#2563EB;cursor:pointer;">
          </label>
          <input class="sts-clip-prefix-input" data-idx="${ci}" value="${stsEscAttr(cat.prefix || '')}" maxlength="3" title="Ký hiệu group" style="width:46px;height:32px;padding:0 6px;border:1px solid #BFE1CB;border-radius:8px;background:#EAF6EF;color:#276A4A;font-size:12px;font-weight:800;text-align:center;outline:none;text-transform:uppercase;box-shadow:0 2px 8px rgba(37,99,235,0.10);">
          <button class="sts-clip-merge-target sts-clip-action-btn" data-idx="${ci}" type="button" title="Gộp vào group này" aria-label="Gộp vào group này" style="${getActionButtonInlineStyle('merge')}">⎇▣</button>
          <button class="sts-clip-del sts-clip-del-left sts-clip-action-btn" data-idx="${ci}" type="button" title="Xóa nhóm này" style="${getActionButtonInlineStyle('del')}">✕</button>
          <button class="sts-clip-up sts-clip-action-btn" data-idx="${ci}" type="button" title="Di chuyển lên" style="${getActionButtonInlineStyle('move')}">▲</button>
          <button class="sts-clip-down sts-clip-action-btn" data-idx="${ci}" type="button" title="Di chuyển xuống" style="${getActionButtonInlineStyle('move')}">▼</button>
          <button class="sts-clip-ht-btn sts-clip-action-btn" data-idx="${ci}" style="${getActionButtonInlineStyle(hasHT ? 'htActive' : 'ht')}" title="Chèn text phía trên">T</button>
          <button class="sts-clip-add-text-item sts-clip-action-btn" data-idx="${ci}" type="button" title="Thêm Text Item" style="${getActionButtonInlineStyle('text')}">✎</button>
        </div>`;

      // ── Header text ABOVE the variant block (outside the card) ──
      if (hasHT) {
        var htStyle = cat.headerTextStyle || {};
        html += `<div class="sts-clip-ht-display" data-idx="${ci}" style="text-align:center;padding:6px 10px;cursor:pointer;border-radius:6px;background:#F8FCF9;" title="Click để chỉnh sửa">
          <span style="font-size:${Math.round((htStyle.fontSize||28)*0.45)}px;font-weight:700;color:${htStyle.color||'#1a1a2e'};font-family:${htStyle.fontFamily||'sans-serif'};">${cat.headerText}</span>
        </div>`;
      }

      // Header text editor row (above card, hidden by default)
      html += `<div class="sts-ht-row" data-idx="${ci}" id="sts-ht-row-${ci}">
        <input class="sts-ht-input" data-idx="${ci}" value="${(cat.headerText||'').replace(/"/g,'&quot;')}" placeholder="Nhập text..." style="flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid #BFE1CB;border-radius:4px;outline:none;font-family:var(--sts-font);">
        <input class="sts-ht-size" data-idx="${ci}" type="number" value="${(cat.headerTextStyle?.fontSize)||28}" min="10" max="80" step="2" style="width:44px;padding:4px;font-size:11px;border:1px solid #E2E8F0;border-radius:4px;text-align:center;outline:none;" title="Font size">
        <input class="sts-ht-color" data-idx="${ci}" type="color" value="${(cat.headerTextStyle?.color)||'#1a1a2e'}" style="width:28px;height:28px;padding:0;border:1px solid #E2E8F0;border-radius:4px;cursor:pointer;" title="Màu chữ">
        <button class="sts-ht-save" data-idx="${ci}" style="background:#2F7D57;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;">✓</button>
        <button class="sts-ht-cancel" data-idx="${ci}" style="background:#F3F4F6;color:#64748B;border:1px solid #E2E8F0;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button>
      </div>
      <div class="sts-clip-cat" data-cat-idx="${ci}" draggable="true" style="padding:10px;border-radius:8px;background:#FFFFFF;border:1px solid #BFDBFE;box-shadow:0 1px 2px rgba(15,23,42,.06);cursor:grab;position:relative;overflow:visible;">
        <div class="sts-clip-main" style="min-width:0;">
          <div class="sts-clip-toolbar" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;column-gap:6px;row-gap:4px;margin-bottom:6px;padding-right:4px;">
            <div class="sts-clip-dot" style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;margin-top:3px;"></div>
            <span class="sts-clip-name" data-idx="${ci}" style="font-weight:700;font-size:13px;color:#0F172A;cursor:text;border-bottom:1px dashed #BDD4C4;padding-bottom:1px;min-width:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.25;word-break:normal;overflow-wrap:normal;" title="Click để sửa tên">${cat.name}</span>
            <span class="sts-clip-meta" style="font-size:10px;color:#8AA095;flex-shrink:0;white-space:nowrap;">${cat.prefix}1→${cat.prefix}${cat.optionCount}</span>
          </div>
        `;

      var isTextFrame = cat.kind === 'text-frame';
      var isTextItemsOnly = !isTextFrame && cat.options.length > 0 && cat.options.every(function(o) { return isTextItemOption(o); });
      // Detect text-only categories (dropdown/select — no images, no bgColors)
      var isTextOnly = !isTextFrame && isTextOnlyCategory(cat);
      if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
        var targetGroups = { "man's hair color": true, "black": true, "man's beard color": true, "man's body type": true, "choose the title": true };
        var catNameKey = String((cat && cat.name) || '').toLowerCase().trim();
        if (targetGroups[catNameKey]) {
          console.log('[STS AUTO DEBUG] RENDER_TRACE', {
            stage: 'before-render-branch',
            groupName: cat && cat.name || '',
            optionCount: (cat.options || []).length,
            renderDecision: isTextOnly ? 'text-list' : 'image-grid',
            first5Options: (cat.options || []).slice(0, 5).map(function(o) {
              return { imageUrl: o && o.imageUrl || null, capturedImage: o && o.capturedImage || null, bgColor: o && o.bgColor || '', optionType: o && o.optionType || '', sourceKind: o && o.sourceKind || '', textContent: o && o.textContent || '', value: o && o.value || '', name: o && o.name || '', hasImage: !!(o && (o.imageUrl || o.capturedImage || o.bgColor)) };
            })
          });
        }
        console.log('[STS AUTO DEBUG] PANEL_CATEGORY_DECISION', {
          category: cat && cat.name || '',
          isTextOnly: isTextOnly,
          inputs: (cat.options || []).map(function(o) {
            var txt = (o && (o.textContent || o.label || o.name || o.title || o.text || o.value) ? String(o.textContent || o.label || o.name || o.title || o.text || o.value) : '').trim();
            return { imageUrl: o && o.imageUrl || null, capturedImage: o && o.capturedImage || null, bgColor: o && o.bgColor || '', text: txt };
          })
        });
      }

      if (isTextFrame) {
        var tf = cat.textFrame || {};
        html += `<div class="sts-text-frame-card" data-idx="${ci}" style="display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:10px;background:${hexToRgba(tf.background || '#FFFFFF',0.8)};border:1px dashed ${color};">
          <textarea class="sts-tf-text" data-idx="${ci}" style="width:100%;min-height:74px;resize:vertical;padding:10px 12px;border:1px solid #E2E8F0;border-radius:10px;font-size:12px;line-height:1.45;font-weight:600;box-sizing:border-box;">${(tf.text || '').replace(/</g,'&lt;')}</textarea>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:end;">
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:4px;">Cỡ chữ</div><input class="sts-tf-size" data-idx="${ci}" type="number" min="10" max="120" step="1" value="${parseInt(tf.fontSize,10)||30}" style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;font-weight:700;"></label>
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:4px;">Màu chữ</div><input class="sts-tf-color" data-idx="${ci}" type="color" value="${tf.color || '#111827'}" style="width:100%;height:34px;padding:0;border:1px solid #E2E8F0;border-radius:8px;"></label>
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:4px;">Màu nền</div><input class="sts-tf-bg" data-idx="${ci}" type="color" value="${tf.background || '#FFFFFF'}" style="width:100%;height:34px;padding:0;border:1px solid #E2E8F0;border-radius:8px;"></label>
            <label style="display:block;"><div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:4px;">Căn chữ</div><select class="sts-tf-align" data-idx="${ci}" style="width:100%;padding:8px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;font-weight:700;"><option value="left"${(tf.align||'center')==='left'?' selected':''}>Trái</option><option value="center"${(tf.align||'center')==='center'?' selected':''}>Giữa</option><option value="right"${(tf.align||'center')==='right'?' selected':''}>Phải</option></select></label>
          </div>
        </div>`;
      } else if (!cat.options.length) {
        html += `<div class="sts-clip-empty" data-idx="${ci}" style="padding:14px;border:1px dashed #CBD5E1;border-radius:10px;background:#F8FAFC;font-size:11px;color:#64748B;text-align:center;">Group trống — dùng Pick / All hoặc menu Pick để thêm item.</div>`;
      } else if (isTextOnly) {
        html += `<div class="sts-clip-list" data-idx="${ci}" style="display:flex;flex-direction:column;gap:6px;">`;
        cat.options.forEach((opt, oi) => {
          var isTextItem = isTextItemOption(opt);
          var textStyle = opt.textStyle || {};
          const optSelected = isOptionSelected(data, opt);
          if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
            console.log('[STS AUTO DEBUG] PANEL_OPTION', {
              group: cat && cat.name || '',
              textContent: opt && opt.textContent || '',
              value: opt && opt.value || '',
              name: opt && opt.name || '',
              imageUrl: opt && opt.imageUrl || null,
              capturedImage: opt && opt.capturedImage || null,
              bgColor: opt && opt.bgColor || '',
              optionType: opt && opt.optionType || '',
              sourceKind: opt && opt.sourceKind || '',
              hasImage: !!(opt && (opt.capturedImage || opt.imageUrl))
            });
          }
          if (isTitleGroupDebug) {
            var listTextCandidates = [
              { field: 'textContent', value: opt && opt.textContent },
              { field: 'label', value: opt && opt.label },
              { field: 'name', value: opt && opt.name },
              { field: 'title', value: opt && opt.title },
              { field: 'text', value: opt && opt.text },
              { field: 'value', value: opt && opt.value }
            ];
            var listPicked = listTextCandidates.find(function(entry) { return String(entry.value || '').trim(); });
            console.log('[STS DEBUG] Title option render', {
              groupLabel: cat.name,
              rawOption: opt,
              computedDisplayText: String((listPicked && listPicked.value) || '?'),
              displayFieldUsed: listPicked ? listPicked.field : 'fallback(?)',
              computedImageSrc: opt && (opt.capturedImage || opt.imageUrl || opt.src || opt.image || opt.imageUrl || '')
            });
          }
          html += `<div class="sts-clip-opt" data-cat-idx="${ci}" data-opt-idx="${oi}" draggable="true" style="display:flex;align-items:${isTextItem ? 'stretch' : 'center'};gap:6px;padding:6px 8px;border-radius:8px;background:${optSelected ? '#EFF6FF' : '#F9FAFB'};border:1px solid ${optSelected ? '#BFDBFE' : '#E5E7EB'};cursor:grab;">
            <span style="font-size:11px;color:#8AA095;line-height:1;padding-top:${isTextItem ? '10px' : '0'};">⋮⋮</span>
            <span class="sts-clip-item-select" data-cat-idx="${ci}" data-opt-idx="${oi}" aria-hidden="true" style="display:none;"></span>
            <span style="font-size:10px;font-weight:700;color:${color};min-width:24px;padding-top:${isTextItem ? '8px' : '0'};">${opt.label}</span>
            ${isTextItem
              ? `<div style="flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px;align-items:start;">
                  <textarea class="sts-clip-text-item-input" data-cat-idx="${ci}" data-opt-idx="${oi}" style="width:100%;min-height:58px;resize:vertical;padding:8px 10px;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;line-height:1.4;font-weight:600;color:${textStyle.color || '#111827'};background:${textStyle.background || '#FFFFFF'};box-sizing:border-box;">${stsEscAttr(opt.textContent || '')}</textarea>
                  <input class="sts-clip-text-item-color" data-cat-idx="${ci}" data-opt-idx="${oi}" type="color" value="${stsEscAttr(textStyle.color || '#111827')}" style="width:32px;height:32px;padding:0;border:1px solid #E2E8F0;border-radius:8px;cursor:pointer;" title="Màu chữ">
                  <input class="sts-clip-text-item-bg" data-cat-idx="${ci}" data-opt-idx="${oi}" type="color" value="${stsEscAttr(textStyle.background || '#FFFFFF')}" style="width:32px;height:32px;padding:0;border:1px solid #E2E8F0;border-radius:8px;cursor:pointer;" title="Màu nền">
                  <select class="sts-clip-text-item-align" data-cat-idx="${ci}" data-opt-idx="${oi}" style="width:66px;padding:7px 6px;border:1px solid #E2E8F0;border-radius:8px;font-size:11px;font-weight:700;color:#334155;background:#fff;">
                    <option value="left"${(textStyle.align || 'left') === 'left' ? ' selected' : ''}>Trái</option>
                    <option value="center"${(textStyle.align || 'left') === 'center' ? ' selected' : ''}>Giữa</option>
                    <option value="right"${(textStyle.align || 'left') === 'right' ? ' selected' : ''}>Phải</option>
                  </select>
                </div>`
              : `<span style="flex:1;min-width:0;font-size:10px;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${stsEscAttr(opt.textContent || opt.label || opt.name || opt.title || opt.text || opt.value || '?')}</span>`}
            <div style="display:flex;align-items:${isTextItem ? 'flex-start' : 'center'};gap:4px;flex-shrink:0;padding-top:${isTextItem ? '4px' : '0'};">
              <button class="sts-clip-opt-dup" data-cat-idx="${ci}" data-opt-idx="${oi}" draggable="false" style="width:22px;height:22px;border-radius:6px;border:1px solid #BFE1CB;background:#EAF6EF;color:#2563EB;font-size:12px;font-weight:800;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;" title="Nhân đôi item">⧉</button>
              <button class="sts-clip-opt-del" data-cat-idx="${ci}" data-opt-idx="${oi}" draggable="false" style="width:22px;height:22px;border-radius:6px;border:1px solid #FECACA;background:#FEF2F2;color:#DC2626;font-size:13px;font-weight:800;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .18s ease;" title="Xóa item">✕</button>
            </div>
          </div>`;
        });
        html += '</div>';
      } else {
        var baseThumb = cat.optionCount > 15 ? 32 : 42;
        var thumbSize = Math.round(baseThumb * scale);
        var gridMin = Math.round((cat.optionCount > 15 ? 38 : 48) * scale);
        var gridGap = cat.optionCount > 15 ? 3 : 5;
        html += `<div class="sts-clip-grid" data-idx="${ci}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${gridMin}px,1fr));gap:${gridGap}px;">`;
        cat.options.forEach((opt, oi) => {
          const isTextItem = isTextItemOption(opt);
          const textStyle = opt.textStyle || {};
          var gridTextCandidates = [
            { field: 'textContent', value: opt && opt.textContent },
            { field: 'label', value: opt && opt.label },
            { field: 'name', value: opt && opt.name },
            { field: 'title', value: opt && opt.title },
            { field: 'text', value: opt && opt.text },
            { field: 'value', value: opt && opt.value }
          ];
          var gridPicked = gridTextCandidates.find(function(entry) { return String(entry.value || '').trim(); });
          if (typeof isAutoDebugEnabled === 'function' && typeof document !== 'undefined' && isAutoDebugEnabled(document)) {
            console.log('[STS AUTO DEBUG] PANEL_OPTION', {
              group: cat && cat.name || '',
              textContent: opt && opt.textContent || '',
              value: opt && opt.value || '',
              name: opt && opt.name || '',
              imageUrl: opt && opt.imageUrl || null,
              capturedImage: opt && opt.capturedImage || null,
              bgColor: opt && opt.bgColor || '',
              optionType: opt && opt.optionType || '',
              sourceKind: opt && opt.sourceKind || '',
              hasImage: !!(opt && (opt.capturedImage || opt.imageUrl))
            });
          }
          if (isTitleGroupDebug) {
            console.log('[STS DEBUG] Title option render', {
              groupLabel: cat.name,
              rawOption: opt,
              computedDisplayText: String((gridPicked && gridPicked.value) || ''),
              displayFieldUsed: gridPicked ? gridPicked.field : 'empty',
              computedImageSrc: opt && (opt.capturedImage || opt.imageUrl || opt.src || opt.image || '')
            });
          }
          const thumb = isTextItem
            ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:6px;text-align:${textStyle.align || 'left'};font-size:${Math.max(8, Math.round(8.5 * scale))}px;line-height:1.25;font-weight:700;color:${textStyle.color || '#111827'};white-space:pre-wrap;overflow:hidden;">${stsEscAttr(opt.textContent || 'Text item').replace(/\n/g,'<br>')}</div>`
            : (opt.capturedImage || opt.imageUrl)
              ? `<img src="${opt.capturedImage || opt.imageUrl}" style="width:100%;height:100%;object-fit:contain;">`
              : opt.bgColor
                ? ''
                : isImageBackedOption(opt)
                  ? `<span style="font-size:7px;color:#64748B;font-weight:700;">IMG</span>`
                : `<span style="font-size:8px;color:#8AA095;">${stsEscAttr((opt.textContent||'?').substring(0,6))}</span>`;
          const bg = isTextItem ? (textStyle.background || '#FFFFFF') : (opt.bgColor || ((opt.capturedImage || opt.imageUrl) ? '' : '#F3F4F6'));

          const optSelected = isOptionSelected(data, opt);
          html += `<div class="sts-clip-opt" data-cat-idx="${ci}" data-opt-idx="${oi}" draggable="true" style="position:relative;text-align:center;cursor:grab;border-radius:6px;padding:2px;background:${optSelected ? 'rgba(37,99,235,0.08)' : 'transparent'};outline:${optSelected ? '2px solid #BFDBFE' : 'none'};outline-offset:1px;">
            <span class="sts-clip-item-select" data-cat-idx="${ci}" data-opt-idx="${oi}" aria-hidden="true" style="display:none;"></span>
            <div style="position:absolute;top:2px;right:2px;display:flex;gap:2px;z-index:2;">
              ${isTextItem ? `<button class="sts-clip-opt-edit-text" data-cat-idx="${ci}" data-opt-idx="${oi}" draggable="false" style="width:18px;height:18px;border-radius:5px;border:1px solid #BFE1CB;background:rgba(238,242,255,0.96);color:#2563EB;font-size:11px;font-weight:700;line-height:1.2;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;" title="Sửa text">✎</button>` : ''}
              <button class="sts-clip-opt-del" data-cat-idx="${ci}" data-opt-idx="${oi}" draggable="false" style="width:18px;height:18px;border-radius:5px;border:1px solid #FECACA;background:rgba(254,242,242,0.96);color:#DC2626;font-size:11px;font-weight:800;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .18s ease;" title="Xóa item">✕</button>
            </div>
            <div style="width:${thumbSize}px;height:${thumbSize}px;border-radius:4px;margin:0 auto 1px;border:1px solid #E2E8F0;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${bg};">${thumb}</div>
            <div style="font-size:${Math.max(6, Math.round(8 * scale))}px;font-weight:700;color:${color};">${opt.label}</div>
          </div>`;
        });
        html += '</div>';
      }

      // Resize handle at bottom of each category
      html += `</div><div class="sts-resize-handle" data-idx="${ci}" title="Kéo để thay đổi kích thước"></div></div>`;
      html += '</div>';
    });

    html += renderInsertButtonHtml(data.categories.length, 'bottom');

    html += `</div>
      <div id="sts-clip-footer" style="padding:8px 10px;border-top:1px solid #E5E7EB;display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:4px;min-width:0;overflow:hidden;">
      </div>`;

    panel.innerHTML = html;
    document.body.appendChild(panel);
    notifyClipartPanelVisibility(true);

    // v3.0.9: Create footer buttons via DOM API (not innerHTML) to guarantee event binding
    var footer = panel.querySelector('#sts-clip-footer');
    if (footer) {
      var baseBtnStyle = 'height:52px;min-height:52px;padding:6px 4px;border-radius:10px;font-size:11px;font-weight:700;line-height:1.1;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;cursor:pointer;font-family:var(--sts-font);flex:1 1 0;min-width:0;max-width:68px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(37,99,235,.08);';
      var btnDefs = [
        { id: 'sts-clip-sync', html: stsButtonHtml('sync', 'Sync', '#FFFFFF'), style: baseBtnStyle + 'background:linear-gradient(180deg,#10B981 0%,#059669 100%);color:#fff;border:1px solid #047857;box-shadow:inset 0 1px 0 rgba(255,255,255,0.25),0 2px 0 #065F46,0 8px 16px rgba(5,150,105,0.16);' },
        { id: 'sts-clip-render', html: stsButtonHtml('render', 'Render', '#FFFFFF'), style: baseBtnStyle + 'background:linear-gradient(180deg,#3B82F6 0%,#2563EB 100%);color:#FFFFFF;border:1px solid #1D4ED8;box-shadow:inset 0 1px 0 rgba(255,255,255,0.28),0 2px 0 #1E40AF,0 8px 16px rgba(37,99,235,0.18);', title: 'Mở panel render / xuất ảnh' },
        { id: 'sts-clip-capture', html: stsButtonHtml('all', 'All', '#2563EB'), style: baseBtnStyle + 'background:#F8FBFF;color:#0F172A;border:1px solid #BFDBFE;', title: 'Quét tất cả nhóm hiện thấy trên trang' },
        { id: 'sts-clip-screenshot-mode', html: stsButtonHtml('camera', 'Screenshot', '#2563EB'), style: baseBtnStyle + 'background:#F8FBFF;color:#0F172A;border:1px solid #BFDBFE;', title: 'Screenshot Mode: chụp vùng clipart để thêm item/group' },
        { id: 'sts-clip-manual', html: stsButtonHtml('manual', 'Manual', '#2563EB'), style: baseBtnStyle + 'background:#F8FBFF;color:#0F172A;border:1px solid #BFDBFE;', title: 'Manual Click Mode' },
        { id: 'sts-clip-append', html: stsButtonHtml('append', 'Append', '#2563EB'), style: baseBtnStyle + 'background:#F8FBFF;color:#0F172A;border:1px solid #BFDBFE;', title: 'Append current visible state' },
        { id: 'sts-clip-reset', html: stsButtonHtml('reset', 'Reset', '#2563EB'), style: baseBtnStyle + 'background:#F8FBFF;color:#0F172A;border:1px solid #BFDBFE;', title: 'Xóa toàn bộ group/item trong panel hiện tại và đưa panel về trạng thái rỗng' },
        { id: 'sts-clip-renumber', html: stsButtonHtml('number', 'Number', '#2563EB'), style: baseBtnStyle + 'background:linear-gradient(180deg,#3B82F6 0%,#2563EB 100%);color:#fff;border:1px solid #1D4ED8;' , title: 'Đánh lại số' }
      ];
      btnDefs.forEach(function(def) {
        if (def.isSeparator) {
          var sep = document.createElement('span');
          sep.id = def.id;
          sep.innerHTML = def.html;
          sep.setAttribute('aria-hidden', 'true');
          sep.style.cssText = def.style;
          footer.appendChild(sep);
          return;
        }
        var b = document.createElement('button');
        b.type = 'button';
        b.id = def.id;
        b.innerHTML = def.html || def.text;
        b.style.cssText = def.style;
        if (def.title) b.title = def.title;
        footer.appendChild(b);
      });
    }

    // Events — v3.0.9: Use direct DOM references (not querySelector) for footer buttons
    panel.querySelector('#sts-clip-close').onclick = () => {
      panel.remove();
      notifyClipartPanelVisibility(false);
      document.querySelectorAll('.sts-clip-label').forEach(e => e.remove());
      document.querySelectorAll('.sts-pick-btn').forEach(e => e.remove());
      // v8.0.6: Clean up any active pick mode
      cleanupAllPickModes();
    };
    
    var syncBtn = document.getElementById('sts-clip-sync');
    var screenshotBtn = document.getElementById('sts-clip-render');
    var captureBtn = document.getElementById('sts-clip-capture');
    var appendBtn = document.getElementById('sts-clip-append');
    var screenshotModeBtn = document.getElementById('sts-clip-screenshot-mode');
    var manualBtn = document.getElementById('sts-clip-manual');
    var resetBtn = document.getElementById('sts-clip-reset');
    var renumberBtn = document.getElementById('sts-clip-renumber');

    console.log('[STS Clipart Pro 8.3 Clipart] Footer buttons found:', !!syncBtn, !!screenshotBtn, !!captureBtn, !!screenshotModeBtn, !!manualBtn, !!appendBtn, !!resetBtn, !!renumberBtn);

    if (syncBtn) syncBtn.onclick = () => syncClipartData(data);
    function syncPickModeButtonState() {
      var isScreenshot = !!document.getElementById('sts-screenshot-wrapper');
      var isManual = !!document.getElementById('sts-pick-wrapper');
      [screenshotModeBtn, manualBtn].forEach(function(btn) {
        if (!btn) return;
        btn.style.boxShadow = '';
        btn.style.borderColor = '#CBD5E1';
        btn.style.background = 'linear-gradient(180deg,#FFFFFF 0%,#F8FAFC 100%)';
      });
      if (isScreenshot && screenshotModeBtn) {
        screenshotModeBtn.style.borderColor = '#F59E0B';
        screenshotModeBtn.style.background = '#FFFBEB';
        screenshotModeBtn.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.15)';
      }
      if (isManual && manualBtn) {
        manualBtn.style.borderColor = '#2563EB';
        manualBtn.style.background = '#EFF6FF';
        manualBtn.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.15)';
      }
    }

    // ── 📷 Screenshot: show selection dialog → render chosen variants to canvas ──
    var renderSessionState = null;
    if (screenshotBtn) screenshotBtn.onclick = () => {
      var cats = data.categories;
      if (!cats || !cats.length) { clipNotify('Không có dữ liệu', 'error'); return; }

      var dlg = document.createElement('div');
      dlg.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(15,23,42,0.48);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);';

      var box = document.createElement('div');
      box.style.cssText = 'width:min(1380px,98vw);max-height:95vh;background:#fff;border:1px solid #BFDBFE;border-radius:18px;box-shadow:0 20px 50px rgba(15,23,42,0.16);display:flex;flex-direction:column;overflow:hidden;position:relative;';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'padding:14px 18px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#FFFFFF;';
      hdr.innerHTML = '<div><div style="font-size:18px;font-weight:700;line-height:1.25;color:#0F172A;">Khung xuất ảnh</div></div>';
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'width:34px;height:34px;border-radius:10px;border:1px solid #E5E7EB;background:#F9FAFB;color:#64748B;font-size:16px;cursor:pointer;';
      closeBtn.onclick = function() { document.removeEventListener('keydown', onRenderDialogKeydown, true); dlg.remove(); };
      hdr.appendChild(closeBtn);
      box.appendChild(hdr);

      var body = document.createElement('div');
      body.style.cssText = 'padding:14px 18px;display:grid;grid-template-columns:minmax(290px,330px) minmax(0,1fr);gap:14px;overflow:auto;min-height:0;align-items:start;background:#F6FBF8;';
      box.appendChild(body);

      var left = document.createElement('div');
      left.style.cssText = 'display:flex;flex-direction:column;gap:10px;min-height:0;';
      body.appendChild(left);

      var right = document.createElement('div');
      right.style.cssText = 'display:flex;flex-direction:column;gap:10px;min-height:0;';
      body.appendChild(right);


      function createStableRenderToggle(opts) {
        opts = opts || {};
        var accent = opts.accent || '#2F7D57';
        var offBg = opts.offBg || '#E5E7EB';
        var offBorder = opts.offBorder || '#CBD5E1';
        var viewportWidth = Math.max(window.innerWidth || 0, document.documentElement ? document.documentElement.clientWidth || 0 : 0);
        var compactScreen = viewportWidth > 0 && viewportWidth <= 1440;
        var requestedSize = opts.size === 'sm' ? 'sm' : opts.size === 'xs' ? 'xs' : 'md';
        var size = compactScreen ? (requestedSize === 'md' ? 'sm' : 'xs') : requestedSize;
        var dims = size === 'xs'
          ? { trackWidth: 32, trackHeight: 18, knobSize: 12, fontSize: 10, paddingX: 4 }
          : size === 'sm'
            ? { trackWidth: 38, trackHeight: 22, knobSize: 16, fontSize: 11, paddingX: 6 }
            : { trackWidth: 46, trackHeight: 26, knobSize: 20, fontSize: 12, paddingX: 6 };
        var trackWidth = dims.trackWidth;
        var trackHeight = dims.trackHeight;
        var knobSize = dims.knobSize;
        var moveX = trackWidth - knobSize - dims.paddingX;

        var root = document.createElement('span');
        root.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;position:relative;flex:0 0 auto;';

        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = opts.checked !== false;
        input.tabIndex = -1;
        input.setAttribute('aria-hidden', 'true');
        input.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden;margin:0;padding:0;border:0;';

        var button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = [
          'position:relative',
          'display:inline-flex',
          'align-items:center',
          'width:' + trackWidth + 'px',
          'height:' + trackHeight + 'px',
          'padding:2px',
          'border-radius:999px',
          'border:1px solid ' + offBorder,
          'background:' + offBg,
          'cursor:pointer',
          'outline:none',
          'box-sizing:border-box',
          'transition:background 0.18s ease,border-color 0.18s ease,box-shadow 0.18s ease'
        ].join(';') + ';';

        var knob = document.createElement('span');
        knob.style.cssText = [
          'display:inline-flex',
          'align-items:center',
          'justify-content:center',
          'width:' + knobSize + 'px',
          'height:' + knobSize + 'px',
          'border-radius:999px',
          'background:#FFFFFF',
          'color:' + accent,
          'font-size:' + dims.fontSize + 'px',
          'font-weight:900',
          'line-height:1',
          'box-shadow:0 1px 3px rgba(15,23,42,0.22)',
          'transform:translateX(0)',
          'transition:transform 0.18s ease,color 0.18s ease'
        ].join(';') + ';';
        button.appendChild(knob);

        function syncUI() {
          var isChecked = !!input.checked;
          button.setAttribute('aria-pressed', isChecked ? 'true' : 'false');
          button.setAttribute('aria-label', (opts.ariaLabel || opts.label || 'Toggle') + ': ' + (isChecked ? 'Bật' : 'Tắt'));
          button.style.background = isChecked ? accent : offBg;
          button.style.borderColor = isChecked ? accent : offBorder;
          button.style.boxShadow = isChecked ? '0 0 0 3px rgba(37,99,235,0.14)' : 'none';
          knob.style.transform = 'translateX(' + (isChecked ? moveX : 0) + 'px)';
          knob.style.color = isChecked ? accent : '#94A3B8';
          knob.textContent = isChecked ? '✓' : '';
        }

        input.syncUI = syncUI;
        input.setChecked = function(nextChecked, silent) {
          input.checked = !!nextChecked;
          syncUI();
          if (!silent) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };

        button.onclick = function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          input.setChecked(!input.checked);
        };
        button.onkeydown = function(ev) {
          var key = ev.key || ev.code || '';
          if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
            ev.preventDefault();
            input.setChecked(!input.checked);
          }
        };

        root.appendChild(input);
        root.appendChild(button);
        syncUI();
        return { wrap: root, input: input, button: button, sync: syncUI };
      }

      function makeSection(title, opts) {
        opts = opts || {};
        var wrap = document.createElement('div');
        wrap.style.cssText = 'border:1px solid #E5E7EB;border-radius:14px;background:#fff;padding:12px;';
        var hd = document.createElement('div');
        hd.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;';
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:13px;font-weight:700;line-height:1.3;color:#111827;';
        titleEl.textContent = title;
        hd.appendChild(titleEl);

        var checkbox = null;
        var rightWrap = null;
        if (opts.checkable) {
          rightWrap = document.createElement('div');
          rightWrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:600;line-height:1.2;color:#374151;cursor:default;flex:0 0 auto;';
          var sectionToggleUi = createStableRenderToggle({
            checked: opts.checked !== false,
            accent: opts.accent || '#2F7D57',
            size: 'sm',
            label: 'In ảnh',
            ariaLabel: 'In ảnh'
          });
          checkbox = sectionToggleUi.input;
          var span = document.createElement('span');
          span.textContent = 'In ảnh';
          rightWrap.appendChild(sectionToggleUi.wrap);
          rightWrap.appendChild(span);
          hd.appendChild(rightWrap);
        }

        wrap.appendChild(hd);
        var bodyEl = document.createElement('div');
        wrap.appendChild(bodyEl);
        return { wrap: wrap, body: bodyEl, checkbox: checkbox, header: hd, titleEl: titleEl, checkWrap: rightWrap };
      }

function makeCollapsibleSection(section, expanded) {
  if (!section || !section.header || !section.body) return section;
  var toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.textContent = expanded ? '▾' : '▸';
  toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggleBtn.style.cssText = 'width:24px;height:24px;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;color:#334155;font-size:12px;font-weight:700;line-height:1.2;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 24px;';
  if (section.checkWrap && section.checkWrap.parentNode === section.header) {
    section.header.insertBefore(toggleBtn, section.checkWrap);
  } else {
    section.header.appendChild(toggleBtn);
  }
  section.body.style.display = expanded ? '' : 'none';
  toggleBtn.onclick = function() {
    var isOpen = section.body.style.display !== 'none';
    section.body.style.display = isOpen ? 'none' : '';
    toggleBtn.textContent = isOpen ? '▸' : '▾';
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  };
  section.collapseBtn = toggleBtn;
  section.isExpanded = function() { return section.body.style.display !== 'none'; };
  return section;
}


      function createField(labelText) {
        var field = document.createElement('label');
        field.style.cssText = 'display:block;';
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:12px;font-weight:600;line-height:1.35;color:#374151;margin-bottom:6px;';
        lbl.textContent = labelText;
        field.appendChild(lbl);
        return { field: field, inputHost: field };
      }

      function createCompactNumberInput(value, min, max) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:100%;min-height:40px;box-sizing:border-box;';

        var input = document.createElement('input');
        input.type = 'number';
        input.inputMode = 'numeric';
        input.min = String(min);
        input.max = String(max);
        input.step = '1';
        input.value = String(value);
        input.autocomplete = 'off';
        input.style.cssText = 'width:100%;height:40px;padding:8px 38px 8px 10px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:500;line-height:1.35;outline:none;box-sizing:border-box;appearance:textfield;-moz-appearance:textfield;-webkit-appearance:none;';
        wrap.appendChild(input);

        var stepWrap = document.createElement('div');
        stepWrap.style.cssText = 'position:absolute;top:4px;right:4px;bottom:4px;width:26px;display:grid;grid-template-rows:1fr 1fr;gap:3px;pointer-events:none;';
        wrap.appendChild(stepWrap);

        function emitInputChange() {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function setClampedValue(nextValue) {
          var minValue = parseInt(input.min, 10);
          var maxValue = parseInt(input.max, 10);
          var resolved = parseInt(nextValue, 10);
          if (!isFinite(resolved)) resolved = isFinite(parseInt(input.value, 10)) ? parseInt(input.value, 10) : minValue;
          if (isFinite(minValue)) resolved = Math.max(minValue, resolved);
          if (isFinite(maxValue)) resolved = Math.min(maxValue, resolved);
          input.value = String(resolved);
          return resolved;
        }

        function bump(delta) {
          var current = parseInt(input.value, 10);
          if (!isFinite(current)) current = parseInt(input.min, 10) || 0;
          setClampedValue(current + delta);
          input.focus();
          emitInputChange();
        }

        function createStepperButton(symbol, title, delta) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = symbol;
          btn.setAttribute('aria-label', title);
          btn.title = title;
          btn.style.cssText = 'pointer-events:auto;width:26px;height:100%;display:flex;align-items:center;justify-content:center;padding:0;border:1px solid #E2E8F0;border-radius:7px;background:#F8FAFC;color:#334155;font-size:11px;font-weight:700;line-height:1.15;cursor:pointer;user-select:none;';
          btn.addEventListener('mousedown', function(ev) { ev.preventDefault(); });
          btn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            bump(delta);
          });
          btn.addEventListener('mouseenter', function() { btn.style.background = '#EAF6EF'; btn.style.borderColor = '#93C5FD'; });
          btn.addEventListener('mouseleave', function() { btn.style.background = '#F8FAFC'; btn.style.borderColor = '#BDD4C4'; });
          return btn;
        }

        stepWrap.appendChild(createStepperButton('▲', 'Tăng giá trị', 1));
        stepWrap.appendChild(createStepperButton('▼', 'Giảm giá trị', -1));

        input.addEventListener('blur', function() {
          setClampedValue(input.value);
        });

        wrap.__input = input;
        wrap.input = input;
        wrap.focus = function() { input.focus(); };
        wrap.select = function() { if (typeof input.select === 'function') input.select(); };
        wrap.stepUp = function() { bump(1); };
        wrap.stepDown = function() { bump(-1); };
        wrap.addEventListener = wrap.addEventListener.bind(wrap);

        ['value', 'min', 'max', 'step', 'type', 'inputMode', 'autocomplete', 'placeholder', 'disabled', 'readOnly', 'name'].forEach(function(prop) {
          Object.defineProperty(wrap, prop, {
            get: function() { return input[prop]; },
            set: function(next) { input[prop] = next; }
          });
        });

        ['oninput', 'onchange', 'onfocus', 'onblur', 'onkeydown', 'onkeyup'].forEach(function(prop) {
          Object.defineProperty(wrap, prop, {
            get: function() { return input[prop]; },
            set: function(next) { input[prop] = next; }
          });
        });

        return wrap;
      }

      function createRangeControl(labelText, value, min, max, step, formatter) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:block;';
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;';
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
        lbl.textContent = labelText;
        var val = document.createElement('div');
        val.style.cssText = 'font-size:11px;font-weight:600;line-height:1.2;color:#111827;';
        top.appendChild(lbl);
        top.appendChild(val);
        wrap.appendChild(top);
        var input = document.createElement('input');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(value);
        input.style.cssText = 'width:100%;accent-color:#2563EB;cursor:pointer;';
        wrap.appendChild(input);
        function sync() {
          var numericValue = parseFloat(input.value);
          if (!isFinite(numericValue)) numericValue = parseFloat(value) || 0;
          val.textContent = typeof formatter === 'function'
            ? formatter(numericValue)
            : (Math.round(numericValue * 100) + '%');
        }
        sync();
        input.addEventListener('input', sync);
        return { wrap: wrap, input: input, valueEl: val, valueBox: val, sync: sync };
      }

      function createOptionButtons(options, value, onChange) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:grid;grid-template-columns:repeat(' + options.length + ',1fr);gap:6px;';
        var buttons = [];
        options.forEach(function(opt) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = opt.label;
          btn.dataset.value = opt.value;
          btn.style.cssText = 'padding:8px 10px;border:1px solid #BFDBFE;border-radius:10px;background:#FFFFFF;color:#0F172A;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
          btn.onclick = function() {
            onChange(opt.value);
            sync();
          };
          buttons.push(btn);
          wrap.appendChild(btn);
        });
        function sync() {
          buttons.forEach(function(btn) {
            var active = btn.dataset.value === String(value());
            btn.style.background = active ? '#EFF6FF' : '#FFFFFF';
            btn.style.borderColor = active ? '#BFDBFE' : '#BFDBFE';
            btn.style.color = active ? '#1D4ED8' : '#0F172A';
          });
        }
        sync();
        return { wrap: wrap, sync: sync };
      }

      function clamp(num, min, max) {
        return Math.max(min, Math.min(max, num));
      }

      var settingsSec = makeSection('Thiết lập');
      left.appendChild(settingsSec.wrap);
      
      var topGrid = document.createElement('div');
      topGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      settingsSec.body.appendChild(topGrid);

      var sizeField = createField('Kích thước');
      var sizeSelect = document.createElement('select');
      sizeSelect.style.cssText = 'width:100%;padding:9px 10px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:500;line-height:1.35;outline:none;';
      [['1000','1000×1000'],['1500','1500×1500'],['2000','2000×2000']].forEach(function(entry) {
        var opt = document.createElement('option');
        opt.value = entry[0];
        opt.textContent = entry[1];
        if (entry[0] === '2000') opt.selected = true;
        sizeSelect.appendChild(opt);
      });
      sizeField.field.appendChild(sizeSelect);
      topGrid.appendChild(sizeField.field);

      var groupColField = createField('Cột Group');
      var groupCols = 2;
      var groupColButtons = createOptionButtons([
        { label: '1 cột', value: '1' },
        { label: '2 cột', value: '2' }
      ], function() { return String(groupCols); }, function(next) {
        applyGroupColsChange(clamp(parseInt(next, 10) || 1, 1, 2));
      });
      groupColField.field.appendChild(groupColButtons.wrap);
      topGrid.appendChild(groupColField.field);

      function createModeItemFields(title, defaults) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'border:1px solid #E5E7EB;border-radius:12px;padding:10px;background:#F8FAFC;';
        var hd = document.createElement('div');
        hd.style.cssText = 'font-size:12px;font-weight:600;line-height:1.35;color:#111827;margin-bottom:8px;';
        hd.textContent = title;
        wrap.appendChild(hd);

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
        wrap.appendChild(grid);

        var colField = document.createElement('label');
        colField.style.cssText = 'display:block;';
        colField.innerHTML = '<div style="font-size:12px;font-weight:600;line-height:1.35;color:#374151;margin-bottom:6px;">Số cột item</div>';
        var colInput = createCompactNumberInput(defaults.cols, 1, 20);
        colField.appendChild(colInput);

        var rowField = document.createElement('label');
        rowField.style.cssText = 'display:block;';
        rowField.innerHTML = '<div style="font-size:12px;font-weight:600;line-height:1.35;color:#374151;margin-bottom:6px;">Số hàng item</div>';
        var rowInput = createCompactNumberInput(defaults.rows, 1, 20);
        rowField.appendChild(rowInput);

        grid.appendChild(colField);
        grid.appendChild(rowField);
        return { wrap: wrap, colInput: colInput, rowInput: rowInput };
      }

      var modeWrap = document.createElement('div');
      modeWrap.style.cssText = 'display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px;';
      settingsSec.body.appendChild(modeWrap);

      var mode1Fields = createModeItemFields('Bố cục 1 cột Group', { cols: 6, rows: 6 });
      var mode2Fields = createModeItemFields('Bố cục 2 cột Group', { cols: 6, rows: 6 });
      modeWrap.appendChild(mode1Fields.wrap);
      modeWrap.appendChild(mode2Fields.wrap);

      function refreshModeFieldVisuals() {
        [mode1Fields.wrap, mode2Fields.wrap].forEach(function(wrap) {
          wrap.style.background = '#F8FAFC';
          wrap.style.borderColor = '#E5E7EB';
        });
        var activeWrap = groupCols === 1 ? mode1Fields.wrap : mode2Fields.wrap;
        activeWrap.style.background = '#EEF2FF';
        activeWrap.style.borderColor = '#4F46E5';
        groupColButtons.sync();
      }

      var extrasGrid = document.createElement('div');
      extrasGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;';
      settingsSec.body.appendChild(extrasGrid);

      var itemScaleField = document.createElement('div');
      var itemScaleCtrl = createRangeControl('Scale Item', 1.0, 0.7, 1.6, 0.05);
      itemScaleField.appendChild(itemScaleCtrl.wrap);
      extrasGrid.appendChild(itemScaleField);

      var groupScaleField = document.createElement('div');
      var groupScaleCtrl = createRangeControl('Scale Group', 1.0, 0.7, 1.5, 0.05);
      groupScaleField.appendChild(groupScaleCtrl.wrap);
      extrasGrid.appendChild(groupScaleField);

      [itemScaleCtrl.input, groupScaleCtrl.input].forEach(function(rangeInput) {
        rangeInput.style.cssText = 'width:100%;accent-color:#2563EB;cursor:pointer;display:block;position:relative;z-index:2;height:20px;';
      });

      var itemBadgeScaleCtrl = createRangeControl('Kích thước ký hiệu', 1.0, 0.7, 1.8, 0.05);
      itemBadgeScaleCtrl.input.style.cssText = 'width:100%;accent-color:#2563EB;cursor:pointer;display:block;position:relative;z-index:2;height:20px;';

      var textGroupInline = true;
      var textGroupRow = document.createElement('div');
      textGroupRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
      var textGroupLabel = document.createElement('span');
      textGroupLabel.textContent = 'Text Group hiển thị Inline';
      textGroupRow.appendChild(textGroupLabel);
      var textGroupInlineToggleUi = createStableRenderToggle({ checked: true, accent: '#2F7D57', label: 'Text Group hiển thị Inline' });
      var textGroupInlineToggle = textGroupInlineToggleUi.input;
      textGroupRow.appendChild(textGroupInlineToggleUi.wrap);
      settingsSec.body.appendChild(textGroupRow);

      var renderFxSec = makeSection('Render FX');
      var badgeBlock = document.createElement('div');
      badgeBlock.style.cssText = 'margin-top:8px;padding:10px;border:1px solid #E5E7EB;border-radius:12px;background:#F8FAFC;';
      badgeBlock.appendChild(itemBadgeScaleCtrl.wrap);
      renderFxSec.body.appendChild(badgeBlock);

      var groupBgRow = document.createElement('div');
      groupBgRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
      var groupBgLabel = document.createElement('span');
      groupBgLabel.textContent = 'Phủ màu group';
      groupBgRow.appendChild(groupBgLabel);
      var groupBgToggleUi = createStableRenderToggle({ checked: true, accent: '#2F7D57', label: 'Phủ màu group' });
      var groupBgToggle = groupBgToggleUi.input;
      groupBgRow.appendChild(groupBgToggleUi.wrap);
      renderFxSec.body.appendChild(groupBgRow);

      var groupBgOpacityCtrl = createRangeControl('Opacity nền group', 0.12, 0.08, 0.18, 0.01);
      renderFxSec.body.appendChild(groupBgOpacityCtrl.wrap);

      var badgeGrid = document.createElement('div');
      badgeGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;';
      badgeBlock.appendChild(badgeGrid);

      var badgeTextField = createField('Màu ký hiệu');
      var itemBadgeColorInput = document.createElement('input');
      itemBadgeColorInput.type = 'color';
      itemBadgeColorInput.value = '#FFFFFF';
      itemBadgeColorInput.style.cssText = 'width:100%;height:38px;padding:0;border:1px solid #E2E8F0;border-radius:10px;';
      badgeTextField.field.appendChild(itemBadgeColorInput);
      badgeGrid.appendChild(badgeTextField.field);

      var badgeBgField = createField('Nền ký hiệu');
      var itemBadgeBgInput = document.createElement('input');
      itemBadgeBgInput.type = 'color';
      itemBadgeBgInput.value = '#1E293B';
      itemBadgeBgInput.style.cssText = 'width:100%;height:38px;padding:0;border:1px solid #E2E8F0;border-radius:10px;';
      badgeBgField.field.appendChild(itemBadgeBgInput);
      badgeGrid.appendChild(badgeBgField.field);

      var itemBadgePos = 'tl';
      var badgePosField = createField('Vị trí ký hiệu');
      var badgePosButtons = createOptionButtons([
        { label: 'TL', value: 'tl' },
        { label: 'TR', value: 'tr' },
        { label: 'BL', value: 'bl' },
        { label: 'BC', value: 'bc' },
        { label: 'BR', value: 'br' }
      ], function() { return itemBadgePos; }, function(next) {
        itemBadgePos = next;
        schedulePreview();
      });
      badgePosField.field.appendChild(badgePosButtons.wrap);
      badgeBlock.appendChild(badgePosField.field);


      var watermarkState = {
        enabled: false,
        preset: 'soft-corner',
        type: 'logo',
        mode: 'corner',
        text: 'STS CLIPART',
        logoText: 'STS',
        opacity: 0.06,
        scale: 1,
        color: '#1F2937',
        position: 'bottom-right',
        offsetX: 24,
        offsetY: 24,
        rotation: -25,
        tileSpacing: 280,
        exportOnly: true,
        previewInPanel: false
      };

      function getWatermarkPresetMap() {
        return {
          'soft-corner': {
            label: 'Soft Corner',
            type: 'logo',
            mode: 'corner',
            opacity: 0.06,
            scale: 1,
            color: '#1F2937',
            position: 'bottom-right',
            offsetX: 24,
            offsetY: 24,
            rotation: 0,
            tileSpacing: 280,
            exportOnly: true,
            previewInPanel: false
          },
          'preview-protect': {
            label: 'Preview Protect',
            type: 'text',
            mode: 'diagonal-repeat',
            opacity: 0.05,
            scale: 1,
            color: '#111827',
            position: 'center',
            offsetX: 0,
            offsetY: 0,
            rotation: -25,
            tileSpacing: 280,
            exportOnly: true,
            previewInPanel: false
          },
          'center-signature': {
            label: 'Center Signature',
            type: 'text',
            mode: 'center',
            opacity: 0.08,
            scale: 1.05,
            color: '#111827',
            position: 'center',
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            tileSpacing: 280,
            exportOnly: true,
            previewInPanel: false
          }
        };
      }

      function applyWatermarkPreset(presetId) {
        var presetMap = getWatermarkPresetMap();
        var preset = presetMap[presetId] || presetMap['soft-corner'];
        watermarkState.preset = presetId in presetMap ? presetId : 'soft-corner';
        Object.keys(preset).forEach(function(key) {
          if (key === 'label') return;
          watermarkState[key] = preset[key];
        });
      }

      function normalizeWatermarkState() {
        watermarkState.enabled = !!watermarkState.enabled;
        watermarkState.preset = watermarkState.preset || 'soft-corner';
        watermarkState.type = watermarkState.type || 'logo';
        watermarkState.mode = watermarkState.mode || 'corner';
        watermarkState.text = String(watermarkState.text || 'STS CLIPART');
        watermarkState.logoText = String(watermarkState.logoText || 'STS');
        watermarkState.opacity = clamp(parseFloat(watermarkState.opacity) || 0.06, 0.02, 0.18);
        watermarkState.scale = clamp(parseFloat(watermarkState.scale) || 1, 0.6, 1.8);
        watermarkState.color = /^#[0-9a-f]{6}$/i.test(watermarkState.color || '') ? watermarkState.color : '#1F2937';
        watermarkState.position = watermarkState.position || 'bottom-right';
        watermarkState.offsetX = clamp(parseInt(watermarkState.offsetX, 10) || 0, -240, 240);
        watermarkState.offsetY = clamp(parseInt(watermarkState.offsetY, 10) || 0, -240, 240);
        watermarkState.rotation = clamp(parseInt(watermarkState.rotation, 10) || 0, -90, 90);
        watermarkState.tileSpacing = clamp(parseInt(watermarkState.tileSpacing, 10) || 280, 160, 480);
        watermarkState.exportOnly = watermarkState.exportOnly !== false;
        watermarkState.previewInPanel = !!watermarkState.previewInPanel;
      }

      applyWatermarkPreset(watermarkState.preset);
      normalizeWatermarkState();

      left.appendChild(renderFxSec.wrap);

      var watermarkSec = makeSection('Watermark');
      left.appendChild(watermarkSec.wrap);

      var watermarkTopRow = document.createElement('div');
      watermarkTopRow.style.cssText = 'display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:end;';
      watermarkSec.body.appendChild(watermarkTopRow);

      var watermarkToggleField = document.createElement('div');
      watermarkToggleField.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
      var watermarkToggleLabel = document.createElement('span');
      watermarkToggleLabel.textContent = 'Bật / Tắt';
      watermarkToggleField.appendChild(watermarkToggleLabel);
      var watermarkToggleUi = createStableRenderToggle({ checked: false, accent: '#2F7D57', label: 'Bật / Tắt' });
      var watermarkToggle = watermarkToggleUi.input;
      watermarkToggleField.appendChild(watermarkToggleUi.wrap);
      watermarkTopRow.appendChild(watermarkToggleField);

      var watermarkPresetField = createField('Preset');
      var watermarkPresetSelect = document.createElement('select');
      watermarkPresetSelect.style.cssText = 'width:100%;padding:9px 10px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:700;outline:none;';
      [
        ['soft-corner', 'Soft Corner'],
        ['preview-protect', 'Preview Protect'],
        ['center-signature', 'Center Signature']
      ].forEach(function(entry) {
        var opt = document.createElement('option');
        opt.value = entry[0];
        opt.textContent = entry[1];
        watermarkPresetSelect.appendChild(opt);
      });
      watermarkPresetField.field.appendChild(watermarkPresetSelect);
      watermarkTopRow.appendChild(watermarkPresetField.field);

      var watermarkAdvancedBtn = document.createElement('button');
      watermarkAdvancedBtn.type = 'button';
      watermarkAdvancedBtn.textContent = 'Advanced';
      watermarkAdvancedBtn.style.cssText = 'height:38px;padding:0 14px;border-radius:10px;border:1px solid #E2E8F0;background:#F8FAFC;color:#0F172A;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
      watermarkTopRow.appendChild(watermarkAdvancedBtn);

      var watermarkHint = document.createElement('div');
      watermarkHint.style.cssText = 'margin-top:8px;padding:9px 10px;border-radius:10px;background:#F8FAFC;color:#475569;font-size:11.5px;font-weight:500;line-height:1.45;border:1px dashed #CBD5E1;';
      watermarkSec.body.appendChild(watermarkHint);

      function updateWatermarkSummary() {
        normalizeWatermarkState();
        watermarkToggle.checked = !!watermarkState.enabled;
        if (typeof watermarkToggle.syncUI === 'function') watermarkToggle.syncUI();
        watermarkPresetSelect.value = watermarkState.preset || 'soft-corner';
        var summary = 'Tắt';
        if (watermarkState.enabled) {
          summary = (watermarkState.type === 'logo' ? 'Logo' : (watermarkState.type === 'text+logo' ? 'Text + Logo' : 'Text'))
            + ' · ' + (watermarkState.mode === 'diagonal-repeat' ? 'Lặp chéo' : watermarkState.mode === 'center' ? 'Giữa ảnh' : 'Góc')
            + ' · ' + Math.round(watermarkState.opacity * 100) + '%'
            + (watermarkState.exportOnly ? ' · Export only' : ' · Có preview');
        }
        watermarkHint.textContent = 'Watermark: ' + summary;
      }

      var watermarkDrawer = document.createElement('div');
      watermarkDrawer.style.cssText = 'position:absolute;top:0;right:0;width:min(360px,92vw);height:100%;background:#FFFFFF;border-left:1px solid #E5E7EB;box-shadow:-18px 0 40px rgba(15,23,42,0.14);transform:translateX(105%);transition:transform .18s ease;z-index:5;display:flex;flex-direction:column;';
      box.appendChild(watermarkDrawer);

      var watermarkDrawerHead = document.createElement('div');
      watermarkDrawerHead.style.cssText = 'padding:16px 18px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;gap:12px;';
      watermarkDrawerHead.innerHTML = '<div><div style="font-size:14px;font-weight:700;line-height:1.25;color:#0F172A;">Watermark nâng cao</div><div style="margin-top:4px;font-size:11.5px;font-weight:500;line-height:1.45;color:#64748B;">Popup riêng để giữ Panel Render gọn và an toàn.</div></div>';
      var watermarkDrawerClose = document.createElement('button');
      watermarkDrawerClose.type = 'button';
      watermarkDrawerClose.textContent = 'Đóng';
      watermarkDrawerClose.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid #E2E8F0;background:#fff;color:#374151;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
      watermarkDrawerHead.appendChild(watermarkDrawerClose);
      watermarkDrawer.appendChild(watermarkDrawerHead);

      var watermarkDrawerBody = document.createElement('div');
      watermarkDrawerBody.style.cssText = 'padding:16px 18px;overflow:auto;display:grid;gap:12px;';
      watermarkDrawer.appendChild(watermarkDrawerBody);

      function createCompactSelectField(label, items) {
        var field = createField(label);
        var select = document.createElement('select');
        select.style.cssText = 'width:100%;padding:9px 10px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:700;outline:none;';
        items.forEach(function(item) {
          var opt = document.createElement('option');
          opt.value = item.value;
          opt.textContent = item.label;
          select.appendChild(opt);
        });
        field.field.appendChild(select);
        return { field: field.field, select: select };
      }

      var wmTypeField = createCompactSelectField('Loại watermark', [
        { value: 'text', label: 'Text' },
        { value: 'logo', label: 'Logo' },
        { value: 'text+logo', label: 'Text + Logo' }
      ]);
      watermarkDrawerBody.appendChild(wmTypeField.field);

      var wmModeField = createCompactSelectField('Kiểu hiển thị', [
        { value: 'corner', label: 'Góc ảnh' },
        { value: 'center', label: 'Giữa ảnh' },
        { value: 'diagonal-repeat', label: 'Lặp chéo' }
      ]);
      watermarkDrawerBody.appendChild(wmModeField.field);

      var wmTextField = createField('Text watermark');
      var wmTextInput = document.createElement('input');
      wmTextInput.type = 'text';
      wmTextInput.maxLength = 64;
      wmTextInput.placeholder = 'STS CLIPART';
      wmTextInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:700;outline:none;box-sizing:border-box;';
      wmTextField.field.appendChild(wmTextInput);
      watermarkDrawerBody.appendChild(wmTextField.field);

      var wmLogoField = createField('Text logo');
      var wmLogoInput = document.createElement('input');
      wmLogoInput.type = 'text';
      wmLogoInput.maxLength = 16;
      wmLogoInput.placeholder = 'STS';
      wmLogoInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:700;outline:none;box-sizing:border-box;';
      wmLogoField.field.appendChild(wmLogoInput);
      watermarkDrawerBody.appendChild(wmLogoField.field);

      var wmRangeGrid = document.createElement('div');
      wmRangeGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      watermarkDrawerBody.appendChild(wmRangeGrid);

      var wmOpacityCtrl = createRangeControl('Opacity', 0.06, 0.02, 0.18, 0.01);
      wmRangeGrid.appendChild(wmOpacityCtrl.wrap);
      var wmScaleCtrl = createRangeControl('Scale', 1, 0.6, 1.8, 0.05);
      wmRangeGrid.appendChild(wmScaleCtrl.wrap);

      var wmVisualGrid = document.createElement('div');
      wmVisualGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      watermarkDrawerBody.appendChild(wmVisualGrid);

      var wmColorField = createField('Màu');
      var wmColorInput = document.createElement('input');
      wmColorInput.type = 'color';
      wmColorInput.value = '#1F2937';
      wmColorInput.style.cssText = 'width:100%;height:38px;padding:0;border:1px solid #E2E8F0;border-radius:10px;';
      wmColorField.field.appendChild(wmColorInput);
      wmVisualGrid.appendChild(wmColorField.field);

      var wmPositionField = createCompactSelectField('Vị trí', [
        { value: 'top-left', label: 'Góc trái trên' },
        { value: 'top-right', label: 'Góc phải trên' },
        { value: 'bottom-left', label: 'Góc trái dưới' },
        { value: 'bottom-right', label: 'Góc phải dưới' },
        { value: 'center', label: 'Giữa ảnh' }
      ]);
      wmVisualGrid.appendChild(wmPositionField.field);

      var wmOffsetGrid = document.createElement('div');
      wmOffsetGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      watermarkDrawerBody.appendChild(wmOffsetGrid);

      var wmOffsetXField = createField('Offset X');
      var wmOffsetXInput = createCompactNumberInput(24, -240, 240);
      wmOffsetXField.field.appendChild(wmOffsetXInput);
      wmOffsetGrid.appendChild(wmOffsetXField.field);

      var wmOffsetYField = createField('Offset Y');
      var wmOffsetYInput = createCompactNumberInput(24, -240, 240);
      wmOffsetYField.field.appendChild(wmOffsetYInput);
      wmOffsetGrid.appendChild(wmOffsetYField.field);

      var wmRotationField = createField('Rotation');
      var wmRotationInput = createCompactNumberInput(-25, -90, 90);
      wmRotationField.field.appendChild(wmRotationInput);
      watermarkDrawerBody.appendChild(wmRotationField.field);

      var wmTileField = createField('Khoảng cách lặp');
      var wmTileInput = createCompactNumberInput(280, 160, 480);
      wmTileField.field.appendChild(wmTileInput);
      watermarkDrawerBody.appendChild(wmTileField.field);

      var wmBehaviorBox = document.createElement('div');
      wmBehaviorBox.style.cssText = 'display:grid;gap:8px;padding:12px;border:1px solid #E5E7EB;border-radius:12px;background:#F8FAFC;';
      watermarkDrawerBody.appendChild(wmBehaviorBox);

      function makeCheckRow(labelText) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
        var span = document.createElement('span');
        span.textContent = labelText;
        var toggleUi = createStableRenderToggle({ checked: false, accent: '#2F7D57', label: labelText });
        var input = toggleUi.input;
        row.appendChild(span);
        row.appendChild(toggleUi.wrap);
        wmBehaviorBox.appendChild(row);
        return input;
      }

      var wmExportOnlyToggle = makeCheckRow('Chỉ áp dụng khi export');
      var wmPreviewToggle = makeCheckRow('Cho hiện cả trong preview');

      function syncWatermarkDrawerVisibility() {
        watermarkDrawer.style.transform = watermarkDrawer.dataset.open === '1' ? 'translateX(0)' : 'translateX(105%)';
      }

      function syncWatermarkControls() {
        normalizeWatermarkState();
        wmTypeField.select.value = watermarkState.type;
        wmModeField.select.value = watermarkState.mode;
        wmTextInput.value = watermarkState.text;
        wmLogoInput.value = watermarkState.logoText;
        wmOpacityCtrl.input.value = String(watermarkState.opacity);
        if (wmOpacityCtrl.sync) wmOpacityCtrl.sync();
        wmScaleCtrl.input.value = String(watermarkState.scale);
        if (wmScaleCtrl.sync) wmScaleCtrl.sync();
        wmColorInput.value = watermarkState.color;
        wmPositionField.select.value = watermarkState.position;
        wmOffsetXInput.value = String(watermarkState.offsetX);
        wmOffsetYInput.value = String(watermarkState.offsetY);
        wmRotationInput.value = String(watermarkState.rotation);
        wmTileInput.value = String(watermarkState.tileSpacing);
        wmExportOnlyToggle.checked = !!watermarkState.exportOnly;
        wmPreviewToggle.checked = !!watermarkState.previewInPanel;
        if (typeof wmExportOnlyToggle.syncUI === 'function') wmExportOnlyToggle.syncUI();
        if (typeof wmPreviewToggle.syncUI === 'function') wmPreviewToggle.syncUI();
        wmTileField.field.style.display = watermarkState.mode === 'diagonal-repeat' ? 'block' : 'none';
        wmPositionField.field.style.display = watermarkState.mode === 'corner' ? 'block' : 'none';
      }

      function syncWatermarkUI() {
        updateWatermarkSummary();
        syncWatermarkControls();
      }

      function openWatermarkDrawer() {
        syncWatermarkControls();
        watermarkDrawer.dataset.open = '1';
        syncWatermarkDrawerVisibility();
      }

      function closeWatermarkDrawer() {
        watermarkDrawer.dataset.open = '0';
        syncWatermarkDrawerVisibility();
      }

      function pushWatermarkFromControls() {
        watermarkState.type = wmTypeField.select.value;
        watermarkState.mode = wmModeField.select.value;
        watermarkState.text = (wmTextInput.value || '').trim() || 'STS CLIPART';
        watermarkState.logoText = (wmLogoInput.value || '').trim() || 'STS';
        watermarkState.opacity = parseFloat(wmOpacityCtrl.input.value) || 0.06;
        watermarkState.scale = parseFloat(wmScaleCtrl.input.value) || 1;
        watermarkState.color = wmColorInput.value || '#1F2937';
        watermarkState.position = wmPositionField.select.value || 'bottom-right';
        watermarkState.offsetX = parseInt(wmOffsetXInput.value, 10) || 0;
        watermarkState.offsetY = parseInt(wmOffsetYInput.value, 10) || 0;
        watermarkState.rotation = parseInt(wmRotationInput.value, 10) || 0;
        watermarkState.tileSpacing = parseInt(wmTileInput.value, 10) || 280;
        watermarkState.exportOnly = !!wmExportOnlyToggle.checked;
        watermarkState.previewInPanel = !!wmPreviewToggle.checked;
        normalizeWatermarkState();
        updateWatermarkSummary();
      }

      watermarkToggle.onchange = function() {
        watermarkState.enabled = !!watermarkToggle.checked;
        updateWatermarkSummary();
        schedulePreview();
      };
      watermarkPresetSelect.onchange = function() {
        applyWatermarkPreset(watermarkPresetSelect.value);
        syncWatermarkUI();
        schedulePreview();
      };
      watermarkAdvancedBtn.onclick = openWatermarkDrawer;
      watermarkDrawerClose.onclick = closeWatermarkDrawer;
      [wmTypeField.select, wmModeField.select, wmTextInput, wmLogoInput, wmOpacityCtrl.input, wmScaleCtrl.input, wmColorInput, wmPositionField.select, wmOffsetXInput, wmOffsetYInput, wmRotationInput, wmTileInput, wmExportOnlyToggle, wmPreviewToggle].forEach(function(ctrl) {
        ctrl.oninput = function() {
          pushWatermarkFromControls();
          syncWatermarkControls();
          schedulePreview();
        };
        ctrl.onchange = ctrl.oninput;
      });

      syncWatermarkUI();

      var alignGrid = document.createElement('div');
      alignGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;';
      settingsSec.body.appendChild(alignGrid);

      var marginSec = makeSection('Lề ảnh');
      var equalMarginWrap = document.createElement('div');
      equalMarginWrap.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
      var equalMarginLabel = document.createElement('span');
      equalMarginLabel.textContent = '4 lề bằng nhau';
      equalMarginWrap.appendChild(equalMarginLabel);
      var equalMarginToggleUi = createStableRenderToggle({ checked: true, accent: '#2F7D57', label: '4 lề bằng nhau' });
      var equalMarginToggle = equalMarginToggleUi.input;
      equalMarginWrap.appendChild(equalMarginToggleUi.wrap);
      marginSec.body.appendChild(equalMarginWrap);

      var marginGrid = document.createElement('div');
      marginGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
      marginSec.body.appendChild(marginGrid);

      function createPxInput(labelText, value) {
        var field = document.createElement('label');
        field.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;line-height:1.35;color:#374151;';
        var text = document.createElement('span');
        text.textContent = labelText;
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '400';
        input.step = '1';
        input.value = String(value);
        input.style.cssText = 'width:100%;padding:8px 10px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:500;line-height:1.35;';
        field.appendChild(text);
        field.appendChild(input);
        return { field: field, input: input };
      }

      var marginTopField = createPxInput('Lề trên', 30);
      var marginRightField = createPxInput('Lề phải', 30);
      var marginBottomField = createPxInput('Lề dưới', 30);
      var marginLeftField = createPxInput('Lề trái', 30);
      [marginTopField, marginRightField, marginBottomField, marginLeftField].forEach(function(entry) {
        marginGrid.appendChild(entry.field);
      });

      function syncMarginInputs(sourceInput) {
        var next = clamp(parseInt(sourceInput.value, 10) || 0, 0, 400);
        sourceInput.value = String(next);
        if (!equalMarginToggle.checked) return;
        [marginTopField.input, marginRightField.input, marginBottomField.input, marginLeftField.input].forEach(function(input) {
          input.value = String(next);
        });
      }

      [marginTopField.input, marginRightField.input, marginBottomField.input, marginLeftField.input].forEach(function(input) {
        input.oninput = function() {
          syncMarginInputs(input);
          schedulePreview();
        };
        input.onchange = input.oninput;
      });
      equalMarginToggle.onchange = function() {
        if (equalMarginToggle.checked) {
          syncMarginInputs(marginTopField.input);
        }
        schedulePreview();
      };

      makeCollapsibleSection(renderFxSec, false);
      makeCollapsibleSection(marginSec, false);

      var hAlign = 'center';
      var vAlign = 'top';
      var hAlignField = createField('Căn ngang');
      var hAlignButtons = createOptionButtons([
        { label: 'Trái', value: 'left' },
        { label: 'Giữa', value: 'center' },
        { label: 'Phải', value: 'right' }
      ], function() { return hAlign; }, function(next) {
        hAlign = next;
        schedulePreview();
      });
      hAlignField.field.appendChild(hAlignButtons.wrap);
      alignGrid.appendChild(hAlignField.field);

      var vAlignField = createField('Căn dọc');
      var vAlignButtons = createOptionButtons([
        { label: 'Trên', value: 'top' },
        { label: 'Giữa', value: 'middle' },
        { label: 'Dưới', value: 'bottom' }
      ], function() { return vAlign; }, function(next) {
        vAlign = next;
        schedulePreview();
      });
      vAlignField.field.appendChild(vAlignButtons.wrap);
      alignGrid.appendChild(vAlignField.field);

      
function getRenderableOptions(cat) {
  if (!cat || !Array.isArray(cat.options)) return [];
  return cat.options
    .filter(function(opt) { return !!opt && !(opt && typeof opt === 'object' && opt._deleted === true); })
    .map(function(opt) { return normalizeClipartOption(opt); });
}

function isBackgroundCategory(cat) {
  var name = String((cat && cat.name) || '').toLowerCase();
  return /(change\s*background|choose\s*background|background|bg\b|backdrop|scene)/i.test(name);
}

function makeBgImageChoice(id, label, src) {
  return {
    id: id,
    label: label,
    type: 'image',
    src: src
  };
}


function collectBackgroundChoices() {
        var choices = [
          {
            id: 'preset-etsy-cream',
            label: 'Etsy Cream',
            type: 'gradient',
            colors: ['#FFF8F1', '#F5EFE6'],
            accent: '#E7D7C6'
          },
          {
            id: 'preset-soft-blue',
            label: 'Soft Blue',
            type: 'gradient',
            colors: ['#F8FAFC', '#E0F2FE'],
            accent: '#BFE1CB'
          },
          {
            id: 'preset-blush',
            label: 'Blush',
            type: 'gradient',
            colors: ['#FFF7ED', '#FCE7F3'],
            accent: '#FDBA74'
          },
          {
            id: 'preset-sage',
            label: 'Sage',
            type: 'gradient',
            colors: ['#F0FDF4', '#ECFCCB'],
            accent: '#BFDBFE'
          }
        ];

        var seen = Object.create(null);
        var mainProductImage = detectProductMockup();
        if (mainProductImage) {
          seen[mainProductImage] = true;
          choices.unshift(makeBgImageChoice('product-main-image', 'Ảnh sản phẩm chính', mainProductImage));
        }

        cats.forEach(function(cat) {
          if (!isBackgroundCategory(cat)) return;
          getRenderableOptions(cat).forEach(function(opt, optIdx) {
            var src = opt && (opt.capturedImage || opt.imageUrl);
            if (!src || seen[src]) return;
            seen[src] = true;
            var optLabel = String(opt.textContent || opt.label || '').trim() || ('BG ' + (optIdx + 1));
            choices.push(makeBgImageChoice('bg-option-' + choices.length, 'BG: ' + optLabel, src));
          });
        });

        cats.forEach(function(cat) {
          getRenderableOptions(cat).forEach(function(opt) {
            var src = opt && (opt.capturedImage || opt.imageUrl);
            if (!src || seen[src] || choices.length >= 12) return;
            seen[src] = true;
            choices.push(makeBgImageChoice('img-' + choices.length, 'Ảnh có sẵn', src));
          });
        });

        return choices;
      }

      var bgChoices = collectBackgroundChoices();
      var selectedBgId = bgChoices[0] ? bgChoices[0].id : '';

      var bgSec = makeSection('Background');
      left.appendChild(bgSec.wrap);

      var bgGrid = document.createElement('div');
      bgGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;';
      bgSec.body.appendChild(bgGrid);

      bgChoices.forEach(function(choice) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.bgId = choice.id;
        btn.style.cssText = 'padding:0;border:1px solid #E2E8F0;border-radius:12px;background:#fff;overflow:hidden;cursor:pointer;text-align:left;';
        var swatch = document.createElement('div');
        swatch.style.cssText = 'height:46px;display:block;';
        if (choice.type === 'image') {
          swatch.style.backgroundImage = 'url("' + choice.src.replace(/"/g, '&quot;') + '")';
          swatch.style.backgroundSize = 'cover';
          swatch.style.backgroundPosition = 'center';
        } else {
          swatch.style.background = 'linear-gradient(135deg,' + choice.colors[0] + ',' + choice.colors[1] + ')';
          if (choice.accent) {
            swatch.style.boxShadow = 'inset 0 0 0 999px rgba(255,255,255,0.03), 0 0 0 1px ' + choice.accent;
          }
        }
        var label = document.createElement('div');
        label.style.cssText = 'padding:7px 8px;font-size:11px;font-weight:700;line-height:1.2;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        label.textContent = choice.label;
        btn.appendChild(swatch);
        btn.appendChild(label);
        btn.onclick = function() {
          selectedBgId = choice.id;
          refreshBgButtons();
          schedulePreview();
        };
        choice._btn = btn;
        bgGrid.appendChild(btn);
      });

      function refreshBgButtons() {
        bgChoices.forEach(function(choice) {
          if (!choice._btn) return;
          var active = choice.id === selectedBgId;
          choice._btn.style.borderColor = active ? '#BFDBFE' : '#CBD5E1';
          choice._btn.style.boxShadow = active ? '0 0 0 2px rgba(37,99,235,0.18)' : 'none';
        });
      }

refreshBgButtons();

var bgBlurCtrl = createRangeControl('Làm mờ nền ảnh', 3, 0, 24, 1, function(value) { return Math.round(value * 100) + '%'; });
bgBlurCtrl.wrap.style.marginTop = '8px';
bgSec.body.appendChild(bgBlurCtrl.wrap);
bgBlurCtrl.input.style.cssText = 'width:100%;accent-color:#2563EB;cursor:pointer;display:block;position:relative;z-index:2;height:20px;';
bgBlurCtrl.input.oninput = function() {
  schedulePreview();
};

function addBackgroundChoice(choice) {
  if (!choice || !choice.id) return;
  var existingIdx = -1;
  for (var bgIdx = 0; bgIdx < bgChoices.length; bgIdx++) {
    if (bgChoices[bgIdx].id === choice.id) { existingIdx = bgIdx; break; }
  }
  if (existingIdx >= 0) {
    bgChoices[existingIdx] = choice;
  } else {
    bgChoices.push(choice);
  }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.bgId = choice.id;
  btn.style.cssText = 'padding:0;border:1px solid #E2E8F0;border-radius:12px;background:#fff;overflow:hidden;cursor:pointer;text-align:left;';
  var swatch = document.createElement('div');
  swatch.style.cssText = 'height:46px;display:block;';
  if (choice.type === 'image') {
    swatch.style.backgroundImage = 'url("' + choice.src.replace(/"/g, '&quot;') + '")';
    swatch.style.backgroundSize = 'cover';
    swatch.style.backgroundPosition = 'center';
  } else {
    swatch.style.background = 'linear-gradient(135deg,' + choice.colors[0] + ',' + choice.colors[1] + ')';
    if (choice.accent) swatch.style.boxShadow = 'inset 0 0 0 999px rgba(255,255,255,0.03), 0 0 0 1px ' + choice.accent;
  }
  var label = document.createElement('div');
  label.style.cssText = 'padding:7px 8px;font-size:11px;font-weight:700;line-height:1.2;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  label.textContent = choice.label;
  btn.appendChild(swatch);
  btn.appendChild(label);
  btn.onclick = function() {
    selectedBgId = choice.id;
    refreshBgButtons();
    schedulePreview();
  };
  choice._btn = btn;
  bgGrid.appendChild(btn);
  refreshBgButtons();
  ensureImagesLoaded();
}

var bgUploadRow = document.createElement('div');
bgUploadRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px;';
var bgUploadBtn = document.createElement('button');
bgUploadBtn.type = 'button';
bgUploadBtn.textContent = 'Chọn ảnh làm Background';
bgUploadBtn.style.cssText = 'flex:1;padding:8px 10px;border:1px dashed #94A3B8;border-radius:10px;background:#F8FAFC;color:#0F172A;font-size:12px;font-weight:700;cursor:pointer;';
var bgUploadInput = document.createElement('input');
bgUploadInput.type = 'file';
bgUploadInput.accept = 'image/*';
bgUploadInput.style.display = 'none';
bgUploadBtn.onclick = function() { bgUploadInput.click(); };
bgUploadInput.onchange = function() {
  var file = bgUploadInput.files && bgUploadInput.files[0];
  if (!file) return;
  try {
    var objectUrl = URL.createObjectURL(file);
    var uploadedChoice = {
      id: 'upload-' + Date.now(),
      type: 'image',
      src: objectUrl,
      label: 'Ảnh tự chọn',
      isUserUpload: true
    };
    addBackgroundChoice(uploadedChoice);
    selectedBgId = uploadedChoice.id;
    refreshBgButtons();
    schedulePreview();
  } catch (uploadErr) {
    console.warn('[STS Render] Failed to load uploaded background', uploadErr);
  } finally {
    bgUploadInput.value = '';
  }
};
bgUploadRow.appendChild(bgUploadBtn);
bgUploadRow.appendChild(bgUploadInput);
bgSec.body.appendChild(bgUploadRow);

      left.appendChild(marginSec.wrap);

var fitStatus = document.createElement('div');
      fitStatus.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:10px;background:#F8FAFC;border:1px solid #BFDBFE;font-size:12px;font-weight:500;line-height:1.45;color:#475569;';

      var selectSec = makeSection('Group');

      var actionRow = document.createElement('div');
      actionRow.style.cssText = 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:8px;';
      var selAllBtn = document.createElement('button');
      selAllBtn.type = 'button';
      selAllBtn.textContent = 'Chọn tất cả';
      selAllBtn.style.cssText = 'padding:8px 10px;background:#EEF2FF;color:#2563EB;border:1px solid #BFE1CB;border-radius:10px;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
      var selNoneBtn = document.createElement('button');
      selNoneBtn.type = 'button';
      selNoneBtn.textContent = 'Bỏ chọn';
      selNoneBtn.style.cssText = 'padding:8px 10px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;border-radius:10px;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
      var renumberVerticalBtn = document.createElement('button');
      renumberVerticalBtn.type = 'button';
      renumberVerticalBtn.textContent = 'Renumber ↑↓';
      renumberVerticalBtn.title = 'Đánh lại số theo chiều dọc';
      renumberVerticalBtn.style.cssText = 'padding:8px 10px;background:#EAF6EF;color:#2563EB;border:1px solid #BFE1CB;border-radius:10px;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
      var renumberHorizontalBtn = document.createElement('button');
      renumberHorizontalBtn.type = 'button';
      renumberHorizontalBtn.textContent = 'Renumber ←→';
      renumberHorizontalBtn.title = 'Đánh lại số theo chiều ngang';
      renumberHorizontalBtn.style.cssText = 'padding:8px 10px;background:#EAF6EF;color:#2563EB;border:1px solid #BFE1CB;border-radius:10px;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
      actionRow.appendChild(selAllBtn);
      actionRow.appendChild(selNoneBtn);
      actionRow.appendChild(renumberVerticalBtn);
      actionRow.appendChild(renumberHorizontalBtn);
      selectSec.body.appendChild(actionRow);

      var listWrap = document.createElement('div');
      listWrap.style.cssText = 'max-height:300px;overflow:auto;padding-right:2px;';
      selectSec.body.appendChild(listWrap);

      var listColsHost = document.createElement('div');
      listColsHost.style.cssText = 'display:grid;grid-template-columns:1fr;gap:8px;align-items:start;';
      listWrap.appendChild(listColsHost);

      var toggleStates = [];
      function normalizeCatIdentity(cat) {
        var name = String((cat && cat.name) || '').trim().toLowerCase().replace(/\s+/g, ' ');
        var count = Array.isArray(cat && cat.options) ? cat.options.filter(function(opt) { return !!opt && !(opt && typeof opt === 'object' && opt._deleted === true); }).length : 0;
        return name + '|' + count;
      }
      function assignBalancedVerticalColumns(states) {
        var entries = states.map(function(state) {
          var cat = cats[state.idx];
          return {
            state: state,
            weight: Math.max(1, Array.isArray(cat && cat.options) ? cat.options.length : 1)
          };
        });
        var total = entries.reduce(function(sum, e) { return sum + e.weight; }, 0);
        var target = total / 2;
        var leftWeight = 0;
        var leftCount = 0;
        for (var i = 0; i < entries.length; i++) {
          var remaining = entries.length - i;
          if (remaining <= 1) break;
          if (leftWeight < target) {
            leftWeight += entries[i].weight;
            leftCount++;
          } else {
            break;
          }
        }
        leftCount = clamp(leftCount, 1, Math.max(1, entries.length - 1));
        states.forEach(function(state, idx) {
          state.column = idx < leftCount ? 0 : 1;
          state.orderInColumn = idx < leftCount ? idx : (idx - leftCount);
        });
      }
      cats.forEach(function(cat, ci) {
        var state = { selected: true, idx: ci, column: 0, orderInColumn: ci, identity: normalizeCatIdentity(cat) };
        toggleStates.push(state);
      });
      if (groupCols === 2) assignBalancedVerticalColumns(toggleStates);

      function normalizeGroupOrders() {
        var cols = groupCols === 2 ? 2 : 1;
        for (var col = 0; col < cols; col++) {
          var states = toggleStates.filter(function(state) {
            return (cols === 1 ? 0 : clamp(parseInt(state.column, 10) || 0, 0, 1)) === col;
          }).sort(function(a, b) {
            return (parseInt(a.orderInColumn, 10) || 0) - (parseInt(b.orderInColumn, 10) || 0) || a.idx - b.idx;
          });
          states.forEach(function(state, orderIdx) {
            state.column = cols === 1 ? 0 : col;
            state.orderInColumn = orderIdx;
          });
        }
      }

      function getFlattenedStates(layoutMode) {
        var cols = groupCols === 2 ? 2 : 1;
        var mode = layoutMode === 'vertical' ? 'vertical' : 'horizontal';
        normalizeGroupOrders();
        if (cols === 1) {
          return toggleStates.slice().sort(function(a, b) {
            return (parseInt(a.orderInColumn, 10) || 0) - (parseInt(b.orderInColumn, 10) || 0) || a.idx - b.idx;
          });
        }
        var byCol = [[], []];
        toggleStates.forEach(function(state) {
          var col = clamp(parseInt(state.column, 10) || 0, 0, 1);
          byCol[col].push(state);
        });
        byCol.forEach(function(list) {
          list.sort(function(a, b) {
            return (parseInt(a.orderInColumn, 10) || 0) - (parseInt(b.orderInColumn, 10) || 0) || a.idx - b.idx;
          });
        });
        if (mode === 'vertical') {
          return byCol[0].concat(byCol[1]);
        }
        var flat = [];
        var maxRows = Math.max(byCol[0].length, byCol[1].length);
        for (var rowIdx = 0; rowIdx < maxRows; rowIdx++) {
          if (byCol[0][rowIdx]) flat.push(byCol[0][rowIdx]);
          if (byCol[1][rowIdx]) flat.push(byCol[1][rowIdx]);
        }
        return flat;
      }

      function applyGroupColsChange(nextCols) {
        nextCols = clamp(parseInt(nextCols, 10) || 1, 1, 2);
        if (nextCols === groupCols) {
          refreshModeFieldVisuals();
          renderGroupLayoutUI();
          schedulePreview();
          return;
        }
        var flattened = getFlattenedStates('vertical');
        groupCols = nextCols;
        if (groupCols === 1) {
          flattened.forEach(function(state, idx) {
            state.column = 0;
            state.orderInColumn = idx;
          });
        } else assignBalancedVerticalColumns(flattened);
        normalizeGroupOrders();
        refreshModeFieldVisuals();
        ensureCustomLayoutRules();
        renderGroupLayoutUI();
        schedulePreview();
      }

      function moveStateVertical(state, direction) {
        var activeCol = groupCols === 1 ? 0 : clamp(parseInt(state.column, 10) || 0, 0, 1);
        var states = toggleStates.filter(function(item) {
          return (groupCols === 1 ? 0 : clamp(parseInt(item.column, 10) || 0, 0, 1)) === activeCol;
        }).sort(function(a, b) {
          return (parseInt(a.orderInColumn, 10) || 0) - (parseInt(b.orderInColumn, 10) || 0) || a.idx - b.idx;
        });
        var currentIndex = states.indexOf(state);
        if (currentIndex < 0) return;
        var targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= states.length) return;
        var swap = states[targetIndex];
        var tmp = state.orderInColumn;
        state.orderInColumn = swap.orderInColumn;
        swap.orderInColumn = tmp;
        normalizeGroupOrders();
        renderGroupLayoutUI();
        schedulePreview();
      }

      function moveStateAcrossColumn(state) {
        if (groupCols !== 2) return;
        var nextCol = clamp((parseInt(state.column, 10) || 0) === 0 ? 1 : 0, 0, 1);
        state.column = nextCol;
        state.orderInColumn = toggleStates.filter(function(item) {
          return clamp(parseInt(item.column, 10) || 0, 0, 1) === nextCol && item !== state;
        }).length;
        normalizeGroupOrders();
        renderGroupLayoutUI();
        schedulePreview();
      }

      function getGroupStatesByColumn() {
        normalizeGroupOrders();
        var cols = groupCols === 2 ? 2 : 1;
        var out = [];
        for (var col = 0; col < cols; col++) {
          out[col] = toggleStates.filter(function(state) {
            return (cols === 1 ? 0 : clamp(parseInt(state.column, 10) || 0, 0, 1)) === col;
          }).sort(function(a, b) {
            return (parseInt(a.orderInColumn, 10) || 0) - (parseInt(b.orderInColumn, 10) || 0) || a.idx - b.idx;
          });
        }
        return out;
      }

      function renderGroupLayoutUI() {
        listColsHost.innerHTML = '';
        listColsHost.style.gridTemplateColumns = groupCols === 2 ? 'repeat(2,minmax(0,1fr))' : '1fr';
        var statesByColumn = getGroupStatesByColumn();

        statesByColumn.forEach(function(states, colIdx) {
          var columnWrap = document.createElement('div');
          columnWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:0;';
          listColsHost.appendChild(columnWrap);

          states.forEach(function(state) {
            var cat = cats[state.idx];
            var card = document.createElement('div');
            card.style.cssText = 'border:1px solid #E2E8F0;border-radius:12px;background:#F9FAFB;padding:8px 10px;display:flex;flex-direction:column;gap:8px;cursor:pointer;';
            card.onclick = function() {
              state.selected = !state.selected;
              renderGroupLayoutUI();
              schedulePreview();
            };

            var topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
            card.appendChild(topRow);

            var dot = document.createElement('div');
            dot.style.cssText = 'width:10px;height:10px;border-radius:999px;background:linear-gradient(135deg,#2F7D57,#7C3AED);flex:0 0 10px;margin-top:4px;';
            topRow.appendChild(dot);

            var prefixInput = document.createElement('input');
            prefixInput.type = 'text';
            prefixInput.maxLength = 3;
            prefixInput.value = isStandaloneTitleCategory(cat) ? '' : sanitizeGroupPrefix(cat.prefix || '', cat.prefix || 'A');
            prefixInput.disabled = isStandaloneTitleCategory(cat);
            prefixInput.title = isStandaloneTitleCategory(cat) ? 'Tiêu đề lớn không dùng ký hiệu group' : 'Ký hiệu group';
            prefixInput.style.cssText = 'width:42px;height:26px;padding:0 6px;border:1px solid #BFE1CB;border-radius:8px;background:' + (isStandaloneTitleCategory(cat) ? '#F3F4F6' : '#EAF6EF') + ';color:#276A4A;font-size:11px;font-weight:700;line-height:1.15;text-align:center;outline:none;text-transform:uppercase;flex:0 0 42px;';
            prefixInput.onclick = function(ev) { ev.stopPropagation(); };
            prefixInput.onmousedown = function(ev) { ev.stopPropagation(); };
            prefixInput.oninput = function(ev) {
              ev.stopPropagation();
              prefixInput.value = String(prefixInput.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
            };
            var commitPrefix = function() {
              if (isStandaloneTitleCategory(cat)) return;
              updateCategoryPrefix(cat, prefixInput.value || cat.prefix || 'A');
              renderGroupLayoutUI();
              schedulePreview();
            };
            prefixInput.onchange = commitPrefix;
            prefixInput.onblur = commitPrefix;
            prefixInput.onkeydown = function(ev) {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                commitPrefix();
              }
            };
            topRow.appendChild(prefixInput);

            var labelWrap = document.createElement('div');
            labelWrap.style.cssText = 'flex:1;min-width:0;';
            topRow.appendChild(labelWrap);

            var title = document.createElement('div');
            title.style.cssText = 'font-size:12px;font-weight:700;line-height:1.2;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            title.textContent = cat.name || ('Group ' + (state.idx + 1));
            labelWrap.appendChild(title);

            var sub = document.createElement('div');
            sub.style.cssText = 'font-size:11.5px;font-weight:500;line-height:1.45;color:#64748B;margin-top:2px;';
            sub.textContent = (cat.options ? cat.options.length : 0) + ' item' + (isStandaloneTitleCategory(cat) ? '' : (' · ' + (cat.prefix || '') + '1→' + (cat.prefix || '') + (cat.options ? cat.options.length : 0)));
            labelWrap.appendChild(sub);

            var tick = document.createElement('div');
            tick.style.cssText = 'min-width:20px;height:20px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;line-height:1.15;flex:0 0 20px;';
            topRow.appendChild(tick);

            var controls = document.createElement('div');
            controls.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;';
            card.appendChild(controls);

            function makeMiniBtn(textLabel, titleText, onClick) {
              var btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = textLabel;
              btn.title = titleText;
              btn.style.cssText = 'min-width:30px;height:28px;padding:0 8px;border-radius:8px;border:1px solid #E2E8F0;background:#FFFFFF;color:#334155;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;';
              btn.onclick = function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
                onClick();
              };
              return btn;
            }

            controls.appendChild(makeMiniBtn('↑', 'Đưa lên', function() { moveStateVertical(state, -1); }));
            controls.appendChild(makeMiniBtn('↓', 'Đưa xuống', function() { moveStateVertical(state, 1); }));
            if (groupCols === 2) {
              controls.appendChild(makeMiniBtn(colIdx === 0 ? '→' : '←', 'Chuyển cột', function() { moveStateAcrossColumn(state); }));
            }

            if (state.selected) {
              card.style.background = '#F0FDF4';
              card.style.borderColor = '#BFDBFE';
              tick.style.background = '#2563EB';
              tick.style.color = '#fff';
              tick.textContent = '✓';
            } else {
              card.style.background = '#F9FAFB';
              card.style.borderColor = '#BDD4C4';
              tick.style.background = '#E5E7EB';
              tick.style.color = '#8AA095';
              tick.textContent = '';
            }

            columnWrap.appendChild(card);
          });
        });
      }

      renderGroupLayoutUI();

      selAllBtn.onclick = function() {
        toggleStates.forEach(function(state) { state.selected = true; });
        renderGroupLayoutUI();
        schedulePreview();
      };
      selNoneBtn.onclick = function() {
        toggleStates.forEach(function(state) { state.selected = false; });
        renderGroupLayoutUI();
        schedulePreview();
      };
      function renumberGroupLayout(directionMode) {
        var ordered = getFlattenedStates(directionMode).map(function(state) {
          return { idx: state.idx, cat: cats[state.idx] };
        });
        renumberClipartCategories(cats, ordered);
        renderGroupLayoutUI();
        schedulePreview();
        clipNotify(directionMode === 'vertical' ? 'Đã đánh lại số theo chiều dọc' : 'Đã đánh lại số theo chiều ngang', 'success');
      }

      renumberVerticalBtn.onclick = function() {
        renumberGroupLayout('vertical');
      };
      renumberHorizontalBtn.onclick = function() {
        renumberGroupLayout('horizontal');
      };

      var previewSec = makeSection('Preview', { checkable: true, checked: true, accent: '#2F7D57' });
      right.appendChild(previewSec.wrap);
      previewSec.header.style.flexWrap = 'wrap';
      previewSec.header.style.alignItems = 'flex-start';
      previewSec.titleEl.style.marginRight = '8px';
      fitStatus.style.cssText = 'flex:1 1 280px;min-width:240px;padding:7px 10px;border-radius:10px;background:#F8FAFC;border:1px solid #BFDBFE;font-size:12px;font-weight:500;line-height:1.45;color:#475569;';
      if (previewSec.checkWrap) previewSec.checkWrap.style.marginLeft = 'auto';
      previewSec.header.insertBefore(fitStatus, previewSec.checkWrap || null);

      var previewFrame = document.createElement('div');
      previewFrame.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:8px;border-radius:16px;background:linear-gradient(180deg,#F8FAFC,#EEF2FF);border:1px solid #E5E7EB;';
      var previewCanvas = document.createElement('canvas');
      previewCanvas.width = 840;
      previewCanvas.height = 840;
      previewCanvas.style.cssText = 'width:min(100%,840px);aspect-ratio:1/1;border-radius:16px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,0.14);display:block;';
      previewFrame.appendChild(previewCanvas);
      previewSec.body.appendChild(previewFrame);

      var previewMeta = document.createElement('div');
      previewMeta.style.cssText = 'margin-top:8px;font-size:12px;font-weight:500;line-height:1.45;color:#64748B;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;';
      previewSec.body.appendChild(previewMeta);



function deriveCustomTitleAndBody(rawText) {
  var raw = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var lines = raw.split('\n');
  var title = '';
  var bodyLines = [];
  var foundTitle = false;
  for (var i = 0; i < lines.length; i++) {
    var line = String(lines[i] || '').trim();
    if (!foundTitle && line) {
      title = line;
      foundTitle = true;
      continue;
    }
    if (foundTitle) bodyLines.push(lines[i]);
  }
  return {
    title: title || 'Please Add Your Custom:',
    body: bodyLines.join('\n').trim()
  };
}

var customSec = makeSection('Custom', { checkable: true, checked: false, accent: '#D8C3A5' });
right.appendChild(customSec.wrap);
makeCollapsibleSection(customSec, false);

var customTitleValue = 'Please Add Your Custom:';
var customLayoutMode = 'full';
var customPosition = 'top';

var customTitleScaleCtrl = createRangeControl('Cỡ chữ Tiêu đề', 1.0, 0.7, 1.8, 0.05);
customTitleScaleCtrl.wrap.style.marginTop = '10px';
customSec.body.appendChild(customTitleScaleCtrl.wrap);
customTitleScaleCtrl.input.style.cssText = 'width:100%;accent-color:#2563EB;cursor:pointer;display:block;position:relative;z-index:2;height:20px;';

var customBodyScaleCtrl = createRangeControl('Cỡ chữ nội dung', 1.0, 0.7, 1.8, 0.05);
customBodyScaleCtrl.wrap.style.marginTop = '8px';
customSec.body.appendChild(customBodyScaleCtrl.wrap);
customBodyScaleCtrl.input.style.cssText = 'width:100%;accent-color:#2563EB;cursor:pointer;display:block;position:relative;z-index:2;height:20px;';

var customArea = document.createElement('textarea');
customArea.placeholder = 'Nhập nội dung custom...';
customArea.style.cssText = 'width:100%;min-height:86px;resize:vertical;padding:12px 14px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;color:#111827;font-size:13px;line-height:1.5;outline:none;box-sizing:border-box;margin-top:10px;';
customSec.body.appendChild(customArea);

var customMeta = document.createElement('div');
customMeta.style.cssText = 'margin-top:8px;display:flex;justify-content:flex-end;gap:12px;align-items:center;font-size:12px;font-weight:500;line-height:1.45;color:#64748B;';
var customCount = document.createElement('div');
customCount.style.cssText = 'font-size:11px;font-weight:700;line-height:1.15;';
customMeta.appendChild(customCount);
customSec.body.appendChild(customMeta);

var customModeField = createField('Kiểu khung Custom');
customModeField.field.style.marginTop = '10px';
var customModeButtons = createOptionButtons([], function() { return customLayoutMode; }, function(next) {
  customLayoutMode = next;
  ensureCustomLayoutRules();
  schedulePreview();
});
customModeField.field.appendChild(customModeButtons.wrap);
customSec.body.appendChild(customModeField.field);

var customPosField = createField('Vị trí khung Custom');
customPosField.field.style.marginTop = '10px';
var customPosButtons = createOptionButtons([], function() { return customPosition; }, function(next) {
  customPosition = next;
  schedulePreview();
});
customPosField.field.appendChild(customPosButtons.wrap);
customSec.body.appendChild(customPosField.field);

function rebuildOptionButtonSet(hostWrap, spec, getValue, onChange) {
  hostWrap.innerHTML = '';
  var nextSet = createOptionButtons(spec, getValue, onChange);
  hostWrap.style.gridTemplateColumns = nextSet.wrap.style.gridTemplateColumns;
  hostWrap.style.display = nextSet.wrap.style.display;
  hostWrap.style.gap = nextSet.wrap.style.gap;
  while (nextSet.wrap.firstChild) hostWrap.appendChild(nextSet.wrap.firstChild);
  hostWrap.__sync = nextSet.sync;
}

function ensureCustomLayoutRules() {
  if (groupCols === 1) {
    customLayoutMode = 'full';
    if (customPosition !== 'top' && customPosition !== 'bottom') customPosition = 'top';
    rebuildOptionButtonSet(customModeButtons.wrap, [
      { label: 'Rộng theo ảnh', value: 'full' }
    ], function() { return customLayoutMode; }, function(next) {
      customLayoutMode = next;
      schedulePreview();
    });
    rebuildOptionButtonSet(customPosButtons.wrap, [
      { label: 'Trên', value: 'top' },
      { label: 'Dưới', value: 'bottom' }
    ], function() { return customPosition; }, function(next) {
      customPosition = next;
      schedulePreview();
    });
  } else {
    if (customLayoutMode !== 'full' && customLayoutMode !== 'column') customLayoutMode = 'full';
    if (customLayoutMode === 'full') {
      if (customPosition !== 'top' && customPosition !== 'bottom') customPosition = 'top';
    } else if (customPosition !== 'left' && customPosition !== 'right') {
      customPosition = 'left';
    }

    rebuildOptionButtonSet(customModeButtons.wrap, [
      { label: 'Rộng theo ảnh', value: 'full' },
      { label: 'Rộng 1 cột', value: 'column' }
    ], function() { return customLayoutMode; }, function(next) {
      customLayoutMode = next;
      ensureCustomLayoutRules();
      schedulePreview();
    });

    rebuildOptionButtonSet(customPosButtons.wrap, customLayoutMode === 'full' ? [
      { label: 'Trên', value: 'top' },
      { label: 'Dưới', value: 'bottom' }
    ] : [
      { label: 'Cột trái', value: 'left' },
      { label: 'Cột phải', value: 'right' }
    ], function() { return customPosition; }, function(next) {
      customPosition = next;
      schedulePreview();
    });
  }

  if (customModeButtons.wrap.__sync) customModeButtons.wrap.__sync();
  if (customPosButtons.wrap.__sync) customPosButtons.wrap.__sync();
}

customArea.addEventListener('input', function() {
  customTitleValue = deriveCustomTitleAndBody(customArea.value).title;
  updateCustomCounter();
  schedulePreview();
});
[customTitleScaleCtrl.input, customBodyScaleCtrl.input].forEach(function(input) {
  input.addEventListener('input', schedulePreview);
  input.addEventListener('change', schedulePreview);
});

ensureCustomLayoutRules();
      right.appendChild(selectSec.wrap);
      renderGroupLayoutUI();

      var RENDER_PRESET_STORAGE_KEY = 'stsClipartRenderPresets';
      var RENDER_EXPORT_COUNTER_KEY = 'stsClipartRenderExportCount';
      var renderPresets = [];
      var renderExportCount = 0;
      var renderFileNameTouched = false;

      var footer = document.createElement('div');
      footer.style.cssText = 'padding:12px 18px;border-top:1px solid #E5E7EB;background:#FAFAFB;display:grid;grid-template-rows:auto auto;row-gap:8px;flex:0 0 auto;';

      var footerRow1 = document.createElement('div');
      footerRow1.style.cssText = 'display:grid;grid-template-columns:108px minmax(0,1.15fr) minmax(0,1fr) 78px 78px;gap:8px;align-items:center;';
      footer.appendChild(footerRow1);

      var presetLabel = document.createElement('div');
      presetLabel.textContent = 'Preset Render';
      presetLabel.style.cssText = 'height:40px;padding:0 14px;border:1px solid #E5E7EB;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:600;line-height:1.25;display:flex;align-items:center;justify-content:center;white-space:nowrap;box-sizing:border-box;';
      footerRow1.appendChild(presetLabel);

      var presetSelect = document.createElement('select');
      presetSelect.style.cssText = 'width:100%;min-width:0;height:40px;padding:0 12px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:500;line-height:1.35;outline:none;box-sizing:border-box;';
      footerRow1.appendChild(presetSelect);

      var presetNameInput = document.createElement('input');
      presetNameInput.type = 'text';
      presetNameInput.maxLength = 60;
      presetNameInput.placeholder = 'Tên preset';
      presetNameInput.style.cssText = 'width:100%;min-width:0;height:40px;padding:0 12px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:500;line-height:1.35;outline:none;box-sizing:border-box;';
      footerRow1.appendChild(presetNameInput);

      var savePresetBtn = document.createElement('button');
      savePresetBtn.type = 'button';
      savePresetBtn.textContent = 'Lưu';
      savePresetBtn.style.cssText = 'width:78px;height:40px;padding:0 12px;border-radius:10px;border:1px solid #BFE1CB;background:#EEF2FF;color:#2563EB;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;white-space:nowrap;box-sizing:border-box;';
      footerRow1.appendChild(savePresetBtn);

      var deletePresetBtn = document.createElement('button');
      deletePresetBtn.type = 'button';
      deletePresetBtn.textContent = 'Xóa';
      deletePresetBtn.style.cssText = 'width:78px;height:40px;padding:0 12px;border-radius:10px;border:1px solid #FECACA;background:#FEF2F2;color:#DC2626;font-size:13px;font-weight:600;line-height:1.25;cursor:pointer;white-space:nowrap;box-sizing:border-box;';
      footerRow1.appendChild(deletePresetBtn);

      var footerRow2 = document.createElement('div');
      footerRow2.style.cssText = 'display:grid;grid-template-columns:112px minmax(0,1fr) 230px;gap:8px;align-items:center;';
      footer.appendChild(footerRow2);

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Đóng';
      cancelBtn.style.cssText = 'width:112px;height:40px;padding:0 18px;border-radius:10px;border:1px solid #E2E8F0;background:#fff;color:#374151;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;box-sizing:border-box;';
      footerRow2.appendChild(cancelBtn);

      var fileNameInput = document.createElement('input');
      fileNameInput.type = 'text';
      fileNameInput.maxLength = 100;
      fileNameInput.placeholder = 'Tên file PNG';
      fileNameInput.style.cssText = 'width:100%;min-width:0;height:40px;padding:0 14px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#111827;font-size:13px;font-weight:500;line-height:1.35;outline:none;box-sizing:border-box;';
      footerRow2.appendChild(fileNameInput);

      var genBtn = document.createElement('button');
      genBtn.type = 'button';
      genBtn.textContent = 'Tải PNG';
      genBtn.style.cssText = 'width:230px;height:40px;padding:0 22px;border-radius:10px;border:none;background:#2F7D57;color:#fff;font-size:13px;font-weight:700;line-height:1.25;cursor:pointer;box-shadow:0 10px 24px rgba(74,124,89,0.22);white-space:nowrap;box-sizing:border-box;';
      footerRow2.appendChild(genBtn);

      var presetHint = document.createElement('div');
      presetHint.style.display = 'none';

      fileNameInput.value = 'STS Clipart Pro 1';
      fileNameInput.addEventListener('input', function() {
        renderFileNameTouched = true;
      });

      function syncRenderFooterLayout() {
      }

      function closeRenderDialog() {
        renderSessionState = getRenderPresetSnapshot();
        window.removeEventListener('resize', syncRenderFooterLayout);
        document.removeEventListener('keydown', onRenderDialogKeydown, true);
        dlg.remove();
      }

      cancelBtn.onclick = closeRenderDialog;
      box.appendChild(footer);

      dlg.appendChild(box);
      document.body.appendChild(dlg);
      syncRenderFooterLayout();
      window.addEventListener('resize', syncRenderFooterLayout);
      dlg.onclick = function(ev) {
        if (ev.target === dlg) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      };
      function onRenderDialogKeydown(ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          closeRenderDialog();
        }
      }
      document.addEventListener('keydown', onRenderDialogKeydown, true);

      function getSelectedCats() {
        normalizeGroupOrders();
        var renderCats = toggleStates
          .filter(function(state) { return state.selected; })
          .sort(function(a, b) {
            var colA = groupCols === 1 ? 0 : clamp(parseInt(a.column, 10) || 0, 0, 1);
            var colB = groupCols === 1 ? 0 : clamp(parseInt(b.column, 10) || 0, 0, 1);
            if (colA !== colB) return colA - colB;
            return (parseInt(a.orderInColumn, 10) || 0) - (parseInt(b.orderInColumn, 10) || 0) || a.idx - b.idx;
          })
          .map(function(state) {
            var cat = cats[state.idx];
            var cloned = JSON.parse(JSON.stringify(cat || {}));
            cloned.__layoutColumn = groupCols === 1 ? 0 : clamp(parseInt(state.column, 10) || 0, 0, 1);
            cloned.__layoutOrder = parseInt(state.orderInColumn, 10) || 0;
            if (!cloned || isStandaloneTitleCategory(cloned)) {
              if (cloned) {
                cloned.prefix = '';
                cloned.optionCount = Array.isArray(cloned.options) ? cloned.options.length : 0;
              }
              return cloned;
            }
            cloned.prefix = sanitizeGroupPrefix(cloned.prefix, sequentialPrefix(state.idx));
            if (Array.isArray(cloned.options)) {
              cloned.options = cloned.options
                .filter(function(opt) { return !!opt && !(opt && typeof opt === 'object' && opt._deleted === true); })
                .map(function(opt) { return normalizeClipartOption(Object.assign({}, opt || {})); });
              relabelCategoryOptions(cloned);
            } else {
              cloned.options = [];
              cloned.optionCount = 0;
            }
            return cloned;
          });

        return renderCats;
      }

      function getConfig() {
        var oneColItemCols = clamp(parseInt(mode1Fields.colInput.value, 10) || 6, 1, 20);
        var oneColItemRows = clamp(parseInt(mode1Fields.rowInput.value, 10) || 6, 1, 20);
        var twoColItemCols = clamp(parseInt(mode2Fields.colInput.value, 10) || 6, 1, 20);
        var twoColItemRows = clamp(parseInt(mode2Fields.rowInput.value, 10) || 6, 1, 20);

        mode1Fields.colInput.value = String(oneColItemCols);
        mode1Fields.rowInput.value = String(oneColItemRows);
        mode2Fields.colInput.value = String(twoColItemCols);
        mode2Fields.rowInput.value = String(twoColItemRows);

        return {
          outputSize: parseInt(sizeSelect.value, 10) || 2000,
          groupCols: clamp(groupCols, 1, 2),
          itemCols: groupCols === 1 ? oneColItemCols : twoColItemCols,
          itemRows: groupCols === 1 ? oneColItemRows : twoColItemRows,
          itemCols1: oneColItemCols,
          itemRows1: oneColItemRows,
          itemCols2: twoColItemCols,
          itemRows2: twoColItemRows,
          customTitleText: deriveCustomTitleAndBody(customArea.value).title,
          customTitleScale: clamp(parseFloat(customTitleScaleCtrl.input.value) || 1, 0.7, 1.8),
          customText: deriveCustomTitleAndBody(customArea.value).body,
          customBodyScale: clamp(parseFloat(customBodyScaleCtrl.input.value) || 1, 0.7, 1.8),
          includePreview: !!(previewSec.checkbox && previewSec.checkbox.checked),
          includeCustom: !!(customSec.checkbox && customSec.checkbox.checked),
          backgroundId: selectedBgId,
          bgImageBlur: clamp(parseFloat(bgBlurCtrl.input.value) || 0, 0, 24),
          itemScale: parseFloat(itemScaleCtrl.input.value) || 1,
          groupScale: parseFloat(groupScaleCtrl.input.value) || 1,
          itemBadgeScale: clamp(parseFloat(itemBadgeScaleCtrl.input.value) || 1, 0.7, 1.8),
          hAlign: hAlign,
          vAlign: vAlign,
          renderGroupBg: !!(groupBgToggle && groupBgToggle.checked),
          groupBgOpacity: Math.max(0.05, Math.min(0.3, parseFloat(groupBgOpacityCtrl.input.value) || 0.12)),
          itemBadgeColor: itemBadgeColorInput ? itemBadgeColorInput.value : '#FFFFFF',
          itemBadgeBg: itemBadgeBgInput ? itemBadgeBgInput.value : '#1E293B',
          itemBadgePos: itemBadgePos || 'tl',
          textGroupLayout: textGroupInlineToggle && textGroupInlineToggle.checked ? 'inline' : 'grid',
          customLayoutMode: customLayoutMode,
          customPosition: customPosition,
          margins: {
            top: clamp(parseInt(marginTopField.input.value, 10) || 0, 0, 400),
            right: clamp(parseInt(marginRightField.input.value, 10) || 0, 0, 400),
            bottom: clamp(parseInt(marginBottomField.input.value, 10) || 0, 0, 400),
            left: clamp(parseInt(marginLeftField.input.value, 10) || 0, 0, 400),
            linked: !!equalMarginToggle.checked
          },
          watermark: {
            enabled: !!watermarkState.enabled,
            preset: watermarkState.preset || 'soft-corner',
            type: watermarkState.type || 'logo',
            mode: watermarkState.mode || 'corner',
            text: String(watermarkState.text || 'STS CLIPART'),
            logoText: String(watermarkState.logoText || 'STS'),
            opacity: clamp(parseFloat(watermarkState.opacity) || 0.06, 0.02, 0.18),
            scale: clamp(parseFloat(watermarkState.scale) || 1, 0.6, 1.8),
            color: watermarkState.color || '#1F2937',
            position: watermarkState.position || 'bottom-right',
            offsetX: clamp(parseInt(watermarkState.offsetX, 10) || 0, -240, 240),
            offsetY: clamp(parseInt(watermarkState.offsetY, 10) || 0, -240, 240),
            rotation: clamp(parseInt(watermarkState.rotation, 10) || 0, -90, 90),
            tileSpacing: clamp(parseInt(watermarkState.tileSpacing, 10) || 280, 160, 480),
            exportOnly: watermarkState.exportOnly !== false,
            previewInPanel: !!watermarkState.previewInPanel
          }
        };
      }


      function getRenderPresetSnapshot() {
        normalizeGroupOrders();
        return {
          config: getConfig(),
          layout: {
            groupCols: clamp(parseInt(groupCols, 10) || 1, 1, 2),
            customExpanded: !!(customSec && typeof customSec.isExpanded === 'function' ? customSec.isExpanded() : false),
            toggleStates: toggleStates.map(function(state) {
              return {
                idx: state.idx,
                identity: state.identity || normalizeCatIdentity(cats[state.idx]),
                selected: !!state.selected,
                column: clamp(parseInt(state.column, 10) || 0, 0, 1),
                orderInColumn: Math.max(0, parseInt(state.orderInColumn, 10) || 0)
              };
            })
          }
        };
      }

      function normalizeRenderPresetName(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 60);
      }

      function readRenderPresets(callback) {
        try {
          chrome.storage.local.get([RENDER_PRESET_STORAGE_KEY], function(store) {
            if (chrome.runtime && chrome.runtime.lastError) {
              callback([]);
              return;
            }
            var list = Array.isArray(store && store[RENDER_PRESET_STORAGE_KEY]) ? store[RENDER_PRESET_STORAGE_KEY] : [];
            callback(list.filter(function(entry) {
              return !!normalizeRenderPresetName(entry && entry.name);
            }));
          });
        } catch (err) {
          callback([]);
        }
      }

      function writeRenderPresets(nextList, callback) {
        renderPresets = Array.isArray(nextList) ? nextList.slice() : [];
        try {
          chrome.storage.local.set({ [RENDER_PRESET_STORAGE_KEY]: renderPresets }, function() {
            if (typeof callback === 'function') callback();
          });
        } catch (err) {
          if (typeof callback === 'function') callback();
        }
      }

      function syncPresetUiState(selectedName) {
        var activeName = normalizeRenderPresetName(selectedName || presetSelect.value || '');
        presetSelect.innerHTML = '';
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = renderPresets.length ? 'Chọn preset đã lưu...' : 'Chưa có preset nào';
        presetSelect.appendChild(defaultOpt);

        renderPresets.forEach(function(entry) {
          var opt = document.createElement('option');
          opt.value = entry.name;
          opt.textContent = entry.name;
          if (entry.name === activeName) opt.selected = true;
          presetSelect.appendChild(opt);
        });

        if (activeName && renderPresets.some(function(entry) { return entry.name === activeName; })) {
          presetSelect.value = activeName;
        } else {
          presetSelect.value = '';
        }

        deletePresetBtn.disabled = !presetSelect.value;
        deletePresetBtn.style.opacity = deletePresetBtn.disabled ? '0.55' : '1';
        deletePresetBtn.style.cursor = deletePresetBtn.disabled ? 'not-allowed' : 'pointer';
        presetHint.textContent = renderPresets.length
          ? ('Đã lưu ' + renderPresets.length + ' preset trong Extension. Chọn preset để áp dụng.')
          : 'Chọn preset để áp dụng. Nhập tên rồi bấm Lưu để ghi nhớ setting của khung render trong Extension.';
      }


      function normalizeRenderFileBaseName(value) {
        return String(value == null ? '' : value)
          .replace(/[\\/:*?"<>|]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);
      }

      function buildDefaultRenderFileName(count) {
        return 'STS Clipart Pro ' + String(Math.max(1, (parseInt(count, 10) || 0) + 1));
      }

      function syncRenderFileName(force) {
        var nextName = buildDefaultRenderFileName(renderExportCount);
        if (force || !normalizeRenderFileBaseName(fileNameInput.value) || !renderFileNameTouched) {
          fileNameInput.value = nextName;
          renderFileNameTouched = false;
        }
      }

      function readRenderExportCount(callback) {
        try {
          chrome.storage.local.get([RENDER_EXPORT_COUNTER_KEY], function(store) {
            if (chrome.runtime && chrome.runtime.lastError) {
              callback(0);
              return;
            }
            callback(Math.max(0, parseInt(store && store[RENDER_EXPORT_COUNTER_KEY], 10) || 0));
          });
        } catch (err) {
          callback(0);
        }
      }

      function writeRenderExportCount(nextValue, callback) {
        renderExportCount = Math.max(0, parseInt(nextValue, 10) || 0);
        try {
          chrome.storage.local.set({ [RENDER_EXPORT_COUNTER_KEY]: renderExportCount }, function() {
            if (typeof callback === 'function') callback(renderExportCount);
          });
        } catch (err) {
          if (typeof callback === 'function') callback(renderExportCount);
        }
      }

      function syncRangeControlValue(ctrl, value, fallback) {
        if (!ctrl || !ctrl.input) return;
        var next = value;
        if (next == null || next === '') next = fallback;
        ctrl.input.value = String(next);
        if (typeof ctrl.sync === 'function') ctrl.sync();
      }

      function syncTextInputValue(input, value, fallback) {
        if (!input) return;
        var next = value;
        if (next == null) next = fallback;
        input.value = String(next == null ? '' : next);
      }

      function applyRenderPreset(preset) {
        if (!preset || typeof preset !== 'object') return;
        var snapshot = preset.config || {};
        var layout = preset.layout || {};
        var oneColItemCols = clamp(parseInt(snapshot.itemCols1, 10) || 6, 1, 20);
        var oneColItemRows = clamp(parseInt(snapshot.itemRows1, 10) || 6, 1, 20);
        var twoColItemCols = clamp(parseInt(snapshot.itemCols2, 10) || 6, 1, 20);
        var twoColItemRows = clamp(parseInt(snapshot.itemRows2, 10) || 6, 1, 20);

        sizeSelect.value = String(parseInt(snapshot.outputSize, 10) || 2000);
        mode1Fields.colInput.value = String(oneColItemCols);
        mode1Fields.rowInput.value = String(oneColItemRows);
        mode2Fields.colInput.value = String(twoColItemCols);
        mode2Fields.rowInput.value = String(twoColItemRows);

        customTitleValue = String(snapshot.customTitleText || 'Please Add Your Custom:').trim() || 'Please Add Your Custom:';
        syncRangeControlValue(customTitleScaleCtrl, clamp(parseFloat(snapshot.customTitleScale) || 1, 0.7, 1.8), 1);
        syncTextInputValue(customArea, [customTitleValue, snapshot.customText || ''].filter(function(part) { return String(part || '').trim(); }).join('\n'), '');
        syncRangeControlValue(customBodyScaleCtrl, clamp(parseFloat(snapshot.customBodyScale) || 1, 0.7, 1.8), 1);

        if (previewSec.checkbox) {
          previewSec.checkbox.checked = snapshot.includePreview !== false;
          if (typeof previewSec.checkbox.syncUI === 'function') previewSec.checkbox.syncUI();
        }
        if (customSec.checkbox) {
          customSec.checkbox.checked = snapshot.includeCustom !== false;
          if (typeof customSec.checkbox.syncUI === 'function') customSec.checkbox.syncUI();
        }

        if (bgChoices.some(function(choice) { return choice.id === snapshot.backgroundId; })) {
          selectedBgId = snapshot.backgroundId;
        }
        refreshBgButtons();
        syncRangeControlValue(bgBlurCtrl, clamp(parseFloat(snapshot.bgImageBlur) || 0, 0, 24), 0);

        syncRangeControlValue(itemScaleCtrl, clamp(parseFloat(snapshot.itemScale) || 1, 0.7, 1.6), 1);
        syncRangeControlValue(groupScaleCtrl, clamp(parseFloat(snapshot.groupScale) || 1, 0.7, 1.5), 1);
        syncRangeControlValue(itemBadgeScaleCtrl, clamp(parseFloat(snapshot.itemBadgeScale) || 1, 0.7, 1.8), 1);

        hAlign = ['left', 'center', 'right'].indexOf(snapshot.hAlign) >= 0 ? snapshot.hAlign : 'center';
        vAlign = ['top', 'middle', 'bottom'].indexOf(snapshot.vAlign) >= 0 ? snapshot.vAlign : 'top';
        if (typeof hAlignButtons.sync === 'function') hAlignButtons.sync();
        if (typeof vAlignButtons.sync === 'function') vAlignButtons.sync();

        if (groupBgToggle) {
          groupBgToggle.checked = snapshot.renderGroupBg !== false;
          if (typeof groupBgToggle.syncUI === 'function') groupBgToggle.syncUI();
        }
        syncRangeControlValue(groupBgOpacityCtrl, clamp(parseFloat(snapshot.groupBgOpacity) || 0.12, 0.05, 0.3), 0.12);

        if (itemBadgeColorInput && /^#[0-9a-f]{6}$/i.test(snapshot.itemBadgeColor || '')) itemBadgeColorInput.value = snapshot.itemBadgeColor;
        if (itemBadgeBgInput && /^#[0-9a-f]{6}$/i.test(snapshot.itemBadgeBg || '')) itemBadgeBgInput.value = snapshot.itemBadgeBg;
        itemBadgePos = ['tl', 'tr', 'bl', 'bc', 'br'].indexOf(snapshot.itemBadgePos) >= 0 ? snapshot.itemBadgePos : 'tl';
        if (typeof badgePosButtons.sync === 'function') badgePosButtons.sync();

        if (textGroupInlineToggle) {
          textGroupInlineToggle.checked = snapshot.textGroupLayout !== 'grid';
          if (typeof textGroupInlineToggle.syncUI === 'function') textGroupInlineToggle.syncUI();
        }

        customLayoutMode = snapshot.customLayoutMode === 'column' ? 'column' : 'full';
        customPosition = String(snapshot.customPosition || 'top');
        groupCols = clamp(parseInt(layout.groupCols, 10) || parseInt(snapshot.groupCols, 10) || 2, 1, 2);

        var margins = snapshot.margins || {};
        if (equalMarginToggle) {
          equalMarginToggle.checked = !!margins.linked;
          if (typeof equalMarginToggle.syncUI === 'function') equalMarginToggle.syncUI();
        }
        syncTextInputValue(marginTopField.input, clamp(parseInt(margins.top, 10) || 0, 0, 400), 0);
        syncTextInputValue(marginRightField.input, clamp(parseInt(margins.right, 10) || 0, 0, 400), 0);
        syncTextInputValue(marginBottomField.input, clamp(parseInt(margins.bottom, 10) || 0, 0, 400), 0);
        syncTextInputValue(marginLeftField.input, clamp(parseInt(margins.left, 10) || 0, 0, 400), 0);

        var savedStates = Array.isArray(layout.toggleStates) ? layout.toggleStates : [];
        var savedByIdx = Object.create(null);
        var savedByIdentity = Object.create(null);
        savedStates.forEach(function(entry) {
          savedByIdx[parseInt(entry && entry.idx, 10)] = entry;
          if (entry && entry.identity) savedByIdentity[String(entry.identity)] = entry;
        });
        toggleStates.forEach(function(state, idx) {
          var saved = savedByIdentity[state.identity] || savedByIdx[idx];
          if (!saved) return;
          state.selected = saved.selected !== false;
          state.column = groupCols === 1 ? 0 : clamp(parseInt(saved.column, 10) || 0, 0, 1);
          state.orderInColumn = Math.max(0, parseInt(saved.orderInColumn, 10) || 0);
        });
        if (layout.customExpanded && customSec && customSec.collapseBtn && customSec.body.style.display === 'none') customSec.collapseBtn.click();

        watermarkState = Object.assign({}, watermarkState, snapshot.watermark || {});
        normalizeWatermarkState();
        syncWatermarkUI();

        refreshModeFieldVisuals();
        ensureCustomLayoutRules();
        normalizeGroupOrders();
        renderGroupLayoutUI();
        updateCustomCounter();
        schedulePreview();
      }

      function loadRenderPresets(selectedName) {
        readRenderPresets(function(list) {
          renderPresets = list.slice();
          syncPresetUiState(selectedName);
        });
      }

      presetSelect.onchange = function() {
        var selectedName = normalizeRenderPresetName(presetSelect.value);
        var match = renderPresets.find(function(entry) { return entry.name === selectedName; });
        presetNameInput.value = selectedName;
        syncPresetUiState(selectedName);
        if (!match) return;
        applyRenderPreset(match);
        clipNotify('Đã áp dụng preset: ' + match.name, 'success');
      };

      savePresetBtn.onclick = function() {
        var presetName = normalizeRenderPresetName(presetNameInput.value || presetSelect.value);
        if (!presetName) {
          clipNotify('Vui lòng nhập tên preset', 'error');
          presetNameInput.focus();
          return;
        }

        var snapshot = getRenderPresetSnapshot();
        var nextPreset = {
          name: presetName,
          savedAt: new Date().toISOString(),
          config: snapshot.config,
          layout: snapshot.layout
        };

        var nextList = renderPresets.slice();
        var existingIndex = nextList.findIndex(function(entry) { return entry.name === presetName; });
        var updated = existingIndex >= 0;
        if (updated) nextList.splice(existingIndex, 1, nextPreset);
        else nextList.unshift(nextPreset);

        writeRenderPresets(nextList, function() {
          syncPresetUiState(presetName);
          presetNameInput.value = presetName;
          clipNotify(updated ? ('Đã cập nhật preset: ' + presetName) : ('Đã lưu preset: ' + presetName), 'success');
        });
      };

      deletePresetBtn.onclick = function() {
        var presetName = normalizeRenderPresetName(presetSelect.value || presetNameInput.value);
        if (!presetName) {
          clipNotify('Hãy chọn preset cần xóa', 'error');
          return;
        }
        var nextList = renderPresets.filter(function(entry) { return entry.name !== presetName; });
        if (nextList.length === renderPresets.length) {
          clipNotify('Không tìm thấy preset để xóa', 'error');
          return;
        }
        writeRenderPresets(nextList, function() {
          presetNameInput.value = '';
          syncPresetUiState('');
          clipNotify('Đã xóa preset: ' + presetName, 'success');
        });
      };

      function updateCustomCounter() {
        var len = (customArea.value || '').length;
        customCount.textContent = len + '/256';
        var over = len > 256;
        customCount.style.color = over ? '#DC2626' : '#0F172A';
        customArea.style.borderColor = over ? '#FCA5A5' : '#BDD4C4';
        customArea.style.background = over ? '#FEF2F2' : '#fff';
      }

      var imageCache = Object.create(null);
      var previewTimer = null;

      function fetchImageAsDataUrlForRender(src) {
        return new Promise(function(resolve) {
          if (!src || /^data:/i.test(String(src))) { resolve(src || null); return; }
          try {
            if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') { resolve(null); return; }
            chrome.runtime.sendMessage({ type: 'FETCH_AS_DATAURL', url: src }, function(res) {
              if (chrome.runtime.lastError || !res || !res.ok || !res.dataUrl) { resolve(null); return; }
              resolve(res.dataUrl);
            });
          } catch (e) { resolve(null); }
        });
      }

      function loadRenderImage(src, cacheKey) {
        cacheKey = cacheKey || src;
        if (!src || imageCache[cacheKey]) return;
        imageCache[cacheKey] = { state: 'loading', img: null };

        function finishWithImage(imageSrc, allowAnonymous, triedFallback) {
          try {
            var img = new Image();
            if (allowAnonymous) img.crossOrigin = 'anonymous';
            img.onload = function() {
              imageCache[cacheKey] = { state: 'done', img: img };
              schedulePreview();
            };
            img.onerror = function() {
              if (!triedFallback && allowAnonymous) {
                // Some GeckoCustom swatches come from CSS --sl-image URLs on S3/CDN.
                // They may render in the page but fail when loaded with crossOrigin.
                // Try again without crossOrigin so the preview does not degrade to ITEM.
                finishWithImage(src, false, true);
                return;
              }
              imageCache[cacheKey] = { state: 'error', img: null };
              schedulePreview();
            };
            img.src = imageSrc;
          } catch (err) {
            imageCache[cacheKey] = { state: 'error', img: null };
            schedulePreview();
          }
        }

        // Prefer a data URL fetched by the extension background so canvas export remains clean.
        fetchImageAsDataUrlForRender(src).then(function(dataUrl) {
          if (dataUrl) finishWithImage(dataUrl, false, true);
          else finishWithImage(src, true, false);
        });
      }

      function ensureImagesLoaded() {
        cats.forEach(function(cat) {
          getRenderableOptions(cat).forEach(function(opt) {
            var src = opt && (opt.capturedImage || opt.imageUrl);
            loadRenderImage(src, src);
          });
        });
        bgChoices.forEach(function(choice) {
          if (choice.type !== 'image' || !choice.src) return;
          loadRenderImage(choice.src, choice.src);
        });
      }

      function drawRoundRect(ctx, x, y, w, h, r) {
        var radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
      }

      function draw3DCard(ctx, x, y, w, h, opts) {
        var radius = opts.radius || 16;
        ctx.save();
        ctx.shadowColor = opts.shadowColor || 'rgba(15,23,42,0.12)';
        ctx.shadowBlur = opts.shadowBlur || 24;
        ctx.shadowOffsetY = opts.shadowOffsetY || 10;
        drawRoundRect(ctx, x, y, w, h, radius);
        ctx.fillStyle = opts.fill || '#FFFFFF';
        ctx.fill();
        ctx.restore();

        ctx.save();
        drawRoundRect(ctx, x, y, w, h, radius);
        ctx.strokeStyle = opts.border || '#DDE3EA';
        ctx.lineWidth = opts.borderWidth || 1.2;
        ctx.stroke();

        var grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, opts.highlightTop || 'rgba(255,255,255,0.88)');
        grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        drawRoundRect(ctx, x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h * 0.48), Math.max(4, radius - 2));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      function wrapLines(ctx, text, maxWidth, maxLines) {
        var clean = (text || '').replace(/\s+/g, ' ').trim();
        if (!clean) return [];
        var words = clean.split(' ');
        var lines = [];
        var current = '';
        words.forEach(function(word) {
          var test = current ? (current + ' ' + word) : word;
          if (ctx.measureText(test).width <= maxWidth || !current) current = test;
          else {
            lines.push(current);
            current = word;
          }
        });
        if (current) lines.push(current);
        if (maxLines && lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          var last = lines[lines.length - 1];
          while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
          lines[lines.length - 1] = (last || '').replace(/[.,\-:; ]+$/, '') + '…';
        }
        return lines;
      }

      function wrapMultilineLines(ctx, text, maxWidth, maxLines) {
        var raw = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
        if (!raw.trim()) return [];
        var paragraphs = raw.split('\n');
        var lines = [];

        function pushWrappedParagraph(paragraph) {
          var clean = String(paragraph || '').replace(/[\t\f\v ]+/g, ' ').trim();
          if (!clean) {
            lines.push('');
            return;
          }
          var words = clean.split(' ');
          var current = '';
          words.forEach(function(word) {
            var test = current ? (current + ' ' + word) : word;
            if (ctx.measureText(test).width <= maxWidth || !current) current = test;
            else {
              lines.push(current);
              current = word;
            }
          });
          if (current) lines.push(current);
        }

        paragraphs.forEach(function(paragraph, idx) {
          pushWrappedParagraph(paragraph);
          if (idx < paragraphs.length - 1 && String(paragraph).trim() && !String(paragraphs[idx + 1] || '').trim()) {
            // keep explicit blank separator line between paragraphs
          }
        });

        while (lines.length && !String(lines[0] || '').trim()) lines.shift();
        while (lines.length && !String(lines[lines.length - 1] || '').trim()) lines.pop();

        if (maxLines && lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          var lastIdx = lines.length - 1;
          var last = lines[lastIdx];
          if (!String(last || '').trim()) {
            lines[lastIdx] = '…';
          } else {
            while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
            lines[lastIdx] = (last || '').replace(/[.,\-:; ]+$/, '') + '…';
          }
        }
        return lines;
      }

      function stripItemCodeLabel(text) {
        var clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!clean) return '';
        clean = clean.replace(/^(?:[A-Z]{1,3}\d{1,3})(?:\s*[-:|.]\s*|\s+)/, '');
        clean = clean.replace(/(?:\s+|\s*[-:|.]\s*)(?:[A-Z]{1,3}\d{1,3})$/, '');
        clean = clean.replace(/\b([A-Z]{1,3}\d{1,3})\b/g, function(match) {
          return /^[A-Z]{1,3}\d{1,3}$/.test(match) ? '' : match;
        });
        return clean.replace(/\s{2,}/g, ' ').trim();
      }

      function looksLikeNoisyImageCaption(text) {
        var raw = String(text || '').replace(/\s+/g, ' ').trim();
        if (!raw) return false;
        var lower = raw.toLowerCase();
        if (/^(option|item)\s*\d+$/i.test(raw)) return true;
        if (/https?:\/\/|imagekit|storage\/|thumbnail\/|personalizeddesign|\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(raw)) return true;
        if (raw.length > 18 && /[_\-]/.test(raw) && /\d/.test(raw)) return true;
        if (raw.length > 22 && !/\s/.test(raw) && /[a-z]/i.test(raw) && /\d/.test(raw)) return true;
        if (/frisur|adobestock|shutterstock|istock|depositphotos|mockup|preview/i.test(raw) && /[_\-\d]/.test(raw)) return true;
        return false;
      }

      function pickCaption(opt) {
        // Chuẩn hóa 2 tình huống:
        // 1) Item Grid có ảnh/màu: KHÔNG lấy alt/title/text/filename làm caption dưới thumbnail.
        // 2) Item dạng Text thật: vẫn lấy text để render trong ô text.
        if (!opt) return '';

        // Text item do tool tạo/thêm thủ công luôn được phép hiển thị text.
        var isManualTextItem = !!(opt && opt.kind === 'text-item');

        // Nếu option có ảnh hoặc màu nền thì xem là visual/grid item, không render caption phụ.
        // Điều này chặn các chuỗi rác như filename, alt, số thứ tự, quote text bị dính dưới ảnh.
        if (!isManualTextItem && (opt.capturedImage || opt.imageUrl || opt.bgColor)) return '';

        var candidates = [
          opt.textContent,
          opt.name,
          opt.title,
          opt.text,
          opt.value
        ];

        var text = '';
        for (var i = 0; i < candidates.length; i++) {
          var v = String(candidates[i] == null ? '' : candidates[i]).replace(/\s+/g, ' ').trim();
          if (v) { text = v; break; }
        }

        text = stripItemCodeLabel(text);
        if (!text) return '';
        if (/^(?:option|item|select|choose)$/i.test(text)) return '';
        if (looksLikeNoisyImageCaption(text)) return '';
        return text;
      }

      function drawItemCodeBadge(ctx, opt, itemX, itemY, cellW, cellH, styles, config) {
        var code = (opt && opt.label ? String(opt.label) : '').replace(/\s+/g, ' ').trim();
        if (!code) return;
        ctx.save();
        var badgeScale = Math.max(0.7, Math.min(1.8, parseFloat(config && config.itemBadgeScale) || 1));
        var badgeFont = Math.max(10, Math.round(styles.itemSubFs * badgeScale));
        ctx.font = '800 ' + badgeFont + 'px sans-serif';
        var badgeW = Math.max(Math.round(30 * badgeScale), Math.round(ctx.measureText(code).width + 14 * badgeScale));
        var badgeH = Math.max(Math.round(20 * badgeScale), Math.round(styles.itemSubFs * 1.75 * badgeScale));
        var pos = (config && config.itemBadgePos) || 'tl';
        var pad = Math.max(6, Math.round(8 * badgeScale));
        var badgeX = itemX + pad;
        var badgeY = itemY + pad;
        if (pos === 'tr' || pos === 'br') badgeX = itemX + cellW - badgeW - pad;
        if (pos === 'bl' || pos === 'br' || pos === 'bc') badgeY = itemY + cellH - badgeH - pad;
        if (pos === 'bc') badgeX = itemX + (cellW - badgeW) / 2;
        var bg = (config && config.itemBadgeBg) || '#1E293B';
        draw3DCard(ctx, badgeX, badgeY, badgeW, badgeH, {
          radius: Math.round(badgeH / 2),
          fill: bg,
          border: hexToRgba(bg, 0.92),
          shadowBlur: 8,
          shadowOffsetY: 3,
          highlightTop: 'rgba(255,255,255,0.16)'
        });
        ctx.fillStyle = (config && config.itemBadgeColor) || '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
        ctx.restore();
      }

      function isRenderableTextGroup(cat) {
        var options = getRenderableOptions(cat);
        return !!options.length && options.every(function(opt) {
          return !opt.capturedImage && !opt.bgColor && !!pickCaption(opt);
        });
      }

      function shouldRenderTextGroupInline(cat, config) {
        if (!config || config.textGroupLayout !== 'inline') return false;
        if (!cat || cat.kind === 'text-frame' || isStandaloneTitleCategory(cat)) return false;
        return isRenderableTextGroup(cat);
      }

      function drawInlineTextGroupRow(ctx, opt, itemX, itemY, itemW, itemH, styles, config) {
        var textStyle = opt.textStyle || {};
        var code = (opt && opt.label ? String(opt.label) : '').replace(/\s+/g, ' ').trim();
        var badgeScale = Math.max(0.7, Math.min(1.8, parseFloat(config && config.itemBadgeScale) || 1));
        var badgeFont = Math.max(10, Math.round(styles.itemSubFs * badgeScale));
        var badgePadX = Math.max(8, Math.round(12 * badgeScale));
        var badgeGap = Math.max(8, Math.round(10 * badgeScale));
        var bg = (config && config.itemBadgeBg) || '#1E293B';
        var fg = (config && config.itemBadgeColor) || '#FFFFFF';
        var textPad = Math.max(14, Math.round(styles.surfacePad * 1.05));
        var badgeW = 0;
        var badgeH = 0;

        if (code) {
          ctx.font = '800 ' + badgeFont + 'px sans-serif';
          badgeW = Math.max(Math.round(30 * badgeScale), Math.round(ctx.measureText(code).width + badgePadX * 2));
          badgeH = Math.max(Math.round(20 * badgeScale), Math.round(styles.itemSubFs * 1.75 * badgeScale));
          var badgeX = itemX + textPad;
          var badgeY = itemY + (itemH - badgeH) / 2;
          draw3DCard(ctx, badgeX, badgeY, badgeW, badgeH, {
            radius: Math.round(badgeH / 2),
            fill: bg,
            border: hexToRgba(bg, 0.92),
            shadowBlur: 8,
            shadowOffsetY: 3,
            highlightTop: 'rgba(255,255,255,0.16)'
          });
          ctx.fillStyle = fg;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(code, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);
        }

        var bodyX = itemX + textPad + (badgeW ? badgeW + badgeGap : 0);
        var bodyW = Math.max(40, itemW - (bodyX - itemX) - textPad);
        ctx.fillStyle = textStyle.color || '#111827';
        ctx.font = '700 ' + styles.itemTextFs + 'px sans-serif';
        ctx.textAlign = (textStyle.align === 'center' || textStyle.align === 'right') ? textStyle.align : 'left';
        ctx.textBaseline = 'middle';
        var anchorX = textStyle.align === 'right' ? (bodyX + bodyW) : textStyle.align === 'center' ? (bodyX + bodyW / 2) : bodyX;
        var rowLines = wrapMultilineLines(ctx, String(pickCaption(opt) || ''), bodyW, 8);
        var rowLineH = Math.round(styles.itemTextFs * 1.42);
        var totalTextH = Math.max(rowLineH, rowLines.length * rowLineH);
        var textStartY = itemY + itemH / 2 - totalTextH / 2 + rowLineH / 2;
        rowLines.forEach(function(line, li) {
          ctx.fillText(line, anchorX, textStartY + li * rowLineH);
        });
      }

      function makeStyles(size, config) {
        var groupScale = config.groupScale || 1;
        var itemScale = config.itemScale || 1;
        return {
          canvasPad: 30,
          columnGap: 10,
          groupGap: Math.max(12, Math.round(size * 0.014 * groupScale)),
          surfacePad: Math.max(10, Math.round(size * 0.012 * groupScale)),
          titleH: Math.max(40, Math.round(size * 0.042 * groupScale)),
          titleFs: Math.max(16, Math.round(size * 0.0185 * groupScale)),
          countFs: Math.max(12, Math.round(size * 0.0125 * groupScale)),
          bannerFs: Math.max(14, Math.round(size * 0.014 * groupScale)),
          customTitleFs: Math.max(14, Math.round(size * 0.015 * groupScale * (config.customTitleScale || 1))),
          customFs: Math.max(13, Math.round(size * 0.014 * groupScale * (config.customBodyScale || 1))),
          itemTextFs: Math.max(11, Math.round(size * 0.0125 * itemScale)),
          itemSubFs: Math.max(10, Math.round(size * 0.0108 * itemScale)),
          itemGap: Math.max(6, Math.round(size * 0.006 * itemScale)),
          radius: Math.max(12, Math.round(size * 0.015 * groupScale)),
          smallRadius: Math.max(10, Math.round(size * 0.011 * groupScale)),
          badgePadX: Math.max(8, Math.round(size * 0.007)),
          badgePadY: Math.max(5, Math.round(size * 0.004))
        };
      }

      function getGroupAccent(idx) {
        var accents = [
          ['#2F7D57', '#60A5FA'],
          ['#7C3AED', '#A78BFA'],
          ['#0F766E', '#2DD4BF'],
          ['#EA580C', '#FDBA74'],
          ['#DC2626', '#FCA5A5'],
          ['#0F766E', '#5EEAD4'],
          ['#2F7D57', '#818CF8'],
          ['#276A4A', '#93C5FD']
        ];
        return accents[idx % accents.length];
      }

      function createMeasureCanvas() {
        return document.createElement('canvas').getContext('2d');
      }


function measureGroupCard(ctx, cat, cardWidth, config, styles, forcedFullWidth) {
  var fullWidth = Math.max(1, forcedFullWidth || (config.groupCols === 1 ? cardWidth : (cardWidth * 2 + styles.columnGap)));
  var innerW = cardWidth - styles.surfacePad * 2;
  var headerBannerLines = [];
  var bannerH = 0;

  if (isStandaloneTitleCategory(cat)) {
    var tl = cat.titleLine || {};
    var titleFontSize = Math.max(18, Math.round(parseFloat(tl.fontSize) || 30));
    var titlePadX = clamp(Math.round(titleFontSize * 0.8), 18, 34);
    var titlePadY = clamp(Math.round(titleFontSize * 0.42), 10, 18);
    var titleInnerW = Math.max(80, fullWidth - titlePadX * 2);
    ctx.font = '900 ' + titleFontSize + 'px sans-serif';
    var titleLines = wrapMultilineLines(ctx, String(tl.text || ''), titleInnerW, 4);
    if (!titleLines.length) titleLines = [' '];
    var titleLineH = Math.round(titleFontSize * 1.16);
    var textH = titleLines.length * titleLineH;
    return {
      width: fullWidth,
      height: titlePadY * 2 + textH,
      cellW: titleInnerW,
      cellH: textH,
      usedRowW: titleInnerW,
      overflowX: 0,
      visualH: textH,
      captionH: 0,
      headerBannerLines: [],
      bannerH: 0,
      textOnly: true,
      captionPresent: false,
      rowsNeeded: 0,
      visibleRows: 0,
      visibleCount: 0,
      hiddenCount: 0,
      totalOptions: 0,
      isTextFrame: false,
      isTitleOnly: true,
      titleLineLines: titleLines,
      titleLineFontSize: titleFontSize,
      titleLineLineH: titleLineH,
      titleLinePadX: titlePadX,
      titleLinePadY: titlePadY
    };
  }

  if (cat.headerText && String(cat.headerText).trim()) {
          ctx.font = '800 ' + styles.bannerFs + 'px sans-serif';
          headerBannerLines = wrapLines(ctx, String(cat.headerText), innerW - styles.surfacePad * 1.4, 3);
          bannerH = headerBannerLines.length ? (headerBannerLines.length * Math.round(styles.bannerFs * 1.32) + styles.surfacePad * 1.1) : 0;
        }

        if (cat.kind === 'text-frame') {
          var tf = cat.textFrame || {};
          var boxPad = Math.max(14, Math.round(styles.surfacePad * 1.1));
          var fontSize = Math.max(12, Math.round(parseFloat(tf.fontSize) || styles.customFs));
          ctx.font = '700 ' + fontSize + 'px sans-serif';
          var textLines = wrapMultilineLines(ctx, String(tf.text || ''), innerW - boxPad * 2, 8);
          var lineH = Math.round(fontSize * 1.32);
          var textH = Math.max(lineH * 2, textLines.length * lineH);
          var bodyH = boxPad * 2 + textH;
          return {
            width: cardWidth,
            height: styles.titleH + styles.surfacePad * 2 + (bannerH ? bannerH + styles.itemGap : 0) + bodyH,
            cellW: innerW,
            cellH: bodyH,
            usedRowW: innerW,
            overflowX: 0,
            visualH: bodyH,
            captionH: 0,
            headerBannerLines: headerBannerLines,
            bannerH: bannerH,
            textOnly: true,
            captionPresent: false,
            rowsNeeded: 0,
            visibleRows: 0,
            visibleCount: 0,
            hiddenCount: 0,
            totalOptions: 0,
            isTextFrame: true,
            textFrameLines: textLines,
            textFrameFontSize: fontSize,
            textFrameLineH: lineH
          };
        }

        var itemCols = Math.max(1, config.itemCols);
        var maxRows = Math.max(1, config.itemRows);
        var options = getRenderableOptions(cat);
        var totalOptions = options.length;
        var textItemsOnly = totalOptions > 0 && options.every(function(opt) { return isTextItemOption(opt); });
        var inlineTextGroup = shouldRenderTextGroupInline(cat, config);

        if (inlineTextGroup) {
          var rowW = innerW;
          var rowPad = Math.max(14, Math.round(styles.surfacePad * 1.05));
          var rowLineH = Math.round(styles.itemTextFs * 1.42);
          ctx.font = '700 ' + styles.itemTextFs + 'px sans-serif';
          var rowHeights = options.map(function(opt) {
            var lines = wrapMultilineLines(ctx, String(opt.textContent || ''), rowW - rowPad * 2 - 18, 8);
            var lineCount = Math.max(1, lines.length);
            return Math.max(52, rowPad * 2 + lineCount * rowLineH);
          });
          var rowsNeeded = totalOptions;
          var visibleRows = Math.min(rowsNeeded, maxRows);
          var visibleCount = visibleRows;
          var hiddenCount = Math.max(0, totalOptions - visibleCount);
          var visibleHeights = rowHeights.slice(0, visibleRows);
          var contentH = totalOptions > 0 ? visibleHeights.reduce(function(sum, h) { return sum + h; }, 0) + Math.max(0, visibleRows - 1) * styles.itemGap : Math.max(42, Math.round(styles.surfacePad * 2.2));
          var height = styles.titleH + styles.surfacePad * 2 + (bannerH ? bannerH + styles.itemGap : 0) + contentH;
          return {
            width: cardWidth,
            height: height,
            cellW: rowW,
            cellH: visibleHeights[0] || Math.max(52, rowPad * 2 + rowLineH),
            usedRowW: rowW,
            overflowX: 0,
            visualH: 0,
            captionH: 0,
            headerBannerLines: headerBannerLines,
            bannerH: bannerH,
            textOnly: false,
            textItemsOnly: true,
            inlineTextGroup: true,
            captionPresent: false,
            rowsNeeded: rowsNeeded,
            visibleRows: visibleRows,
            visibleCount: visibleCount,
            hiddenCount: hiddenCount,
            totalOptions: totalOptions,
            isTextFrame: false,
            textItemRowHeights: rowHeights,
            textItemLineH: rowLineH,
            textItemPad: rowPad
          };
        }

        var baseCellW = Math.floor((innerW - (itemCols - 1) * styles.itemGap) / itemCols);
        var cellW = Math.max(26, Math.round(baseCellW * config.itemScale));
        var usedRowW = itemCols * cellW + Math.max(0, itemCols - 1) * styles.itemGap;
        var overflowX = Math.max(0, usedRowW - innerW);

        var textOnly = totalOptions > 0 && options.every(function(opt) {
          return !opt.capturedImage && !opt.bgColor && pickCaption(opt);
        });
        var captionPresent = options.some(function(opt) { return !!pickCaption(opt); });
        var visualH = textOnly ? Math.max(50, Math.round(cellW * 0.52)) : Math.max(64, Math.round(cellW * 0.82));
        var captionH = textOnly ? Math.round(styles.itemTextFs * 2.45) : (captionPresent ? Math.round(styles.itemSubFs * 2.75) : Math.round(styles.itemSubFs * 1.05));
        var cellH = visualH + captionH + 12;
        var rowsNeeded = totalOptions > 0 ? Math.ceil(totalOptions / itemCols) : 0;
        var visibleRows = totalOptions > 0 ? Math.min(rowsNeeded, maxRows) : 0;
        var visibleCount = totalOptions > 0 ? Math.min(totalOptions, itemCols * visibleRows) : 0;
        var hiddenCount = Math.max(0, totalOptions - visibleCount);
        var contentH = totalOptions > 0 ? (visibleRows * cellH + Math.max(0, visibleRows - 1) * styles.itemGap) : Math.max(42, Math.round(styles.surfacePad * 2.2));
        var height = styles.titleH + styles.surfacePad * 2 + (bannerH ? bannerH + styles.itemGap : 0) + contentH;

        return {
          width: cardWidth,
          height: height,
          cellW: cellW,
          cellH: cellH,
          usedRowW: usedRowW,
          overflowX: overflowX,
          visualH: visualH,
          captionH: captionH,
          headerBannerLines: headerBannerLines,
          bannerH: bannerH,
          textOnly: textOnly,
          textItemsOnly: false,
          captionPresent: captionPresent,
          rowsNeeded: rowsNeeded,
          visibleRows: visibleRows,
          visibleCount: visibleCount,
          hiddenCount: hiddenCount,
          totalOptions: totalOptions,
          isTextFrame: false,
          inlineTextGroup: false
        };
      }

      function measureCustomBlock(ctx, title, text, width, styles) {
        if (!text && !title) return { height: 0, lines: [], width: Math.max(140, width || 0), title: '' };
        var safeWidth = Math.max(180, width || 0);
        var resolvedTitle = String(title || 'Please Add Your Custom:').trim() || 'Please Add Your Custom:';
        ctx.font = '600 ' + styles.customFs + 'px sans-serif';
        var lines = wrapMultilineLines(ctx, text, safeWidth - styles.surfacePad * 2, 24);
        var longestLineWidth = 0;
        lines.forEach(function(line) {
          longestLineWidth = Math.max(longestLineWidth, ctx.measureText(String(line || ' ')).width);
        });
        ctx.font = '800 ' + styles.customTitleFs + 'px sans-serif';
        longestLineWidth = Math.max(longestLineWidth, ctx.measureText(resolvedTitle).width);
        var contentWidth = Math.max(180, Math.min(safeWidth, Math.ceil(longestLineWidth + styles.surfacePad * 2.2)));
        var lineH = Math.round(styles.customFs * 1.45);
        var headerH = styles.customTitleFs + Math.max(18, Math.round(styles.surfacePad * 0.9));
        var bodyH = Math.max(lineH * 1.2, Math.max(1, lines.length) * lineH);
        var h = Math.ceil(headerH + bodyH + styles.surfacePad * 1.8);
        return { height: h, lines: lines, lineH: lineH, width: contentWidth, title: resolvedTitle };
      }

      function getBackgroundChoice(config) {
        for (var i = 0; i < bgChoices.length; i++) {
          if (bgChoices[i].id === config.backgroundId) return bgChoices[i];
        }
        return bgChoices[0] || null;
      }

      function fillCoverImage(ctx, img, x, y, w, h) {
        if (!img || !img.width || !img.height) return;
        var scale = Math.max(w / img.width, h / img.height);
        var drawW = img.width * scale;
        var drawH = img.height * scale;
        var dx = x + (w - drawW) / 2;
        var dy = y + (h - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
      }

      function drawBackground(ctx, choice, x, y, w, h, styles, config) {
        ctx.save();
        drawRoundRect(ctx, x, y, w, h, Math.max(16, styles.radius));
        ctx.clip();

        if (choice && choice.type === 'image' && choice.src && imageCache[choice.src] && imageCache[choice.src].state === 'done') {
          var blurPx = Math.max(0, Math.min(24, parseFloat(config && config.bgImageBlur) || 0));
          if (blurPx > 0) {
            ctx.save();
            ctx.filter = 'blur(' + blurPx + 'px)';
            var bleed = blurPx * 2;
            fillCoverImage(ctx, imageCache[choice.src].img, x - bleed, y - bleed, w + bleed * 2, h + bleed * 2);
            ctx.restore();
          } else {
            fillCoverImage(ctx, imageCache[choice.src].img, x, y, w, h);
          }
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x, y, w, h);
        } else {
          var c1 = choice && choice.colors ? choice.colors[0] : '#F8FAFC';
          var c2 = choice && choice.colors ? choice.colors[1] : '#EAF6EF';
          var grad = ctx.createLinearGradient(x, y, x + w, y + h);
          grad.addColorStop(0, c1);
          grad.addColorStop(1, c2);
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, w, h);
        }

        ctx.restore();
      }

      function alignOffset(mode, available, used) {
        var free = Math.max(0, available - used);
        if (mode === 'right' || mode === 'bottom') return free;
        if (mode === 'center' || mode === 'middle') return free / 2;
        return 0;
      }


      function hexToRgb(hex) {
        var raw = String(hex || '').trim().replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(raw)) return { r: 31, g: 41, b: 55 };
        return {
          r: parseInt(raw.slice(0, 2), 16),
          g: parseInt(raw.slice(2, 4), 16),
          b: parseInt(raw.slice(4, 6), 16)
        };
      }

      function rgbaFromHex(hex, alpha) {
        var rgb = hexToRgb(hex);
        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + Math.max(0, Math.min(1, alpha)) + ')';
      }

      function shouldRenderWatermark(config, targetSize) {
        var wm = config && config.watermark;
        if (!wm || !wm.enabled) return false;
        if (wm.exportOnly && targetSize !== (config.outputSize || targetSize) && !wm.previewInPanel) return false;
        return true;
      }

      function resolveWatermarkAnchor(targetSize, wm, margin) {
        var pos = wm.position || 'bottom-right';
        var x = targetSize / 2;
        var y = targetSize / 2;
        if (pos === 'top-left') {
          x = margin;
          y = margin;
        } else if (pos === 'top-right') {
          x = targetSize - margin;
          y = margin;
        } else if (pos === 'bottom-left') {
          x = margin;
          y = targetSize - margin;
        } else if (pos === 'bottom-right') {
          x = targetSize - margin;
          y = targetSize - margin;
        }
        return {
          x: x + (wm.offsetX || 0),
          y: y + (wm.offsetY || 0)
        };
      }

      function drawWatermarkToken(ctx, targetSize, wm, anchor, mode) {
        var label = wm.type === 'logo' ? (wm.logoText || 'STS') : (wm.text || 'STS CLIPART');
        var color = rgbaFromHex(wm.color || '#1F2937', wm.opacity || 0.06);
        var circleFill = rgbaFromHex(wm.color || '#1F2937', Math.max(0.02, (wm.opacity || 0.06) * 0.25));
        var logoFont = Math.round(targetSize * 0.04 * (wm.scale || 1));
        var textFont = Math.round(targetSize * 0.034 * (wm.scale || 1));
        var gap = Math.round(targetSize * 0.012);
        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        if (mode !== 'corner') {
          ctx.rotate(((wm.rotation || 0) * Math.PI) / 180);
        }
        if (wm.type === 'logo' || wm.type === 'text+logo') {
          var radius = Math.round(targetSize * 0.045 * (wm.scale || 1));
          drawRoundRect(ctx, -radius, -radius, radius * 2, radius * 2, radius);
          ctx.fillStyle = circleFill;
          ctx.fill();
          ctx.strokeStyle = rgbaFromHex(wm.color || '#1F2937', Math.max(0.03, (wm.opacity || 0.06) * 0.65));
          ctx.lineWidth = Math.max(1, Math.round(targetSize * 0.0016));
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '900 ' + logoFont + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wm.logoText || 'STS', 0, 1);
          if (wm.type === 'logo') {
            ctx.restore();
            return;
          }
          ctx.translate(radius + gap, 0);
        }

        ctx.fillStyle = color;
        ctx.font = '900 ' + textFont + 'px sans-serif';
        ctx.textAlign = mode === 'corner' ? ((wm.position || '').indexOf('right') >= 0 ? 'right' : 'left') : 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(wm.text || 'STS CLIPART', 0, 0);
        ctx.restore();
      }

      function applyWatermark(ctx, targetSize, config) {
        var wm = config && config.watermark;
        if (!shouldRenderWatermark(config, targetSize)) return;
        var margin = Math.round(targetSize * 0.065);
        ctx.save();
        if (wm.mode === 'diagonal-repeat') {
          var step = Math.max(160, Math.round((wm.tileSpacing || 280) * (targetSize / 1000)));
          for (var y = -targetSize; y <= targetSize * 2; y += step) {
            for (var x = -targetSize; x <= targetSize * 2; x += step) {
              drawWatermarkToken(ctx, targetSize, wm, { x: x, y: y }, 'repeat');
            }
          }
        } else if (wm.mode === 'center') {
          drawWatermarkToken(ctx, targetSize, wm, {
            x: targetSize / 2 + (wm.offsetX || 0),
            y: targetSize / 2 + (wm.offsetY || 0)
          }, 'center');
        } else {
          drawWatermarkToken(ctx, targetSize, wm, resolveWatermarkAnchor(targetSize, wm, margin), 'corner');
        }
        ctx.restore();
      }

      function renderExportCanvas(targetSize, config, selectedCats) {
        var canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        var ctx = canvas.getContext('2d');
        var styles = makeStyles(targetSize, config);
        var measureCtx = createMeasureCanvas();

        var renderMargins = config && config.margins ? config.margins : null;
        var marginTop = clamp(parseInt(renderMargins && renderMargins.top, 10) || 30, 0, Math.floor(targetSize * 0.35));
        var marginRight = clamp(parseInt(renderMargins && renderMargins.right, 10) || 30, 0, Math.floor(targetSize * 0.35));
        var marginBottom = clamp(parseInt(renderMargins && renderMargins.bottom, 10) || 30, 0, Math.floor(targetSize * 0.35));
        var marginLeft = clamp(parseInt(renderMargins && renderMargins.left, 10) || 30, 0, Math.floor(targetSize * 0.35));
        var safeX = marginLeft;
        var safeY = marginTop;
        var safeW = targetSize - marginLeft - marginRight;
        var safeH = targetSize - marginTop - marginBottom;

        var allPreviewCats = config.includePreview ? selectedCats : [];
        var titleCats = [];
        var previewCats = [];
        allPreviewCats.forEach(function(cat) {
          if (isStandaloneTitleCategory(cat)) titleCats.push(cat);
          else previewCats.push(cat);
        });

        var previewContentWidth = config.groupCols === 1 ? Math.min(safeW, Math.floor(safeW * 0.92)) : safeW;
        var columnWidth = config.groupCols === 1
          ? previewContentWidth
          : Math.floor((safeW - styles.columnGap) / 2);

        var titleMeasured = titleCats.map(function(cat) {
          return measureGroupCard(measureCtx, cat, safeW, config, styles, safeW);
        });
        var titlePlacements = [];
        var titleStackH = 0;
        titleMeasured.forEach(function(m, idx) {
          titlePlacements[idx] = { x: 0, y: titleStackH, col: -1 };
          titleStackH += m.height + styles.groupGap;
        });
        if (titleMeasured.length) titleStackH -= styles.groupGap;
        var titleBandH = titleMeasured.length ? (titleStackH + ((previewCats.length || config.includeCustom) ? styles.groupGap : 0)) : 0;

        var measured = previewCats.map(function(cat) {
          return measureGroupCard(measureCtx, cat, columnWidth, config, styles);
        });

        var groupsW = 0;
        var placements = [];
        var groupsBottom = 0;

        if (previewCats.length) {
          if (config.groupCols === 1) {
            groupsW = previewContentWidth;
            var y1 = 0;
            measured.forEach(function(m, idx) {
              placements[idx] = { x: 0, y: y1, col: 0 };
              y1 += m.height + styles.groupGap;
            });
            groupsBottom = y1 - styles.groupGap;

} else {
  groupsW = columnWidth * 2 + styles.columnGap;
  var yCols = [0, 0];
  var xCols = [0, columnWidth + styles.columnGap];
  var orderedEntries = [];
  measured.forEach(function(m, idx) {
    var catOrder = parseInt((previewCats[idx] && previewCats[idx].__layoutOrder), 10);
    if (isNaN(catOrder)) catOrder = idx;
    orderedEntries.push({
      idx: idx,
      measure: m,
      order: catOrder,
      col: clamp(parseInt((previewCats[idx] && previewCats[idx].__layoutColumn), 10) || 0, 0, 1),
      full: !!m.isTitleOnly
    });
  });
  orderedEntries.sort(function(a, b) { return a.order - b.order || a.idx - b.idx; });
  orderedEntries.forEach(function(entry) {
    if (entry.full) {
      var yFull = Math.max(yCols[0], yCols[1]);
      placements[entry.idx] = { x: 0, y: yFull, col: -1 };
      yCols[0] = yFull + entry.measure.height + styles.groupGap;
      yCols[1] = yCols[0];
      return;
    }
    placements[entry.idx] = { x: xCols[entry.col], y: yCols[entry.col], col: entry.col };
    yCols[entry.col] += entry.measure.height + styles.groupGap;
  });
  groupsBottom = Math.max(yCols[0], yCols[1]) - ((yCols[0] || yCols[1]) ? styles.groupGap : 0);
}
        }

        var customText = config.includeCustom ? config.customText : '';
        var customTitleText = config.includeCustom ? (config.customTitleText || 'Please Add Your Custom:') : '';
        var hasCustom = (!!customText || !!customTitleText) && config.includeCustom;
        var customLayoutMode = config.customLayoutMode || (config.groupCols === 2 ? 'full' : 'full');
        var customPosition = config.customPosition || 'bottom';
        var customWidth = previewCats.length ? groupsW : safeW;
        var sideCustom = hasCustom && config.groupCols === 2 && customLayoutMode === 'column' && (customPosition === 'left' || customPosition === 'right');
        if (sideCustom) {
          customWidth = Math.max(180, Math.min(columnWidth, safeW - 120));
        }
        var customMeasure = measureCustomBlock(measureCtx, customTitleText, customText, customWidth, styles);
        if (sideCustom) {
          customWidth = Math.max(180, Math.min(columnWidth, customMeasure.width || customWidth));
        } else {
          customWidth = previewCats.length ? groupsW : safeW;
          customMeasure = measureCustomBlock(measureCtx, customTitleText, customText, customWidth, styles);
        }
        var customX = 0;
        var customY = previewCats.length ? (groupsBottom + (hasCustom ? styles.groupGap : 0)) : 0;
        var groupsOriginX = 0;
        var groupsOriginY = 0;
        var contentH = 0;
        var contentW = previewCats.length ? groupsW : (hasCustom ? customWidth : 0);

        if (hasCustom) {
          if (sideCustom) {
            groupsOriginX = customPosition === 'left' ? (customWidth + styles.groupGap) : 0;
            customX = customPosition === 'left' ? 0 : (groupsW + styles.groupGap);
            customY = 0;
            contentW = (previewCats.length ? groupsW : 0) + (previewCats.length ? styles.groupGap : 0) + customWidth;
            contentH = Math.max(groupsBottom, customMeasure.height);
          } else if (customPosition === 'top') {
            groupsOriginY = customMeasure.height + (previewCats.length ? styles.groupGap : 0);
            customY = 0;
            contentW = Math.max(previewCats.length ? groupsW : 0, customWidth);
            contentH = customMeasure.height + (previewCats.length ? styles.groupGap : 0) + groupsBottom;
          } else {
            customY = previewCats.length ? (groupsBottom + styles.groupGap) : 0;
            contentW = Math.max(previewCats.length ? groupsW : 0, customWidth);
            contentH = (previewCats.length ? groupsBottom : 0) + customMeasure.height + (previewCats.length ? styles.groupGap : 0);
          }
        } else {
          contentH = previewCats.length ? groupsBottom : 0;
        }

        var baseContentW = contentW;
        if (titleMeasured.length) {
          groupsOriginY += titleBandH;
          customY += titleBandH;
          contentW = Math.max(contentW, safeW);
          contentH += titleBandH;
          var bodyOffsetX = Math.max(0, (contentW - baseContentW) / 2);
          groupsOriginX += bodyOffsetX;
          customX += bodyOffsetX;
        }

        var scaleRatio = Math.min(1, safeW / Math.max(1, contentW), safeH / Math.max(1, contentH || 1));

        var effectiveCell = measured.length ? Math.min.apply(null, measured.map(function(m) { return m.cellW; })) * scaleRatio : 0;
        var hiddenItems = measured.reduce(function(sum, m) { return sum + (m.hiddenCount || 0); }, 0);
        var overflowGroups = measured.filter(function(m) { return m.overflowX > 0; }).length;

        var ok = true;
        var reason = 'Bố cục có thể xuất tốt.';
        if (!config.includePreview && !config.includeCustom) {
          ok = false;
          reason = 'Cần bật Preview hoặc Custom để in lên ảnh.';
        } else if (config.includePreview && !allPreviewCats.length) {
          ok = false;
          reason = 'Chưa chọn group nào để in lên ảnh.';
        } else if (config.includeCustom && config.customText.length > 256) {
          ok = false;
          reason = 'Custom vượt 256 ký tự.';
        } else if (overflowGroups > 0) {
          ok = false;
          reason = 'Item đang tràn ngang. Giảm scale Item hoặc giảm số cột item.';
        } else if (hiddenItems > 0) {
          ok = false;
          reason = 'Số hàng/cột item hiện tại chưa đủ để hiển thị hết ' + hiddenItems + ' item.';
        } else if (config.includePreview && effectiveCell < 24) {
          ok = false;
          reason = 'Item quá nhỏ. Giảm số cột item hoặc tăng size ảnh.';
        } else if (config.includePreview && scaleRatio < 0.58) {
          ok = false;
          reason = 'Nội dung quá dày theo chiều dọc. Giảm group hoặc tăng size ảnh.';
        }

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, targetSize, targetSize);
        drawBackground(ctx, getBackgroundChoice(config), safeX, safeY, safeW, safeH, styles, config);

        ctx.save();
        var usedW = contentW * scaleRatio;
        var usedH = contentH * scaleRatio;
        var offsetX = safeX + alignOffset(config.hAlign, safeW, usedW);
        var offsetY = safeY + alignOffset(config.vAlign, safeH, usedH);
        ctx.translate(offsetX, offsetY);
        ctx.scale(scaleRatio, scaleRatio);


titleMeasured.forEach(function(m, titleIndex) {
  var cat = titleCats[titleIndex];
  var placement = titlePlacements[titleIndex];
  var cardX = placement.x;
  var cardY = placement.y;
  var tl = cat.titleLine || {};
  draw3DCard(ctx, cardX, cardY, m.width, m.height, {
    radius: styles.radius,
    fill: tl.background || '#FFF7ED',
    border: '#FDBA74',
    shadowBlur: Math.round(targetSize * 0.014),
    shadowOffsetY: Math.round(targetSize * 0.006),
    highlightTop: 'rgba(255,255,255,0.82)'
  });
  ctx.fillStyle = tl.color || '#0F172A';
  ctx.font = '900 ' + m.titleLineFontSize + 'px sans-serif';
  ctx.textAlign = (tl.align === 'left' || tl.align === 'right') ? tl.align : 'center';
  ctx.textBaseline = 'middle';
  var titleAnchorX = tl.align === 'left'
    ? (cardX + m.titleLinePadX)
    : tl.align === 'right'
      ? (cardX + m.width - m.titleLinePadX)
      : (cardX + m.width / 2);
  var titleStartY = cardY + m.titleLinePadY + m.titleLineLineH / 2;
  m.titleLineLines.forEach(function(line, lineIdx) {
    ctx.fillText(line, titleAnchorX, titleStartY + lineIdx * m.titleLineLineH);
  });
});

measured.forEach(function(m, cardIndex) {
  var cat = previewCats[cardIndex];
  var placement = placements[cardIndex];
  var cardX = groupsOriginX + placement.x;
  var cardY = groupsOriginY + placement.y;
  var accent = getGroupAccent(cardIndex);
  var drawWidth = columnWidth;

  var bannerOffset = (m.headerBannerLines && m.headerBannerLines.length) ? (m.bannerH + styles.itemGap) : 0;
  var groupCardY = cardY + bannerOffset;
  var groupCardH = Math.max(styles.titleH + styles.surfacePad * 2 + 24, m.height - bannerOffset);

  if (bannerOffset) {
    draw3DCard(ctx, cardX, cardY, drawWidth, m.bannerH, {
      radius: styles.smallRadius,
      fill: '#F8FAFC',
      border: '#D9E7DE',
      shadowBlur: 8,
      shadowOffsetY: 4,
      highlightTop: 'rgba(255,255,255,0.9)'
    });
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 ' + styles.bannerFs + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var bannerLineH = Math.round(styles.bannerFs * 1.32);
    var bannerStartY = cardY + styles.surfacePad * 0.7 + bannerLineH / 2;
    m.headerBannerLines.forEach(function(line, li) {
      ctx.fillText(line, cardX + drawWidth / 2, bannerStartY + li * bannerLineH);
    });
  }

  draw3DCard(ctx, cardX, groupCardY, drawWidth, groupCardH, {
    radius: styles.radius,
    fill: (config.renderGroupBg ? hexToRgba(getGroupAccent(cardIndex)[0], Math.max(0.08, Math.min(0.24, config.groupBgOpacity || 0.12))) : '#FFFFFF'),
    border: '#DCE3EB',
    shadowBlur: Math.round(targetSize * 0.016),
    shadowOffsetY: Math.round(targetSize * 0.007),
    highlightTop: 'rgba(255,255,255,0.96)'
  });

  var titleGrad = ctx.createLinearGradient(cardX, groupCardY, cardX + drawWidth, groupCardY + styles.titleH);
  titleGrad.addColorStop(0, accent[0]);
  titleGrad.addColorStop(1, accent[1]);
  ctx.save();
  drawRoundRect(ctx, cardX, groupCardY, drawWidth, styles.titleH, styles.radius);
  ctx.clip();
  ctx.fillStyle = titleGrad;
  ctx.fillRect(cardX, groupCardY, drawWidth, styles.titleH);
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 ' + styles.titleFs + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  var titleText = (cat.name || 'Group').trim();
  var titleLines = wrapLines(ctx, titleText, drawWidth - styles.surfacePad * 2 - 86, 1);
  ctx.fillText(titleLines[0] || 'Group', cardX + styles.surfacePad, groupCardY + styles.titleH / 2);

  var options = getRenderableOptions(cat);
  var badgeText = options.length + ' item';
  ctx.font = '800 ' + styles.countFs + 'px sans-serif';
  var badgeW = ctx.measureText(badgeText).width + styles.badgePadX * 2;
  var badgeH = Math.max(22, Math.round(styles.titleH * 0.44));
  var badgeX = cardX + drawWidth - styles.surfacePad - badgeW;
  var badgeY = groupCardY + (styles.titleH - badgeH) / 2;
  draw3DCard(ctx, badgeX, badgeY, badgeW, badgeH, {
    radius: badgeH / 2,
    fill: 'rgba(255,255,255,0.18)',
    border: 'rgba(255,255,255,0.3)',
    shadowBlur: 0,
    shadowOffsetY: 0,
    highlightTop: 'rgba(255,255,255,0.24)'
  });
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);

  var innerX = cardX + styles.surfacePad;
  var drawY = groupCardY + styles.titleH + styles.surfacePad;
  var innerW = drawWidth - styles.surfacePad * 2;

          var rowStartX = innerX;

          if (m.isTextFrame) {
            var tf = cat.textFrame || {};
            var tfPad = Math.max(14, Math.round(styles.surfacePad * 1.1));
            draw3DCard(ctx, innerX, drawY, innerW, m.cellH, {
              radius: styles.smallRadius,
              fill: tf.background || '#FFFFFF',
              border: hexToRgba(tf.background || '#FFFFFF', 0.9),
              shadowBlur: 8,
              shadowOffsetY: 4,
              highlightTop: 'rgba(255,255,255,0.35)'
            });
            ctx.fillStyle = tf.color || '#111827';
            ctx.font = '700 ' + m.textFrameFontSize + 'px sans-serif';
            ctx.textAlign = (tf.align === 'left' || tf.align === 'right') ? tf.align : 'center';
            ctx.textBaseline = 'middle';
            var anchorX = tf.align === 'left' ? (innerX + tfPad) : tf.align === 'right' ? (innerX + innerW - tfPad) : (innerX + innerW / 2);
            var startY = drawY + m.cellH / 2 - ((m.textFrameLines.length - 1) * m.textFrameLineH) / 2;
            m.textFrameLines.forEach(function(line, lineIdx) {
              ctx.fillText(line, anchorX, startY + lineIdx * m.textFrameLineH);
            });
          } else if (!options.length) {
            draw3DCard(ctx, innerX, drawY, innerW, Math.max(42, Math.round(styles.surfacePad * 2.2)), {
              radius: styles.smallRadius,
              fill: '#F8FAFC',
              border: '#CBD5E1',
              shadowBlur: 0,
              shadowOffsetY: 0,
              highlightTop: 'rgba(255,255,255,0.5)'
            });
            ctx.fillStyle = '#64748B';
            ctx.font = '700 ' + styles.itemSubFs + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Group trống', innerX + innerW / 2, drawY + Math.max(42, Math.round(styles.surfacePad * 2.2)) / 2);
          } else if (m.textItemsOnly) {
            var textOptionsToDraw = options.slice(0, m.visibleCount);
            var textCursorY = drawY;
            textOptionsToDraw.forEach(function(opt, optIdx) {
              var itemH = (m.textItemRowHeights && m.textItemRowHeights[optIdx]) || m.cellH;
              var itemX = innerX;
              var itemY = textCursorY;
              textCursorY += itemH + styles.itemGap;
              var textStyle = opt.textStyle || {};
              draw3DCard(ctx, itemX, itemY, m.cellW, itemH, {
                radius: styles.smallRadius,
                fill: textStyle.background || '#FFFFFF',
                border: '#DCE3EB',
                shadowBlur: 10,
                shadowOffsetY: 5,
                highlightTop: 'rgba(255,255,255,0.92)'
              });
              if (m.inlineTextGroup) {
                drawInlineTextGroupRow(ctx, opt, itemX, itemY, m.cellW, itemH, styles, config);
              } else {
                ctx.fillStyle = textStyle.color || '#111827';
                ctx.font = '700 ' + styles.itemTextFs + 'px sans-serif';
                ctx.textAlign = (textStyle.align === 'center' || textStyle.align === 'right') ? textStyle.align : 'left';
                ctx.textBaseline = 'middle';
                var textPad = m.textItemPad || Math.max(14, Math.round(styles.surfacePad * 1.05));
                var anchorX = textStyle.align === 'right' ? (itemX + m.cellW - textPad) : textStyle.align === 'center' ? (itemX + m.cellW / 2) : (itemX + textPad);
                var rowLines = wrapMultilineLines(ctx, String(opt.textContent || ''), m.cellW - textPad * 2 - 18, 8);
                var rowLineH = m.textItemLineH || Math.round(styles.itemTextFs * 1.42);
                var totalTextH = Math.max(rowLineH, rowLines.length * rowLineH);
                var textStartY = itemY + itemH / 2 - totalTextH / 2 + rowLineH / 2;
                rowLines.forEach(function(line, li) {
                  ctx.fillText(line, anchorX, textStartY + li * rowLineH);
                });
                drawItemCodeBadge(ctx, opt, itemX, itemY, m.cellW, itemH, styles, config);
              }
            });
          } else {
            var optionsToDraw = options.slice(0, m.visibleCount);
            optionsToDraw.forEach(function(opt, optIdx) {
              var row = Math.floor(optIdx / config.itemCols);
              var colIdx = optIdx % config.itemCols;
              var itemX = rowStartX + colIdx * (m.cellW + styles.itemGap);
              var itemY = drawY + row * (m.cellH + styles.itemGap);

              draw3DCard(ctx, itemX, itemY, m.cellW, m.cellH, {
                radius: styles.smallRadius,
                fill: '#FFFFFF',
                border: '#DCE3EB',
                shadowBlur: 10,
                shadowOffsetY: 5,
                highlightTop: 'rgba(255,255,255,0.94)'
              });

              var visualPad = Math.max(8, Math.round(styles.surfacePad * 0.55));
              var visualX = itemX + visualPad;
              var visualY = itemY + visualPad;
              var visualW = m.cellW - visualPad * 2;
              var visualH = m.visualH;

              var hasCaption = !!pickCaption(opt);
              var optImageSrc = opt && (opt.capturedImage || opt.imageUrl);
              var imgEntry = optImageSrc ? imageCache[optImageSrc] : null;
              var img = imgEntry && imgEntry.state === 'done' ? imgEntry.img : null;
              var isTextItem = isTextItemOption(opt);

              if (m.textOnly) {
                draw3DCard(ctx, visualX, visualY, visualW, visualH, {
                  radius: Math.max(6, styles.smallRadius - 2),
                  fill: '#F8FAFC',
                  border: '#D9E7DE',
                  shadowBlur: 6,
                  shadowOffsetY: 3,
                  highlightTop: 'rgba(255,255,255,0.96)'
                });
                ctx.fillStyle = '#0F172A';
                ctx.font = '700 ' + styles.itemTextFs + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var textLines = wrapLines(ctx, pickCaption(opt), visualW - 14, 3);
                var lineH = Math.round(styles.itemTextFs * 1.28);
                var totalTextH = textLines.length * lineH;
                var startTextY = visualY + visualH / 2 - totalTextH / 2 + lineH / 2;
                textLines.forEach(function(line, li) {
                  ctx.fillText(line, visualX + visualW / 2, startTextY + li * lineH);
                });
              } else {
                draw3DCard(ctx, visualX, visualY, visualW, visualH, {
                  radius: Math.max(6, styles.smallRadius - 2),
                  fill: isTextItem ? ((opt.textStyle && opt.textStyle.background) || '#FFFFFF') : '#F8FAFC',
                  border: '#D9E7DE',
                  shadowBlur: 6,
                  shadowOffsetY: 3,
                  highlightTop: 'rgba(255,255,255,0.98)'
                });

                if (img) {
                  var fit = Math.min(visualW / img.width, visualH / img.height);
                  var drawW = img.width * fit;
                  var drawH = img.height * fit;
                  ctx.drawImage(img, visualX + (visualW - drawW) / 2, visualY + (visualH - drawH) / 2, drawW, drawH);
                } else if (opt.bgColor) {
                  ctx.save();
                  drawRoundRect(ctx, visualX + 6, visualY + 6, visualW - 12, visualH - 12, Math.max(6, styles.smallRadius - 4));
                  ctx.fillStyle = opt.bgColor;
                  ctx.fill();
                  ctx.restore();
                } else if (isTextItem) {
                  var gridTextStyle = opt.textStyle || {};
                  ctx.fillStyle = gridTextStyle.color || '#111827';
                  ctx.font = '700 ' + styles.itemTextFs + 'px sans-serif';
                  ctx.textAlign = (gridTextStyle.align === 'center' || gridTextStyle.align === 'right') ? gridTextStyle.align : 'left';
                  ctx.textBaseline = 'middle';
                  var gridAnchorX = gridTextStyle.align === 'right' ? (visualX + visualW - 10) : gridTextStyle.align === 'center' ? (visualX + visualW / 2) : (visualX + 10);
                  var gridTextLines = wrapMultilineLines(ctx, String(opt.textContent || ''), visualW - 20, 5);
                  var gridLineH = Math.round(styles.itemTextFs * 1.24);
                  var gridTotalTextH = Math.max(gridLineH, gridTextLines.length * gridLineH);
                  var gridStartTextY = visualY + visualH / 2 - gridTotalTextH / 2 + gridLineH / 2;
                  gridTextLines.forEach(function(line, li) {
                    ctx.fillText(line, gridAnchorX, gridStartTextY + li * gridLineH);
                  });
                } else {
                  ctx.fillStyle = '#94A3B8';
                  ctx.font = '700 ' + styles.itemSubFs + 'px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText('ITEM', visualX + visualW / 2, visualY + visualH / 2);
                }
              }

              if (hasCaption && !m.textOnly && !isTextItem) {
                ctx.fillStyle = '#475569';
                ctx.font = '700 ' + styles.itemSubFs + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var captionLines = wrapLines(ctx, pickCaption(opt), m.cellW - 14, 2);
                var captionLineH = Math.round(styles.itemSubFs * 1.18);
                var captionGap = Math.max(8, Math.round(styles.surfacePad * 0.55));
                var captionY = visualY + visualH + captionGap + captionLineH / 2;
                captionLines.forEach(function(line, li) {
                  ctx.fillText(line, itemX + m.cellW / 2, captionY + li * captionLineH);
                });
              }

              drawItemCodeBadge(ctx, opt, itemX, itemY, m.cellW, m.cellH, styles, config);
            });
          }
        });

        if (hasCustom) {
          draw3DCard(ctx, customX, customY, customWidth, customMeasure.height, {
            radius: styles.radius,
            fill: '#FFFFFF',
            border: '#DCE3EB',
            shadowBlur: Math.round(targetSize * 0.016),
            shadowOffsetY: Math.round(targetSize * 0.008),
            highlightTop: 'rgba(255,255,255,0.96)'
          });

          var customGrad = ctx.createLinearGradient(customX, customY, customX + customWidth, customY + Math.max(48, styles.customTitleFs + 20));
          customGrad.addColorStop(0, '#EFE3CF');
          customGrad.addColorStop(1, '#D8C3A5');
          ctx.save();
          drawRoundRect(ctx, customX, customY, customWidth, Math.max(50, styles.customTitleFs + 22), styles.radius);
          ctx.clip();
          ctx.fillStyle = customGrad;
          ctx.fillRect(customX, customY, customWidth, Math.max(50, styles.customTitleFs + 22));
          ctx.restore();

          ctx.fillStyle = '#3F3428';
          ctx.font = '800 ' + styles.customTitleFs + 'px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(customMeasure.title || 'Please Add Your Custom:', customX + styles.surfacePad, customY + Math.max(50, styles.customTitleFs + 22) / 2);

          ctx.fillStyle = '#0F172A';
          ctx.font = '600 ' + styles.customFs + 'px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          var textY = customY + Math.max(50, styles.customTitleFs + 22) + 12;
          customMeasure.lines.forEach(function(line, idx) {
            ctx.fillText(line, customX + styles.surfacePad, textY + idx * customMeasure.lineH);
          });
        }

        ctx.restore();

        applyWatermark(ctx, targetSize, config);

        ctx.strokeStyle = 'rgba(148,163,184,0.24)';
        ctx.lineWidth = 1;
        ctx.strokeRect(15, 15, targetSize - 30, targetSize - 30);

        return {
          canvas: canvas,
          meta: {
            ok: ok,
            reason: reason,
            scaleRatio: scaleRatio,
            effectiveCell: effectiveCell,
            hiddenItems: hiddenItems,
            selectedCount: previewCats.length,
            totalItems: previewCats.reduce(function(sum, cat) { return sum + getRenderableOptions(cat).length; }, 0),
            includePreview: config.includePreview,
            includeCustom: config.includeCustom
          }
        };
      }

      function drawIntoPreview(result) {
        var pctx = previewCanvas.getContext('2d');
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        pctx.drawImage(result.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      }

      function syncGenerateState(meta, config) {
        var canGenerate = meta.ok;
        fitStatus.style.background = canGenerate ? '#EAF6EF' : '#FEF2F2';
        fitStatus.style.borderColor = canGenerate ? '#BBF7D0' : '#FECACA';
        fitStatus.style.color = canGenerate ? '#166534' : '#B91C1C';
        fitStatus.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;">'
          + '<div style="font-weight:800;">' + (canGenerate ? 'Bố cục ổn' : 'Cần chỉnh lại bố cục') + '</div>'
          + '<div>' + meta.reason + '</div>'
          + '<div>Scale: ' + Math.round(meta.scaleRatio * 100) + '%</div>'
          + '<div>Cell: ' + Math.round(meta.effectiveCell || 0) + 'px</div>'
          + (meta.hiddenItems ? '<div>Ẩn tạm: ' + meta.hiddenItems + ' item</div>' : '')
          + '</div>';
        genBtn.disabled = !canGenerate;
        genBtn.style.opacity = '1';
        genBtn.style.cursor = canGenerate ? 'pointer' : 'not-allowed';
        genBtn.style.background = canGenerate ? '#2F7D57' : '#EEF3F0';
        genBtn.style.borderColor = canGenerate ? '#276A4A' : '#D5E0DA';
        genBtn.style.color = canGenerate ? '#FFFFFF' : '#7B8F85';
        genBtn.textContent = canGenerate ? ('Tải PNG ' + config.outputSize + '×' + config.outputSize) : 'Không thể xuất với cấu hình này';
      }

      function renderPreviewNow() {
        ensureImagesLoaded();
        var config = getConfig();
        var selectedCats = getSelectedCats();
        var previewResult = renderExportCanvas(1000, config, selectedCats);
        drawIntoPreview(previewResult);

        var exportResult = renderExportCanvas(config.outputSize, config, selectedCats);
        previewMeta.innerHTML = '<div><b>' + exportResult.meta.selectedCount + '</b> group · <b>' + exportResult.meta.totalItems + '</b> item · Group: <b>' + config.groupCols + '</b> cột</div>'
          + '<div>Item: <b>' + config.itemCols + '</b> cột × <b>' + config.itemRows + '</b> hàng · Text Group: <b>' + String(config.textGroupLayout || 'inline').toUpperCase() + '</b> · Badge: <b>' + config.itemBadgePos.toUpperCase() + '</b> · Custom: <b>' + config.customPosition + '</b></div>';
        syncGenerateState(exportResult.meta, config);
      }

      function schedulePreview() {
        updateCustomCounter();
        if (previewTimer) clearTimeout(previewTimer);
        previewTimer = setTimeout(renderPreviewNow, 60);
      }

      [mode1Fields.colInput, mode1Fields.rowInput, mode2Fields.colInput, mode2Fields.rowInput].forEach(function(input) {
        input.oninput = function() {
          var min = parseInt(input.min, 10) || 1;
          var max = parseInt(input.max, 10) || 20;
          var next = clamp(parseInt(input.value, 10) || min, min, max);
          input.value = String(next);
          schedulePreview();
        };
      });

      [sizeSelect, customArea, itemScaleCtrl.input, groupScaleCtrl.input, itemBadgeScaleCtrl.input, groupBgOpacityCtrl.input, itemBadgeColorInput, itemBadgeBgInput, groupBgToggle, textGroupInlineToggle].forEach(function(input) {
        input.oninput = schedulePreview;
        input.onchange = schedulePreview;
      });

      if (previewSec.checkbox) previewSec.checkbox.onchange = schedulePreview;
      if (customSec.checkbox) customSec.checkbox.onchange = schedulePreview;

      genBtn.onclick = function() {
        var config = getConfig();
        var selectedCats = getSelectedCats();
        var exportResult = renderExportCanvas(config.outputSize, config, selectedCats);
        if (!exportResult.meta.ok) {
          clipNotify(exportResult.meta.reason, 'error');
          return;
        }

        var fileBaseName = normalizeRenderFileBaseName(fileNameInput.value) || buildDefaultRenderFileName(renderExportCount);
        fileNameInput.value = fileBaseName;

        genBtn.disabled = true;
        genBtn.style.opacity = '0.7';
        genBtn.textContent = 'Đang tạo PNG...';

        exportResult.canvas.toBlob(function(blob) {
          genBtn.disabled = false;
          genBtn.style.opacity = '1';
          syncGenerateState(exportResult.meta, config);
          if (!blob) {
            clipNotify('Không thể tạo file PNG', 'error');
            return;
          }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = fileBaseName + '.png';
          document.body.appendChild(a);
          a.click();
          setTimeout(function() {
            a.remove();
            URL.revokeObjectURL(url);
          }, 1200);
          writeRenderExportCount(renderExportCount + 1, function(nextCount) {
            renderExportCount = nextCount;
            syncRenderFileName(true);
          });
          clipNotify('Đã tải ảnh ' + fileBaseName + '.png', 'success');
        }, 'image/png');
      };

      loadRenderPresets('');
      readRenderExportCount(function(count) {
        renderExportCount = count;
        syncRenderFileName(true);
      });
      updateCustomCounter();
      refreshModeFieldVisuals();
      if (renderSessionState && renderSessionState.config && !presetSelect.value) {
        applyRenderPreset(renderSessionState);
      }
      schedulePreview();
    };
    
    // Helper: re-render panel preserving data
    function refreshPanel() {
      // Preserve scroll position
      var scrollArea = panel.querySelector('div[style*="overflow-y"]');
      var scrollTop = scrollArea ? scrollArea.scrollTop : 0;
      panel.remove();
      document.querySelectorAll('.sts-clip-label').forEach(e => e.remove());
      showClipartPanel(data);
      // Restore scroll
      var newPanel = document.getElementById('sts-clip-panel');
      if (newPanel) {
        var newScroll = newPanel.querySelector('div[style*="overflow-y"]');
        if (newScroll) newScroll.scrollTop = scrollTop;
      }
    }
    
    // ── Header text: T button toggle editor ──
    panel.querySelectorAll('.sts-clip-ht-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        var idx = btn.getAttribute('data-idx');
        var row = document.getElementById('sts-ht-row-' + idx);
        if (row) {
          var isActive = row.classList.contains('active');
          // Close all first
          panel.querySelectorAll('.sts-ht-row').forEach(r => r.classList.remove('active'));
          if (!isActive) {
            row.classList.add('active');
            var inp = row.querySelector('.sts-ht-input');
            if (inp) { inp.focus(); inp.select(); }
          }
        }
      };
    });

    // Header text display: click to edit
    panel.querySelectorAll('.sts-clip-ht-display').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        var idx = el.getAttribute('data-idx');
        var row = document.getElementById('sts-ht-row-' + idx);
        if (row) { row.classList.add('active'); var inp = row.querySelector('.sts-ht-input'); if (inp) { inp.focus(); inp.select(); } }
      };
    });

    // Header text: save
    panel.querySelectorAll('.sts-ht-save').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-idx'));
        var row = document.getElementById('sts-ht-row-' + idx);
        if (!row) return;
        var text = row.querySelector('.sts-ht-input').value.trim();
        var fontSize = parseInt(row.querySelector('.sts-ht-size').value) || 28;
        var color = row.querySelector('.sts-ht-color').value || '#1a1a2e';
        data.categories[idx].headerText = text || '';
        data.categories[idx].headerTextStyle = { fontSize: fontSize, color: color, fontFamily: 'sans-serif' };
        refreshPanel();
        clipNotify(text ? 'Đã lưu text!' : 'Đã xóa text', 'success');
      };
    });

    // Header text: cancel
    panel.querySelectorAll('.sts-ht-cancel').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        var idx = btn.getAttribute('data-idx');
        var row = document.getElementById('sts-ht-row-' + idx);
        if (row) row.classList.remove('active');
      };
    });

    // Header text: Enter to save
    panel.querySelectorAll('.sts-ht-input').forEach(inp => {
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          var idx = inp.getAttribute('data-idx');
          var saveBtn = panel.querySelector('.sts-ht-save[data-idx="' + idx + '"]');
          if (saveBtn) saveBtn.click();
        }
        if (e.key === 'Escape') {
          var idx2 = inp.getAttribute('data-idx');
          var row = document.getElementById('sts-ht-row-' + idx2);
          if (row) row.classList.remove('active');
        }
      };
    });

    // Text-frame live editors
    panel.querySelectorAll('.sts-tf-text, .sts-tf-size, .sts-tf-color, .sts-tf-bg, .sts-tf-align').forEach(function(el) {
      var applyTextFrame = function() {
        var idx = parseInt(el.getAttribute('data-idx'), 10);
        var cat = data.categories[idx];
        if (!cat || cat.kind !== 'text-frame') return;
        cat.textFrame = cat.textFrame || {};
        var root = panel.querySelector('.sts-text-frame-card[data-idx="' + idx + '"]');
        if (!root) return;
        cat.textFrame.text = root.querySelector('.sts-tf-text').value;
        cat.textFrame.fontSize = Math.max(10, Math.min(120, parseInt(root.querySelector('.sts-tf-size').value, 10) || 30));
        cat.textFrame.color = root.querySelector('.sts-tf-color').value || '#111827';
        cat.textFrame.background = root.querySelector('.sts-tf-bg').value || '#FFFFFF';
        cat.textFrame.align = root.querySelector('.sts-tf-align').value || 'center';
      };
      el.addEventListener('input', applyTextFrame);
      el.addEventListener('change', applyTextFrame);
    });


panel.querySelectorAll('.sts-title-line-text, .sts-title-line-size, .sts-title-line-color, .sts-title-line-bg, .sts-title-line-align').forEach(function(el) {
  var applyTitleLine = function() {
    var idx = parseInt(el.getAttribute('data-idx'), 10);
    var cat = data.categories[idx];
    if (!isStandaloneTitleCategory(cat)) return;
    cat.titleLine = cat.titleLine || {};
    var root = panel.querySelector('.sts-title-only-card[data-idx="' + idx + '"]');
    if (!root) return;
    cat.titleLine.text = root.querySelector('.sts-title-line-text').value;
    cat.titleLine.fontSize = Math.max(12, Math.min(160, parseInt(root.querySelector('.sts-title-line-size').value, 10) || 30));
    cat.titleLine.color = root.querySelector('.sts-title-line-color').value || '#0F172A';
    cat.titleLine.background = root.querySelector('.sts-title-line-bg').value || '#FFF7ED';
    cat.titleLine.align = root.querySelector('.sts-title-line-align').value || 'center';

    var previewBox = root.firstElementChild;
    if (previewBox) {
      previewBox.style.textAlign = cat.titleLine.align || 'center';
      var previewText = previewBox.querySelector('div');
      if (previewText) {
        previewText.textContent = cat.titleLine.text || '';
        previewText.style.color = cat.titleLine.color || '#0F172A';
        previewText.style.fontSize = Math.max(18, Math.round((parseInt(cat.titleLine.fontSize, 10) || 42) * 0.45)) + 'px';
      }
    }
    root.style.background = hexToRgba(cat.titleLine.background || '#FFF7ED', 0.96);

    if (typeof schedulePreview === 'function') schedulePreview();
  };
  el.addEventListener('input', applyTitleLine);
  el.addEventListener('change', applyTitleLine);
});

    panel.querySelectorAll('.sts-clip-add-text-item').forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (!addTextItemToCategory(data, idx)) {
          clipNotify('Không thể thêm Text Item vào group này', 'error');
          return;
        }
        refreshPanel();
        clipNotify('Đã thêm Text Item', 'success');
      };
    });

    panel.querySelectorAll('.sts-clip-text-item-input, .sts-clip-text-item-color, .sts-clip-text-item-bg, .sts-clip-text-item-align').forEach(function(el) {
      var applyTextItem = function() {
        var catIdx = parseInt(el.getAttribute('data-cat-idx'), 10);
        var optIdx = parseInt(el.getAttribute('data-opt-idx'), 10);
        var cat = data.categories[catIdx];
        var opt = cat && Array.isArray(cat.options) ? cat.options[optIdx] : null;
        if (!opt || !isTextItemOption(opt)) return;
        opt.textStyle = opt.textStyle || {};
        var row = panel.querySelector('.sts-clip-opt[data-cat-idx="' + catIdx + '"][data-opt-idx="' + optIdx + '"]');
        if (!row) return;
        var textInput = row.querySelector('.sts-clip-text-item-input');
        var colorInput = row.querySelector('.sts-clip-text-item-color');
        var bgInput = row.querySelector('.sts-clip-text-item-bg');
        var alignInput = row.querySelector('.sts-clip-text-item-align');
        opt.textContent = textInput ? textInput.value : opt.textContent;
        opt.textStyle.color = colorInput ? (colorInput.value || '#111827') : (opt.textStyle.color || '#111827');
        opt.textStyle.background = bgInput ? (bgInput.value || '#FFFFFF') : (opt.textStyle.background || '#FFFFFF');
        opt.textStyle.align = alignInput ? (alignInput.value || 'left') : (opt.textStyle.align || 'left');
        if (textInput) {
          textInput.style.color = opt.textStyle.color;
          textInput.style.background = opt.textStyle.background;
          textInput.style.textAlign = opt.textStyle.align;
        }
      };
      el.addEventListener('input', applyTextItem);
      el.addEventListener('change', applyTextItem);
    });

    panel.querySelectorAll('.sts-clip-opt-edit-text').forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var catIdx = parseInt(btn.getAttribute('data-cat-idx'), 10);
        var optIdx = parseInt(btn.getAttribute('data-opt-idx'), 10);
        var cat = data.categories[catIdx];
        var opt = cat && Array.isArray(cat.options) ? cat.options[optIdx] : null;
        if (!opt || !isTextItemOption(opt)) return;
        var nextText = prompt('Nhập nội dung Text Item', opt.textContent || '');
        if (nextText === null) return;
        opt.textContent = nextText;
        refreshPanel();
      };
    });

    // Bind existing + buttons rendered inside each group wrapper
    (function bindInsertButtons() {
      panel.querySelectorAll('.sts-insert-group-btn').forEach(function(btn) {
        btn.onclick = function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var insertIdx = parseInt(btn.getAttribute('data-insert-idx'), 10) || 0;
          var existing = document.getElementById('sts-insert-menu');
          if (existing) existing.remove();
          var menu = document.createElement('div');
          menu.id = 'sts-insert-menu';
          menu.style.cssText = 'position:fixed;z-index:999999999;background:#fff;border:1px solid #E2E8F0;border-radius:10px;box-shadow:0 18px 40px rgba(15,23,42,0.18);padding:6px;min-width:210px;font-family:var(--sts-font);';
          var r = btn.getBoundingClientRect();
          menu.style.left = Math.max(8, r.left - 92) + 'px';
          menu.style.top = Math.min(window.innerHeight - 120, r.bottom + 8) + 'px';
          function addOpt(label, desc, onClick, bg, border, color) {
            var item = document.createElement('button');
            item.type = 'button';
            item.style.cssText = 'display:block;width:100%;text-align:left;padding:10px 12px;border:1px solid ' + border + ';background:' + bg + ';color:' + color + ';border-radius:8px;cursor:pointer;margin:4px 0;';
            var safeLabel = window.STSSanitize ? window.STSSanitize.html(label) : String(label || '');
            var safeDesc = window.STSSanitize ? window.STSSanitize.html(desc) : String(desc || '');
            item.innerHTML = '<div style="font-size:12px;font-weight:700;line-height:1.3;">' + safeLabel + '</div><div style="font-size:11.5px;font-weight:500;line-height:1.45;opacity:.8;margin-top:2px;">' + safeDesc + '</div>';
            item.onclick = function(e2) { e2.stopPropagation(); menu.remove(); onClick(); };
            menu.appendChild(item);
          }
          addOpt('Thêm Tiêu đề lớn', 'Một dòng text lớn đứng riêng, dùng cho Woman / Man / Kids...', function() {
            insertCategoryAt(data, insertIdx, createStandaloneTitleCategory());
            refreshPanel();
            clipNotify('Đã thêm tiêu đề lớn', 'success');
          }, '#FFF7ED', '#FED7AA', '#C2410C');
          addOpt('Thêm Khung Text', 'Khung text có màu chữ, nền, cỡ chữ, căn trái/giữa/phải', function() {
            insertCategoryAt(data, insertIdx, createTextFrameCategory(insertIdx));
            refreshPanel();
            clipNotify('Đã thêm khung text', 'success');
          }, '#EAF6EF', '#BFE1CB', '#276A4A');
          addOpt('Thêm Group mới', 'Tạo group rỗng để điền item sau', function() {
            insertCategoryAt(data, insertIdx, createEmptyCategory(insertIdx));
            refreshPanel();
            clipNotify('Đã thêm group mới', 'success');
          }, '#F0FDF4', '#BBF7D0', '#166534');
          document.body.appendChild(menu);
          var closeMenu = function(closeEv) {
            if (!menu.contains(closeEv.target)) {
              menu.remove();
              document.removeEventListener('click', closeMenu, true);
            }
          };
          setTimeout(function() { document.addEventListener('click', closeMenu, true); }, 0);
        };
      });
    })();

    // ── Resize handles: drag to scale variant thumbnails ──
    panel.querySelectorAll('.sts-resize-handle').forEach(handle => {
      handle.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        var idx = parseInt(handle.getAttribute('data-idx'));
        var startY = e.clientY;
        var startScale = data._thumbScales[idx] || 1.0;
        handle.style.background = 'rgba(74,124,89,0.2)';

        var resizeOverlay = document.createElement('div');
        resizeOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999998;cursor:ns-resize;';
        document.body.appendChild(resizeOverlay);

        function onMove(ev) {
          var dy = ev.clientY - startY;
          var delta = dy / 150; // 150px drag = 1.0 scale
          var newScale = Math.max(0.4, Math.min(3.0, startScale + delta));
          data._thumbScales[idx] = newScale;
          // Live update: resize grid items without full re-render
          var cat = data.categories[idx];
          var grid = panel.querySelector('.sts-clip-grid[data-idx="' + idx + '"]');
          if (grid && cat) {
            var baseThumb = cat.optionCount > 15 ? 32 : 42;
            var thumbSize = Math.round(baseThumb * newScale);
            var gridMin = Math.round((cat.optionCount > 15 ? 38 : 48) * newScale);
            grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(' + gridMin + 'px,1fr))';
            grid.querySelectorAll(':scope > div > div:first-child').forEach(function(cell) {
              cell.style.width = thumbSize + 'px';
              cell.style.height = thumbSize + 'px';
            });
            grid.querySelectorAll(':scope > div > div:last-child').forEach(function(lbl) {
              lbl.style.fontSize = Math.max(6, Math.round(8 * newScale)) + 'px';
            });
          }
        }
        function onUp() {
          handle.style.background = '';
          resizeOverlay.remove();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };
    });

    // Delete individual groups
    panel.querySelectorAll('.sts-clip-del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        data.categories.splice(idx, 1);
        refreshPanel();
      };
    });

    panel.querySelectorAll('.sts-clip-opt-del').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const catIdx = parseInt(btn.getAttribute('data-cat-idx'), 10);
        const optIdx = parseInt(btn.getAttribute('data-opt-idx'), 10);
        if (!removeOptionInCategory(data, catIdx, optIdx)) {
          clipNotify('Phải giữ lại ít nhất 1 item trong group', 'warning');
          return;
        }
        refreshPanel();
        clipNotify('Đã xóa item', 'success');
      };
    });
    
    // Move up/down
    panel.querySelectorAll('.sts-clip-up').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (idx <= 0) return;
        const item = data.categories.splice(idx, 1)[0];
        data.categories.splice(idx - 1, 0, item);
        refreshPanel();
      };
    });
    panel.querySelectorAll('.sts-clip-down').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (idx >= data.categories.length - 1) return;
        const item = data.categories.splice(idx, 1)[0];
        data.categories.splice(idx + 1, 0, item);
        refreshPanel();
      };
    });
    
    // Renumber: reassign prefixes and labels based on current order

if (renumberBtn) renumberBtn.onclick = () => {
  renumberClipartCategories(data.categories);
  refreshPanel();
  clipNotify('Đã đánh lại số!', 'success');
};
    
    // + All: capture ALL groups from current page — v3.0.9: DEDUP by group name
    if (captureBtn) captureBtn.onclick = async () => {
      captureBtn.innerHTML = stsButtonHtml('scan', 'Scan...', '#2563EB');
      captureBtn.disabled = true;
      
      // Scroll through form to trigger lazy-loaded options
      var form = document.querySelector('.ctm-artwork-personalized-form, .ant-form, .product-form, .personalization-form');
      if (form) {
        var fRect = form.getBoundingClientRect();
        var pos = fRect.top + window.scrollY;
        while (pos < fRect.bottom + window.scrollY) {
          window.scrollTo({ top: pos, behavior: 'instant' });
          await sleep(200);
          pos += window.innerHeight * 0.7;
        }
      }
      await sleep(500);
      
      var newGroups = await scanDOMForAllVisible();
      var addedCount = 0;
      var existingNames = new Set(data.categories.map(function(c) { return c.name.toLowerCase().trim(); }));
      
      newGroups.forEach(function(grp) {
        var nameKey = grp.label.toLowerCase().trim();
        if (existingNames.has(nameKey)) return;
        existingNames.add(nameKey);
        var pfx = getNextAvailableCategoryPrefix(data.categories);
        data.categories.push({
          name: grp.label, prefix: pfx,
          options: grp.options.map(function(o, i) { return { ...o, label: pfx + (i+1), capturedImage: o.imageUrl || null, bgColor: o.bgColor || '' }; }),
          optionCount: grp.options.length,
        });
        addedCount++;
      });
      
      if (addedCount > 0) {
        refreshPanel();
        clipNotify('+' + addedCount + ' nhóm mới (bỏ qua ' + (newGroups.length - addedCount) + ' trùng)', 'success');
      } else {
        captureBtn.disabled = false;
        captureBtn.innerHTML = stsButtonHtml('all', 'No new', '#2563EB');
        setTimeout(function() { captureBtn.innerHTML = stsButtonHtml('all', 'All', '#2563EB'); }, 2000);
      }
    };
    
    // 🎯 Pick: v8.0.4 — Dropdown with 2 modes: Screenshot + Manual click
    if (resetBtn) resetBtn.onclick = () => {
      resetClipartPanelData(data);
    };

    if (screenshotModeBtn) screenshotModeBtn.onclick = function() {
      activateScreenshotPickOrchestrated(data, refreshPanel);
      setTimeout(syncPickModeButtonState, 0);
    };
    if (manualBtn) manualBtn.onclick = function() {
      activateManualPick(data, refreshPanel);
      setTimeout(syncPickModeButtonState, 0);
    };
    if (appendBtn) appendBtn.onclick = async function() { await appendCurrentVisibleState(data, refreshPanel, appendBtn); };
    syncPickModeButtonState();
    
    panel.querySelectorAll('.sts-clip-prefix-input').forEach(function(input) {
      input.addEventListener('click', function(ev) { ev.stopPropagation(); });
      input.addEventListener('mousedown', function(ev) { ev.stopPropagation(); });
      input.addEventListener('input', function(ev) {
        ev.stopPropagation();
        input.value = String(input.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      });
      var commit = function() {
        var idx = parseInt(input.getAttribute('data-idx'), 10);
        var cat = data.categories[idx];
        if (!cat) return;
        updateCategoryPrefix(cat, input.value || cat.prefix || 'A');
        refreshPanel();
      };
      input.addEventListener('change', commit);
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function(ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          commit();
        }
        if (ev.key === 'Escape') {
          input.value = data.categories[parseInt(input.getAttribute('data-idx'), 10)]?.prefix || input.value;
          input.blur();
        }
      });
    });

    panel.querySelectorAll('.sts-clip-group-select').forEach(function(input) {
      input.addEventListener('click', function(ev) { ev.stopPropagation(); });
      input.addEventListener('change', function(ev) {
        ev.stopPropagation();
        var idx = parseInt(input.getAttribute('data-idx'), 10);
        var cat = data.categories[idx];
        if (!cat) return;
        setGroupSelected(data, cat, !!input.checked);
        refreshPanel();
      });
    });

    panel.querySelectorAll('.sts-clip-opt').forEach(function(optEl) {
      var hoverTimer = null;
      var delBtn = optEl.querySelector('.sts-clip-opt-del');
      optEl.addEventListener('mouseenter', function() {
        hoverTimer = setTimeout(function() {
          if (!delBtn) return;
          delBtn.style.opacity = '1';
          delBtn.style.pointerEvents = 'auto';
        }, 300);
      });
      optEl.addEventListener('mouseleave', function() {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = null;
        if (!delBtn) return;
        delBtn.style.opacity = '0';
        delBtn.style.pointerEvents = 'none';
      });
      optEl.addEventListener('click', function(ev) {
        if (ev.target.closest('.sts-clip-opt-del,.sts-clip-opt-edit-text,.sts-clip-opt-dup,.sts-clip-text-item-input,.sts-clip-text-item-color,.sts-clip-text-item-bg,.sts-clip-text-item-align')) return;
        var catIdx = parseInt(optEl.getAttribute('data-cat-idx'), 10);
        var optIdx = parseInt(optEl.getAttribute('data-opt-idx'), 10);
        var cat = data.categories[catIdx];
        var opt = cat && Array.isArray(cat.options) ? cat.options[optIdx] : null;
        if (!opt) return;
        setOptionSelected(data, opt, !isOptionSelected(data, opt));
        refreshPanel();
      });
    });

    panel.querySelectorAll('.sts-clip-merge-target').forEach(function(btn) {
      btn.onclick = function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var result = moveSelectedEntriesIntoCategory(data, idx);
        if (!result.ok) {
          if (result.reason === 'empty-selection') clipNotify('Chưa chọn group/item để gộp', 'warning');
          else clipNotify('Group đích không hợp lệ', 'error');
          return;
        }
        refreshPanel();
        clipNotify('Đã gộp ' + result.movedGroups + ' group và ' + result.movedItems + ' item', 'success');
      };
    });

    // Editable group names — click to edit
    panel.querySelectorAll('.sts-clip-name').forEach(nameEl => {
      nameEl.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(nameEl.getAttribute('data-idx'));
        const current = data.categories[idx].name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = current;
        input.style.cssText = 'background:#FFFFFF;color:#0F172A;border:1px solid #1565C0;border-radius:4px;padding:2px 6px;font-size:13px;font-weight:700;font-family:var(--sts-font);width:160px;outline:none;';
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        
        const save = () => {
          const newName = input.value.trim() || current;
          data.categories[idx].name = newName;
          refreshPanel();
        };
        input.onblur = save;
        input.onkeydown = (ev) => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') { input.value = current; save(); } };
      };
    });
    
    // Drag & drop
    bindClipartPanelDrag(panel, data, refreshPanel);
  }

  function showClipartPanel(data) {
    return legacyShowClipartPanelImpl(data);
  }

  // ---- Auto-detect product mockup image ----
  function detectProductMockup() {
    // Strategy 1: Open Graph image (most reliable for product pages)
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.content) return ogImg.content;

    // Strategy 2: Twitter card image
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg && twImg.content) return twImg.content;

    // Strategy 3: First large product image (common selectors)
    const selectors = [
      '.product-featured-img img',
      '.product__media img',
      '.product-single__photo img',
      '.product-gallery img',
      '[data-product-featured-image]',
      '.product-image-main img',
      '.product__main-photos img',
      '.wt-max-width-full img', // Etsy
      '#imgTagWrapperId img', // Amazon
      '#landingImage', // Amazon
      '.image-viewer-container img',
      '.product-gallery__image img',
      '.product-page__image img',
    ];
    for (const sel of selectors) {
      const img = document.querySelector(sel);
      if (img && (img.naturalWidth >= 200 || img.width >= 200)) {
        return img.src || img.currentSrc;
      }
    }

    // Strategy 4: Largest image on page (fallback)
    const allImgs = [...document.querySelectorAll('img')].filter(img => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const src = (img.src || '').toLowerCase();
      return w >= 250 && h >= 250 && !src.includes('icon') && !src.includes('logo') && !src.includes('badge') && !src.includes('svg');
    });
    allImgs.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
    if (allImgs.length > 0) return allImgs[0].src || allImgs[0].currentSrc;

    return null;
  }

  // ---- Mockup Picker Modal for Sync ----
  function showMockupPicker(data) {
    return new Promise((resolve) => {
      const detectedUrl = detectProductMockup();

      const overlay = document.createElement('div');
      overlay.id = 'sts-mockup-picker-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);';

      const modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;padding:0;width:480px;max-height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;';
      header.innerHTML = '<div><div style="font-size:15px;font-weight:700;color:#0F172A;">🖼️ Chọn Mockup sản phẩm</div><div style="font-size:11.5px;font-weight:500;line-height:1.45;color:#64748B;margin-top:2px;">Chọn ảnh mockup để phân biệt sản phẩm trong Clipart Lab</div></div><span id="sts-mp-close" style="color:#64748B;font-size:18px;cursor:pointer;padding:4px 8px;">✕</span>';
      modal.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px;overflow-y:auto;flex:1;';

      let selectedUrl = detectedUrl;
      const previewSection = document.createElement('div');
      previewSection.style.cssText = 'margin-bottom:16px;text-align:center;';

      function updatePreview() {
        if (selectedUrl) {
          var safeSelectedUrl = window.STSSanitize ? window.STSSanitize.url(selectedUrl) : String(selectedUrl || '').replace(/"/g, '&quot;');
          previewSection.innerHTML = '<div style="font-size:11px;font-weight:600;color:#2563EB;margin-bottom:8px;">✅ Mockup đã chọn</div><div style="position:relative;display:inline-block;"><img src="' + safeSelectedUrl + '" style="max-width:200px;max-height:200px;border-radius:8px;border:2px solid #2F7D57;object-fit:contain;background:#F9FAFB;"><button id="sts-mp-clear" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#E8453C;color:#fff;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2);">✕</button></div>';
          var clearBtn = previewSection.querySelector('#sts-mp-clear');
          if (clearBtn) clearBtn.onclick = function() { selectedUrl = null; updatePreview(); };
        } else {
          previewSection.innerHTML = '<div style="padding:24px;border:2px dashed #BDD4C4;border-radius:8px;color:#8AA095;font-size:12px;">Chưa chọn mockup — click vào ảnh bên dưới hoặc chọn trên trang</div>';
        }
      }
      updatePreview();
      body.appendChild(previewSection);

      // Collect product images from page
      var pageImages = [];
      var seen = new Set();
      var imgEls = document.querySelectorAll('img');
      imgEls.forEach(function(img) {
        var src = img.src || img.currentSrc;
        if (!src || src.startsWith('data:') || seen.has(src)) return;
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (w < 100 || h < 100) return;
        var srcLow = src.toLowerCase();
        if (srcLow.includes('icon') || srcLow.includes('logo') || srcLow.includes('badge') || srcLow.includes('tracking') || srcLow.includes('pixel')) return;
        seen.add(src);
        pageImages.push({ src: src, w: w, h: h });
      });
      pageImages.sort(function(a, b) { return (b.w * b.h) - (a.w * a.h); });

      // Image grid
      if (pageImages.length > 0) {
        var gridLabel = document.createElement('div');
        gridLabel.style.cssText = 'font-size:11px;font-weight:600;line-height:1.2;color:#64748B;margin-bottom:8px;';
        gridLabel.textContent = '📷 Ảnh trên trang (' + pageImages.length + ')';
        body.appendChild(gridLabel);

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(4, 100px);gap:8px;max-height:260px;overflow-y:auto;padding:4px;';

        pageImages.slice(0, 20).forEach(function(imgData) {
          var item = document.createElement('div');
          item.className = 'sts-mp-grid-item';
          item.style.cssText = 'position:relative;width:100px;height:100px;border:2px solid ' + (imgData.src === selectedUrl ? '#2F7D57' : '#E5E7EB') + ';border-radius:6px;overflow:hidden;cursor:pointer;transition:border-color .15s;box-sizing:border-box;';
          var safeImgSrc = window.STSSanitize ? window.STSSanitize.url(imgData.src) : String(imgData.src || '').replace(/"/g, '&quot;');
          var safeW = Number(imgData.w || 0);
          var safeH = Number(imgData.h || 0);
          item.innerHTML = '<img src="' + safeImgSrc + '" style="width:100%;height:100%;object-fit:contain;display:block;"><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:8px;text-align:center;padding:2px;pointer-events:none;">' + safeW + '×' + safeH + '</div>';
          item.onmouseover = function() { if (imgData.src !== selectedUrl) item.style.borderColor = '#7B1FA2'; };
          item.onmouseout = function() { item.style.borderColor = imgData.src === selectedUrl ? '#2F7D57' : '#E5E7EB'; };
          item.onclick = function() {
            selectedUrl = imgData.src;
            updatePreview();
            grid.querySelectorAll('.sts-mp-grid-item').forEach(function(d) { d.style.borderColor = '#E5E7EB'; });
            item.style.borderColor = '#2F7D57';
          };
          grid.appendChild(item);
        });
        body.appendChild(grid);
      }

      // Pick from page button
      var pickFromPage = document.createElement('button');
      pickFromPage.style.cssText = 'width:100%;margin-top:12px;padding:10px;background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--sts-font);';
      pickFromPage.textContent = '🎯 Click chọn ảnh trực tiếp trên trang';
      pickFromPage.onclick = function() {
        overlay.style.display = 'none';
        clipNotify('🎯 Click vào ảnh mockup trên trang... (ESC để hủy)', 'info');

        var pickOverlays = [];
        document.querySelectorAll('img').forEach(function(img) {
          var src = img.src || img.currentSrc;
          if (!src || src.startsWith('data:')) return;
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (w < 80 || h < 80) return;
          var rect = img.getBoundingClientRect();
          if (rect.width < 50 || rect.height < 50) return;

          var ov = document.createElement('div');
          ov.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;z-index:99999998;border:3px solid transparent;border-radius:4px;cursor:pointer;transition:all .15s;box-sizing:border-box;';
          ov.onmouseover = function() { ov.style.borderColor = '#7B1FA2'; ov.style.background = 'rgba(123,31,162,0.1)'; };
          ov.onmouseout = function() { ov.style.borderColor = 'transparent'; ov.style.background = 'none'; };
          ov.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectedUrl = src;
            pickOverlays.forEach(function(o) { o.remove(); });
            overlay.style.display = 'flex';
            updatePreview();
            grid && grid.querySelectorAll('.sts-mp-grid-item').forEach(function(d) {
              var dImg = d.querySelector('img');
              d.style.borderColor = (dImg && dImg.src === src) ? '#2F7D57' : '#E5E7EB';
            });
          };
          document.body.appendChild(ov);
          pickOverlays.push(ov);
        });

        var cancelPick = function(e) {
          if (e.key === 'Escape') {
            pickOverlays.forEach(function(o) { o.remove(); });
            overlay.style.display = 'flex';
            document.removeEventListener('keydown', cancelPick);
          }
        };
        document.addEventListener('keydown', cancelPick);
      };
      body.appendChild(pickFromPage);

      modal.appendChild(body);

      // Footer buttons
      var footer = document.createElement('div');
      footer.style.cssText = 'padding:14px 20px;border-top:1px solid #E5E7EB;display:flex;gap:10px;justify-content:flex-end;';

      var skipBtn = document.createElement('button');
      skipBtn.style.cssText = 'padding:9px 18px;background:#F3F4F6;color:#555;border:1px solid #E2E8F0;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--sts-font);';
      skipBtn.textContent = 'Bỏ qua mockup';
      skipBtn.onclick = function() { overlay.remove(); resolve(null); };

      var confirmBtn = document.createElement('button');
      confirmBtn.style.cssText = 'padding:9px 24px;background:#2F7D57;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--sts-font);';
      confirmBtn.textContent = '✅ Xác nhận & Sync';
      confirmBtn.onclick = function() { overlay.remove(); resolve(selectedUrl); };

      footer.appendChild(skipBtn);
      footer.appendChild(confirmBtn);
      modal.appendChild(footer);

      overlay.appendChild(modal);

      // Close events
      overlay.querySelector('#sts-mp-close').onclick = function() { overlay.remove(); resolve(undefined); };
      overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); resolve(undefined); } };

      document.body.appendChild(overlay);
    });
  }

  // ---- Sync to Supabase ----
  async function syncClipartData(data) {
    const btn = document.querySelector('#sts-clip-sync');

    // Step 1: Show mockup picker before syncing
    const mockupUrl = await showMockupPicker(data);
    // undefined = user closed modal (cancel), null = skip mockup, string = selected mockup
    if (mockupUrl === undefined) return;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Syncing...'; }

    try {
      if (window.STSSyncPayload && window.STSSyncPayload.validateSyncPayloadShape) {
        const checkPayload = window.STSSyncPayload.validateSyncPayloadShape(data);
        if (!checkPayload.ok) throw new Error(checkPayload.error);
      }
      // Get auth from storage
      const stored = await new Promise(r => chrome.storage.local.get(['stsClipartProUser'], r));
      if (!stored.stsClipartProUser?.id) throw new Error('Chưa đăng nhập');

      const SUPA_URL = 'https://qhejotdjehgneusqjvhz.supabase.co';
      const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWpvdGRqZWhnbmV1c3Fqdmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzcyNTEsImV4cCI6MjA4NDI1MzI1MX0.5sbhhZ3VUrRQuRuLo3-o6CDzjbotPLzDGsn3oIjPM_U';
      const hdr = {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        // UPSERT: if same url+scanned_by exists, merge/update instead of failing
        'Prefer': 'return=representation,resolution=merge-duplicates',
      };

      // Compress captured images that are too large (resize + JPEG)
      const compressImage = (dataUrl, maxW = 120, quality = 0.6) => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
            const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', quality));
          };
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
      };

      const cleanCats = [];
      for (const cat of data.categories) {
        const cleanOpts = [];
        for (const opt of cat.options) {
          const clean = { ...opt };
          if (clean.capturedImage && clean.capturedImage.length > 70000) {
            // Compress instead of dropping — resize to 120px thumbnail + JPEG
            try {
              const compressed = await compressImage(clean.capturedImage);
              clean.capturedImage = compressed;
            } catch { clean.capturedImage = clean.imageUrl || null; }
          }
          cleanOpts.push(clean);
        }
        cleanCats.push({ ...cat, options: cleanOpts });
      }

      // ── Check if URL already scanned → merge variant mới vào bản cũ ──
      const normalSlug = data.url.split('?')[0].split('/').pop();
      const checkRes = await fetch(
        `${SUPA_URL}/rest/v1/clipart_scans?url=like.*${encodeURIComponent(normalSlug)}*&order=scanned_at.desc&limit=1`,
        { headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` } }
      );
      const existing = checkRes.ok ? await checkRes.json() : [];

      // Link to Clipart Studio task if available
      const taskStorage = await new Promise(r => chrome.storage.local.get(['studioActiveTaskId'], r));

      if (existing.length > 0) {
        // ── v8.3.0: FULL REPLACE — panel data is source of truth ──
        // Previous "smart merge" logic caused issues:
        //   1. Duplicate category names → one gets overwritten → missing groups
        //   2. Panel order changes (drag/drop) not reflected in DB (old order preserved)
        //   3. Deleted groups from panel not removed from DB (old groups lingered)
        // Since the panel contains ALL categories (user edits panel → syncs),
        // we replace categories entirely with cleanCats.
        const old = existing[0];
        const oldCatCount = (old.categories || []).length;

        const patchPayload = {
          categories: cleanCats,
          scanned_at: data.scannedAt,
          updated_at: new Date().toISOString(),
        };
        if (mockupUrl) patchPayload.mockup_image_url = mockupUrl;
        if (taskStorage.studioActiveTaskId) patchPayload.studio_task_id = taskStorage.studioActiveTaskId;

        const patchRes = await fetch(`${SUPA_URL}/rest/v1/clipart_scans?id=eq.${old.id}`, {
          method: 'PATCH',
          headers: hdr,
          body: JSON.stringify(patchPayload),
        });
        if (!patchRes.ok) throw new Error('Sync failed: ' + await patchRes.text());

        const newCount = cleanCats.length;
        clipNotify(`✅ Đã sync! ${newCount} nhóm`, 'success');
        if (btn) { btn.textContent = '✅ Sync +' + newCount; btn.style.background = '#2F7D57'; }
      } else {
        // ── NEW: tạo bản mới ──
        const payload = {
          url: data.url,
          title: data.title,
          platform: data.platform,
          scanned_at: data.scannedAt,
          scanned_by: stored.stsClipartProUser.id,
          categories: cleanCats,
          status: 'pending',
        };
        if (mockupUrl) payload.mockup_image_url = mockupUrl;
        if (taskStorage.studioActiveTaskId) payload.studio_task_id = taskStorage.studioActiveTaskId;

        const res = await fetch(`${SUPA_URL}/rest/v1/clipart_scans?on_conflict=url,scanned_by`, {
          method: 'POST',
          headers: hdr,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Sync failed: ' + await res.text());

        clipNotify('✅ Đã sync về STS Clipart Pro 8.3!' + (mockupUrl ? ' (kèm mockup)' : ''), 'success');
        if (btn) { btn.textContent = '✅ Đã sync'; btn.style.background = '#2F7D57'; }
      }
    } catch(err) {
      clipNotify('❌ ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '⬆️ Sync về STS Clipart Pro 8.3'; }
    }
  }

  // ---- v8.3.0: Manual Scan — open empty panel immediately, user adds clipart via Pick ----
  function startManualScan() {
    // Create empty result data
    var emptyData = {
      url: window.location.href,
      title: document.title,
      platform: (window.Shopify || document.querySelector('[data-shopify]')) ? 'shopify' : window.location.hostname.includes('etsy') ? 'etsy' : 'custom',
      scannedAt: new Date().toISOString(),
      categories: [],
    };
    CLIPART.categories = [];
    CLIPART.capturedData = emptyData;
    CLIPART.isScanning = false;

    // Show panel immediately (empty, with Pick buttons ready)
    showClipartPanel(emptyData);
    clipNotify('Manual mode — dùng Pick hoặc Screenshot để thêm clipart', 'info');
  }

  async function openClipartPanelFromFab() {
    if (!(await ensureClipartLoggedIn())) return false;
    startManualScan();
    return true;
  }

  // ---- v8.3.0: Scan mode selector popup ----
  function showScanModePopup() {
    // Remove existing popup
    var old = document.getElementById('sts-scan-mode-popup');
    if (old) { old.remove(); return; }

    var popup = document.createElement('div');
    popup.id = 'sts-scan-mode-popup';
    popup.style.cssText = 'position:fixed;bottom:98px;left:16px;z-index:999999;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:8px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);min-width:200px;animation:stsPopUp .2s ease;';

    // Add animation
    if (!document.getElementById('sts-popup-anim')) {
      var animStyle = document.createElement('style');
      animStyle.id = 'sts-popup-anim';
      animStyle.textContent = '@keyframes stsPopUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(animStyle);
    }

    var btnStyle = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;background:none;border-radius:8px;cursor:pointer;font-family:var(--sts-font);font-size:13px;text-align:left;color:#333;transition:background .15s;';

    // Auto Scan button
    var autoBtn = document.createElement('button');
    autoBtn.style.cssText = btnStyle;
    autoBtn.innerHTML = '<span style="font-size:20px;">🔍</span><div><div style="font-weight:700;">Auto Scan</div><div style="font-size:11px;color:#64748B;margin-top:1px;">Tự quét toàn bộ clipart</div></div>';
    autoBtn.onmouseover = function() { autoBtn.style.background = '#F0FDF4'; };
    autoBtn.onmouseout = function() { autoBtn.style.background = 'none'; };
    autoBtn.onclick = function() { popup.remove(); scanClipartsOrchestrated('fab'); };

    // Manual Scan button
    var manualBtn = document.createElement('button');
    manualBtn.style.cssText = btnStyle;
    manualBtn.innerHTML = '<span style="font-size:20px;">✋</span><div><div style="font-weight:700;">Manual Scan</div><div style="font-size:11px;color:#64748B;margin-top:1px;">Mở panel trống, tự pick clipart</div></div>';
    manualBtn.onmouseover = function() { manualBtn.style.background = '#FFFBEB'; };
    manualBtn.onmouseout = function() { manualBtn.style.background = 'none'; };
    manualBtn.onclick = function() { popup.remove(); startManualScanOrchestrated(); };

    // Divider
    var divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:#E5E7EB;margin:4px 0;';

    popup.appendChild(autoBtn);
    popup.appendChild(divider);
    popup.appendChild(manualBtn);
    document.body.appendChild(popup);

    // Close popup when clicking outside
    setTimeout(function() {
      function closePopup(e) {
        if (!popup.contains(e.target) && e.target.id !== 'sts-clip-fab') {
          popup.remove();
          document.removeEventListener('click', closePopup, true);
        }
      }
      document.addEventListener('click', closePopup, true);
    }, 100);
  }

  // Hotkey Alt+C for auto scan, Alt+Shift+C for manual scan
  document.addEventListener('keydown', async (e) => {
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (!(await ensureClipartLoggedIn())) return;
      if (e.shiftKey) startManualScanOrchestrated();
      else scanClipartsOrchestrated('hotkey');
    }
  });


  var panelFacade = window.STSClipartScanner && window.STSClipartScanner.panel;
  if (panelFacade && typeof panelFacade.registerRenderer === 'function') {
    panelFacade.registerRenderer(legacyShowClipartPanelImpl);
  }


  function buildScannerContext() {
    var entrypointId = arguments.length > 0 ? arguments[0] : null;
    return {
      CLIPART: CLIPART,
      utils: window.STSClipartScanner && window.STSClipartScanner.utils,
      siteRouter: window.STSClipartScanner && window.STSClipartScanner.siteRouter,
      ui: window.STSClipartScanner && window.STSClipartScanner.ui,
      render: window.STSClipartScanner && window.STSClipartScanner.render,
      exportModule: window.STSClipartScanner && window.STSClipartScanner.export,
      sync: window.STSClipartScanner && window.STSClipartScanner.sync,
      showProgress: showProgress,
      clearProgress: clearProgress,
      clipNotify: clipNotify,
      showClipartPanel: showClipartPanel,
      resetClipartPanelData: resetClipartPanelData,
      ensureClipartLoggedIn: ensureClipartLoggedIn,
      cleanupAllPickModes: cleanupAllPickModes,
      mergeVisibleGroupsIntoData: mergeVisibleGroupsIntoData,
      normalizeClipartData: normalizeClipartData,
      getCurrentProfile: getUnifiedSiteProfile,
      getManualProfileForHost: getManualProfileForHost,
      entrypointId: entrypointId || null,
      coreFns: {
        scanClipartsLegacy: scanCliparts,
        scanDOMLegacy: scanDOM,
        appendCurrentVisibleStateLegacy: appendCurrentVisibleState,
        getManualTitleCandidatesLegacy: getManualTitleCandidates,
        hasManualDrivenAutoCandidatesLegacy: hasManualDrivenAutoCandidates,
        collectManualGroupViaResolverLegacy: collectManualGroupViaResolver,
        collectManualGroupViaLegacyContainerLegacy: collectManualGroupViaLegacyContainer,
        startManualScanLegacy: startManualScan,
        activateManualPickLegacy: activateManualPick,
        deactivateManualPickLegacy: deactivateManualPick,
        activateScreenshotPickLegacy: activateScreenshotPick,
        captureSingleGroupLegacy: captureSingleGroup,
        captureTabLegacy: captureTab
      }
    };
  }

  function scanClipartsOrchestrated(entrypointId) {
    var m = window.STSClipartScanner && window.STSClipartScanner.auto;
    if (m && typeof m.scanCliparts === 'function') return m.scanCliparts(buildScannerContext(entrypointId || null));
    return scanCliparts();
  }

  function startManualScanOrchestrated() {
    var m = window.STSClipartScanner && window.STSClipartScanner.manual;
    if (m && typeof m.startManualScan === 'function') return m.startManualScan(buildScannerContext());
    return startManualScan();
  }
  function activateScreenshotPickOrchestrated(data, onRefresh) {
    var m = window.STSClipartScanner && window.STSClipartScanner.screenshot;
    if (m && typeof m.activateScreenshotPick === 'function') return m.activateScreenshotPick(buildScannerContext(), data, onRefresh);
    return activateScreenshotPick(data, onRefresh);
  }

  // Export
  window.__stsClipartPro = {
    scan: async function(entrypointId) {
      if (!(await ensureClipartLoggedIn())) return false;
      return scanClipartsOrchestrated(entrypointId || 'external-api');
    },
    manualScan: async function() {
      if (!(await ensureClipartLoggedIn())) return false;
      return startManualScan();
    },
    getState: () => ({
      isScanning: CLIPART.isScanning,
      hasScan: !!CLIPART.capturedData,
      categoryCount: CLIPART.categories.length,
    }),
  };

  // Expose FAB dependencies for dedicated FAB manager
  window.__stsEnsureClipartLoggedIn = ensureClipartLoggedIn;
  window.__stsIsClipartAuthenticated = isClipartAuthenticated;
  window.__stsShowScanModePopup = showScanModePopup;
  window.__stsOpenClipartPanelFromFab = openClipartPanelFromFab;
  window.__stsIsClipartPanelOpen = isClipartPanelOpen;
  window.__stsOnClipartPanelVisibilityChange = onClipartPanelVisibilityChange;

  // Init: FAB manager bootstrap (top-window-only/auth-gated logic handled by manager)
  function initClipart() {
    if (window.__stsFabManager && typeof window.__stsFabManager.init === 'function') {
      window.__stsFabManager.init();
      console.log('[STS Clipart Pro 8.3 Clipart] FAB manager initialized');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClipart);
  else setTimeout(initClipart, 1000); // Delay for JS-rendered pages

  } catch(e) { console.error('[STS Clipart Pro 8.3 Clipart] FATAL INIT ERROR:', e); }
})();
