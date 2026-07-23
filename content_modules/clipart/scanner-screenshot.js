(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function activateScreenshotPick(ctx, data, onRefresh) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.activateScreenshotPickLegacy !== 'function') return null;
    return ctx.coreFns.activateScreenshotPickLegacy(data, onRefresh);
  }

  function captureSingleGroup(ctx, cat) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.captureSingleGroupLegacy !== 'function') return Promise.resolve(null);
    return ctx.coreFns.captureSingleGroupLegacy(cat);
  }

  function captureTab(ctx) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.captureTabLegacy !== 'function') return Promise.resolve(null);
    return ctx.coreFns.captureTabLegacy();
  }

  ns.screenshot = ns.screenshot || {};
  ns.screenshot.activateScreenshotPick = activateScreenshotPick;
  ns.screenshot.captureSingleGroup = captureSingleGroup;
  ns.screenshot.captureTab = captureTab;

  ns.modules.screenshot = {
    name: 'screenshot',
    activateScreenshotPick: activateScreenshotPick,
    captureSingleGroup: captureSingleGroup,
    captureTab: captureTab
  };
})();
