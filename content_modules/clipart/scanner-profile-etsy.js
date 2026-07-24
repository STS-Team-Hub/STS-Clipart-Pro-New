(function(){
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var profiles = ns.profiles; if (!profiles || typeof profiles.register !== 'function') return;
  var nativeAdapter = ns.nativeProfileAdapter; if (!nativeAdapter || typeof nativeAdapter.toScannerProfile !== 'function') return;
  profiles.register(nativeAdapter.toScannerProfile({
    id: 'etsy',
    name: 'Etsy',
    domains: ['etsy.com'],
    match: function(hostname){ var h=String(hostname||'').toLowerCase(); return h==='etsy.com' || h.endsWith('.etsy.com'); },
    matchHost: function(h){ return h === 'etsy.com' || h.endsWith('.etsy.com'); },
    selectors: {},
    scanHints: { useLegacyGeneric: true },
    cleanupRules: {},
    fallback: { useLegacyGeneric: true },
    useLegacyGeneric: true
  }, { sourceKind: 'scanner-profile-etsy', scanHints: { phase8Native: true } }));
})();
