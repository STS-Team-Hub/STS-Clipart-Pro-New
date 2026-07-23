(function(){
  var reg = window.STSManualProfiles; if(!reg) return;
  reg.register({ key:'macorner-baseline', matchHost:function(h){ return h==='macorner.co'||h.endsWith('.macorner.co'); }, useLegacyGeneric:true });
})();
