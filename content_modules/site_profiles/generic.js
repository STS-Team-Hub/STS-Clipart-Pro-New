(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  reg.register({
    id: 'generic',
    name: 'Generic',
    domains: [],
    match: function(){ return true; },
    matchHost: function(){ return true; },
    selectors: {},
    scanHints: { useLegacyGeneric: true },
    cleanupRules: {},
    fallback: { useLegacyGeneric: true },
    useLegacyGeneric: true
  });
})();
