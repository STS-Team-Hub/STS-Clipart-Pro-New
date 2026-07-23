const assert = require('assert');
const fs = require('fs');

const core = fs.readFileSync('content_modules/clipart/scanner-core.js','utf8');
const m1 = core.match(/function mapResolvedProfileOption\(rawOption\) {[\s\S]*?\n  }\n\s*function mapResolvedProfileGroup/);
const m2 = core.match(/function mapResolvedProfileGroup\(rawGroup, ctx, profile\) {[\s\S]*?\n  }\n\s*(?:async\s+)?function collectAutoScanGroupsViaResolver/);
if (!m1 || !m2) throw new Error('Failed to extract mapping fns');
const mapResolvedProfileOption = eval('(' + m1[0].replace(/\n\s*function mapResolvedProfileGroup[\s\S]*/, '') + ')');
const mapResolvedProfileGroup = eval('(' + m2[0].replace(/\n\s*(?:async\s+)?function collectAutoScanGroupsViaResolver[\s\S]*/, '') + ')');

const a = mapResolvedProfileOption({ imageUrl:'https://a', textContent:'' });
assert.equal(a.imageUrl, 'https://a');
assert.equal(a.capturedImage, 'https://a');

const b = mapResolvedProfileOption({ textContent:'x', value:'y', name:'n', capturedImage:'cap', bgColor:'#fff', optionType:'image', sourceKind:'customily-swatch' });
assert.equal(b.optionType, 'image');
assert.equal(b.sourceKind, 'customily-swatch');
assert.equal(b.capturedImage, 'cap');

const g1 = mapResolvedProfileGroup({ label:'Eyes', options:[{ imageUrl:'https://img' }] });
assert.ok(g1 && g1.options.length === 1, 'image-only option should be kept');
const g2 = mapResolvedProfileGroup({ label:'Hair', options:[{ bgColor:'rgb(1,2,3)' }] });
assert.ok(g2 && g2.options.length === 1, 'bgColor-only option should be kept');
const g3 = mapResolvedProfileGroup({ label:'Empty', options:[{}] });
assert.equal(g3, null, 'empty option should be dropped');
assert.ok(core.includes("reason: 'default-empty-manual-group'"), 'default-empty-manual-group fallback marker must exist');
console.log('manual mapping filter regression test passed.');

assert.ok(core.includes('isDefaultManualMethodInherited'), 'inherited default manual method detection must exist');
assert.ok(core.includes("'default-inherited' : 'custom-override'"), 'manual method origin debug marker must exist');
console.log('manual resolver fallback inheritance marker test passed.');
