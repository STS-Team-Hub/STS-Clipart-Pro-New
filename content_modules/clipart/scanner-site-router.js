(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function resolve(hostname){
    var host = hostname || (location && location.hostname) || '';
    if (window.STSSiteProfilesV2 && typeof window.STSSiteProfilesV2.resolve === 'function') {
      var p = window.STSSiteProfilesV2.resolve(host);
      if (p) return p;
    }
    if (window.STSSiteProfiles && typeof window.STSSiteProfiles.pickSiteProfile === 'function') {
      return window.STSSiteProfiles.pickSiteProfile(host);
    }
    return null;
  }

  ns.siteRouter = ns.siteRouter || {};
  ns.siteRouter.resolve = resolve;

  ns.modules.siteRouter = {
    name: 'site-router',
    resolve: resolve
  };
})();
