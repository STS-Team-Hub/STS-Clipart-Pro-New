const assert = require('assert');

function hasSourceKindImageIntent(sourceKind) {
  const kind = String(sourceKind || '').toLowerCase();
  if (!kind) return false;
  return kind.includes('swatch') || kind.includes('image') || kind.includes('customily');
}

function isImageBackedOption(opt) {
  if (!opt || typeof opt !== 'object') return false;
  if (opt.imageUrl || opt.capturedImage || opt.bgColor) return true;
  const optionType = String(opt.optionType || '').toLowerCase();
  const sourceKind = String(opt.sourceKind || '').toLowerCase();
  if ((sourceKind === 'select' || sourceKind === 'customily-select') && !opt.imageUrl && !opt.capturedImage && !opt.bgColor) return false;
  if (optionType === 'visual-text') return true;
  if (optionType === 'text' && !opt.imageUrl && !opt.capturedImage && !opt.bgColor && !opt.hasVisual && !opt.needsCapture) return false;
  if (optionType === 'image') return true;
  return hasSourceKindImageIntent(sourceKind);
}

function isTextOnlyCategory(cat) {
  const options = (cat && Array.isArray(cat.options)) ? cat.options : [];
  if (!options.length) return false;
  return options.every((o) => {
    if (isImageBackedOption(o)) return false;
    const txt = String(o?.textContent || o?.label || o?.name || o?.title || o?.text || o?.value || '').trim();
    return txt.length > 0;
  });
}

assert.equal(isTextOnlyCategory({ options: [{ textContent: 'Mr', sourceKind: 'select', optionType: 'text' }] }), true);
assert.equal(isTextOnlyCategory({ options: [{ imageUrl: 'https://a/b.png', textContent: 'black' }] }), false);
assert.equal(isTextOnlyCategory({ options: [{ capturedImage: 'data:image/png;base64,abc', textContent: 'black' }] }), false);
assert.equal(isTextOnlyCategory({ options: [{ bgColor: '#000', textContent: 'black' }] }), false);
assert.equal(isTextOnlyCategory({ options: [{ optionType: 'image', textContent: 'black' }] }), false);
assert.equal(isTextOnlyCategory({ options: [{ sourceKind: 'customily-swatch', textContent: 'black' }] }), false);
assert.equal(isTextOnlyCategory({ options: [{ sourceKind: 'customily-swatch', textContent: '5_o_clock_shadow_beard-03', value: 'x', name: 'black' }] }), false);
assert.equal(isTextOnlyCategory({ options: [{ optionType: 'visual-text', textContent: 'YOUNG', sourceKind: 'customily-swatch', hasVisual: true, needsCapture: true }] }), false);

console.log('render image-backed classification test passed.');
