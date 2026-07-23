(function(){
  var g = window;
  var ns = g.STSSiteProfileShared = g.STSSiteProfileShared || {};
  function normSpaces(v){ return String(v == null ? '' : v).replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function cleanupTitle(v){
    return normSpaces(v)
      .replace(/^option\s+\d+\s+of\s+\d+\s*/i, '')
      .replace(/\*\s*required$/i, '')
      .replace(/\*$/,'')
      .replace(/\(\d+\|\d+\)$/,'')
      .replace(/required$/i,'')
      .replace(/\s+/g,' ')
      .trim();
  }
  function cleanupValue(v){ return normSpaces(v).replace(/[☑☒✅❌✔✖🗑️📋]/g, ' ').replace(/\s+/g,' ').trim(); }
  ns.cleanup = { normSpaces: normSpaces, cleanupTitle: cleanupTitle, cleanupValue: cleanupValue };
})();
