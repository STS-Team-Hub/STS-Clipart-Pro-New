(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function getStoredClipartAuth() {
    return new Promise(function(resolve) {
      try {
        chrome.storage.local.get(['stsClipartProUser', 'stsAuthUser', 'stsAuthToken'], function(data) {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          var clipartUser = data && data.stsClipartProUser;
          var legacyUser = data && data.stsAuthUser;
          var sourceUser = clipartUser || legacyUser;
          var token = (clipartUser && clipartUser.token) || (data && data.stsAuthToken) || '';
          if (!sourceUser) {
            resolve(null);
            return;
          }
          var normalizedUser = {
            id: String(sourceUser.id || sourceUser.userId || sourceUser.uid || sourceUser.username || sourceUser.name || ''),
            email: String(sourceUser.email || ''),
            name: String(sourceUser.name || sourceUser.username || ''),
            username: String(sourceUser.username || sourceUser.name || ''),
            role: String(sourceUser.role || 'user'),
            token: String(token)
          };
          if (normalizedUser.id || normalizedUser.username) {
            resolve(normalizedUser);
            return;
          }
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  ns.sync = ns.sync || {};
  ns.sync.getStoredClipartAuth = getStoredClipartAuth;
  ns.modules['sync'] = { name: 'sync', getStoredClipartAuth: getStoredClipartAuth };
})();
