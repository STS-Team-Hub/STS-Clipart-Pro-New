(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function resolve(hostname){
    if (!ns.profiles || typeof ns.profiles.resolve !== 'function') return null;
    var host = hostname || (location && location.hostname) || '';
    var href = (location && location.href) || (host ? ('https://' + host + '/') : '');
    return ns.profiles.resolve({
      document: document,
      location: { hostname: host, href: href },
      window: window
    });
  }

  ns.siteRouter = ns.siteRouter || {};
  ns.siteRouter.resolve = resolve;

  ns.modules.siteRouter = {
    name: 'site-router',
    resolve: resolve
  };
})();
