(function(){
  var g = window;
  var ns = g.STSSiteProfileShared = g.STSSiteProfileShared || {};
  function isVisibleElement(el){
    if (!el || el.nodeType !== 1) return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true' || el.getAttribute('visually-hidden') === 'true') return false;
    var s = g.getComputedStyle ? g.getComputedStyle(el) : null;
    if (s && (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') <= 0)) return false;
    var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return !!(r && r.width > 0 && r.height > 0);
  }
  function isJunkElement(el){
    if (!el || !el.matches) return true;
    if (!isVisibleElement(el)) return true;
    if (el.closest('#reviews, [id*=review], [class*=review], [class*=rating], [class*=sort], [class*=shipping], [class*=delivery], [class*=gallery], [class*=thumbnail], [class*=helper]')) return true;
    if (el.matches('script,style,template,noscript,input[type="hidden"],[disabled],[aria-disabled="true"]')) return true;
    return false;
  }
  ns.dom = { isVisibleElement: isVisibleElement, isJunkElement: isJunkElement };
})();
