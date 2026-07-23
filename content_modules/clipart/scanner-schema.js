(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function normalizeText(v) {
    if (ns.utils && typeof ns.utils.normScanText === 'function') return ns.utils.normScanText(v);
    if (window.STSLabelExtraction && typeof window.STSLabelExtraction.normScanText === 'function') return window.STSLabelExtraction.normScanText(v);
    return String(v || '').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
  }

  function sequentialPrefix(index) {
    if (window.STSLabelExtraction && typeof window.STSLabelExtraction.sequentialPrefix === 'function') {
      return window.STSLabelExtraction.sequentialPrefix(index);
    }
    if (index < 26) return String.fromCharCode(65 + index);
    var first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    var second = String.fromCharCode(65 + (index % 26));
    return first + second;
  }

  function sanitizeGroupPrefix(value, fallback) {
    var clean = String(value == null ? '' : value).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (clean) return clean;
    var fallbackClean = String(fallback == null ? '' : fallback).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    return fallbackClean || 'A';
  }

  function isStandaloneTitleCategory(cat) { return !!(cat && cat.kind === 'title-only'); }

  function makeStsUid(prefix) { return String(prefix || 'sts') + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function ensureClipartCategoryId(cat) { if (!cat || typeof cat !== 'object') return ''; if (!cat._stsId) cat._stsId = makeStsUid('cat'); return cat._stsId; }
  function ensureClipartOptionId(opt) { if (!opt || typeof opt !== 'object') return ''; if (!opt._stsId) opt._stsId = makeStsUid('opt'); return opt._stsId; }
  function isTextItemOption(opt) { return !!(opt && opt.kind === 'text-item'); }

  function getNextAvailableCategoryPrefix(categories) {
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

  function createOption(raw) {
    var opt = (raw && typeof raw === 'object') ? raw : {};
    ensureClipartOptionId(opt);
    if (typeof opt.textContent !== 'string') opt.textContent = '';
    if (typeof opt.label !== 'string') opt.label = '';
    if (typeof opt.bgColor !== 'string') opt.bgColor = opt.bgColor ? String(opt.bgColor) : '';
    if (!('capturedImage' in opt)) opt.capturedImage = opt.imageUrl || null;
    if (!('imageUrl' in opt)) opt.imageUrl = opt.capturedImage || null;
    if (isTextItemOption(opt)) {
      opt.capturedImage = null; opt.imageUrl = null; opt.bgColor = '';
      if (!opt.textStyle || typeof opt.textStyle !== 'object') opt.textStyle = {};
      if (!opt.textStyle.color) opt.textStyle.color = '#111827';
      if (!opt.textStyle.background) opt.textStyle.background = '#FFFFFF';
      if (!opt.textStyle.align) opt.textStyle.align = 'left';
    }
    return opt;
  }

  function createCategory(raw, idx) {
    var cat = (raw && typeof raw === 'object') ? raw : {};
    ensureClipartCategoryId(cat);
    if (!Array.isArray(cat.options)) cat.options = [];
    cat.options = cat.options.map(function(opt) { return createOption(opt); });
    if (isStandaloneTitleCategory(cat)) {
      cat.prefix = '';
      if (!cat.name) cat.name = 'Tiêu đề lớn';
      if (!cat.titleLine || typeof cat.titleLine !== 'object') cat.titleLine = {};
      if (typeof cat.titleLine.text !== 'string' || cat.titleLine.text === 'Woman') cat.titleLine.text = 'Personalized-Option';
      if (!cat.titleLine.color) cat.titleLine.color = '#0F172A';
      if (!cat.titleLine.background) cat.titleLine.background = '#FFF7ED';
      if (!cat.titleLine.fontSize || cat.titleLine.fontSize === 30) cat.titleLine.fontSize = 40;
      if (!cat.titleLine.align) cat.titleLine.align = 'center';
      cat.options = []; cat.optionCount = 0;
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
    cat.optionCount = cat.options.length;
    cat.options.forEach(function(opt, i) { opt.label = cat.prefix + (i + 1); });
    return cat;
  }

  function normalizeClipartData(data) {
    if (!data || !Array.isArray(data.categories)) return;
    data.categories = data.categories.map(function(cat, idx) { return createCategory(cat, idx); });
  }

  ns.schema = Object.assign({}, ns.schema || {}, {
    normalizeText: normalizeText,
    normScanText: normalizeText,
    getNextAvailableCategoryPrefix: getNextAvailableCategoryPrefix,
    createOption: createOption,
    createCategory: createCategory,
    normalizeClipartData: normalizeClipartData,
    isStandaloneTitleCategory: isStandaloneTitleCategory,
    sanitizeGroupPrefix: sanitizeGroupPrefix,
    sequentialPrefix: sequentialPrefix,
    ensureClipartCategoryId: ensureClipartCategoryId,
    ensureClipartOptionId: ensureClipartOptionId
  });
})();
