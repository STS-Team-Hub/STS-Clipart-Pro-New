const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function fail(message) { console.error('SMOKE CHECK FAILED:', message); process.exit(1); }

const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));

if (manifest.version !== '8.3.0') fail(`manifest version must be 8.3.0, got ${manifest.version}`);
if (pkg.version !== manifest.version) fail(`package version ${pkg.version} != manifest ${manifest.version}`);
if (!manifest.host_permissions || !manifest.host_permissions.includes('<all_urls>')) fail('host_permissions must keep <all_urls> by user request');

const contentFiles = (((manifest.content_scripts || [])[0] || {}).js || []);
const expectedContentFiles = [
  'content_modules/debug.js',
  'content_modules/sanitize.js',
  'content_modules/label-extraction.js',
  'content_modules/dropdown-detection.js',
  'content_modules/sync-payload.js',
  'content_modules/site-profiles.js',
  'content_modules/site_profiles/index.js',
  'content_modules/site_profiles/shared/cleanup.js',
  'content_modules/site_profiles/shared/dom.js',
  'content_modules/site_profiles/shared/values.js',
  'content_modules/site_profiles/macorner.js',
  'content_modules/site_profiles/pawesomehouse.js',
  'content_modules/site_profiles/suzitee.js',
  'content_modules/site_profiles/pawfecthouse.js',
  'content_modules/site_profiles/trendingcustom.js',
  'content_modules/site_profiles/interestpod.js',
  'content_modules/site_profiles/personalfury.js',
  'content_modules/site_profiles/generic.js',
  'content_modules/site_profiles/etsy.js',
  'content_modules/site_profiles/wanderprints.js',
  'content_modules/site_profiles/gossby.js',
  'content_modules/site_profiles/geckocustom.js',
  'content_modules/manual_profiles/index.js',
  'content_modules/manual_profiles/macorner.js',
  'content_modules/manual_profiles/pawesomehouse.js',
  'content_modules/manual_profiles/suzitee.js',
  'content_modules/manual_profiles/geckocustom.js',
  'content_modules/product-crawler.js',
  'content_modules/fab-manager.js',
  'content_modules/clipart/scanner-utils.js',
  'content_modules/clipart/scanner-schema.js',
  'content_modules/clipart/scanner-state.js',
  'content_modules/clipart/scanner-collectors.js',
  'content_modules/clipart/scanner-profile-context.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-pawesomehouse-customily.js',
  'content_modules/clipart/scanner-profile-macorner-customily.js',
  'content_modules/clipart/scanner-profile-geckocustom.js',
  'content_modules/clipart/scanner-profile-pawfecthouse-teeinblue.js',
  'content_modules/clipart/scanner-profile-suzitee.js',
  'content_modules/clipart/scanner-profile-trendingcustom.js',
  'content_modules/clipart/scanner-profile-wanderprints.js',
  'content_modules/clipart/scanner-profile-etsy.js',
  'content_modules/clipart/scanner-profile-site-v2-bridge.js',
  'content_modules/clipart/scanner-profile-personalfury.js',
  'content_modules/clipart/scanner-profile-interestpod.js',
  'content_modules/clipart/scanner-profile-gossby.js',
  'content_modules/clipart/scanner-profile-site-v2-consolidated.js',
  'content_modules/clipart/scanner-profile-adapters.js',
  'content_modules/clipart/scanner-site-router.js',
  'content_modules/clipart/scanner-ui.js',
  'content_modules/clipart/scanner-export.js',
  'content_modules/clipart/scanner-sync.js',
  'content_modules/clipart/scanner-render.js',
  'content_modules/clipart/scanner-auto-default-v2.js',
  'content_modules/clipart/scanner-auto.js',
  'content_modules/clipart/scanner-manual.js',
  'content_modules/clipart/scanner-screenshot.js',
  'content_modules/clipart/scanner-panel.js',
  'content_modules/clipart/scanner-core.js',
  'content_modules/clipart-scanner.js'
];
if (contentFiles.length !== expectedContentFiles.length) fail(`content script load order length changed: expected ${expectedContentFiles.length}, got ${contentFiles.length}`);
expectedContentFiles.forEach((file, idx) => {
  if (contentFiles[idx] !== file) fail(`content script load order changed at index ${idx}: expected ${file}, got ${contentFiles[idx] || 'missing'}`);
});
contentFiles.forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) fail(`missing content script file: ${file}`);
});

const architectureBaseline = read('docs/clipart-architecture-baseline.md');
expectedContentFiles.forEach((file, idx) => {
  const numberedEntry = `${idx + 1}. \`${file}\``;
  if (!architectureBaseline.includes(numberedEntry)) fail(`architecture baseline load order missing: ${numberedEntry}`);
});
['content_modules/debug.js', 'content_modules/sanitize.js', 'content_modules/product-crawler.js', 'content_modules/clipart-scanner.js'].forEach(file => {
  if (!contentFiles.includes(file)) fail(`manifest missing content file: ${file}`);
  if (!fs.existsSync(path.join(root, file))) fail(`missing file: ${file}`);
});


const requiredProfileFiles = [
  'content_modules/site-profiles.js',
  'content_modules/site_profiles/index.js',
  'content_modules/site_profiles/generic.js',
  'content_modules/site_profiles/pawesomehouse.js',
  'content_modules/site_profiles/suzitee.js',
  'content_modules/site_profiles/macorner.js',
  'content_modules/site_profiles/etsy.js',
  'content_modules/site_profiles/wanderprints.js',
  'content_modules/site_profiles/gossby.js'
];
requiredProfileFiles.forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) fail(`missing profile file: ${file}`);
});

const v2Index = read('content_modules/site_profiles/index.js');
if (!v2Index.includes('g.STSSiteProfilesV2')) fail('STSSiteProfilesV2 registry namespace missing');
if (!v2Index.includes('register: register') || !v2Index.includes('resolve: resolve')) fail('STSSiteProfilesV2 register/resolve API missing');

const legacyProfiles = read('content_modules/site-profiles.js');
['DEFAULT_PROFILE', 'SITE_PROFILES', 'pickSiteProfile', 'warnLegacyRouter', 'deprecated and kept as compatibility fallback only'].forEach((pattern) => {
  if (!legacyProfiles.includes(pattern)) fail(`legacy site profile contract missing: ${pattern}`);
});

const knownProfileIds = ['generic', 'pawesomehouse', 'suzitee', 'macorner', 'etsy', 'wanderprints', 'gossby'];
knownProfileIds.forEach((id) => {
  const candidates = [
    'content_modules/site_profiles/generic.js',
    'content_modules/site_profiles/pawesomehouse.js',
    'content_modules/site_profiles/suzitee.js',
    'content_modules/site_profiles/macorner.js',
    'content_modules/site_profiles/etsy.js',
    'content_modules/site_profiles/wanderprints.js',
    'content_modules/site_profiles/gossby.js'
  ];
  const found = candidates.some((file) => read(file).includes(`id: '${id}'`) || read(file).includes(`id:'${id}'`));
  if (!found) fail(`known profile id not discoverable: ${id}`);
});

const expectedClipartOrder = [
  'content_modules/clipart/scanner-utils.js',
  'content_modules/clipart/scanner-schema.js',
  'content_modules/clipart/scanner-state.js',
  'content_modules/clipart/scanner-collectors.js',
  'content_modules/clipart/scanner-profile-context.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-site-router.js',
  'content_modules/clipart/scanner-ui.js',
  'content_modules/clipart/scanner-export.js',
  'content_modules/clipart/scanner-sync.js',
  'content_modules/clipart/scanner-render.js',
  'content_modules/clipart/scanner-auto-default-v2.js',
  'content_modules/clipart/scanner-auto.js',
  'content_modules/clipart/scanner-manual.js',
  'content_modules/clipart/scanner-screenshot.js',
  'content_modules/clipart/scanner-panel.js',
  'content_modules/clipart/scanner-core.js',
  'content_modules/clipart-scanner.js'
];
let previousIndex = -1;

const indexOf = (file) => contentFiles.indexOf(file);
if (!(indexOf('content_modules/clipart/scanner-schema.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: schema must load before core');
if (!(indexOf('content_modules/clipart/scanner-state.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: state must load before core');
if (!(indexOf('content_modules/clipart/scanner-collectors.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: collectors must load before core');
if (!(indexOf('content_modules/clipart/scanner-panel.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: panel must load before core');
if (!(indexOf('content_modules/clipart/scanner-auto-default-v2.js') < indexOf('content_modules/clipart/scanner-auto.js'))) fail('manifest order broken: auto default v2 must load before auto');
if (!(indexOf('content_modules/clipart/scanner-auto-default-v2.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: auto default v2 must load before core');
if (!(indexOf('content_modules/clipart/scanner-core.js') < indexOf('content_modules/clipart-scanner.js'))) fail('manifest order broken: core must load before legacy entry');


expectedClipartOrder.forEach((file) => {
  const idx = contentFiles.indexOf(file);
  if (idx < 0) fail(`manifest missing clipart runtime file: ${file}`);
  if (idx <= previousIndex) fail(`clipart runtime load order invalid around: ${file}`);
  previousIndex = idx;
});


[
  'content_modules/clipart/scanner-profile-context.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js'
].forEach((file) => {
  if (!contentFiles.includes(file)) fail(`manifest missing scanner profile runtime file: ${file}`);
});
if (!(indexOf('content_modules/clipart/scanner-collectors.js') < indexOf('content_modules/clipart/scanner-profile-context.js'))) fail('manifest order broken: profile context must load after collectors');
if (!(indexOf('content_modules/clipart/scanner-profile-context.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: profile context must load before core');
if (!(indexOf('content_modules/clipart/scanner-profile-registry.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: profile registry must load before core');
if (!(indexOf('content_modules/clipart/scanner-profile-default.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: profile default must load before core');


if (!contentFiles.includes('content_modules/clipart/scanner-profile-adapters.js')) fail('manifest missing scanner profile adapters runtime file');
if (!(indexOf('content_modules/site_profiles/gossby.js') < indexOf('content_modules/clipart/scanner-profile-adapters.js'))) fail('manifest order broken: profile adapters must load after legacy site profiles');
if (!(indexOf('content_modules/clipart/scanner-profile-default.js') < indexOf('content_modules/clipart/scanner-profile-adapters.js'))) fail('manifest order broken: profile adapters must load after default profile');
if (!(indexOf('content_modules/clipart/scanner-profile-adapters.js') < indexOf('content_modules/clipart/scanner-core.js'))) fail('manifest order broken: profile adapters must load before core');

const vm = require('vm');
function runInContext(ctx, file) { vm.runInContext(read(file), ctx, { filename: file }); }
const ctx = vm.createContext({ window: {}, location: { hostname: 'example.com', href: 'https://example.com' }, document: {}, console });
ctx.window = ctx;
runInContext(ctx, 'content_modules/site-profiles.js');
runInContext(ctx, 'content_modules/site_profiles/index.js');
[
  'content_modules/site_profiles/generic.js',
  'content_modules/site_profiles/pawesomehouse.js',
  'content_modules/site_profiles/suzitee.js',
  'content_modules/site_profiles/macorner.js',
  'content_modules/site_profiles/etsy.js',
  'content_modules/site_profiles/wanderprints.js',
  'content_modules/site_profiles/gossby.js',
  'content_modules/clipart/scanner-profile-context.js',
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-adapters.js',
  'content_modules/clipart/scanner-site-router.js'
].forEach((file) => runInContext(ctx, file));

const scannerProfiles = ctx.window.STSClipartScanner && ctx.window.STSClipartScanner.profiles;
if (!scannerProfiles) fail('scanner profiles registry missing after profile adapter load');
const scannerList = scannerProfiles.list().map((p) => p.id);
knownProfileIds.filter((id) => id !== 'generic').forEach((id) => {
  if (!scannerList.includes(id)) fail(`scanner profile adapter missing known id: ${id}`);
  if (!scannerProfiles.get(id)) fail(`scanner profiles.get(id) missing adapter for: ${id}`);
});

const hostToProfileId = {
  'pawesomehouse.com': 'pawesomehouse',
  'www.suzitee.com': 'suzitee',
  'macorner.co': 'macorner',
  'www.etsy.com': 'etsy',
  'wanderprints.com': 'wanderprints',
  'gossby.com': 'gossby'
};
Object.entries(hostToProfileId).forEach(([hostname, expectedId]) => {
  const resolved = scannerProfiles.resolve({ location: { hostname, href: `https://${hostname}/p` }, document: {}, schema: {}, collectors: {}, state: {}, utils: {} });
  if (!resolved || resolved.id !== expectedId) fail(`known host should resolve to ${expectedId}, got ${(resolved && resolved.id) || 'null'} for ${hostname}`);
});

const unknownResolved = scannerProfiles.resolve({ location: { hostname: 'unknown.example', href: 'https://unknown.example' }, document: {}, schema: {}, collectors: {}, state: {}, utils: {} });
if (!unknownResolved || unknownResolved.id !== 'default') fail('unknown host must resolve to default scanner profile');
if (typeof unknownResolved.scanVisibleState !== 'function') fail('effective default profile missing scanVisibleState fallback');

const macornerResolved = scannerProfiles.resolve({ location: { hostname: 'macorner.co', href: 'https://macorner.co' }, document: {}, schema: {}, collectors: {}, state: {}, utils: {} });
if (!macornerResolved || macornerResolved.id !== 'macorner') fail('macorner host must resolve to macorner profile');
if (typeof macornerResolved.scanVisibleState !== 'function') fail('matched profile without method must inherit default scanVisibleState fallback');

if (!ctx.window.STSSiteProfiles || typeof ctx.window.STSSiteProfiles.pickSiteProfile !== 'function') fail('legacy STSSiteProfiles global contract missing');
if (!ctx.window.STSSiteProfilesV2 || typeof ctx.window.STSSiteProfilesV2.resolve !== 'function') fail('legacy STSSiteProfilesV2 global contract missing');
if (!read('content_modules/manual_profiles/index.js').includes('warnDeprecated: warnManualProfiles')) fail('legacy manual profiles deprecation warning contract missing');


const clipartFiles = {
  utils: read('content_modules/clipart/scanner-utils.js'),
  siteRouter: read('content_modules/clipart/scanner-site-router.js'),
  ui: read('content_modules/clipart/scanner-ui.js'),
  exportModule: read('content_modules/clipart/scanner-export.js'),
  sync: read('content_modules/clipart/scanner-sync.js'),
  render: read('content_modules/clipart/scanner-render.js'),
  autoDefaultV2: read('content_modules/clipart/scanner-auto-default-v2.js'),
  auto: read('content_modules/clipart/scanner-auto.js'),
  manual: read('content_modules/clipart/scanner-manual.js'),
  screenshot: read('content_modules/clipart/scanner-screenshot.js'),
  panel: read('content_modules/clipart/scanner-panel.js'),
  collectors: read('content_modules/clipart/scanner-collectors.js'),
  core: read('content_modules/clipart/scanner-core.js'),
  legacy: read('content_modules/clipart-scanner.js')
};

Object.entries(clipartFiles).forEach(([name, src]) => {
  if (!src.includes('window.STSClipartScanner = window.STSClipartScanner || {};') && name !== 'core' && name !== 'legacy') {
    fail(`namespace bootstrap missing in ${name}`);
  }
});


[
  'collectOptionsInContainer: collectOptionsInContainer',
  'collectOptionsInRegion: collectOptionsInRegion',
  'detectNearestGroupTitleFromOption: detectNearestGroupTitleFromOption'
].forEach((pattern) => {
  if (!clipartFiles.collectors.includes(pattern)) fail(`scanner-collectors API export missing: ${pattern}`);
});

[
  'schema.normalizeText',
  "schema.normScanText"
].forEach((pattern) => {
  if (!clipartFiles.collectors.includes(pattern)) fail(`scanner-collectors schema normalization contract missing: ${pattern}`);
});

[
  "m && typeof m.collectOptionsInRegion === 'function'",
  "m && typeof m.collectOptionsInContainer === 'function'",
  "m && typeof m.detectNearestGroupTitleFromOption === 'function'"
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`scanner-core collector wrapper missing: ${pattern}`);
});

if (clipartFiles.core.includes('function makeOptionFromSwatch(')) {
  fail('scanner-core should not retain makeOptionFromSwatch implementation');
}


[
  'ns.utils = ns.utils || {}',
  'ns.siteRouter = ns.siteRouter || {}',
  'ns.ui = ns.ui || {}',
  'ns.export = ns.export || {}',
  'ns.sync = ns.sync || {}',
  'ns.render = ns.render || {}',
  'ns.auto = ns.auto || {}',
  'ns.manual = ns.manual || {}',
  'ns.screenshot = ns.screenshot || {}'
  ,
  'ns.panel = ns.panel || {}'
].forEach((pattern) => {
  const found = Object.values(clipartFiles).some((src) => src.includes(pattern));
  if (!found) fail(`missing expected namespace module declaration: ${pattern}`);
});

[
  'function scanCliparts(ctx)',
  'function scanDOM(ctx)',
  'function appendCurrentVisibleState(ctx, data, refreshPanel, triggerBtn)',
  'ctx.coreFns.scanClipartsLegacy',
  'ctx.coreFns.scanDOMLegacy',
  'ctx.coreFns.appendCurrentVisibleStateLegacy'
].forEach((pattern) => {
  if (!clipartFiles.auto.includes(pattern)) fail(`scanner-auto wrapper contract missing: ${pattern}`);
});

[
  'function startManualScan(ctx)',
  'function activateManualPick(ctx, data, onRefresh)',
  'function deactivateManualPick(ctx)',
  'function createManualResult(ctx)',
  'function collectManualGroupViaProfile(ctx, titleEl)',
  'profile.scanManualGroupFromTitle(titleEl, profileCtx)',
  'profile.normalizeGroup(rawGroup, profileCtx)',
  'ns.schema.normalizeClipartData(data)',
  'ctx.coreFns.activateManualPickLegacy',
  'ctx.coreFns.deactivateManualPickLegacy'
].forEach((pattern) => {
  if (!clipartFiles.manual.includes(pattern)) fail(`scanner-manual profile-first contract missing: ${pattern}`);
});

[
  'function activateScreenshotPick(ctx, data, onRefresh)',
  'function captureSingleGroup(ctx, cat)',
  'function captureTab(ctx)',
  'ctx.coreFns.activateScreenshotPickLegacy',
  'ctx.coreFns.captureSingleGroupLegacy',
  'ctx.coreFns.captureTabLegacy'
].forEach((pattern) => {
  if (!clipartFiles.screenshot.includes(pattern)) fail(`scanner-screenshot wrapper contract missing: ${pattern}`);
});

[
  'function registerRenderer(fn)',
  'function hasRenderer()',
  'function show(data, actions)',
  'function unmount()',
  'ns.panel.registerRenderer = registerRenderer',
  'ns.panel.hasRenderer = hasRenderer',
  'ns.panel.show = show',
  'ns.panel.unmount = unmount',
  "console.warn('[STS Clipart Pro 8.3 Panel] No renderer registered.')"
].forEach((pattern) => {
  if (!clipartFiles.panel.includes(pattern)) fail(`scanner-panel facade contract missing: ${pattern}`);
});

[
  'panelFacade.registerRenderer(legacyShowClipartPanelImpl)',
  'function legacyShowClipartPanelImpl(data)',
  'function showClipartPanel(data)',
  'return legacyShowClipartPanelImpl(data);'
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`scanner-core panel registration contract missing: ${pattern}`);
});

if (clipartFiles.core.includes('panelFacade.registerRenderer(showClipartPanel)')) {
  fail('scanner-core must not self-register showClipartPanel (recursion-prone)');
}

[
  'function buildScannerContext()',
  'scanClipartsLegacy: scanCliparts',
  'scanDOMLegacy: scanDOM',
  'appendCurrentVisibleStateLegacy: appendCurrentVisibleState',
  'startManualScanLegacy: startManualScan',
  'activateManualPickLegacy: activateManualPick',
  'deactivateManualPickLegacy: deactivateManualPick',
  'activateScreenshotPickLegacy: activateScreenshotPick',
  'captureSingleGroupLegacy: captureSingleGroup',
  'captureTabLegacy: captureTab',
  'window.__stsClipartPro = {',
  'window.__stsEnsureClipartLoggedIn = ensureClipartLoggedIn',
  'window.__stsIsClipartAuthenticated = isClipartAuthenticated',
  'window.__stsShowScanModePopup = showScanModePopup',
  'window.__stsOpenClipartPanelFromFab = openClipartPanelFromFab',
  'window.__stsIsClipartPanelOpen = isClipartPanelOpen',
  'window.__stsOnClipartPanelVisibilityChange = onClipartPanelVisibilityChange'
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`scanner-core legacy runtime contract missing: ${pattern}`);
});


[
  'function collectManualGroupViaResolver(titleEl)',
  'Manual Pick fallback: profileContext.create unavailable',
  'Manual Pick fallback: profiles.resolve unavailable',
  'Manual Pick fallback: invalid effective profile',
  'profileContextApi.create({ document: document, location: location, window: window })',
  'profilesApi.resolve(ctx)',
  'profile.scanManualGroupFromTitle(titleEl, ctx)',
  'profile.normalizeGroup(rawGroup, ctx)',
  'function collectAutoScanGroupsViaResolver()',
  'profileContextApi.create({ document: document, location: location, window: window })',
  'profilesApi.resolve(ctx)',
  'profile.scanPage(ctx)',
  'profile.normalizeGroup(rawGroup, ctx)',
  'Auto Scan fallback: profileContext.create unavailable',
  'Auto Scan fallback: profiles.resolve unavailable',
  'Auto Scan fallback: invalid effective profile'
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`scanner-core auto resolver route missing: ${pattern}`);
});

[
  "if (!picked || !Array.isArray(picked.options) || picked.options.length < 1)",
  "clipNotify('Không tìm thấy options trong nhóm vừa chọn', 'warning')",
  "reason: 'default-empty-manual-group'"
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`scanner-core manual resolver empty-options guard missing: ${pattern}`);
});

[
  'function findGenericManualContainerFromTitle(titleEl)',
  'collectOptionsInContainer(container)',
  'var container = findGenericManualContainerFromTitle(titleEl);',
  "return { name: title || 'Manual Group', options: options };"
].forEach((pattern) => {
  if (!read('content_modules/clipart/scanner-profile-default.js').includes(pattern)) fail(`default profile manual collector contract missing: ${pattern}`);
});

[
  'function collectVisibleStateGroupsViaResolver()',
  'Append Visible State fallback: profileContext.create unavailable',
  'Append Visible State fallback: profiles.resolve unavailable',
  'profile.scanVisibleState(ctx)',
  'collectVisibleStateGroupsViaResolver()',
  'if (!scanned || !scanned.length) scanned = await scanDOM() || [];'
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`scanner-core append resolver route missing: ${pattern}`);
});

[
  'adapter.scanVisibleState = function(ctx)',
  'legacyProfile.autoScan(doc)'
].forEach((pattern) => {
  if (!read('content_modules/clipart/scanner-profile-adapters.js').includes(pattern)) fail(`scanner profile adapter visible-state route missing: ${pattern}`);
});

[
  'function activateScreenshotPickOrchestrated(data, onRefresh)',
  'if (screenshotModeBtn) screenshotModeBtn.onclick = function() {'
].forEach((pattern) => {
  if (!clipartFiles.core.includes(pattern)) fail(`screenshot orchestration contract missing: ${pattern}`);
});

if (!clipartFiles.legacy.includes('Legacy compatibility entrypoint for STS Clipart Pro scanner runtime.')) {
  fail('clipart-scanner legacy marker comment missing');
}
if (!clipartFiles.legacy.includes('window.__stsClipartScannerLegacyLoaded')) {
  fail('clipart-scanner no-op marker flag missing');
}

const wrapperMustNotContain = [
  'scanCliparts(',
  'scanDOM(',
  'appendCurrentVisibleState(',
  'startManualScan(',
  'activateManualPick(',
  'activateScreenshotPick(',
  'captureSingleGroup(',
  'captureTab('
];
[clipartFiles.auto, clipartFiles.manual, clipartFiles.screenshot].forEach((src, idx) => {
  const name = ['auto', 'manual', 'screenshot'][idx];
  if (src.includes('window.scanCliparts') || src.includes('window.scanDOM') || src.includes('window.captureTab')) {
    fail(`wrapper ${name} has bare global helper call`);
  }
  if (!src.includes('ctx.coreFns')) fail(`wrapper ${name} no longer delegates through ctx.coreFns`);
});

[
  'function sequentialPrefix(index)',
  'function normScanText(v)'
].forEach((pattern) => {
  if (!read('tests/unit/helpers.test.js').includes(pattern)) fail(`unit helper baseline missing: ${pattern}`);
});


const profileContext = read('content_modules/clipart/scanner-profile-context.js');
const profileRegistry = read('content_modules/clipart/scanner-profile-registry.js');
const profileDefault = read('content_modules/clipart/scanner-profile-default.js');
[
  'ns.profileContext',
  'create: create'
].forEach((pattern) => {
  if (!profileContext.includes(pattern)) fail(`profile context API missing: ${pattern}`);
});
[
  'ns.profiles',
  'register: register',
  'list: list',
  'get: get',
  'getDefault: getDefault',
  'resolve: resolve'
].forEach((pattern) => {
  if (!profileRegistry.includes(pattern)) fail(`profile registry API missing: ${pattern}`);
});
[
  "id: 'default'",
  "name: 'Default Generic Profile'",
  'ns.profiles.register(defaultProfile)'
].forEach((pattern) => {
  if (!profileDefault.includes(pattern)) fail(`default profile contract missing: ${pattern}`);
});


const phaseOneDocs = {
  roadmap: read('docs/clipart-roadmap.md'),
  architecture: read('docs/clipart-profile-architecture.md'),
  contract: read('docs/clipart-profile-contract.md'),
  rules: read('docs/clipart-development-rules.md'),
  onboarding: read('docs/clipart-new-site-onboarding.md'),
  removalPlan: read('docs/clipart-v2-legacy-removal-plan.md')
};
[
  'Status: **Complete**',
  'Define target scanner-profile contract',
  'Define development rules for scanner-profile-first work',
  'Document profile systems and onboarding workflow'
].forEach((pattern) => {
  if (!phaseOneDocs.roadmap.includes(pattern)) fail(`Phase 1 roadmap checkpoint missing: ${pattern}`);
});
[
  'scanPage(ctx)',
  'scanVisibleState(ctx)',
  'scanManualGroupFromTitle(titleEl, ctx)',
  'collectOptionsInContainer(containerEl, ctx)',
  'collectOptionsInRegion(region, ctx)',
  'detectNearestGroupTitleFromOption(optionEl, ctx)',
  'normalizeGroup(rawGroup, ctx)',
  'normalizeOption(rawOption, ctx)'
].forEach((pattern) => {
  if (!phaseOneDocs.contract.includes(pattern)) fail(`Phase 1 profile contract missing: ${pattern}`);
});
[
  'Target layer: scanner profiles',
  'Removal target: V2 site profiles',
  'Removal target: scanner-list routing',
  'Removal target: legacy manual profiles',
  'Data shape rules'
].forEach((pattern) => {
  if (!phaseOneDocs.rules.includes(pattern)) fail(`Phase 1 development rule missing: ${pattern}`);
});
[
  'Standard onboarding steps',
  'Implement a scanner profile under `content_modules/clipart/scanner-profile-<site>.js`',
  'Run fixture/profile tests',
  'Manual Chrome verification'
].forEach((pattern) => {
  if (!phaseOneDocs.onboarding.includes(pattern)) fail(`Phase 1 onboarding workflow missing: ${pattern}`);
});
if (!phaseOneDocs.architecture.includes('Current phase status')) fail('Phase 1 architecture status section missing');
if (!phaseOneDocs.architecture.includes('Phase 8 in progress')) fail('architecture docs must reflect Phase 8 in-progress status');
if (!phaseOneDocs.contract.includes('Phase 8 in progress')) fail('profile contract docs must reflect Phase 8 in-progress status');
if (!phaseOneDocs.rules.includes('Phase 8 in progress')) fail('development rules docs must reflect Phase 8 in-progress status');
if (!phaseOneDocs.onboarding.includes('Phase 8 in progress')) fail('onboarding docs must reflect Phase 8 in-progress status');
[
  'one operational scanner flow',
  'What will be removed',
  'Execution phases',
  'Definition of done'
].forEach((pattern) => {
  if (!phaseOneDocs.removalPlan.includes(pattern)) fail(`V2/legacy removal plan missing: ${pattern}`);
});

const changelog = read('CHANGELOG.txt');
const versionHeaders = changelog.match(/^## \d+\.\d+\.\d+/gm) || [];
if (versionHeaders.length !== 3) fail(`CHANGELOG must contain exactly 3 recent version headers, got ${versionHeaders.length}`);

const tests = read('TEST_CASES.md');
['https://pawesomehouse.com', 'https://www.suzitee.com'].forEach(site => {
  if (!tests.includes(site)) fail(`TEST_CASES missing ${site}`);
});

const sanitize = read('content_modules/sanitize.js');
if (!sanitize.includes('window.STSSanitize')) fail('sanitize module missing window.STSSanitize');
const debug = read('content_modules/debug.js');
if (!debug.includes('stsDebugEnabled')) fail('debug module missing stsDebugEnabled storage key');

console.log('Smoke check passed.');
