(function() {
  'use strict';

  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var profiles = ns.profiles;
  var legacyRegistry = window.STSSiteProfilesV2;

  if (!profiles || typeof profiles.register !== 'function' || !legacyRegistry || typeof legacyRegistry.list !== 'function') {
    return;
  }

  function toHosts(legacyProfile) {
    var domains = Array.isArray(legacyProfile && legacyProfile.domains) ? legacyProfile.domains : [];
    return domains.slice();
  }

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function legacyItemToOption(item) {
    if (!item || typeof item !== 'object') return item || {};
    var text = cleanText(item.textContent || item.label || item.value || item.rawValue || item.name || '');
    var value = cleanText(item.value || item.rawValue || text || item.name || '');
    var name = cleanText(item.name || item.label || value || text || '');
    return Object.assign({}, item, {
      textContent: cleanText(item.textContent || text || value || name),
      value: value || text || name,
      name: name || value || text,
      imageUrl: item.imageUrl || item.image || item.capturedImage || null,
      capturedImage: item.capturedImage || item.imageUrl || item.image || null,
      element: item.element || null
    });
  }

  function legacyGroupToScannerGroup(rawGroup) {
    if (!rawGroup || typeof rawGroup !== 'object') return rawGroup || null;
    var rawOptions = Array.isArray(rawGroup.options)
      ? rawGroup.options
      : (Array.isArray(rawGroup.items) ? rawGroup.items : []);
    var title = cleanText(rawGroup.label || rawGroup.name || rawGroup.title || '');
    return Object.assign({}, rawGroup, {
      label: rawGroup.label || title,
      name: rawGroup.name || title,
      title: rawGroup.title || title,
      options: rawOptions.map(legacyItemToOption)
    });
  }

  function createAdapter(legacyProfile) {
    if (!legacyProfile || !legacyProfile.id || legacyProfile.id === 'generic') return null;

    var adapter = {
      id: legacyProfile.id,
      name: legacyProfile.name || legacyProfile.id,
      hosts: toHosts(legacyProfile),
      detect: function(ctx) {
        var host = String((ctx && ctx.location && ctx.location.hostname) || '').toLowerCase();
        var href = String((ctx && ctx.location && ctx.location.href) || '');
        if (typeof legacyProfile.match === 'function') return !!legacyProfile.match(host, href);
        if (typeof legacyProfile.matchHost === 'function') return !!legacyProfile.matchHost(host, href);
        return false;
      }
    };

    if (typeof legacyProfile.autoScan === 'function') {
      adapter.scanPage = function(ctx) {
        var doc = (ctx && ctx.document) || window.document;
        return (legacyProfile.autoScan(doc) || []).map(legacyGroupToScannerGroup).filter(Boolean);
      };
      adapter.scanVisibleState = function(ctx) {
        var doc = (ctx && ctx.document) || window.document;
        return (legacyProfile.autoScan(doc) || []).map(legacyGroupToScannerGroup).filter(Boolean);
      };
    }

    if (typeof legacyProfile.scanManualGroupFromTitle === 'function') {
      adapter.scanManualGroupFromTitle = function(titleEl) {
        return legacyGroupToScannerGroup(legacyProfile.scanManualGroupFromTitle(titleEl));
      };
    }

    ['getRoot', 'getGroups', 'getTitleElement', 'getItems', 'extractValue', 'cleanupTitle', 'cleanupValue', 'isValidGroup', 'isVisibleElement', 'isJunkElement'].forEach(function(methodName) {
      if (typeof legacyProfile[methodName] === 'function') adapter[methodName] = legacyProfile[methodName];
    });

    return adapter;
  }

  var legacyProfiles = legacyRegistry.list();
  legacyProfiles.forEach(function(legacyProfile) {
    var adapter = createAdapter(legacyProfile);
    if (adapter) profiles.register(adapter);
  });
})();
