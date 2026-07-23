(function() {
  'use strict';

  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var profiles = ns.profiles;
  var legacyRegistry = window.STSSiteProfilesV2;

  if (!profiles || typeof profiles.register !== 'function' || !legacyRegistry || typeof legacyRegistry.get !== 'function') return;

  var PROFILE_IDS = ['personalfury', 'interestpod', 'gossby'];

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function hostPattern(domain) {
    return ['*.' + domain, domain];
  }

  function toHosts(legacyProfile) {
    var domains = Array.isArray(legacyProfile && legacyProfile.domains) ? legacyProfile.domains : [];
    var out = [];
    domains.forEach(function(domain) {
      hostPattern(domain).forEach(function(pattern) {
        if (out.indexOf(pattern) < 0) out.push(pattern);
      });
    });
    return out;
  }

  function legacyItemToOption(item) {
    if (!item || typeof item !== 'object') return item || {};
    var text = cleanText(item.textContent || item.label || item.value || item.rawValue || item.name || '');
    var value = cleanText(item.value || item.rawValue || text || item.name || '');
    var name = cleanText(item.name || item.label || value || text || '');
    var imageUrl = item.imageUrl || item.image || item.capturedImage || null;
    return Object.assign({}, item, {
      label: cleanText(item.label || text || value || name),
      textContent: cleanText(item.textContent || text || value || name),
      value: value || text || name,
      name: name || value || text,
      imageUrl: imageUrl,
      capturedImage: item.capturedImage || imageUrl,
      optionType: item.optionType || (imageUrl ? 'image' : 'text'),
      sourceKind: item.sourceKind || 'site-v2-consolidated',
      element: item.element || null
    });
  }

  function legacyGroupToScannerGroup(rawGroup) {
    if (!rawGroup || typeof rawGroup !== 'object') return null;
    var rawOptions = Array.isArray(rawGroup.options) ? rawGroup.options : (Array.isArray(rawGroup.items) ? rawGroup.items : []);
    var title = cleanText(rawGroup.label || rawGroup.name || rawGroup.title || '');
    if (!title && !rawOptions.length) return null;
    return Object.assign({}, rawGroup, {
      label: rawGroup.label || title,
      name: rawGroup.name || title,
      title: rawGroup.title || title,
      options: rawOptions.map(legacyItemToOption)
    });
  }

  function mapGroups(groups) {
    return (groups || []).map(legacyGroupToScannerGroup).filter(Boolean);
  }

  function createScannerProfile(legacyProfile) {
    return {
      id: legacyProfile.id,
      name: (legacyProfile.name || legacyProfile.id) + ' Scanner Profile',
      hosts: toHosts(legacyProfile),
      detect: function(ctx) {
        var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase();
        var href = String((ctx && ctx.location && ctx.location.href) || location.href || '');
        if (typeof legacyProfile.match === 'function') return !!legacyProfile.match(host, href);
        if (typeof legacyProfile.matchHost === 'function') return !!legacyProfile.matchHost(host, href);
        return false;
      },
      scanPage: function(ctx) {
        var doc = (ctx && ctx.document) || document;
        return mapGroups(typeof legacyProfile.autoScan === 'function' ? legacyProfile.autoScan(doc) : []);
      },
      scanVisibleState: function(ctx) { return this.scanPage(ctx); },
      scanManualGroupFromTitle: function(titleEl) {
        return legacyGroupToScannerGroup(typeof legacyProfile.scanManualGroupFromTitle === 'function' ? legacyProfile.scanManualGroupFromTitle(titleEl) : null);
      },
      collectOptionsInContainer: function(containerEl) {
        if (!containerEl) return [];
        if (typeof legacyProfile.getItems === 'function') return (legacyProfile.getItems(containerEl) || []).map(function(item) { return legacyItemToOption({ element: item, value: typeof legacyProfile.extractValue === 'function' ? legacyProfile.extractValue(item) : cleanText(item && item.textContent) }); });
        return [];
      },
      collectOptionsInRegion: function(region) {
        var container = region && (region.container || region.element || region.root || region);
        return this.collectOptionsInContainer(container);
      },
      detectNearestGroupTitleFromOption: function(optionEl) {
        var group = optionEl && optionEl.closest && optionEl.closest((legacyProfile.selectors && legacyProfile.selectors.group) || '.customily_option, .pt-4');
        var titleEl = group && typeof legacyProfile.getTitleElement === 'function' ? legacyProfile.getTitleElement(group) : null;
        return cleanText(titleEl && titleEl.textContent);
      },
      getRoot: legacyProfile.getRoot,
      getGroups: legacyProfile.getGroups,
      getTitleElement: legacyProfile.getTitleElement,
      getItems: legacyProfile.getItems,
      extractValue: legacyProfile.extractValue,
      cleanupTitle: legacyProfile.cleanupTitle,
      cleanupValue: legacyProfile.cleanupValue,
      isValidGroup: legacyProfile.isValidGroup,
      isVisibleElement: legacyProfile.isVisibleElement,
      isJunkElement: legacyProfile.isJunkElement,
      selectors: legacyProfile.selectors,
      scanHints: Object.assign({ consolidatedPhase: 3 }, legacyProfile.scanHints || {})
    };
  }

  PROFILE_IDS.forEach(function(id) {
    var legacyProfile = legacyRegistry.get(id);
    if (legacyProfile) profiles.register(createScannerProfile(legacyProfile));
  });
})();
