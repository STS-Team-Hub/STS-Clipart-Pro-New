(function(){
  var g = window;
  var ns = g.STSSiteProfileShared = g.STSSiteProfileShared || {};
  function isSkuLike(v){ return /^\d{3,6}-[a-z0-9]{2,12}-[a-z0-9-]{2,40}$/i.test(String(v || '').trim()); }
  function skuToDisplay(v){ var m = String(v || '').trim().match(/^\d{3,6}-[a-z0-9]{2,12}-([a-z0-9-]{2,40})$/i); return m ? m[1].replace(/-/g, ' ').toUpperCase() : ''; }
  function firstNonEmpty(list){ for (var i=0;i<list.length;i++){ var x=String(list[i]||'').trim(); if(x) return x; } return ''; }
  function extractCommonValue(item){
    if (!item) return { rawValue: '', value: '', label: '', image: null };
    var input = item.querySelector && item.querySelector('input[value]');
    var img = item.querySelector && item.querySelector('img[alt]');
    var rawInput = input ? String(input.getAttribute('value') || '').trim() : '';
    var imgAlt = img ? String(img.getAttribute('alt') || '').trim() : '';
    var raw = firstNonEmpty([imgAlt, item.getAttribute && item.getAttribute('aria-label'), item.getAttribute && item.getAttribute('title'), item.getAttribute && item.getAttribute('data-value'), item.getAttribute && item.getAttribute('data-title'), item.getAttribute && item.getAttribute('data-name'), skuToDisplay(rawInput), rawInput]);
    return { rawValue: rawInput || raw, value: raw, label: raw, image: (img && (img.currentSrc || img.src)) || null };
  }
  ns.values = { isSkuLike: isSkuLike, skuToDisplay: skuToDisplay, extractCommonValue: extractCommonValue };
})();
