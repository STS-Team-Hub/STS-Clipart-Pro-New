(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  reg.register({
    id: 'macorner',
    name: 'Macorner',
    domains: ['macorner.co'],
    match: function(hostname){ var h=String(hostname||'').toLowerCase(); return h==='macorner.co' || h.endsWith('.macorner.co'); },
    matchHost: function(h){ return h === 'macorner.co' || h.endsWith('.macorner.co'); },
    selectors: {},
    scanHints: { useLegacyGeneric: true },
    cleanupRules: {},
    fallback: { useLegacyGeneric: true },
    useLegacyGeneric: true
  });
})();
