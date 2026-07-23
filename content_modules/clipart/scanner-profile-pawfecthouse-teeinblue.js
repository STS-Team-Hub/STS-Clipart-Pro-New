(function() {
  'use strict';

  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\bUpload Guidelines\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isHidden(el) {
    if (!el || !el.getAttribute) return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return true;
    var cls = String(el.className || '');
    return /\b(sr-only|hidden|d-none|hide)\b/i.test(cls);
  }

  function firstNonEmpty(values) {
    for (var i = 0; i < values.length; i++) {
      var v = cleanText(values[i]);
      if (v) return v;
    }
    return '';
  }

  function imageFrom(el) {
    if (!el || !el.querySelector) return '';
    var img = el.querySelector('img, .tee-clipart-thumbnail');
    if (!img) return '';
    return img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src') || '';
  }

  function isSelected(item, input) {
    if (input && input.checked) return true;
    var cls = String((item && item.className) || '') + ' ' + String((item && item.parentElement && item.parentElement.className) || '');
    return /\b(active|selected|checked|is-selected)\b/i.test(cls);
  }

  function optionObject(value, extra) {
    value = cleanText(value);
    if (!value && !(extra && extra.imageUrl)) return null;
    return Object.assign({
      label: value,
      textContent: value,
      value: value,
      name: value,
      imageUrl: null,
      capturedImage: null,
      bgColor: null,
      optionType: 'text',
      sourceKind: 'pawfecthouse-teeinblue'
    }, extra || {});
  }

  function getRoot(doc) {
    doc = doc || document;
    return doc.querySelector('#teeFormInputs, .tee-customization-form.tee-form-inputs');
  }

  function getGroups(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('.tee-field')).filter(function(group) {
      if (isHidden(group)) return false;
      var title = cleanText((getTitleElement(group) || {}).textContent || '');
      if (!title || /^[-\s]+$/.test(title)) return false;
      return collectOptions(group).length > 0;
    });
  }

  function getTitleElement(group) {
    return group && group.querySelector('.tee-field__heading');
  }

  function optionFromClipart(item) {
    if (!item || isHidden(item)) return null;
    var input = item.querySelector('input[type="radio"], input[type="checkbox"], input[value]');
    var label = item.querySelector('.tee-clipart-label, label') || item;
    var img = imageFrom(item);
    var value = firstNonEmpty([
      label && label.getAttribute && label.getAttribute('data-title'),
      item.getAttribute && item.getAttribute('data-title'),
      label && label.getAttribute && label.getAttribute('title'),
      label && label.getAttribute && label.getAttribute('aria-label'),
      item.getAttribute && item.getAttribute('aria-label'),
      item.getAttribute && item.getAttribute('title'),
      label && label.textContent,
      input && (input.getAttribute('value') || input.value)
    ]);
    var opt = optionObject(value || (input && input.getAttribute('value')) || '', {
      value: value || (input && (input.getAttribute('value') || input.value)) || '',
      name: input && (input.name || input.getAttribute('name')) || value,
      imageUrl: img || null,
      capturedImage: img || null,
      optionType: img ? 'image' : 'text',
      sourceKind: 'teeinblue-clipart'
    });
    if (opt && isSelected(item, input)) opt.isSelected = true;
    return opt;
  }

  function optionFromSelect(select, option) {
    if (!option || option.disabled) return null;
    var value = firstNonEmpty([option.textContent, option.getAttribute('label'), option.getAttribute('value')]);
    if (!value || /^(choose|select|please select)/i.test(value)) return null;
    return optionObject(value, {
      value: option.getAttribute('value') || value,
      name: select && (select.name || select.getAttribute('name')) || value,
      optionType: 'text',
      sourceKind: 'teeinblue-select'
    });
  }

  function optionFromTextInput(input) {
    if (!input || isHidden(input)) return null;
    var tag = String(input.tagName || '').toUpperCase();
    var label = firstNonEmpty([
      input.getAttribute('placeholder'),
      input.getAttribute('aria-label'),
      input.getAttribute('name'),
      input.value
    ]);
    if (!label) label = tag === 'TEXTAREA' ? 'Text Area' : 'Text';
    return optionObject(label, {
      value: cleanText(input.value || input.getAttribute('value') || label),
      name: cleanText(input.name || input.getAttribute('name') || label),
      optionType: tag === 'TEXTAREA' ? 'textarea' : 'text',
      sourceKind: tag === 'TEXTAREA' ? 'teeinblue-textarea' : 'teeinblue-text-input',
      hasVisual: false,
      needsCapture: false,
      placeholder: cleanText(input.getAttribute('placeholder')),
      maxlength: input.getAttribute('maxlength') || ''
    });
  }

  function optionFromPhotoInput(input) {
    if (!input || isHidden(input)) return null;
    var name = cleanText(input.name || input.getAttribute('name') || input.id || 'Upload Photo');
    return optionObject(name, {
      value: cleanText(input.getAttribute('accept') || name),
      name: name,
      optionType: 'file',
      sourceKind: 'teeinblue-photo-input',
      hasVisual: false,
      needsCapture: false,
      accept: cleanText(input.getAttribute('accept'))
    });
  }

  function collectOptions(group) {
    if (!group) return [];
    var out = [];
    Array.from(group.querySelectorAll('.tee-clipart')).forEach(function(item) {
      var opt = optionFromClipart(item);
      if (opt) out.push(opt);
    });
    Array.from(group.querySelectorAll('select.tee-field__select, select')).forEach(function(select) {
      if (isHidden(select)) return;
      Array.from(select.options || select.querySelectorAll('option')).forEach(function(option) {
        var opt = optionFromSelect(select, option);
        if (opt) out.push(opt);
      });
    });
    Array.from(group.querySelectorAll('input[type="text"], textarea')).forEach(function(input) {
      var opt = optionFromTextInput(input);
      if (opt) out.push(opt);
    });
    Array.from(group.querySelectorAll('input[type="file"], .tee-photo-input')).forEach(function(input) {
      var opt = optionFromPhotoInput(input);
      if (opt) out.push(opt);
    });
    return out;
  }

  function mapGroup(group) {
    var title = cleanText((getTitleElement(group) || {}).textContent || '');
    var options = collectOptions(group);
    if (!title || /^[-\s]+$/.test(title) || !options.length) return null;
    return { name: title, label: title, title: title, options: options };
  }

  var profile = {
    id: 'pawfecthouse-teeinblue',
    name: 'Pawfecthouse TeeInBlue',
    hosts: ['pawfecthouse.com', '*.pawfecthouse.com'],
    detect: function(ctx) {
      var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase();
      return host === 'pawfecthouse.com' || host.endsWith('.pawfecthouse.com');
    },
    scanPage: function(ctx) {
      var doc = (ctx && ctx.document) || document;
      var root = getRoot(doc);
      return getGroups(root).map(mapGroup).filter(Boolean);
    },
    scanVisibleState: function(ctx) { return this.scanPage(ctx); },
    scanManualGroupFromTitle: function(titleEl) {
      return mapGroup(titleEl && titleEl.closest && titleEl.closest('.tee-field'));
    },
    collectOptionsInContainer: function(containerEl) { return collectOptions(containerEl); },
    detectNearestGroupTitleFromOption: function(optionEl) {
      var group = optionEl && optionEl.closest && optionEl.closest('.tee-field');
      var title = getTitleElement(group);
      return cleanText(title && title.textContent);
    }
  };

  if (ns.profiles && typeof ns.profiles.register === 'function') ns.profiles.register(profile);
})();
