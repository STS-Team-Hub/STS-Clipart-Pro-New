(function(){
  const DEFAULT_PROFILE = {
    key: 'default',
    scanners: ['customily','shopify','personalizationForm','gossby','select','textDropdown','quote','callieText','generic','deep']
  };

  const SITE_PROFILES = {
    'pawesomehouse.com': {
      key: 'pawesomehouse.com',
      scanners: ['customily','personalizationForm','select','textDropdown','quote','generic','deep']
    },
    'pawfecthouse.com': {
      key: 'pawfecthouse.com',
      scanners: ['personalizationForm','select','textDropdown','quote','generic','deep']
    },
    'trendingcustom.com': {
      key: 'trendingcustom.com',
      scanners: ['personalizationForm','select','textDropdown','quote','generic','deep']
    },
    'www.suzitee.com': {
      key: 'www.suzitee.com',
      scanners: ['customily','shopify','select','textDropdown','quote','generic','deep']
    },
    'wanderprints.com': {
      key: 'wanderprints.com',
      scanners: ['personalizationForm','select','textDropdown','quote','callieText','generic','deep']
    },
    'gossby.com': {
      key: 'gossby.com',
      scanners: ['gossby','select','textDropdown','quote','generic','deep']
    },
    'macorner.co': {
      key: 'macorner.co',
      scanners: ['shopify','select','textDropdown','quote','generic','deep']
    },
    'www.etsy.com': {
      key: 'www.etsy.com',
      scanners: ['shopify','select','textDropdown','quote','generic','deep']
    }
  };

  let didWarnLegacyRouter = false;

  function warnLegacyRouter(reason){
    if (didWarnLegacyRouter) return;
    didWarnLegacyRouter = true;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[STS Clipart Pro 8.3 Legacy] STSSiteProfiles scanner-list route is deprecated and kept as compatibility fallback only.', reason || '');
    }
  }

  function pickSiteProfile(hostname){
    const host = String(hostname || '').toLowerCase();

    if (window.STSSiteProfilesV2 && typeof window.STSSiteProfilesV2.resolve === 'function') {
      const resolved = window.STSSiteProfilesV2.resolve(host);
      if (resolved && resolved.id) {
        const byId = Object.values(SITE_PROFILES).find((p) => p.key.indexOf(resolved.id) >= 0) || SITE_PROFILES[resolved.id + '.com'];
        if (byId) {
          warnLegacyRouter('mapped-v2-profile');
          return byId;
        }
      }
    }

    if (!host) {
      warnLegacyRouter('empty-host-default');
      return DEFAULT_PROFILE;
    }
    if (SITE_PROFILES[host]) {
      warnLegacyRouter('direct-host-match');
      return SITE_PROFILES[host];
    }

    for (const key of Object.keys(SITE_PROFILES)) {
      if (host === key || host.endsWith('.' + key.replace(/^www\./, ''))) {
        warnLegacyRouter('suffix-host-match');
        return SITE_PROFILES[key];
      }
    }
    warnLegacyRouter('unknown-host-default');
    return DEFAULT_PROFILE;
  }

  window.STSSiteProfiles = {
    DEFAULT_PROFILE,
    SITE_PROFILES,
    pickSiteProfile
  };
})();
