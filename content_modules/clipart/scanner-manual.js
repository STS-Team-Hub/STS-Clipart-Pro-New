(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function startManualScan(ctx) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.startManualScanLegacy !== 'function') return null;
    return ctx.coreFns.startManualScanLegacy();
  }

  function activateManualPick(ctx, data, onRefresh) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.activateManualPickLegacy !== 'function') return null;
    return ctx.coreFns.activateManualPickLegacy(data, onRefresh);
  }

  function deactivateManualPick(ctx) {
    if (ctx && ctx.coreFns && typeof ctx.coreFns.deactivateManualPickLegacy === 'function') {
      return ctx.coreFns.deactivateManualPickLegacy();
    }
    if (ctx && typeof ctx.cleanupAllPickModes === 'function') ctx.cleanupAllPickModes();
    return null;
  }

  ns.manual = ns.manual || {};
  ns.manual.startManualScan = startManualScan;
  ns.manual.activateManualPick = activateManualPick;
  ns.manual.deactivateManualPick = deactivateManualPick;

  ns.modules.manual = {
    name: 'manual',
    startManualScan: startManualScan,
    activateManualPick: activateManualPick,
    deactivateManualPick: deactivateManualPick
  };
})();
