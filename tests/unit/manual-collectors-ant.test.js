const assert = require('assert');
const fs = require('fs');

const collectorsSrc = fs.readFileSync('content_modules/clipart/scanner-collectors.js', 'utf8');
const match = collectorsSrc.match(/function collectOptionsInContainer\(container\) {[\s\S]*?\n  }\n\n\n  function detectNearestGroupTitleFromOption/);
if (!match) throw new Error('collectOptionsInContainer not found');
const fnSrc = match[0].replace(/\n\n\n  function detectNearestGroupTitleFromOption[\s\S]*/, '');
const collectOptionsInContainer = eval('(' + fnSrc + ')');

global.getComputedStyle = function(el) {
  return {
    backgroundColor: el.__bg || 'rgba(0, 0, 0, 0)',
    backgroundImage: el.__bgImage || 'none'
  };
};
global.normalizeCollectorText = (v) => String(v || '').replace(/\s+/g, ' ').trim();
global.makeOptionFromSwatch = () => null;

function makeEl({ tag = 'DIV', className = '', text = '', attrs = {}, imgSrc = null, rect = { x: 1, y: 1, w: 80, h: 28 }, bg = '', bgImage = '' }) {
  return {
    tagName: tag,
    className,
    textContent: text,
    style: { backgroundColor: bg },
    __bg: bg,
    __bgImage: bgImage,
    getBoundingClientRect: () => ({ x: rect.x, y: rect.y, width: rect.w, height: rect.h }),
    getAttribute: (k) => attrs[k] || '',
    matches: (sel) => sel.split(',').some((s) => {
      const t = s.trim();
      if (!t) return false;
      if (t === '.ant-radio-button-wrapper') return className.split(/\s+/).includes('ant-radio-button-wrapper');
      if (t === '[role="radio"]') return attrs.role === 'radio';
      if (t === '[data-value]') return !!attrs['data-value'];
      if (t === 'button:not([type="submit"])') return tag === 'BUTTON' && String(attrs.type || '').toLowerCase() !== 'submit';
      if (t.startsWith('[class*="')) { const m = t.match(/\[class\*="([^"]+)"\]/); return m ? className.includes(m[1]) : false; }
      return false;
    }),
    querySelector: (sel) => (sel === 'img' && imgSrc ? { src: imgSrc } : null),
    querySelectorAll: () => []
  };
}

const genderWoman = makeEl({ tag: 'LABEL', className: 'ant-radio-button-wrapper', text: 'WOMAN', attrs: { 'data-value': 'WOMAN' } });
const genderMan = makeEl({ tag: 'LABEL', className: 'ant-radio-button-wrapper', text: 'MAN', attrs: { 'data-value': 'MAN' } });
const eye = makeEl({ tag: 'LABEL', className: 'ant-radio-button-wrapper', imgSrc: 'eye1.png', attrs: { 'data-value': 'EYE1' } });
const segmented = makeEl({ tag: 'DIV', className: 'ant-segmented-item-label', text: 'NO' });

const container = {
  querySelectorAll: (sel) => {
    if (sel.includes('.by-image-swatch__swatch')) return [];
    if (sel.includes('button:not([type="submit"])')) return [genderWoman, genderMan, eye, segmented];
    if (sel === 'label[for]') return [];
    if (sel === 'input[type="radio"], input[type="checkbox"]') return [];
    if (sel === 'img') return [];
    if (sel === '[style*="background-color"], [class*="color-swatch"], [class*="color-option"]') return [];
    if (sel === 'select') return [];
    return [];
  },
  querySelector: () => null
};

const options = collectOptionsInContainer(container);
assert.equal(options.length, 4);
assert.ok(options.some((o) => o.textContent === 'WOMAN'));
assert.ok(options.some((o) => o.textContent === 'MAN'));
assert.ok(options.some((o) => o.imageUrl === 'eye1.png'));
assert.ok(options.some((o) => o.textContent === 'NO'));

const rootLabel = makeEl({ tag: 'LABEL', className: 'ant-radio-button-wrapper', text: 'ROOT-WOMAN', attrs: { 'data-value': 'ROOT-WOMAN' } });
rootLabel.querySelectorAll = (sel) => (sel.includes('.by-image-swatch__swatch') ? [] : []);
rootLabel.querySelector = () => null;
const rootOpts1 = collectOptionsInContainer(rootLabel);
assert.ok(rootOpts1.some((o) => o.textContent === 'ROOT-WOMAN'), 'root .ant-radio-button-wrapper should be collected');

const rootRoleRadio = makeEl({ tag: 'DIV', className: 'x', text: 'ROOT-NO', attrs: { role: 'radio' } });
rootRoleRadio.querySelectorAll = () => [];
rootRoleRadio.querySelector = () => null;
const rootOpts2 = collectOptionsInContainer(rootRoleRadio);
assert.ok(rootOpts2.some((o) => o.textContent === 'ROOT-NO'), 'root [role=radio] should be collected');

const rootDataValue = makeEl({ tag: 'DIV', className: 'x', text: 'ROOT-DATA', attrs: { 'data-value': 'ROOT-DATA' } });
rootDataValue.querySelectorAll = () => [];
rootDataValue.querySelector = () => null;
const rootOpts3 = collectOptionsInContainer(rootDataValue);
assert.ok(rootOpts3.some((o) => o.value === 'ROOT-DATA' || o.textContent === 'ROOT-DATA'), 'root [data-value] should be collected');
console.log('manual ant collector test passed.');
