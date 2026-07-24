(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function create(overrides) {
    var o = overrides || {};
    var ctx = Object.assign({}, o, {
      document: o.document || window.document,
      location: o.location || window.location,
      window: o.window || window,
      schema: o.schema || ns.schema || {},
      state: o.state || ns.state || {},
      collectors: o.collectors || ns.collectors || {},
      utils: o.utils || ns.utils || {}
    });
    return ctx;
  }

  ns.profileContext = Object.assign({}, ns.profileContext || {}, {
    create: create
  });
})();
