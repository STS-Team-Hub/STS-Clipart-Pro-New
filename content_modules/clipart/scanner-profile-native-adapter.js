(function() {
  'use strict';

  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function toHosts(profile) {
    var domains = Array.isArray(profile && profile.domains) ? profile.domains : [];
    var out = [];
    domains.forEach(function(domain) {
      [domain, '*.' + domain].forEach(function(host) {
        if (out.indexOf(host) < 0) out.push(host);
      });
    });
    return out;
  }

  function optionToScannerOption(item, sourceKind) {
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
      sourceKind: item.sourceKind || sourceKind || 'scanner-profile-native',
      element: item.element || null
    });
  }

  function groupToScannerGroup(rawGroup, sourceKind) {
    if (!rawGroup || typeof rawGroup !== 'object') return null;
    var rawOptions = Array.isArray(rawGroup.options) ? rawGroup.options : (Array.isArray(rawGroup.items) ? rawGroup.items : []);
    var title = cleanText(rawGroup.label || rawGroup.name || rawGroup.title || '');
    if (!title && !rawOptions.length) return null;
    return Object.assign({}, rawGroup, {
      label: rawGroup.label || title,
      name: rawGroup.name || title,
      title: rawGroup.title || title,
      options: rawOptions.map(function(item) { return optionToScannerOption(item, sourceKind); })
    });
  }

  function mapGroups(groups, sourceKind) {
    return (groups || []).map(function(group) { return groupToScannerGroup(group, sourceKind); }).filter(Boolean);
  }

  function toScannerProfile(profile, options) {
    options = options || {};
    var sourceKind = options.sourceKind || ('scanner-profile-' + profile.id);
    var scannerProfile = Object.assign({}, profile, {
      hosts: options.hosts || profile.hosts || toHosts(profile),
      detect: function(ctx) {
        var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase();
        var href = String((ctx && ctx.location && ctx.location.href) || location.href || '');
        if (typeof profile.match === 'function') return !!profile.match(host, href);
        if (typeof profile.matchHost === 'function') return !!profile.matchHost(host, href);
        return false;
      },
      scanPage: function(ctx) {
        var doc = (ctx && ctx.document) || document;
        return mapGroups(typeof profile.autoScan === 'function' ? profile.autoScan(doc) : [], sourceKind);
      },
      scanVisibleState: function(ctx) { return this.scanPage(ctx); },
      collectOptionsInContainer: function(containerEl) {
        if (!containerEl) return [];
        if (typeof profile.getItems === 'function') return (profile.getItems(containerEl) || []).map(function(item) {
          return optionToScannerOption({
            element: item,
            value: typeof profile.extractValue === 'function' ? profile.extractValue(item) : cleanText(item && item.textContent)
          }, sourceKind);
        });
        return [];
      },
      collectOptionsInRegion: function(region) {
        var container = region && (region.container || region.element || region.root || region);
        return this.collectOptionsInContainer(container);
      },
      detectNearestGroupTitleFromOption: function(optionEl) {
        var group = optionEl && optionEl.closest && optionEl.closest((profile.selectors && profile.selectors.group) || '.customily_option, .pt-4, .ant-form-item');
        var titleEl = group && typeof profile.getTitleElement === 'function' ? profile.getTitleElement(group) : null;
        return cleanText(titleEl && titleEl.textContent);
      },
      getManualDrivenAutoTitleCandidates: profile.getManualDrivenAutoTitleCandidates || function(ctx) {
        var doc = (ctx && ctx.document) || document;
        var root = typeof profile.getRoot === 'function' ? profile.getRoot(doc) : null;
        var groups = root && typeof profile.getGroups === 'function' ? profile.getGroups(root) : [];
        return (groups || []).map(function(group) {
          var titleEl = typeof profile.getTitleElement === 'function' ? profile.getTitleElement(group) : null;
          if (!titleEl) return null;
          var expandTarget = titleEl.closest && titleEl.closest('label[aria-controls], label[role="tab"], label[role="button"], [aria-controls][role="tab"], [aria-controls][role="button"]');
          return { titleEl: titleEl, groupEl: group, rootEl: root, expandTarget: expandTarget || titleEl, sourceKind: sourceKind };
        }).filter(Boolean);
      },
      scanHints: Object.assign({ phase2NativeDebridged: true }, profile.scanHints || {}, options.scanHints || {})
    });
    if (typeof profile.scanManualGroupFromTitle === 'function') {
      scannerProfile.scanManualGroupFromTitle = function(titleEl, ctx) {
        return groupToScannerGroup(profile.scanManualGroupFromTitle.call(profile, titleEl, ctx), sourceKind);
      };
    }
    return scannerProfile;
  }

  ns.nativeProfileAdapter = Object.assign({}, ns.nativeProfileAdapter || {}, {
    cleanText: cleanText,
    optionToScannerOption: optionToScannerOption,
    groupToScannerGroup: groupToScannerGroup,
    mapGroups: mapGroups,
    toScannerProfile: toScannerProfile
  });
})();
