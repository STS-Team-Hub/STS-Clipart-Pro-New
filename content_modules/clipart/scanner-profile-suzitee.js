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

  function cleanScannerText(value){ return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function mapOption(item){ if (!item || typeof item !== 'object') return item || {}; var text = cleanScannerText(item.textContent || item.label || item.value || item.rawValue || item.name || ''); var imageUrl = item.imageUrl || item.image || item.capturedImage || null; return Object.assign({}, item, { label: cleanScannerText(item.label || text), textContent: cleanScannerText(item.textContent || text), value: cleanScannerText(item.value || item.rawValue || text), name: cleanScannerText(item.name || item.label || item.value || text), imageUrl: imageUrl, capturedImage: item.capturedImage || imageUrl, optionType: item.optionType || (imageUrl ? 'image' : 'text') }); }
  function mapGroupForScanner(group){ if (!group || typeof group !== 'object') return null; var rawOptions = Array.isArray(group.options) ? group.options : (Array.isArray(group.items) ? group.items : []); var title = cleanScannerText(group.label || group.name || group.title || ''); if (!title && !rawOptions.length) return null; return Object.assign({}, group, { label: group.label || title, name: group.name || title, title: group.title || title, options: rawOptions.map(mapOption) }); }
  function toScannerProfile(profile){ profile.hosts = (profile.domains || []).reduce(function(out, domain){ out.push(domain, '*.' + domain); return out; }, []); profile.detect = function(ctx){ var host = String((ctx && ctx.location && ctx.location.hostname) || location.hostname || '').toLowerCase(); var href = String((ctx && ctx.location && ctx.location.href) || location.href || ''); return typeof profile.match === 'function' ? !!profile.match(host, href) : (typeof profile.matchHost === 'function' ? !!profile.matchHost(host, href) : false); }; profile.scanPage = function(ctx){ var doc = (ctx && ctx.document) || document; return (typeof profile.autoScan === 'function' ? profile.autoScan(doc) : []).map(mapGroupForScanner).filter(Boolean); }; profile.scanVisibleState = function(ctx){ return profile.scanPage(ctx); }; if (typeof profile.scanManualGroupFromTitle === 'function') { var manual = profile.scanManualGroupFromTitle; profile.scanManualGroupFromTitle = function(titleEl, ctx){ return mapGroupForScanner(manual.call(profile, titleEl, ctx)); }; } profile.scanHints = Object.assign({ phase8Native: true }, profile.scanHints || {}); return profile; }
  function isVisible(el){ return !dom.isVisibleElement || dom.isVisibleElement(el); }
  function clean(v){ return cleanup.cleanupValue ? cleanup.cleanupValue(v) : String(v || '').replace(/\s+/g, ' ').trim(); }
  function cleanTitle(v){ return cleanup.cleanupTitle ? cleanup.cleanupTitle(v) : clean(v); }
  function cleanName(v){ var m = String(v || '').match(/properties\[(.+?)\]/i); return clean(m ? m[1] : v); }
  function first(list){ for (var i = 0; i < list.length; i++){ var v = clean(list[i]); if (v) return v; } return ''; }
  function getRoot(doc){ return doc.querySelector('#cl_optionsapp') || doc.querySelector('#customily-options'); }
  function getGroups(root){ return Array.from((root && root.querySelectorAll('.customily_option')) || []).filter(function(g){ return isVisible(g); }); }
  function getTitleElement(group){ return group && group.querySelector('.option_name'); }
  function isPlaceholder(v){ return /^(select|choose|please select|pick one|choose an option)$/i.test(clean(v)); }
  function optionFromSwatch(item){
    if (!item) return null;
    var extracted = values.extractCommonValue ? values.extractCommonValue(item) : null;
    var input = item.querySelector && item.querySelector('input[value]');
    var img = item.querySelector && item.querySelector('img');
    var value = first([extracted && extracted.value, input && input.getAttribute('value'), img && img.getAttribute('alt'), item.getAttribute && item.getAttribute('data-value'), item.getAttribute && item.getAttribute('title'), item.getAttribute && item.getAttribute('aria-label')]);
    if (!value) return null;
    return { value:value, rawValue:(extracted && extracted.rawValue) || (input && input.getAttribute('value')) || value, label:value, image:(extracted && extracted.image) || (img && (img.currentSrc || img.src)) || null, element:item, sourceKind:'customily-swatch' };
  }
  function optionFromSelect(select, option){
    if (!option || option.disabled) return null;
    var value = first([option.textContent, option.getAttribute && option.getAttribute('label'), option.getAttribute && option.getAttribute('value')]);
    if (!value || isPlaceholder(value)) return null;
    return { value:value, rawValue:(option.getAttribute && option.getAttribute('value')) || value, label:value, image:null, element:select, sourceKind:'customily-select' };
  }
  function optionFromInput(input){
    if (!input) return null;
    var tag = String(input.tagName || '').toUpperCase();
    var type = tag === 'TEXTAREA' ? 'textarea' : String((input.getAttribute && input.getAttribute('type')) || 'text').toLowerCase();
    var name = cleanName((input.getAttribute && input.getAttribute('name')) || input.name || '');
    var placeholder = clean((input.getAttribute && input.getAttribute('placeholder')) || '');
    var value = clean(input.value || (input.getAttribute && input.getAttribute('value')) || '');
    var label = first([name, placeholder, value]);
    if (!label && type !== 'file') return null;
    if (type === 'file') {
      var accept = String((input.getAttribute && input.getAttribute('accept')) || '').trim();
      label = label || 'Upload File';
      return { value:accept || label, rawValue:accept || label, label:label, image:null, element:input, sourceKind:'customily-file-input', optionType:'file', accept:accept };
    }
    return { value:value, rawValue:value, label:label, image:null, element:input, sourceKind:type === 'textarea' ? 'customily-textarea' : 'customily-text-input', optionType:type === 'textarea' ? 'textarea' : 'text', placeholder:placeholder, maxlength:(input.getAttribute && input.getAttribute('maxlength')) || '' };
  }
  function collectItems(group, includeFormInputs){
    var out=[];
    Array.from((group && group.querySelectorAll('.swatch-container .customily-swatch, .customily-swatch')) || []).filter(isVisible).forEach(function(item){ var mapped=optionFromSwatch(item); if(mapped) out.push(mapped); });
    Array.from((group && group.querySelectorAll('select')) || []).forEach(function(select){ Array.from(select.options || select.querySelectorAll('option')).forEach(function(option){ var mapped=optionFromSelect(select, option); if(mapped) out.push(mapped); }); });
    if (includeFormInputs) Array.from((group && group.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), textarea, input[type="file"]')) || []).forEach(function(input){ var mapped=optionFromInput(input); if(mapped) out.push(mapped); });
    return out;
  }
  function getItems(group){ return collectItems(group, false).map(function(item){ return item.element; }).filter(Boolean); }
  function isValidGroup(group){ var t=cleanTitle((getTitleElement(group)||{}).textContent||''); return !!t && collectItems(group, false).length>0; }
  function mapGroup(group, includeFormInputs){ var title=cleanTitle((getTitleElement(group)||{}).textContent||''); if(!title) return null; var items=collectItems(group, !!includeFormInputs); if(!items.length) return null; return { title:title, items:items }; }
  profiles.register(toScannerProfile({
    id:'suzitee',
    name:'Suzitee',
    domains:['suzitee.com'],
    match:function(hostname){ var h=String(hostname||'').toLowerCase(); return h==='suzitee.com'||h==='www.suzitee.com'||h.endsWith('.suzitee.com'); },
    matchHost:function(h){ return h==='suzitee.com'||h==='www.suzitee.com'||h.endsWith('.suzitee.com'); },
    getRoot:getRoot, getGroups:getGroups, getTitleElement:getTitleElement, getItems:getItems,
    extractValue:function(item){ var mapped=optionFromSwatch(item)||optionFromInput(item); return mapped ? mapped.value : ''; }, cleanupTitle:cleanTitle, cleanupValue:clean,
    isValidGroup:isValidGroup, isVisibleElement:dom.isVisibleElement, isJunkElement:dom.isJunkElement,
    autoScan:function(doc){ var root=getRoot(doc||document); return getGroups(root).map(function(group){ return mapGroup(group, true); }).filter(Boolean); },
    getManualTitleElements:function(doc){ var root=getRoot(doc||document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle:function(titleEl){ var group=titleEl&&titleEl.closest('.customily_option'); return mapGroup(group, false); },
    selectors:{ root: '#cl_optionsapp, #customily-options', group: '.customily_option', title: '.option_name', item: '.swatch-container .customily-swatch, .customily-swatch, select option, input[type="text"], input[type="file"], textarea' },
    scanHints:{ source: 'customily', preferVisualSwatches: true, supportsTextInputs: true, supportsSelects: true, supportsFileInputs: true },
    cleanupRules:{ trim: true, collapseWhitespace: true },
    fallback:{ useLegacyGeneric: false }
  }));
})();
