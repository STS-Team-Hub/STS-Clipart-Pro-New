(function(){
  var g = window;
  if (g.STSSiteProfilesV2) return;
  var registry = [];

  function toHost(input){ return String(input || '').toLowerCase(); }

  function normalizeProfile(profile){
    if (!profile || typeof profile !== 'object') return null;
    if (!profile.id) profile.id = 'unknown';
    if (!Array.isArray(profile.domains)) profile.domains = [];
    if (!profile.selectors || typeof profile.selectors !== 'object') profile.selectors = {};
    if (!profile.scanHints || typeof profile.scanHints !== 'object') profile.scanHints = {};
    if (!profile.cleanupRules || typeof profile.cleanupRules !== 'object') profile.cleanupRules = {};
    if (!profile.fallback || typeof profile.fallback !== 'object') profile.fallback = {};
    if (typeof profile.match !== 'function') {
      profile.match = function(hostname, url){
        try {
          if (typeof profile.matchHost === 'function') return !!profile.matchHost(toHost(hostname), url);
        } catch(e) {}
        var h = toHost(hostname);
        return profile.domains.some(function(d){ return h === d || h.endsWith('.' + d); });
      };
    }
    if (typeof profile.matchHost !== 'function') {
      profile.matchHost = function(hostname, url){ return !!profile.match(hostname, url); };
    }
    return profile;
  }

  function register(profile){
    var p = normalizeProfile(profile);
    if (p) registry.push(p);
  }

  function resolve(host, url){
    var h = toHost(host);
    var generic = null;
    for (var i = 0; i < registry.length; i++) {
      var p = registry[i];
      if (!p) continue;
      if (p.id === 'generic') { generic = p; continue; }
      try {
        if ((typeof p.match === 'function' && p.match(h, url)) || (typeof p.matchHost === 'function' && p.matchHost(h, url))) return p;
      } catch(e) {}
    }
    if (generic) return generic;
    for (var j = 0; j < registry.length; j++) {
      var x = registry[j];
      try { if (x && typeof x.matchHost === 'function' && x.matchHost(h, url)) return x; } catch(e) {}
    }
    return null;
  }

  g.STSSiteProfilesV2 = { register: register, resolve: resolve, list: function(){ return registry.slice(); } };
})();
