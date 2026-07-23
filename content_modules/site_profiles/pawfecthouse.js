(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  var shared = window.STSSiteProfileShared || {};
  var dom = shared.dom || {};
  var cleanup = shared.cleanup || {};

  function isVisible(el){ return !dom.isVisibleElement || dom.isVisibleElement(el); }
  function clean(v){ return cleanup.cleanupValue ? cleanup.cleanupValue(v) : String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(v){ return cleanup.cleanupTitle ? cleanup.cleanupTitle(v) : clean(v); }
  function firstNonEmpty(list){ for (var i = 0; i < list.length; i++){ var v = clean(list[i]); if (v) return v; } return ''; }
  function getRoot(doc){ return (doc || document).querySelector('#teeFormInputs, .tee-customization-form.tee-form-inputs'); }
  function getGroups(root){
    if (!root) return [];
    return Array.from(root.querySelectorAll('.tee-field')).filter(function(group){
      if (!isVisible(group)) return false;
      if (group.closest('[class*=shipping],[class*=gallery],[class*=review],[class*=helper]')) return false;
      return !!getTitleElement(group);
    });
  }
  function getTitleElement(group){ return group && group.querySelector('.tee-field__heading'); }
  function optionFromClipart(item){
    if (!item) return null;
    var input = item.querySelector('input[type="radio"], input[type="checkbox"], input[value]');
    var label = input && input.id ? item.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(input.id) : input.id.replace(/"/g, '\\"')) + '"]') : item.querySelector('.tee-clipart-label, label');
    var img = item.querySelector('img');
    var value = firstNonEmpty([
      label && label.getAttribute('data-title'),
      img && img.getAttribute('alt'),
      label && label.textContent,
      item.getAttribute('aria-label'),
      item.getAttribute('title'),
      input && input.getAttribute('value')
    ]);
    if (!value) return null;
    return { value: value, rawValue: input ? input.getAttribute('value') || value : value, label: value, image: (img && (img.currentSrc || img.src || img.getAttribute('data-src'))) || null, element: item };
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
  function collectItems(group){
    if (!group) return [];
    var out = [];
    Array.from(group.querySelectorAll('.tee-clipart')).forEach(function(item){ var mapped = optionFromClipart(item); if (mapped) out.push(mapped); });
    Array.from(group.querySelectorAll('select.tee-field__select, select')).forEach(function(select){
      Array.from(select.options || select.querySelectorAll('option')).forEach(function(option){ var mapped = optionFromSelect(select, option); if (mapped) out.push(mapped); });
    });
    Array.from(group.querySelectorAll('input[type="text"], textarea')).forEach(function(input){ var mapped = optionFromTextInput(input); if (mapped) out.push(mapped); });
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
    id: 'pawfecthouse',
    name: 'Pawfecthouse',
    domains: ['pawfecthouse.com'],
    match: function(hostname){ var h = String(hostname || '').toLowerCase(); return h === 'pawfecthouse.com' || h.endsWith('.pawfecthouse.com'); },
    matchHost: function(h){ return h === 'pawfecthouse.com' || h.endsWith('.pawfecthouse.com'); },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: getItems,
    extractValue: function(item){ var mapped = optionFromClipart(item) || optionFromTextInput(item); return mapped ? mapped.value : ''; },
    cleanupTitle: cleanTitle,
    cleanupValue: clean,
    isValidGroup: isValidGroup,
    isVisibleElement: dom.isVisibleElement,
    isJunkElement: dom.isJunkElement,
    autoScan: function(doc){ var root = getRoot(doc || document); return getGroups(root).map(mapGroup).filter(Boolean); },
    getManualTitleElements: function(doc){ var root = getRoot(doc || document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && titleEl.closest('.tee-field'); return mapGroup(group); },
    selectors: { root: '#teeFormInputs, .tee-customization-form.tee-form-inputs', group: '.tee-field', title: '.tee-field__heading', item: '.tee-clipart, select.tee-field__select option, input[type="text"], textarea' },
    scanHints: { source: 'teeinblue', preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  };
  reg.register(profile);
})();
