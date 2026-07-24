(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var STS_CLIPART_BUILD = '8.3.0';
  if (document && document.documentElement && typeof document.documentElement.setAttribute === 'function') {
    document.documentElement.setAttribute('data-sts-pawesomehouse-profile-loaded', '1');
    if (typeof document.documentElement.getAttribute !== 'function' || !document.documentElement.getAttribute('data-sts-clipart-build')) {
      document.documentElement.setAttribute('data-sts-clipart-build', STS_CLIPART_BUILD);
    }
  }
  console.log('[STS BUILD] pawesomehouse-customily profile loaded ' + STS_CLIPART_BUILD);

  function isManualDebugEnabled(doc) {
    var d = doc || document;
    if (!d || !d.documentElement) return !!window.__STS_CLIPART_DEBUG_MANUAL_PICK;
    return d.documentElement.getAttribute('data-sts-clipart-debug-manual-pick') === '1' || !!window.__STS_CLIPART_DEBUG_MANUAL_PICK;
  }

  function cleanText(v) {
    return String(v || '')
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\bRequired\b/gi, ' ')
      .replace(/^\s*Option\s+\d+\s+of\s+\d+\s*/i, ' ')
      .replace(/\b(select image|replace|submit|add|preview|continue)\b/gi, ' ')
      .replace(/\(\s*\d+\s*\|\s*\d+\s*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanNameLike(v) {
    var raw = String(v || '');
    var m = raw.match(/properties\[(.+?)\]/i);
    return cleanText(m ? m[1] : raw);
  }

  function isSelectedSwatch(swatch, input, label) {
    if (input && input.checked) return true;
    var el = label || swatch;
    var cls = String((el && el.className) || '') + ' ' + String((swatch && swatch.className) || '');
    return /\b(selected|active|is-selected|label-focus|focus|checked)\b/i.test(cls);
  }

  function getSwatchColor(swatch, label) {
    var target = label || swatch;
    if (!target) return null;
    var inline = String(target.getAttribute && (target.getAttribute('style') || '') || '');
    var m = inline.match(/background(?:-color)?:\s*([^;]+)/i);
    if (m && m[1]) return m[1].trim();
    try {
      var cs = window.getComputedStyle(target);
      var bg = cs && cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    } catch (e) {}
    return null;
  }

  function extractCustomilyGroupName(groupEl, titleEl) {
    var optionNameEl = groupEl && groupEl.querySelector('.option_name');
    var fromOptionName = optionNameEl ? cleanText(optionNameEl.textContent) : '';
    if (fromOptionName) return fromOptionName;
    var namedInput = groupEl && groupEl.querySelector('input[name], select[name], textarea[name]');
    var fromNameAttr = cleanNameLike(namedInput && namedInput.getAttribute && namedInput.getAttribute('name'));
    if (fromNameAttr) return fromNameAttr;
    return cleanText(titleEl && titleEl.textContent);
  }

  function isPlaceholderOption(optionEl) {
    var value = cleanText(optionEl && optionEl.value);
    var text = cleanText(optionEl && optionEl.textContent);
    var combined = (value + ' ' + text).toLowerCase();
    if (!value && !text) return true;
    return /^(select|choose|please select|pick one)$/i.test(value) ||
      /^(select|choose|please select|pick one)/i.test(text) ||
      /\b(select image|replace|submit|add|preview|continue)\b/i.test(combined);
  }

  function isUploadOrTextOnlyGroup(groupEl) {
    if (!groupEl || !groupEl.querySelectorAll) return false;
    var hasSelect = groupEl.querySelectorAll('select').length > 0;
    var hasSwatch = groupEl.querySelectorAll('.customily-swatch.swatch, .customily-swatch').length > 0;
    if (hasSelect || hasSwatch) return false;
    var fileInputs = groupEl.querySelectorAll('input[type="file"]').length;
    var textareas = groupEl.querySelectorAll('textarea').length;
    var textInputs = groupEl.querySelectorAll('input[type="text"], input:not([type]), input[type="email"], input[type="tel"], input[type="number"]').length;
    return (fileInputs + textareas + textInputs) > 0;
  }

  function extractCustomilyOptions(groupEl, opts) {
    var includeFormInputs = !!(opts && opts.includeFormInputs);
    var options = [];
    var swatches = Array.from(groupEl.querySelectorAll('.customily-swatch.swatch'));
    if (!swatches.length) {
      swatches = Array.from(groupEl.querySelectorAll('.customily-swatch'));
    }
    swatches.forEach(function(swatch) {
      var input = swatch.querySelector('input[type="radio"]') || swatch.querySelector('input[type="checkbox"]');
      if (!input) return;
      var label = swatch.querySelector('label') || swatch;
      var img = label && label.querySelector ? label.querySelector('img') : null;
      var value = cleanText(input && input.value);
      var name = cleanNameLike(input && (input.name || (input.getAttribute && input.getAttribute('name'))));
      var imageUrl = img ? (img.getAttribute('src') || img.src || '') : '';
      var altText = cleanText(img && img.getAttribute('alt'));
      var rawText = cleanText(label && label.textContent);
      var textContent = altText || value || rawText || name;
      var bgColor = imageUrl ? null : getSwatchColor(swatch, label);
      var selected = isSelectedSwatch(swatch, input, label);
      var hasImage = !!imageUrl;
      var option = {
        label: textContent || value || name || '',
        textContent: textContent || '',
        value: value || textContent || '',
        name: name || '',
        imageUrl: imageUrl || null,
        capturedImage: imageUrl || null,
        bgColor: bgColor || null,
        optionType: hasImage ? 'image' : (bgColor ? 'color' : 'text'),
        sourceKind: 'customily-swatch'
      };
      if (selected) option.isSelected = true;
      if (option.value || option.textContent || option.imageUrl || option.bgColor) options.push(option);
    });

    var selects = Array.from(groupEl.querySelectorAll('select[name^="properties["]'));
    selects.forEach(function(selectEl) {
      var selectName = cleanNameLike(selectEl && (selectEl.name || (selectEl.getAttribute && selectEl.getAttribute('name'))));
      Array.from(selectEl.children || []).forEach(function(optEl) {
        if (!optEl || String(optEl.tagName || '').toUpperCase() !== 'OPTION' || optEl.disabled || isPlaceholderOption(optEl)) return;
        var value = cleanText(optEl.value || (optEl.getAttribute && optEl.getAttribute('value')) || '');
        var text = cleanText(optEl.textContent);
        if (!value && !text) return;
        options.push({
          label: text || value || selectName || '',
          textContent: text || value || '',
          value: value || text || '',
          name: selectName || '',
          imageUrl: null,
          capturedImage: null,
          bgColor: null,
          optionType: 'text',
          sourceKind: 'customily-select'
        });
      });
    });

    if (includeFormInputs) Array.from(groupEl.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), textarea')).forEach(function(inputEl) {
      if (!inputEl || (inputEl.closest && inputEl.closest('.customily-swatch'))) return;
      var tag = String(inputEl.tagName || '').toUpperCase();
      var inputType = tag === 'TEXTAREA' ? 'textarea' : String((inputEl.getAttribute('type') || 'text')).toLowerCase();
      var fieldName = cleanNameLike(inputEl.name || (inputEl.getAttribute && inputEl.getAttribute('name')) || '');
      var placeholder = cleanText(inputEl.getAttribute && inputEl.getAttribute('placeholder'));
      var value = cleanText(inputEl.value || (inputEl.getAttribute && inputEl.getAttribute('value')) || '');
      var label = cleanText(fieldName || placeholder || value || groupEl.querySelector('.option_name') && groupEl.querySelector('.option_name').textContent || 'Text');
      if (!label && !value && !placeholder) return;
      options.push({
        label: label || value || placeholder || 'Text',
        textContent: label || placeholder || value || '',
        value: value || '',
        name: fieldName || '',
        imageUrl: null,
        capturedImage: null,
        bgColor: null,
        optionType: inputType === 'textarea' ? 'textarea' : 'text',
        sourceKind: inputType === 'textarea' ? 'customily-textarea' : 'customily-text-input',
        hasVisual: false,
        needsCapture: false,
        placeholder: placeholder || '',
        maxlength: inputEl.getAttribute && inputEl.getAttribute('maxlength') != null ? String(inputEl.getAttribute('maxlength')) : '',
        inputType: inputType
      });
    });

    if (includeFormInputs) Array.from(groupEl.querySelectorAll('input[type="file"]')).forEach(function(inputEl) {
      if (!inputEl || (inputEl.closest && inputEl.closest('.customily-swatch'))) return;
      var fieldName = cleanNameLike(inputEl.name || (inputEl.getAttribute && inputEl.getAttribute('name')) || '');
      var accept = String((inputEl.getAttribute && inputEl.getAttribute('accept')) || '').trim();
      var label = fieldName || cleanText(groupEl.querySelector('.option_name') && groupEl.querySelector('.option_name').textContent) || 'Upload File';
      options.push({
        label: label,
        textContent: label,
        value: accept || label,
        name: fieldName || label,
        imageUrl: null,
        capturedImage: null,
        bgColor: null,
        optionType: 'file',
        sourceKind: 'customily-file-input',
        hasVisual: false,
        needsCapture: false,
        accept: accept || ''
      });
    });

    return options.filter(function(option) {
      return !!(option && (option.value || option.textContent || option.imageUrl || option.bgColor));
    });
  }

  function extractCustomilyGroupFromGroupEl(groupEl, ctx, titleEl) {
    if (!groupEl || !groupEl.querySelector) return null;
    var includeFormInputs = !!(ctx && ctx.includeFormInputs);
    if (!includeFormInputs && isUploadOrTextOnlyGroup(groupEl)) return null;
    var groupName = extractCustomilyGroupName(groupEl, titleEl);
    var options = extractCustomilyOptions(groupEl, { includeFormInputs: includeFormInputs });
    if (!groupName && !options.length) return null;
    return { name: groupName || 'Manual Group', options: options };
  }

  var profile = {
    id: 'pawesomehouse-customily-manual',
    name: 'Pawesomehouse Customily Manual Profile',
    hosts: ['pawesomehouse.com', '*.pawesomehouse.com'],
    detect: function(ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      var loc = c.location || window.location;
      var host = String((loc && loc.hostname) || '').toLowerCase();
      var hostMatch = host === 'pawesomehouse.com' || host.endsWith('.pawesomehouse.com');
      if (!hostMatch || !doc || !doc.querySelector) return false;
      var root = doc.querySelector('#customily-options');
      var hasGroup = !!(root && root.querySelector && root.querySelector('.customily_option'));
      var hasEnumerableSource = !!(root && root.querySelector && root.querySelector(
        '.customily-swatch.swatch, select[name^="properties["], input[name^="properties["], textarea[name^="properties["]'
      ));
      var hasCustomily = !!(root && hasGroup && hasEnumerableSource);
      if (isManualDebugEnabled(doc) && hasCustomily) {
        console.log('[STS DEBUG] pawesomehouse/customily profile matched');
      }
      return hasCustomily;
    },
    scanPage: function(ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      if (isManualDebugEnabled(doc)) {
        console.log('[STS AUTO DEBUG] pawesomehouse/customily scanPage entered');
        console.log('[STS AUTO DEBUG] auto using manual shared extractor yes');
      }
      var root = doc && doc.querySelector ? doc.querySelector('#customily-options') : null;
      if (isManualDebugEnabled(doc)) {
        console.log('[STS AUTO DEBUG] auto root found', !!root);
      }
      if (!root) return [];
      var groups = Array.from(root.querySelectorAll('.customily_option'));
      if (isManualDebugEnabled(doc)) {
        console.log('[STS AUTO DEBUG] auto groupEls count', groups.length);
      }
      if (!groups.length) {
        if (isManualDebugEnabled(doc)) {
          console.log('[STS AUTO DEBUG] final group count', 0);
        }
        return [];
      }

      var out = [];
      groups.forEach(function(groupEl) {
        var titleEl = groupEl && groupEl.querySelector ? (groupEl.querySelector('.option_name') || groupEl.querySelector('label[role="tab"]')) : null;
        var group = extractCustomilyGroupFromGroupEl(groupEl, Object.assign({}, c, { includeFormInputs: true }), titleEl);
        if (isManualDebugEnabled(doc)) {
          var first = group && group.options && group.options[0] ? group.options[0] : null;
          console.log('[STS AUTO DEBUG] group scan result', {
            groupName: group && group.name ? group.name : '',
            optionCount: group && group.options ? group.options.length : 0,
            firstOption: first ? {
              imageUrl: first.imageUrl || null,
              capturedImage: first.capturedImage || null,
              textContent: first.textContent || '',
              value: first.value || ''
            } : null
          });
        }
        if (group && group.name && Array.isArray(group.options) && group.options.length) out.push(group);
      });
      if (isManualDebugEnabled(doc)) {
        console.log('[STS AUTO DEBUG] final group count', out.length);
      }
      return out;
    },
    scanManualGroupFromTitle: function(titleEl, ctx) {
      var c = ctx || {};
      var doc = c.document || document;
      if (!titleEl || !titleEl.closest) return null;
      var groupEl = titleEl.closest('.customily_option');
      if (isManualDebugEnabled(doc)) {
        console.log('[STS MANUAL DEBUG] customily group found', !!groupEl);
      }
      if (!groupEl) return null;

      var rawGroup = extractCustomilyGroupFromGroupEl(groupEl, c, titleEl);
      if (!rawGroup) return null;

      if (isManualDebugEnabled(doc)) {
        console.log('[STS MANUAL DEBUG] customily manual group name', rawGroup.name);
        console.log('[STS MANUAL DEBUG] customily extracted option count', rawGroup.options.length);
        console.log('[STS MANUAL DEBUG] first 3 customily options', rawGroup.options.slice(0, 3));
      }

      return rawGroup;
    },
    getRoot: function(doc) {
      var d = doc || document;
      var root = d && d.querySelector ? d.querySelector('#customily-options') : null;
      if (!root || !root.querySelector || !root.querySelector('.customily_option')) return null;
      return root;
    },
    getGroups: function(root) {
      if (!root || !root.querySelectorAll) return [];
      return Array.from(root.querySelectorAll('.customily_option'));
    },
    getTitleElement: function(groupEl) {
      if (!groupEl || !groupEl.querySelector) return null;
      return groupEl.querySelector('.option_name') || groupEl.querySelector('label[role="tab"]');
    },
    cleanupTitle: function(text) {
      return cleanText(text || '');
    },
    scanHints: { source: 'customily', phase3CustomilyRollout: true, phase4CustomilyRollout: true, phase5CustomilyRollout: true, preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true, supportsFileInputs: true },
    isValidGroup: function(groupEl) {
      if (!groupEl || !groupEl.querySelector) return false;
      var titleEl = groupEl.querySelector('.option_name') || groupEl.querySelector('label[role="tab"]');
      if (!titleEl || !cleanText(titleEl.textContent || '')) return false;
      return !!extractCustomilyGroupFromGroupEl(groupEl, {}, titleEl);
    }
  };

  if (ns.profiles && typeof ns.profiles.register === 'function') {
    ns.profiles.register(profile);
  }
})();
