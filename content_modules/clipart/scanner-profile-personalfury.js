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

  var legacyProfile = getLegacyProfile('personalfury');
  if (!legacyProfile) return;

  profiles.register(bridge.createScannerProfile(legacyProfile, {
    id: 'personalfury',
    sourceKind: 'scanner-profile-personalfury',
    scanHints: { phase3CustomilyRollout: true, phase4CustomilyRollout: true, phase5CustomilyRollout: true }
  }));
})();
