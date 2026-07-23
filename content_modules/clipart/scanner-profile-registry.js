(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  var REQUIRED_METHODS = [
    'scanPage',
    'scanVisibleState',
    'scanManualGroupFromTitle',
    'collectOptionsInContainer',
    'collectOptionsInRegion',
    'detectNearestGroupTitleFromOption',
    'normalizeGroup',
    'normalizeOption'
  ];

  var registry = [];

  function validateProfile(profile) {
    if (!profile || typeof profile !== 'object') return false;
    if (!profile.id || typeof profile.id !== 'string') return false;
    return true;
  }

  function register(profile) {
    if (!validateProfile(profile)) throw new Error('Invalid scanner profile');
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].id === profile.id) {
        registry[i] = profile;
        return profile;
      }
    }
    registry.push(profile);
    return profile;
  }

  function list() { return registry.slice(); }
  function get(id) { return registry.find(function(p) { return p.id === id; }) || null; }
  function getDefault() { return registry.find(function(p) { return p && p.isDefault; }) || get('default') || null; }

  function hostMatches(host, pattern) {
    if (!pattern || pattern === '*') return true;
    var h = String(host || '').toLowerCase();
    var p = String(pattern || '').toLowerCase();
    if (p.indexOf('*.') === 0) return h === p.slice(2) || h.endsWith('.' + p.slice(2));
    return h === p;
  }

  function matchByHost(locationLike) {
    var host = String((locationLike && locationLike.hostname) || '').toLowerCase();
    return registry.filter(function(profile) {
      if (!profile || profile.isDefault) return false;
      var hosts = Array.isArray(profile.hosts) ? profile.hosts : [];
      return hosts.some(function(pattern) { return hostMatches(host, pattern); });
    });
  }

  function createEffectiveProfile(defaultProfile, matchedProfile) {
    var effective = Object.assign({}, defaultProfile || {});
    if (matchedProfile) effective = Object.assign(effective, matchedProfile);
    REQUIRED_METHODS.forEach(function(methodName) {
      if (typeof effective[methodName] !== 'function' && defaultProfile && typeof defaultProfile[methodName] === 'function') {
        effective[methodName] = defaultProfile[methodName];
      }
    });
    effective.baseProfileId = defaultProfile ? defaultProfile.id : null;
    effective.matchedProfileId = matchedProfile ? matchedProfile.id : null;
    return effective;
  }

  function resolve(ctx) {
    var context = ctx || (ns.profileContext && typeof ns.profileContext.create === 'function' ? ns.profileContext.create() : {});
    var defaultProfile = getDefault();
    var candidates = list().filter(function(profile) { return profile && !profile.isDefault; });
    var detected = candidates.filter(function(profile) { return typeof profile.detect === 'function' && profile.detect(context); });
    var hostMatched = matchByHost(context.location);
    var seen = Object.create(null);
    var ordered = detected.concat(hostMatched).filter(function(profile) {
      if (!profile || seen[profile.id]) return false;
      seen[profile.id] = true;
      return true;
    });
    var matched = ordered.length ? ordered[0] : null;
    return createEffectiveProfile(defaultProfile, matched);
  }

  ns.profiles = Object.assign({}, ns.profiles || {}, {
    register: register,
    list: list,
    get: get,
    getDefault: getDefault,
    resolve: resolve,
    validateProfile: validateProfile,
    matchByHost: matchByHost,
    createEffectiveProfile: createEffectiveProfile
  });
})();
