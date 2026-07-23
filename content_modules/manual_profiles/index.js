(function(){
  var g = window;
  if (!g.STSManualProfiles) g.STSManualProfiles = { profiles: [], register: function(p){ if (p) this.profiles.push(p); }, resolve: function(host){ host=String(host||'').toLowerCase(); return this.profiles.find(function(p){ try{return !!p.matchHost(host);}catch(e){return false;} }) || null; } };
})();
