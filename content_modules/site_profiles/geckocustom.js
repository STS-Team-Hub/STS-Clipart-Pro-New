(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  var shared = window.STSSiteProfileShared || {};
  var dom = shared.dom || {};
  var cleanup = shared.cleanup || {};

  function clean(v){ return cleanup.cleanupValue ? cleanup.cleanupValue(v) : String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(v){
    v = cleanup.cleanupTitle ? cleanup.cleanupTitle(v) : clean(v);
    return String(v || '')
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\bRequired\b/gi, ' ')
      .replace(/\(\s*\d+\s*\|\s*\d+\s*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function firstNonEmpty(list){ for (var i=0;i<list.length;i++){ var v=clean(list[i]); if(v) return v; } return ''; }
  function isVisible(el){ return !dom.isVisibleElement || dom.isVisibleElement(el); }
  function cssEscape(v){ return window.CSS && CSS.escape ? CSS.escape(v) : String(v || '').replace(/"/g, '\\"'); }
  function propName(v){ var m = String(v || '').match(/properties\[(.+?)\]/i); return cleanTitle(m ? m[1] : v); }
  function imageFrom(el){
    var img = el && el.querySelector && el.querySelector('img');
    return img ? (img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
  }
  function bgImageFrom(el){
    if (!el || !el.getAttribute) return '';
    var style = String(el.getAttribute('style') || '');
    var m = style.match(/--sl-image:\s*url\(([^)]+)\)/i) || style.match(/background-image:\s*url\(([^)]+)\)/i);
    return m && m[1] ? m[1].replace(/^['"]|['"]$/g, '') : '';
  }
  function bgColorFrom(el){
    if (!el || !el.getAttribute) return '';
    var style = String(el.getAttribute('style') || '');
    var m = style.match(/background-color:\s*([^;]+)/i);
    if (m && m[1]) return clean(m[1]);
    try { var cs = window.getComputedStyle && window.getComputedStyle(el); return cs && cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : ''; } catch(e) {}
    return '';
  }
  function getRoot(doc){ return (doc || document).querySelector('#customily-options, #cl_optionsapp, .customily-options-wrapper'); }
  function getTitleElement(group){ return group && group.querySelector('.sl-option-set-item_label, .option_name'); }
  function getGroups(root){
    if (!root) return [];
    return Array.from(root.querySelectorAll('.sl-option-set-item, .customily_option')).filter(function(group){
      if (!isVisible(group)) return false;
      if (group.closest('[class*=shipping],[class*=gallery],[class*=review],[class*=helper]')) return false;
      return !!getTitleElement(group) && collectItems(group).length > 0;
    });
  }
  function optionFromShoplineSwatch(item){
    if (!item) return null;
    var input = item.querySelector('input[type="radio"], input[type="checkbox"], input[value]');
    var label = input && input.id ? item.querySelector('label[for="' + cssEscape(input.id) + '"]') : item.querySelector('label');
    var image = imageFrom(item) || bgImageFrom(label) || bgImageFrom(item);
    var value = firstNonEmpty([
      label && label.getAttribute('data-title'),
      label && label.getAttribute('title'),
      label && label.getAttribute('aria-label'),
      input && input.getAttribute('value'),
      label && label.textContent,
      item.getAttribute && item.getAttribute('data-option-id'),
      propName(input && input.getAttribute('name'))
    ]);
    if (!value && !image) return null;
    return { value: value || image, rawValue: input ? input.getAttribute('value') || value : value, label: value || image, image: image || null, imageUrl: image || null, capturedImage: image || null, bgColor: image ? null : (bgColorFrom(label) || bgColorFrom(item) || null), element: item };
  }
  function optionFromCustomilySwatch(item){
    if (!item) return null;
    var input = item.querySelector('input[type="radio"], input[type="checkbox"], input[value]');
    var label = input && input.id ? item.querySelector('label[for="' + cssEscape(input.id) + '"]') : item.querySelector('label');
    var img = item.querySelector('img');
    var image = imageFrom(item);
    var value = firstNonEmpty([
      label && label.getAttribute('data-title'),
      img && img.getAttribute('alt'),
      input && input.getAttribute('value'),
      label && label.textContent,
      item.getAttribute && item.getAttribute('aria-label'),
      item.getAttribute && item.getAttribute('title'),
      propName(input && input.getAttribute('name'))
    ]);
    var bg = image ? '' : (bgColorFrom(label) || bgColorFrom(item));
    if (!value && !image && !bg) return null;
    return { value: value || bg || image, rawValue: input ? input.getAttribute('value') || value : value, label: value || bg || image, image: image || null, imageUrl: image || null, capturedImage: image || null, bgColor: bg || null, element: item };
  }
  function optionFromTextInput(input){
    if (!input) return null;
    var type = String(input.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden' || type === 'file') return null;
    var title = propName(input.getAttribute('name')) || clean(input.getAttribute('placeholder')) || clean(input.getAttribute('aria-label')) || 'Text';
    var value = clean(input.value || input.getAttribute('value') || input.getAttribute('placeholder') || title);
    return { value: value || title, rawValue: input.value || value || title, label: title, image: null, imageUrl: null, capturedImage: null, element: input };
  }
  function collectItems(group){
    if (!group || !group.querySelectorAll) return [];
    var out = [];
    Array.from(group.querySelectorAll('.sl-swatch-item')).forEach(function(item){ var o = optionFromShoplineSwatch(item); if (o) out.push(o); });
    Array.from(group.querySelectorAll('.customily-swatch')).forEach(function(item){ var o = optionFromCustomilySwatch(item); if (o) out.push(o); });
    Array.from(group.querySelectorAll('input[type="text"], textarea')).forEach(function(input){ var o = optionFromTextInput(input); if (o) out.push(o); });
    return out;
  }
  function getItems(group){ return collectItems(group).map(function(item){ return item.element; }).filter(Boolean); }
  function isValidGroup(group){ return !!cleanTitle((getTitleElement(group) || {}).textContent || '') && collectItems(group).length > 0; }
  function mapGroup(group){
    if (!isValidGroup(group)) return null;
    var title = cleanTitle(getTitleElement(group).textContent || '');
    var items = collectItems(group);
    return items.length ? { title: title, label: title, name: title, items: items, options: items } : null;
  }

  reg.register({
    id: 'geckocustom',
    name: 'GeckoCustom',
    domains: ['geckocustom.com'],
    match: function(hostname){ var h=String(hostname||'').toLowerCase(); return h==='geckocustom.com' || h.endsWith('.geckocustom.com'); },
    matchHost: function(h){ h=String(h||'').toLowerCase(); return h==='geckocustom.com' || h.endsWith('.geckocustom.com'); },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: getItems,
    extractValue: function(item){ var mapped = optionFromShoplineSwatch(item) || optionFromCustomilySwatch(item) || optionFromTextInput(item); return mapped ? mapped.value : ''; },
    cleanupTitle: cleanTitle,
    cleanupValue: clean,
    isValidGroup: isValidGroup,
    isVisibleElement: dom.isVisibleElement,
    isJunkElement: dom.isJunkElement,
    autoScan: function(doc){ var root = getRoot(doc || document); return getGroups(root).map(mapGroup).filter(Boolean); },
    getManualTitleElements: function(doc){ var root = getRoot(doc || document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && titleEl.closest && titleEl.closest('.sl-option-set-item, .customily_option'); return mapGroup(group); },
    selectors: { root: '#customily-options, #cl_optionsapp, .customily-options-wrapper', group: '.sl-option-set-item, .customily_option', title: '.sl-option-set-item_label, .option_name', item: '.sl-swatch-item, .customily-swatch, input[type="text"], textarea' },
    scanHints: { source: 'geckocustom-shopline-customily', preferVisualSwatches: true, supportsTextInputs: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  });
})();
