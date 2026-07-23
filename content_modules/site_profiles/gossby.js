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
  function getRoot(doc){ return (doc || document).querySelector('form.at-product-personalized-form') || (doc || document).querySelector('.at-product-personalized-form'); }
  function isExcludedTitle(title){ return /^(product type|color|size|quantity|subtotal|preview|promotion|discount|shipping)$/i.test(cleanTitle(title || '')); }
  function isExcludedContainer(el){ return !!(el && el.closest && el.closest('#at-promotion-code, #at-sub-total, [class*=promotion], [class*=discount], [class*=shipping], [class*=quantity]')); }
  function getTitleElement(group){
    if (!group || !group.querySelector) return null;
    return group.querySelector('[class*="PersonalizedForm_option-title"]') || group.querySelector('.font-semibold span') || group.querySelector('.font-semibold');
  }
  function hasCollectible(group){ return collectItems(group).length > 0; }
  function getGroups(root){
    if (!root) return [];
    var seen = [];
    function add(group){
      if (!group || seen.indexOf(group) >= 0) return;
      if (isExcludedContainer(group)) return;
      var titleEl = getTitleElement(group);
      var title = cleanTitle((titleEl && titleEl.textContent) || '');
      if (!title || isExcludedTitle(title)) return;
      if (!hasCollectible(group)) return;
      seen.push(group);
    }
    Array.from(root.querySelectorAll('.pt-4')).forEach(add);
    if (!seen.length) {
      Array.from(root.querySelectorAll('.form-part, .mb-4, [class*="form-part"]')).forEach(function(section){
        if (!getTitleElement(section)) return;
        add(section);
      });
    }
    return seen;
  }
  function imageFilename(url){
    var cleanUrl = String(url || '').split('?')[0].split('#')[0];
    var file = cleanUrl.slice(cleanUrl.lastIndexOf('/') + 1).replace(/\.[a-z0-9]+$/i, '');
    return file.replace(/^\d+\./, '').replace(/[-_]+/g, ' ').trim();
  }
  function classValue(el){
    var cls = String((el && el.className) || '');
    var match = cls.match(/\bat-field-value-([^\s]+)/);
    return match ? match[1] : '';
  }
  function optionFromImageCard(item){
    if (!item || !item.querySelector) return null;
    var img = item.querySelector('img');
    if (!img) return null;
    var image = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src') || '';
    var extracted = values.extractCommonValue ? values.extractCommonValue(item) : null;
    var value = firstNonEmpty([
      extracted && extracted.value,
      item.getAttribute && item.getAttribute('title'),
      item.getAttribute && item.getAttribute('aria-label'),
      item.getAttribute && item.getAttribute('data-value'),
      classValue(item),
      imageFilename(image)
    ]);
    if (!value && !image) return null;
    return { value: value || image, rawValue: (extracted && extracted.rawValue) || value || image, label: value || image, image: image || null, element: item };
  }
  function optionFromTextInput(input){
    if (!input) return null;
    var type = String((input.getAttribute && input.getAttribute('type')) || '').toLowerCase();
    if (type === 'hidden' || type === 'file') return null;
    if ((input.getAttribute && input.getAttribute('id')) === 'quantity-input') return null;
    if (input.closest && input.closest('.at-quantity, #at-sub-total, #at-promotion-code')) return null;
    var value = firstNonEmpty([input.getAttribute && input.getAttribute('placeholder'), input.getAttribute && input.getAttribute('aria-label'), input.getAttribute && input.getAttribute('name'), input.value, 'text']);
    if (!value) return null;
    return { value: value, rawValue: input.value || value, label: value, image: null, element: input };
  }
  function optionFromFileInput(input){
    if (!input) return null;
    if (input.closest && input.closest('.at-quantity, #at-sub-total, #at-promotion-code')) return null;
    var value = firstNonEmpty([input.getAttribute && input.getAttribute('aria-label'), input.getAttribute && input.getAttribute('name'), input.getAttribute && input.getAttribute('accept'), 'Upload photo']);
    if (!value) return null;
    return { value: value, rawValue: value, label: value, image: null, element: input };
  }
  function collectItems(group){
    if (!group || !group.querySelectorAll) return [];
    var out = [];
    var seen = [];
    function push(mapped){
      if (!mapped || !mapped.element) return;
      if (seen.indexOf(mapped.element) >= 0) return;
      seen.push(mapped.element);
      out.push(mapped);
    }
    Array.from(group.querySelectorAll('.at-image-selector .at-item')).forEach(function(item){ push(optionFromImageCard(item)); });
    Array.from(group.querySelectorAll('.at-item')).forEach(function(item){ if (item.querySelector && item.querySelector('img')) push(optionFromImageCard(item)); });
    Array.from(group.querySelectorAll('input[type="text"], input:not([type]), textarea')).forEach(function(input){ push(optionFromTextInput(input)); });
    Array.from(group.querySelectorAll('input[type="file"]')).forEach(function(input){ push(optionFromFileInput(input)); });
    return out;
  }
  function getItems(group){ return collectItems(group).map(function(item){ return item.element; }).filter(Boolean); }
  function isValidGroup(group){
    var titleEl = getTitleElement(group);
    var title = cleanTitle((titleEl && titleEl.textContent) || '');
    return !!title && !isExcludedTitle(title) && collectItems(group).length > 0;
  }
  function mapGroup(group){
    if (!isValidGroup(group)) return null;
    var title = cleanTitle(getTitleElement(group).textContent || '');
    var items = collectItems(group);
    return items.length ? { title: title, items: items } : null;
  }

  reg.register({
    id: 'gossby',
    name: 'Gossby',
    domains: ['gossby.com'],
    match: function(hostname){ var h=String(hostname||'').toLowerCase(); return h==='gossby.com' || h.endsWith('.gossby.com'); },
    matchHost: function(h){ return h === 'gossby.com' || h.endsWith('.gossby.com'); },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: getItems,
    extractValue: function(item){ var mapped = optionFromImageCard(item) || optionFromTextInput(item) || optionFromFileInput(item); return mapped ? mapped.value : ''; },
    cleanupTitle: cleanTitle,
    cleanupValue: clean,
    isValidGroup: isValidGroup,
    isVisibleElement: dom.isVisibleElement,
    isJunkElement: dom.isJunkElement,
    autoScan: function(doc){ var root = getRoot(doc || document); return getGroups(root).map(mapGroup).filter(Boolean); },
    getManualTitleElements: function(doc){ var root = getRoot(doc || document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && (titleEl.__stsManualProfileGroup || (titleEl.closest && titleEl.closest('.pt-4'))); return mapGroup(group); },
    selectors: { root: 'form.at-product-personalized-form, .at-product-personalized-form', group: '.pt-4', title: '[class*="PersonalizedForm_option-title"], .font-semibold span, .font-semibold', item: '.at-image-selector .at-item, .at-item img, input[type="text"], input[type="file"], textarea' },
    scanHints: { source: 'gossby-at-product-personalized-form', preferVisualSwatches: true, supportsTextInputs: true, supportsFileInputs: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  });
})();
