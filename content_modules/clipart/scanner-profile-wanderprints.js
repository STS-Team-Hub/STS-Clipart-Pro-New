(function(){
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};
  var profiles = ns.profiles; if (!profiles || typeof profiles.register !== 'function') return;
  var shared = window.STSSiteProfileShared || {};
  var dom = shared.dom || {};
  var cleanup = shared.cleanup || {};
  var values = shared.values || {};
  if (!dom.isVisibleElement) dom.isVisibleElement = function(el){ return !el || !el.getClientRects || el.getClientRects().length > 0 || !!(el.offsetWidth || el.offsetHeight); };
  if (!dom.isJunkElement) dom.isJunkElement = function(){ return false; };
  if (!values.extractCommonValue) values.extractCommonValue = function(el){
    if (!el) return null;
    var img = el.querySelector && el.querySelector('img');
    var value = (el.getAttribute && (el.getAttribute('data-value') || el.getAttribute('aria-label') || el.getAttribute('title'))) || (img && (img.getAttribute('alt') || img.getAttribute('title'))) || el.textContent || '';
    var image = img && (img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src'));
    return { value: value, rawValue: value, image: image || null };
  };

  function isVisible(el){ return !dom.isVisibleElement || dom.isVisibleElement(el); }
  function clean(v){ return cleanup.cleanupValue ? cleanup.cleanupValue(v) : String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(v){ return cleanup.cleanupTitle ? cleanup.cleanupTitle(v) : clean(v); }
  function firstNonEmpty(list){ for (var i = 0; i < list.length; i++){ var v = clean(list[i]); if (v) return v; } return ''; }
  function getRoot(doc){
    var outer = (doc || document).querySelector('#customily-options');
    if (!outer) return null;
    return outer.querySelector('#cl_optionsapp') || outer;
  }
  function getGroups(root){
    if (!root) return [];
    return Array.from(root.querySelectorAll('.customily_option')).filter(function(group){
      if (!isVisible(group)) return false;
      if (group.closest('[class*=shipping],[class*=gallery],[class*=review],[class*=helper]')) return false;
      return !!getTitleElement(group);
    });
  }
  function getTitleElement(group){ return group && group.querySelector('.option_name'); }
  function optionFromSwatch(item){
    if (!item) return null;
    var extracted = values.extractCommonValue ? values.extractCommonValue(item) : null;
    var input = item.querySelector && item.querySelector('input[value]');
    var img = item.querySelector && item.querySelector('img');
    var value = firstNonEmpty([
      extracted && extracted.value,
      input && input.getAttribute('value'),
      img && img.getAttribute('alt'),
      item.getAttribute && item.getAttribute('data-value'),
      item.getAttribute && item.getAttribute('title'),
      item.getAttribute && item.getAttribute('aria-label')
    ]);
    if (!value) return null;
    return { value: value, rawValue: (extracted && extracted.rawValue) || (input && input.getAttribute('value')) || value, label: value, image: (extracted && extracted.image) || (img && (img.currentSrc || img.src)) || null, element: item };
  }
  function optionFromSelect(select, option){
    var value = firstNonEmpty([option.textContent, option.getAttribute('label'), option.getAttribute('value')]);
    if (!value || /^choose an option$/i.test(value)) return null;
    return { value: value, rawValue: option.getAttribute('value') || value, label: value, image: null, element: select };
  }
  function optionFromTextInput(input){
    var value = firstNonEmpty([input.getAttribute('placeholder'), input.getAttribute('aria-label'), input.getAttribute('name'), input.value]);
    if (!value) return null;
    return { value: value, rawValue: input.value || value, label: value, image: null, element: input };
  }
  function optionFromFileInput(input){
    var value = firstNonEmpty([input.getAttribute('name'), input.getAttribute('accept'), 'file']);
    if (!value) return null;
    return { value: value, rawValue: value, label: value, image: null, element: input };
  }
  function collectItems(group){
    if (!group) return [];
    var out = [];
    Array.from(group.querySelectorAll('.swatch-container .customily-swatch, .customily-swatch')).forEach(function(item){ var mapped = optionFromSwatch(item); if (mapped) out.push(mapped); });
    Array.from(group.querySelectorAll('select')).forEach(function(select){
      Array.from(select.options || select.querySelectorAll('option')).forEach(function(option){ var mapped = optionFromSelect(select, option); if (mapped) out.push(mapped); });
    });
    Array.from(group.querySelectorAll('input[type="text"], textarea')).forEach(function(input){ var mapped = optionFromTextInput(input); if (mapped) out.push(mapped); });
    Array.from(group.querySelectorAll('input[type="file"]')).forEach(function(input){ var mapped = optionFromFileInput(input); if (mapped) out.push(mapped); });
    return out;
  }
  function getItems(group){ return collectItems(group).map(function(item){ return item.element; }).filter(Boolean); }
  function isValidGroup(group){ return !!cleanTitle((getTitleElement(group) || {}).textContent || '') && collectItems(group).length > 0; }
  function mapGroup(group){
    if (!isValidGroup(group)) return null;
    var title = cleanTitle(getTitleElement(group).textContent || '');
    var items = collectItems(group);
    return items.length ? { title: title, items: items } : null;
  }

  function cleanScannerText(value){ return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function mapOption(item){
    if (!item || typeof item !== 'object') return item || {};
    var text = cleanScannerText(item.textContent || item.label || item.value || item.rawValue || item.name || '');
    var imageUrl = item.imageUrl || item.image || item.capturedImage || null;
    return Object.assign({}, item, {
      label: cleanScannerText(item.label || text),
      textContent: cleanScannerText(item.textContent || text),
      value: cleanScannerText(item.value || item.rawValue || text),
      name: cleanScannerText(item.name || item.label || item.value || text),
      imageUrl: imageUrl,
      capturedImage: item.capturedImage || imageUrl,
      optionType: item.optionType || (imageUrl ? 'image' : 'text')
    });
  }
  function mapGroupForScanner(group){
    if (!group || typeof group !== 'object') return null;
    var rawOptions = Array.isArray(group.options) ? group.options : (Array.isArray(group.items) ? group.items : []);
    var title = cleanScannerText(group.label || group.name || group.title || '');
    if (!title && !rawOptions.length) return null;
    return Object.assign({}, group, { label: group.label || title, name: group.name || title, title: group.title || title, options: rawOptions.map(mapOption) });
  }
  function toScannerProfile(profile){
    profile.hosts = (profile.domains || []).reduce(function(out, domain){ out.push(domain, '*.' + domain); return out; }, []);
    profile.detect = function(ctx){ var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase(); var href = String((ctx && ctx.location && ctx.location.href) || location.href || ''); return typeof profile.match === 'function' ? !!profile.match(host, href) : (typeof profile.matchHost === 'function' ? !!profile.matchHost(host, href) : false); };
    profile.scanPage = function(ctx){ var doc = (ctx && ctx.document) || document; return (typeof profile.autoScan === 'function' ? profile.autoScan(doc) : []).map(mapGroupForScanner).filter(Boolean); };
    profile.scanVisibleState = function(ctx){ return profile.scanPage(ctx); };
    if (typeof profile.scanManualGroupFromTitle === 'function') { var manual = profile.scanManualGroupFromTitle; profile.scanManualGroupFromTitle = function(titleEl, ctx){ return mapGroupForScanner(manual.call(profile, titleEl, ctx)); }; }
    profile.scanHints = Object.assign({ phase8Native: true }, profile.scanHints || {});
    return profile;
  }
  var profile = {
    id: 'wanderprints',
    name: 'Wanderprints',
    domains: ['wanderprints.com'],
    match: function(hostname){ var h = String(hostname || '').toLowerCase(); return h === 'wanderprints.com' || h.endsWith('.wanderprints.com'); },
    matchHost: function(h){ return h === 'wanderprints.com' || h.endsWith('.wanderprints.com'); },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: getItems,
    extractValue: function(item){ var mapped = optionFromSwatch(item) || optionFromTextInput(item) || optionFromFileInput(item); return mapped ? mapped.value : ''; },
    cleanupTitle: cleanTitle,
    cleanupValue: clean,
    isValidGroup: isValidGroup,
    isVisibleElement: dom.isVisibleElement,
    isJunkElement: dom.isJunkElement,
    autoScan: function(doc){ var root = getRoot(doc || document); return getGroups(root).map(mapGroup).filter(Boolean); },
    getManualTitleElements: function(doc){ var root = getRoot(doc || document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && titleEl.closest('.customily_option'); return mapGroup(group); },
    selectors: { root: '#cl_optionsapp, #customily-options', group: '.customily_option', title: '.option_name', item: '.customily-swatch, select option, input[type="text"], input[type="file"], textarea' },
    scanHints: { source: 'customily', phase3CustomilyRollout: true, phase4CustomilyRollout: true, preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true, supportsFileInputs: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  };
  profiles.register(toScannerProfile(profile));
})();
