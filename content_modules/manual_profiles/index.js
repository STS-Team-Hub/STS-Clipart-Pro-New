(function(){
  var g = window;
  function warnManualProfiles(reason){
    if (g.__stsManualProfilesDeprecationWarned) return;
    g.__stsManualProfilesDeprecationWarned = true;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[STS Clipart Pro 8.3 Legacy] STSManualProfiles assets are deprecated compatibility fixtures; prefer scanner profiles.', reason || '');
    }
  }

  if (!g.STSManualProfiles) g.STSManualProfiles = {
    profiles: [],
    register: function(p){ if (p) this.profiles.push(p); },
    resolve: function(host){
      host=String(host||'').toLowerCase();
      var profile = this.profiles.find(function(p){ try{return !!p.matchHost(host);}catch(e){return false;} }) || null;
      if (profile) warnManualProfiles(profile.id || host || 'resolved');
      return profile;
    },
    warnDeprecated: warnManualProfiles
  };
})();
