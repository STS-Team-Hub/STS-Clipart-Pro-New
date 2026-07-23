(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  var shared = window.STSSiteProfileShared || {};
  var dom = shared.dom || {};
  var cleanup = shared.cleanup || {};

  function isVisible(el){ return !dom.isVisibleElement || dom.isVisibleElement(el); }
  function clean(v){ return cleanup.cleanupValue ? cleanup.cleanupValue(v) : String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(v){ return cleanup.cleanupTitle ? cleanup.cleanupTitle(v) : clean(v); }
  function firstNonEmpty(list){ for (var i = 0; i < list.length; i++){ var v = clean(list[i]); if (v) return v; } return ''; }
  function getRoot(doc){ return (doc || document).querySelector('.personalized-options'); }
  function getGroups(root){
    if (!root) return [];
    return Array.from(root.querySelectorAll('.ant-form-item')).filter(function(group){
      if (!isVisible(group)) return false;
      if (group.closest('[class*=shipping],[class*=gallery],[class*=review],[class*=helper]')) return false;
      return !!getTitleElement(group);
    });
  }
  function getTitleElement(group){ return group && group.querySelector('.ant-form-item-label label'); }
  function optionFromImageCard(card, index){
    var img = card && card.querySelector('img.image-item, img[src]');
    if (!img) return null;
    var value = firstNonEmpty([img.getAttribute('alt'), img.getAttribute('title'), card.getAttribute('aria-label'), card.getAttribute('title'), img.currentSrc || img.src || img.getAttribute('src')]);
    if (!value) return null;
    return { value: value, rawValue: value, label: value, image: (img.currentSrc || img.src || img.getAttribute('src')) || null, element: card };
  }
  function optionFromSelect(select, option){
    var value = firstNonEmpty([option.textContent, option.getAttribute('label'), option.getAttribute('value')]);
    if (!value || /^please select an option$/i.test(value)) return null;
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
    Array.from(group.querySelectorAll('.customall-grid > div')).forEach(function(card, index){ var mapped = optionFromImageCard(card, index); if (mapped) out.push(mapped); });
    Array.from(group.querySelectorAll('select.form-select, select')).forEach(function(select){
      Array.from(select.options || select.querySelectorAll('option')).forEach(function(option){ var mapped = optionFromSelect(select, option); if (mapped) out.push(mapped); });
    });
    Array.from(group.querySelectorAll('input.form-control, input:not([type]), input[type="text"], textarea')).forEach(function(input){ var mapped = optionFromTextInput(input); if (mapped) out.push(mapped); });
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
  var profile = {
    id: 'trendingcustom',
    name: 'TrendingCustom',
    domains: ['trendingcustom.com'],
    match: function(hostname){ var h = String(hostname || '').toLowerCase(); return h === 'trendingcustom.com' || h.endsWith('.trendingcustom.com'); },
    matchHost: function(h){ return h === 'trendingcustom.com' || h.endsWith('.trendingcustom.com'); },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: getItems,
    extractValue: function(item){ var mapped = optionFromImageCard(item, 0) || optionFromTextInput(item) || optionFromFileInput(item); return mapped ? mapped.value : ''; },
    cleanupTitle: cleanTitle,
    cleanupValue: clean,
    isValidGroup: isValidGroup,
    isVisibleElement: dom.isVisibleElement,
    isJunkElement: dom.isJunkElement,
    autoScan: function(doc){ var root = getRoot(doc || document); return getGroups(root).map(mapGroup).filter(Boolean); },
    getManualTitleElements: function(doc){ var root = getRoot(doc || document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && titleEl.closest('.ant-form-item'); return mapGroup(group); },
    selectors: { root: '.personalized-options', group: '.ant-form-item', title: '.ant-form-item-label label', item: '.customall-grid > div, select.form-select option, input.form-control, input[type="file"], textarea' },
    scanHints: { source: 'customall', preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true, supportsFileInputs: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  };
  reg.register(profile);
})();
