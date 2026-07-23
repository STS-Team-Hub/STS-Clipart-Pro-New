const assert = require('assert');
const fs = require('fs');

const core = fs.readFileSync('content_modules/clipart/scanner-core.js', 'utf8');
const popup = fs.readFileSync('popup.js', 'utf8');
const crawler = fs.readFileSync('content_modules/product-crawler.js', 'utf8');

assert.ok(core.includes("autoBtn.onclick = function() { popup.remove(); scanClipartsOrchestrated('fab'); };"), 'FAB auto must route to orchestrated auto');
assert.ok(core.includes("else scanClipartsOrchestrated('hotkey');"), 'Alt+C must route to orchestrated auto');
assert.ok(core.includes("return scanClipartsOrchestrated(entrypointId || 'external-api');"), '__stsClipartPro.scan must route to orchestrated auto');
assert.ok(!core.includes('scan: async function() {\n      if (!(await ensureClipartLoggedIn())) return false;\n      return scanCliparts();'), '__stsClipartPro.scan legacy direct path must be removed');
assert.ok(popup.includes("{ type: 'CLIPART_SCAN', entrypointId: 'popup' }"), 'popup CLIPART_SCAN must tag popup entrypoint');
assert.ok(crawler.includes("window.__stsClipartPro.scan(msg && msg.entrypointId ? msg.entrypointId : 'product-crawler')"), 'product-crawler bridge must route through __stsClipartPro.scan orchestrated API');

console.log('auto entrypoints routing test passed');
