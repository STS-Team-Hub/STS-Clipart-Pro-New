(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function rectData(el) {
    try {
      var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r) return { x: 0, y: 0, w: 0, h: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
      return {
        x: r.x || 0,
        y: r.y || 0,
        w: r.width || 0,
        h: r.height || 0,
        top: r.top || 0,
        left: r.left || 0,
        right: r.right || 0,
        bottom: r.bottom || 0,
        width: r.width || 0,
        height: r.height || 0
      };
    } catch (e) {
      return { x: 0, y: 0, w: 0, h: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
  }

  function normScanText(v) {
    if (window.STSLabelExtraction && window.STSLabelExtraction.normScanText) {
      return window.STSLabelExtraction.normScanText(v);
    }
    return String(v || '').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
  }

  function cssEscapeSafe(v) {
    try {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(v || ''));
    } catch (e) {}
    return String(v || '').replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
  }

  ns.utils = ns.utils || {};
  ns.utils.rectData = rectData;
  ns.utils.normScanText = normScanText;
  ns.utils.cssEscapeSafe = cssEscapeSafe;

  ns.modules.utils = {
    name: 'utils',
    version: '2.0.0',
    rectData: rectData,
    normScanText: normScanText,
    cssEscapeSafe: cssEscapeSafe
  };
})();
