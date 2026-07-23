(function() {
  'use strict';
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  var registeredRenderer = null;

  function registerRenderer(fn) {
    registeredRenderer = (typeof fn === 'function') ? fn : null;
  }

  function hasRenderer() {
    return typeof registeredRenderer === 'function';
  }

  function show(data, actions) {
    if (!hasRenderer()) {
      console.warn('[STS Clipart Pro 8.3 Panel] No renderer registered.');
      return;
    }
    return registeredRenderer(data, actions);
  }

  function unmount() {
    var panel = document.getElementById('sts-clip-panel');
    if (panel) panel.remove();
  }

  ns.panel = ns.panel || {};
  ns.panel.registerRenderer = registerRenderer;
  ns.panel.hasRenderer = hasRenderer;
  ns.panel.show = show;
  ns.panel.unmount = unmount;

  ns.modules.panel = {
    name: 'panel',
    registerRenderer: registerRenderer,
    hasRenderer: hasRenderer,
    show: show,
    unmount: unmount
  };
})();
