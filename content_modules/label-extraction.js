// STS Clipart Pro 8.3 — Label extraction helpers.
(function () {
  'use strict';

  function normScanText(v) {
    return String(v || '').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
  }

  function cssEscapeSafe(v) {
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(v || ''));
    } catch (_) {}
    return String(v || '').replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
  }

  function isChromeLikeLabel(label) {
    var t = normScanText(label).toLowerCase();
    if (!t) return true;
    return /^(search|sort|filter|currency|country|language|newsletter|email|quantity|shipping|delivery|tracking|track order)$/.test(t);
  }

  function sequentialPrefix(index) {
    if (index < 26) return String.fromCharCode(65 + index);
    var first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    var second = String.fromCharCode(65 + (index % 26));
    return first + second;
  }

  window.STSLabelExtraction = {
    normScanText: normScanText,
    cssEscapeSafe: cssEscapeSafe,
    isChromeLikeLabel: isChromeLikeLabel,
    sequentialPrefix: sequentialPrefix,
  };
})();
