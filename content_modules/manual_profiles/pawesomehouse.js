(function(){
  var reg = window.STSManualProfiles;
  if (!reg) return;
  function vis(el){ if(!el) return false; if(el.hidden||el.getAttribute('aria-hidden')==='true'||el.getAttribute('visually-hidden')==='true') return false; var s=getComputedStyle(el); if(!s||s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')<=0) return false; var r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }
  function cleanTitle(t){ return String(t||'').replace(/^\s*option\s+\d+\s+of\s+\d+\s*/i,'').replace(/\s*\*\s*required\s*$/i,'').replace(/\s*\*\s*$/,'').replace(/\s+/g,' ').trim(); }
  function skuToDisplay(v){ var m=String(v||'').trim().match(/^\d{3,6}-[a-z0-9]{2,12}-([a-z0-9-]{2,40})$/i); if(!m) return ''; return m[1].replace(/-/g,' ').toUpperCase(); }
  function cleanValue(v){ return String(v||'').replace(/\s+/g,' ').trim(); }
  function score(v){ v=String(v||'').trim(); if(!v) return -1; if(/^\d{3,6}-[a-z0-9]{2,12}-[a-z0-9-]{2,40}$/i.test(v)) return 1; if(/^[a-z0-9][a-z0-9\s'&()#-]{1,40}$/i.test(v)) return 3; return 2; }
  var profile={
    key:'pawesomehouse',
    matchHost:function(h){ return h==='pawesomehouse.com'||h.endsWith('.pawesomehouse.com'); },
    getRoot:function(){ return document.querySelector('#customily-options'); },
    getGroups:function(){ var root=this.getRoot(); if(!root) return []; return Array.from(root.querySelectorAll('.customily_option')).filter(function(g){ if(!vis(g)) return false; if(g.closest('[class*=shipping],[class*=gallery],[class*=review],[class*=helper]')) return false; return vis(g.querySelector('.option_name')) && g.querySelectorAll('.swatch-container .customily-swatch').length>0; }); },
    getTitle:function(group){ return group&&group.querySelector('.option_name'); },
    getItems:function(group){ return Array.from((group&&group.querySelectorAll('.swatch-container .customily-swatch'))||[]).filter(vis); },
    extractValue:function(item){
      var input = item && item.querySelector('input[value]');
      var img = item && item.querySelector('img[alt]');
      var fromInput = input ? String(input.getAttribute('value')||'').trim() : '';
      var skuDisplay = skuToDisplay(fromInput);
      var fromImg = img ? String(img.getAttribute('alt')||'').trim() : '';
      var fromTitle = item ? String(item.getAttribute('title')||'').trim() : '';
      var fromAria = item ? String(item.getAttribute('aria-label')||'').trim() : '';
      var inputUse = skuDisplay || fromInput;
      var best = inputUse;
      if (score(fromImg) > score(best)) best = fromImg;
      if (!best) best = fromTitle || fromAria;
      return best;
    },
    cleanupTitle:cleanTitle,
    cleanupValue:cleanValue
  };
  reg.register(profile);
})();
