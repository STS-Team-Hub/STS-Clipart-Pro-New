(function() {
  'use strict';

  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var profiles = ns.profiles;
  var bridge = ns.siteV2Bridge;
  var legacyRegistry = window.STSSiteProfilesV2;

  if (!profiles || typeof profiles.register !== 'function' || !bridge || typeof bridge.createScannerProfile !== 'function' || !legacyRegistry) return;

  function getLegacyProfile(id) {
    if (typeof legacyRegistry.get === 'function') return legacyRegistry.get(id);
    if (typeof legacyRegistry.list === 'function') {
      var list = legacyRegistry.list() || [];
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  var legacyProfile = getLegacyProfile('interestpod');
  if (!legacyProfile) return;

  profiles.register(bridge.createScannerProfile(legacyProfile, {
    id: 'interestpod',
    sourceKind: 'scanner-profile-interestpod',
    scanHints: { phase3CustomilyRollout: true }
  }));
})();
