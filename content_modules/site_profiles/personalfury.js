(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  var shared = window.STSSiteProfileShared || {};
  var dom = shared.dom || {};
  var cleanup = shared.cleanup || {};
  var values = shared.values || {};

  function isVisible(el){ return !dom.isVisibleElement || dom.isVisibleElement(el); }
  function clean(v){ return cleanup.cleanupValue ? cleanup.cleanupValue(v) : String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(v){ return cleanup.cleanupTitle ? cleanup.cleanupTitle(v) : clean(v); }
  function firstNonEmpty(list){ for (var i = 0; i < list.length; i++){ var v = clean(list[i]); if (v) return v; } return ''; }
  function cleanPropertyName(v){ return clean(String(v || '').replace(/^properties\[/, '').replace(/\]$/, '')); }
  function getRoot(doc){
    var d = doc || document;
    var outer = d.querySelector('#customily-options');
    if (outer) return outer.querySelector('#cl_optionsapp') || outer;
    return d.querySelector('#cl_optionsapp');
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
    return { value: value, rawValue: (extracted && extracted.rawValue) || (input && input.getAttribute('value')) || value, label: value, image: (extracted && extracted.image) || (img && (img.currentSrc || img.src || img.getAttribute('data-src'))) || null, element: item };
  }
  function optionFromSelect(select, option){
    if (!option || option.disabled || (option.getAttribute && option.getAttribute('disabled') != null)) return null;
    var value = firstNonEmpty([option.textContent, option.getAttribute && option.getAttribute('label'), option.getAttribute && option.getAttribute('value')]);
    if (!value || /^(choose|select|please select)(\s+an?)?\s+option$/i.test(value)) return null;
    return { value: value, rawValue: (option.getAttribute && option.getAttribute('value')) || value, label: value, image: null, element: select };
  }
  function optionFromTextInput(input){
    if (!input) return null;
    var type = String((input.getAttribute && input.getAttribute('type')) || '').toLowerCase();
    if (type === 'hidden' || type === 'file') return null;
    var value = firstNonEmpty([input.getAttribute && input.getAttribute('placeholder'), input.getAttribute && input.getAttribute('aria-label'), cleanPropertyName(input.getAttribute && input.getAttribute('name')), input.value]);
    if (!value) return null;
    return { value: value, rawValue: input.value || value, label: value, image: null, element: input };
  }
  function optionFromFileInput(input){
    var value = firstNonEmpty([cleanPropertyName(input && input.getAttribute && input.getAttribute('name')), input && input.getAttribute && input.getAttribute('accept'), 'file']);
    if (!value) return null;
    return { value: value, rawValue: value, label: value, image: null, element: input };
  }
  function collectItems(group){
    if (!group) return [];
    var out = [];
    Array.from(group.querySelectorAll('.swatch-container .customily-swatch')).forEach(function(item){ var mapped = optionFromSwatch(item); if (mapped) out.push(mapped); });
    if (!out.length) Array.from(group.querySelectorAll('.customily-swatch')).forEach(function(item){ var mapped = optionFromSwatch(item); if (mapped) out.push(mapped); });
    Array.from(group.querySelectorAll('select[name^="properties["]')).forEach(function(select){
      Array.from(select.options || select.querySelectorAll('option')).forEach(function(option){ var mapped = optionFromSelect(select, option); if (mapped) out.push(mapped); });
    });
    if (!out.some(function(item){ return item && item.element && item.element.tagName === 'SELECT'; })) {
      Array.from(group.querySelectorAll('select')).forEach(function(select){
        Array.from(select.options || select.querySelectorAll('option')).forEach(function(option){ var mapped = optionFromSelect(select, option); if (mapped) out.push(mapped); });
      });
    }
    Array.from(group.querySelectorAll('input[type="text"], input:not([type]), textarea')).forEach(function(input){ var mapped = optionFromTextInput(input); if (mapped) out.push(mapped); });
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
    id: 'personalfury',
    name: 'Personalfury',
    domains: ['personalfury.com'],
    match: function(hostname){ var h = String(hostname || '').toLowerCase(); return h === 'personalfury.com' || h.endsWith('.personalfury.com'); },
    matchHost: function(h){ return h === 'personalfury.com' || h.endsWith('.personalfury.com'); },
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
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && (titleEl.__stsManualProfileGroup || (titleEl.closest && titleEl.closest('.customily_option'))); return mapGroup(group); },
    selectors: { root: '#cl_optionsapp, #customily-options', group: '.customily_option', title: '.option_name', item: '.swatch-container .customily-swatch, .customily-swatch, select option, input[type="text"], input[type="file"], textarea' },
    scanHints: { source: 'customily', preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true, supportsFileInputs: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  };
  reg.register(profile);
})();
