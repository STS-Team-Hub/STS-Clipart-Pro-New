(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function getDoc(ctx) { return (ctx && ctx.document) || document; }
  function getWin(ctx) { return (ctx && ctx.window) || window; }

  function detectPlatform(ctx) {
    var doc = getDoc(ctx);
    var win = getWin(ctx);
    var host = String((win.location && win.location.hostname) || '');
    if (win.Shopify || (doc && doc.querySelector && doc.querySelector('[data-shopify]'))) return 'shopify';
    if (host.indexOf('etsy') >= 0) return 'etsy';
    return 'custom';
  }

  function normalizeManualData(data) {
    if (ns.schema && typeof ns.schema.normalizeClipartData === 'function') {
      ns.schema.normalizeClipartData(data);
    }
    return data;
  }

  function createManualResult(ctx) {
    var doc = getDoc(ctx);
    var win = getWin(ctx);
    return normalizeManualData({
      url: (win.location && win.location.href) || '',
      title: doc && doc.title || '',
      platform: detectPlatform(ctx),
      scannedAt: new Date().toISOString(),
      categories: []
    });
  }

  function resolveEffectiveProfile(ctx) {
    var profileContextApi = ns.profileContext;
    var profilesApi = ns.profiles;
    if (!profileContextApi || typeof profileContextApi.create !== 'function') return null;
    if (!profilesApi || typeof profilesApi.resolve !== 'function') return null;
    var profileCtx = profileContextApi.create({
      document: getDoc(ctx),
      location: (ctx && ctx.location) || (getWin(ctx).location),
      window: getWin(ctx)
    });
    var profile = profilesApi.resolve(profileCtx);
    if (!profile) return null;
    return { profile: profile, ctx: profileCtx };
  }

  function collectManualGroupViaProfile(ctx, titleEl) {
    var resolved = resolveEffectiveProfile(ctx);
    var profile = resolved && resolved.profile;
    var profileCtx = resolved && resolved.ctx;
    if (!profile || typeof profile.scanManualGroupFromTitle !== 'function' || typeof profile.normalizeGroup !== 'function') {
      return { fallback: true, reason: 'invalid-effective-profile' };
    }
    var rawGroup = profile.scanManualGroupFromTitle(titleEl, profileCtx);
    var normalizedGroup = profile.normalizeGroup(rawGroup, profileCtx);
    if (!normalizedGroup || !Array.isArray(normalizedGroup.options) || normalizedGroup.options.length < 1) {
      return { fallback: true, reason: 'empty-profile-manual-group', profile: profile, ctx: profileCtx };
    }
    return { fallback: false, group: normalizedGroup, profile: profile, ctx: profileCtx };
  }

  function startManualScan(ctx) {
    var c = ctx || {};
    var data = createManualResult(c);
    if (c.CLIPART) {
      c.CLIPART.categories = data.categories;
      c.CLIPART.capturedData = data;
      c.CLIPART.isScanning = false;
    }
    if (typeof c.showClipartPanel === 'function') c.showClipartPanel(data);
    if (typeof c.clipNotify === 'function') c.clipNotify('Manual mode — dùng Pick hoặc Screenshot để thêm clipart', 'info');
    return data;
  }

  function activateManualPick(ctx, data, onRefresh) {
    if (!ctx || !ctx.coreFns || typeof ctx.coreFns.activateManualPickLegacy !== 'function') return null;
    return ctx.coreFns.activateManualPickLegacy(data, onRefresh);
  }

  function deactivateManualPick(ctx) {
    if (ctx && ctx.coreFns && typeof ctx.coreFns.deactivateManualPickLegacy === 'function') {
      return ctx.coreFns.deactivateManualPickLegacy();
    }
    if (ctx && typeof ctx.cleanupAllPickModes === 'function') ctx.cleanupAllPickModes();
    return null;
  }

  ns.manual = ns.manual || {};
  ns.manual.createManualResult = createManualResult;
  ns.manual.normalizeManualData = normalizeManualData;
  ns.manual.resolveEffectiveProfile = resolveEffectiveProfile;
  ns.manual.collectManualGroupViaProfile = collectManualGroupViaProfile;
  ns.manual.startManualScan = startManualScan;
  ns.manual.activateManualPick = activateManualPick;
  ns.manual.deactivateManualPick = deactivateManualPick;

  ns.modules.manual = {
    name: 'manual',
    createManualResult: createManualResult,
    normalizeManualData: normalizeManualData,
    resolveEffectiveProfile: resolveEffectiveProfile,
    collectManualGroupViaProfile: collectManualGroupViaProfile,
    startManualScan: startManualScan,
    activateManualPick: activateManualPick,
    deactivateManualPick: deactivateManualPick
  };
})();
