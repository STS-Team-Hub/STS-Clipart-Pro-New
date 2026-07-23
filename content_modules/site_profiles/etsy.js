(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  reg.register({
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
  });
})();
