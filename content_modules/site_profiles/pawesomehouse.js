(function(){
  var reg = window.STSSiteProfilesV2; if (!reg) return;
  var shared = window.STSSiteProfileShared || {};
  var dom = shared.dom || {};
  var cleanup = shared.cleanup || {};
  var values = shared.values || {};

  function getRoot(doc){
    var outer = doc.querySelector('#customily-options');
    if (!outer) return null;
    return outer.querySelector('#cl_optionsapp') || outer;
  }
  function getGroups(root){
    if (!root) return [];
    return Array.from(root.querySelectorAll('.customily_option')).filter(function(g){
      if (!dom.isVisibleElement(g)) return false;
      if (g.closest('[class*=shipping],[class*=gallery],[class*=review],[class*=helper]')) return false;
      return true;
    });
  }
  function getTitleElement(group){ return group && group.querySelector('.option_name'); }
  function getItems(group){ return Array.from((group && group.querySelectorAll('.swatch-container .customily-swatch')) || []).filter(dom.isVisibleElement); }
  function isValidGroup(group){ var t = cleanup.cleanupTitle((getTitleElement(group) || {}).textContent || ''); return !!t && getItems(group).length > 0; }
  function mapGroup(group){
    if (!isValidGroup(group)) return null;
    var title = cleanup.cleanupTitle(getTitleElement(group).textContent || '');
    var items = getItems(group).map(function(item){ var ex = values.extractCommonValue(item); var v = cleanup.cleanupValue(ex.value); if (!v) return null; return { value: v, rawValue: ex.rawValue, label: v, image: ex.image, element: item }; }).filter(Boolean);
    if (!items.length) return null;
    return { title: title, items: items };
  }
  var profile = {
    id: 'pawesomehouse',
    name: 'Pawesomehouse',
    domains: ['pawesomehouse.com'],
    match: function(hostname){ var h=String(hostname||'').toLowerCase(); return h === 'pawesomehouse.com' || h.endsWith('.pawesomehouse.com'); },
    matchHost: function(h){ return h === 'pawesomehouse.com' || h.endsWith('.pawesomehouse.com'); },
    getRoot: getRoot,
    getGroups: getGroups,
    getTitleElement: getTitleElement,
    getItems: getItems,
    extractValue: function(item){ return values.extractCommonValue(item).value; },
    cleanupTitle: cleanup.cleanupTitle,
    cleanupValue: cleanup.cleanupValue,
    isValidGroup: isValidGroup,
    isVisibleElement: dom.isVisibleElement,
    isJunkElement: dom.isJunkElement,
    autoScan: function(doc){ var root = getRoot(doc || document); return getGroups(root).map(mapGroup).filter(Boolean); },
    getManualTitleElements: function(doc){ var root = getRoot(doc || document); return getGroups(root).filter(isValidGroup).map(getTitleElement).filter(Boolean); },
    scanManualGroupFromTitle: function(titleEl){ var group = titleEl && titleEl.closest('.customily_option'); return mapGroup(group); },
    selectors: { root: "#cl_optionsapp, #customily-options", group: ".customily_option", title: ".option_name", item: ".swatch-container .customily-swatch" },
    scanHints: { source: "customily", preferVisualSwatches: true },
    cleanupRules: { trim: true, collapseWhitespace: true },
    fallback: { useLegacyGeneric: false }
  };
  reg.register(profile);
})();
