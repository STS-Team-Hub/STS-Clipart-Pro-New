(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function buildEmptyClipartDataFrom(data) {
    return {
      url: (data && data.url) || window.location.href,
      title: (data && data.title) || document.title,
      platform: (data && data.platform) || ((window.Shopify || document.querySelector('[data-shopify]')) ? 'shopify' : window.location.hostname.includes('etsy') ? 'etsy' : 'custom'),
      scannedAt: new Date().toISOString(),
      categories: []
    };
  }

  ns.export = ns.export || {};
  ns.export.buildEmptyClipartDataFrom = buildEmptyClipartDataFrom;
  ns.modules['export'] = { name: 'export', buildEmptyClipartDataFrom: buildEmptyClipartDataFrom };
})();
