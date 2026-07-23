// STS Clipart Pro 8.3 — Dropdown detection helpers.
(function () {
  'use strict';

  function isVisibleForScan(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (!r || (r.width < 1 && r.height < 1)) return false;
    try {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
    } catch (_) {}
    return true;
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
    var raw = document.querySelectorAll(
      '.ant-select, input[role="combobox"], [role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"][aria-expanded], input[aria-controls][aria-expanded], input[aria-controls][role="combobox"], .react-select__control, [class*="react-select"][class*="-control"], [class*="select__control"]'
    );
    var seen = new Set();
    var out = [];
    raw.forEach(function (node) {
      var ctrl = normalizeDropdownControl(node);
      if (!ctrl || ctrl.tagName === 'SELECT' || seen.has(ctrl)) return;
      seen.add(ctrl);
      out.push(ctrl);
    });
    return out;
  }

  window.STSDropdownDetection = {
    isVisibleForScan: isVisibleForScan,
    normalizeDropdownControl: normalizeDropdownControl,
    collectCustomDropdownControls: collectCustomDropdownControls,
  };
})();
