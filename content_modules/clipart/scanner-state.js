(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function addCategory(data, cat, insertIdx) {
    if (!data || !Array.isArray(data.categories)) return false;
    var schema = ns.schema || {};
    var idx = Math.max(0, Math.min(typeof insertIdx === 'number' ? insertIdx : data.categories.length, data.categories.length));
    var next = (typeof schema.createCategory === 'function') ? schema.createCategory(cat || {}, idx) : (cat || {});
    if (!next || (typeof next !== 'object')) return false;
    if (!next.kind || next.kind !== 'title-only') {
      var hasConflict = data.categories.some(function(existing) {
        if (!existing || (schema.isStandaloneTitleCategory && schema.isStandaloneTitleCategory(existing))) return false;
        var a = schema.sanitizeGroupPrefix ? schema.sanitizeGroupPrefix(existing.prefix || '', '') : String(existing.prefix || '');
        var b = schema.sanitizeGroupPrefix ? schema.sanitizeGroupPrefix(next.prefix || '', '') : String(next.prefix || '');
        return a && b && a === b;
      });
      if ((!next.prefix || hasConflict) && typeof schema.getNextAvailableCategoryPrefix === 'function') {
        next.prefix = schema.getNextAvailableCategoryPrefix(data.categories);
        if (typeof schema.createCategory === 'function') next = schema.createCategory(next, idx);
      }
    }
    data.categories.splice(idx, 0, next);
    if (typeof schema.normalizeClipartData === 'function') schema.normalizeClipartData(data);
    return true;
  }

  function mergeCategories(target, incoming) {
    var out = Array.isArray(target) ? target.slice() : [];
    if (!Array.isArray(incoming)) return out;
    var schema = ns.schema || {};
    var byName = Object.create(null);
    out.forEach(function(cat, i) {
      var key = (schema.normalizeText ? schema.normalizeText(cat && cat.name) : String(cat && cat.name || '')).toLowerCase();
      if (key) byName[key] = i;
    });
    incoming.forEach(function(cat) {
      var key = (schema.normalizeText ? schema.normalizeText(cat && cat.name) : String(cat && cat.name || '')).toLowerCase();
      if (!key || typeof byName[key] !== 'number') out.push(cat);
    });
    return out;
  }

  function startManualScanState(state, metadata) {
    if (!state || typeof state !== 'object') return null;
    var meta = metadata || {};
    var data = {
      url: meta.url || (window.location && window.location.href) || '',
      title: meta.title || document.title || '',
      platform: meta.platform || 'custom',
      scannedAt: meta.scannedAt || new Date().toISOString(),
      categories: []
    };
    state.categories = [];
    state.capturedData = data;
    state.isScanning = false;
    if (schema.normalizeClipartData) schema.normalizeClipartData(data);
    return data;
  }

  ns.state = Object.assign({}, ns.state || {}, {
    addCategory: addCategory,
    mergeCategories: mergeCategories,
    startManualScanState: startManualScanState
  });
})();
