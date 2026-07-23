(function() {
  'use strict';

  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\bRequired\b/gi, ' ')
      .replace(/\(\s*\d+\s*\|\s*\d+\s*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanNameLike(value) {
    var raw = String(value || '');
    var m = raw.match(/properties\[(.+?)\]/i);
    return cleanText(m ? m[1] : raw);
  }

  function isHidden(el) {
    if (!el || !el.getAttribute) return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return true;
    var cls = String(el.className || '');
    return /\b(hidden|d-none|hide|sr-only)\b/i.test(cls);
  }

  function isSelected(el, input) {
    if (input && input.checked) return true;
    var cls = String((el && el.className) || '') + ' ' + String((el && el.parentElement && el.parentElement.className) || '');
    return /\b(active|selected|checked|is-selected|label-focus)\b/i.test(cls);
  }

  function imageFrom(el) {
    if (!el || !el.querySelector) return '';
    var img = el.querySelector('img, .sl-icon img, .customily-swatch img');
    if (!img) return '';
    return img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
  }

  function cssUrl(value) {
    var raw = String(value || '');
    var m = raw.match(/url\((['"]?)(.*?)\1\)/i);
    return m && m[2] ? m[2].trim() : '';
  }

  function backgroundImageFrom(el) {
    if (!el || !el.getAttribute) return '';
    var style = String(el.getAttribute('style') || '');
    var sl = style.match(/--sl-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
    if (sl && sl[2]) return sl[2].trim();
    var bg = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
    if (bg && bg[2]) return bg[2].trim();
    try {
      var cs = window.getComputedStyle && window.getComputedStyle(el);
      var cssVar = cs && cs.getPropertyValue && cs.getPropertyValue('--sl-image');
      var fromVar = cssUrl(cssVar);
      if (fromVar) return fromVar;
      var bgImg = cs && cs.backgroundImage;
      var fromBg = bgImg && bgImg !== 'none' ? cssUrl(bgImg) : '';
      if (fromBg) return fromBg;
    } catch (e) {}
    return '';
  }

  function backgroundFrom(el) {
    if (!el || !el.getAttribute) return '';
    var image = backgroundImageFrom(el);
    if (image) return image;
    var style = String(el.getAttribute('style') || '');
    var m = style.match(/background(?:-color)?:\s*([^;]+)/i);
    if (m && m[1]) return m[1].trim();
    try {
      var cs = window.getComputedStyle && window.getComputedStyle(el);
      var bg = cs && cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    } catch (e) {}
    return '';
  }

  function optionObject(value, extra) {
    value = cleanText(value);
    if (!value && !(extra && (extra.imageUrl || extra.bgColor))) return null;
    return Object.assign({
      label: value,
      textContent: value,
      value: value,
      name: value,
      imageUrl: null,
      capturedImage: null,
      bgColor: null,
      optionType: 'text',
      sourceKind: 'geckocustom'
    }, extra || {});
  }

  function collectShoplineOptions(groupEl) {
    var out = [];
    Array.from(groupEl.querySelectorAll('.sl-swatch-item')).forEach(function(item) {
      if (isHidden(item)) return;
      var input = item.querySelector('input[type="radio"], input[type="checkbox"]');
      var labelEl = item.querySelector('label') || item;
      var img = imageFrom(item) || backgroundImageFrom(labelEl) || backgroundImageFrom(item);
      var value = cleanText(
        (labelEl && labelEl.getAttribute && (labelEl.getAttribute('data-title') || labelEl.getAttribute('title') || labelEl.getAttribute('aria-label'))) ||
        (input && (input.getAttribute('value') || input.value)) ||
        (item.getAttribute && (item.getAttribute('data-value') || item.getAttribute('data-title') || item.getAttribute('data-option-id'))) ||
        (labelEl && labelEl.textContent) ||
        ''
      );
      var opt = optionObject(value || cleanNameLike(input && input.name), {
        name: cleanNameLike(input && input.name) || value,
        imageUrl: img || null,
        capturedImage: img || null,
        bgColor: img ? null : (backgroundFrom(labelEl) || backgroundFrom(item) || null),
        optionType: img ? 'image' : 'text',
        sourceKind: 'geckocustom-shopline-swatch'
      });
      if (opt) {
        if (isSelected(item, input)) opt.isSelected = true;
        out.push(opt);
      }
    });

    Array.from(groupEl.querySelectorAll('input[type="text"], textarea')).forEach(function(input) {
      if (isHidden(input)) return;
      var label = cleanNameLike(input.name || input.getAttribute('name')) || cleanText(input.getAttribute('placeholder')) || 'Text';
      var value = cleanText(input.value || input.getAttribute('value') || input.getAttribute('placeholder') || label);
      var opt = optionObject(label || value, {
        value: value || label,
        name: label,
        optionType: String(input.tagName || '').toUpperCase() === 'TEXTAREA' ? 'textarea' : 'text',
        sourceKind: 'geckocustom-shopline-text-input',
        hasVisual: false,
        needsCapture: false,
        placeholder: cleanText(input.getAttribute('placeholder')),
        maxlength: input.getAttribute('maxlength') || ''
      });
      if (opt) out.push(opt);
    });

    return out;
  }

  function collectCustomilyOptions(groupEl) {
    var out = [];
    Array.from(groupEl.querySelectorAll('.customily-swatch')).forEach(function(item) {
      if (isHidden(item)) return;
      var input = item.querySelector('input[type="radio"], input[type="checkbox"]');
      var labelEl = item.querySelector('label') || item;
      var img = imageFrom(item) || backgroundImageFrom(labelEl) || backgroundImageFrom(item);
      var value = cleanText(
        (labelEl && labelEl.getAttribute && (labelEl.getAttribute('data-title') || labelEl.getAttribute('title') || labelEl.getAttribute('aria-label'))) ||
        (input && (input.getAttribute('value') || input.value)) ||
        (labelEl && labelEl.textContent) ||
        ''
      );
      var bg = img ? '' : (backgroundFrom(labelEl) || backgroundFrom(item));
      var opt = optionObject(value || cleanNameLike(input && input.name), {
        name: cleanNameLike(input && input.name) || value,
        imageUrl: img || null,
        capturedImage: img || null,
        bgColor: bg || null,
        optionType: img ? 'image' : (bg ? 'color' : 'text'),
        sourceKind: 'geckocustom-customily-swatch'
      });
      if (opt) {
        if (isSelected(item, input)) opt.isSelected = true;
        out.push(opt);
      }
    });

    Array.from(groupEl.querySelectorAll('input[type="text"], textarea')).forEach(function(input) {
      if (isHidden(input)) return;
      var label = cleanNameLike(input.name || input.getAttribute('name')) || cleanText(input.getAttribute('placeholder')) || 'Text';
      var value = cleanText(input.value || input.getAttribute('value') || input.getAttribute('placeholder') || label);
      var opt = optionObject(label || value, {
        value: value || label,
        name: label,
        optionType: String(input.tagName || '').toUpperCase() === 'TEXTAREA' ? 'textarea' : 'text',
        sourceKind: 'geckocustom-customily-text-input',
        hasVisual: false,
        needsCapture: false,
        placeholder: cleanText(input.getAttribute('placeholder')),
        maxlength: input.getAttribute('maxlength') || ''
      });
      if (opt) out.push(opt);
    });

    return out;
  }

  function getRoot(doc) {
    doc = doc || document;
    return doc.querySelector('#customily-options, #cl_optionsapp, .customily-options-wrapper, #global-option-set');
  }

  function getGroups(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('.sl-option-set-item, .customily_option')).filter(function(group) {
      return !isHidden(group) && !!getTitleElement(group);
    });
  }

  function getTitleElement(group) {
    return group && group.querySelector('.sl-option-set-item_label, .option_name');
  }

  function collectOptions(group) {
    if (!group) return [];
    var cls = String(group.className || '');
    return /customily_option/i.test(cls) ? collectCustomilyOptions(group) : collectShoplineOptions(group);
  }

  function mapGroup(group) {
    var titleEl = getTitleElement(group);
    var name = cleanText(titleEl && titleEl.textContent);
    var options = collectOptions(group);
    if (!name || !options.length) return null;
    return { name: name, label: name, title: name, options: options };
  }

  var profile = {
    id: 'geckocustom',
    name: 'GeckoCustom',
    hosts: ['geckocustom.com', '*.geckocustom.com'],
    detect: function(ctx) {
      var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase();
      return host === 'geckocustom.com' || host.endsWith('.geckocustom.com');
    },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: function(groupEl) {
      return collectOptions(groupEl).map(function(opt) { return opt && opt.element; }).filter(Boolean);
    },
    isValidGroup: function(groupEl) {
      var titleEl = getTitleElement(groupEl);
      var name = cleanText(titleEl && titleEl.textContent);
      return !!name && collectOptions(groupEl).length > 0;
    },
    cleanupTitle: cleanText,
    cleanupValue: cleanText,
    scanPage: function(ctx) {
      var doc = (ctx && ctx.document) || document;
      var root = getRoot(doc);
      return getGroups(root).map(mapGroup).filter(Boolean);
    },
    scanVisibleState: function(ctx) { return this.scanPage(ctx); },
    scanManualGroupFromTitle: function(titleEl) {
      return mapGroup(titleEl && titleEl.closest && titleEl.closest('.sl-option-set-item, .customily_option'));
    },
    collectOptionsInContainer: function(containerEl) { return collectOptions(containerEl); },
    detectNearestGroupTitleFromOption: function(optionEl) {
      var group = optionEl && optionEl.closest && optionEl.closest('.sl-option-set-item, .customily_option');
      var title = getTitleElement(group);
      return cleanText(title && title.textContent);
    }
  };

  if (ns.profiles && typeof ns.profiles.register === 'function') ns.profiles.register(profile);
})();
