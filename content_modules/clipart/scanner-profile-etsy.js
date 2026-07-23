(function(){
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var profiles = ns.profiles; if (!profiles || typeof profiles.register !== 'function') return;
  function toScannerProfile(profile){
    profile.hosts = (profile.domains || []).reduce(function(out, domain){ out.push(domain, '*.' + domain); return out; }, []);
    profile.detect = function(ctx){ var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase(); var href = String((ctx && ctx.location && ctx.location.href) || location.href || ''); return typeof profile.match === 'function' ? !!profile.match(host, href) : (typeof profile.matchHost === 'function' ? !!profile.matchHost(host, href) : false); };
    profile.scanPage = function(){ return []; };
    profile.scanVisibleState = function(){ return []; };
    profile.scanHints = Object.assign({ phase8Native: true }, profile.scanHints || {});
    return profile;
  }
  profiles.register(toScannerProfile({
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
  }));
})();
