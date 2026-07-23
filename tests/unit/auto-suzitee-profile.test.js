const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function el(tag, opts = {}) {
  const node = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    className: opts.className || '',
    textContent: opts.textContent || '',
    attrs: Object.assign({}, opts.attrs || {}),
    children: [],
    parentElement: null,
    hidden: false,
    disabled: !!opts.disabled,
    getBoundingClientRect() { return { width: 20, height: 20 }; },
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) {
      const selectors = selector.split(',').map((s) => s.trim()).filter(Boolean);
      const hasClass = (n, cls) => String(n.className || '').split(/\s+/).includes(cls);
      const inputType = (n) => String((n.getAttribute && n.getAttribute('type')) || '').toLowerCase();
      const matches = (n, sel) => {
        if (sel === '.customily_option') return hasClass(n, 'customily_option');
        if (sel === '.option_name') return hasClass(n, 'option_name');
        if (sel === '.swatch-container .customily-swatch') return hasClass(n, 'customily-swatch');
        if (sel === '.customily-swatch') return hasClass(n, 'customily-swatch');
        if (sel === 'input[value]') return n.tagName === 'INPUT' && n.getAttribute('value') != null;
        if (sel === 'img') return n.tagName === 'IMG';
        if (sel === 'img[alt]') return n.tagName === 'IMG' && n.getAttribute('alt') != null;
        if (sel === 'select') return n.tagName === 'SELECT';
        if (sel === 'option') return n.tagName === 'OPTION';
        if (sel === 'textarea') return n.tagName === 'TEXTAREA';
        if (sel === 'input[type="text"]') return n.tagName === 'INPUT' && inputType(n) === 'text';
        if (sel === 'input[type="email"]') return n.tagName === 'INPUT' && inputType(n) === 'email';
        if (sel === 'input[type="tel"]') return n.tagName === 'INPUT' && inputType(n) === 'tel';
        if (sel === 'input[type="number"]') return n.tagName === 'INPUT' && inputType(n) === 'number';
        if (sel === 'input:not([type])') return n.tagName === 'INPUT' && !n.getAttribute('type');
        if (sel === 'input[type="file"]') return n.tagName === 'INPUT' && inputType(n) === 'file';
        return false;
      };
      const out = [];
      (function walk(n) {
        n.children.forEach((child) => {
          if (selectors.some((sel) => matches(child, sel))) out.push(child);
          walk(child);
        });
      })(this);
      return out;
    },
    closest(selector) {
      let n = this;
      while (n) {
        if (selector === '.customily_option' && String(n.className || '').split(/\s+/).includes('customily_option')) return n;
        n = n.parentElement;
      }
      return null;
    }
  };
  if (opts.value != null) { node.value = opts.value; node.attrs.value = opts.value; }
  if (opts.name) { node.name = opts.name; node.attrs.name = opts.name; }
  if (opts.src) { node.src = opts.src; node.attrs.src = opts.src; }
  if (opts.currentSrc) node.currentSrc = opts.currentSrc;
  Object.defineProperty(node, 'options', { get() { return node.children.filter((child) => child.tagName === 'OPTION'); } });
  return node;
}

const root = el('div', { attrs: { id: 'cl_optionsapp' } });
const swatchGroup = root.appendChild(el('div', { className: 'customily_option' }));
swatchGroup.appendChild(el('div', { className: 'option_name', textContent: 'Option 1 of 3 Choose Pet * Required' }));
['Dog', 'Cat'].forEach((name) => {
  const swatch = swatchGroup.appendChild(el('div', { className: 'customily-swatch' }));
  swatch.appendChild(el('input', { attrs: { value: name.toLowerCase(), type: 'radio' } }));
  swatch.appendChild(el('img', { attrs: { alt: name }, src: `https://cdn.example/${name}.png` }));
});

const selectGroup = root.appendChild(el('div', { className: 'customily_option' }));
selectGroup.appendChild(el('div', { className: 'option_name', textContent: 'Choose Size' }));
const select = selectGroup.appendChild(el('select', { name: 'properties[Choose Size]' }));
select.appendChild(el('option', { value: '', textContent: 'Select' }));
select.appendChild(el('option', { value: 'Small', textContent: 'Small' }));
select.appendChild(el('option', { value: 'Large', textContent: 'Large' }));

const textGroup = root.appendChild(el('div', { className: 'customily_option' }));
textGroup.appendChild(el('div', { className: 'option_name', textContent: 'Enter Name' }));
textGroup.appendChild(el('textarea', { attrs: { name: 'properties[Enter Name]', placeholder: 'Type name', maxlength: '24' } }));

const documentMock = {
  querySelector(selector) { return selector === '#cl_optionsapp' || selector === '#customily-options' ? root : null; },
  documentElement: { getAttribute() { return ''; }, setAttribute() {} }
};
const windowMock = { document: documentMock, getComputedStyle() { return { display: 'block', visibility: 'visible', opacity: '1' }; } };
const ctx = vm.createContext({ window: windowMock, document: documentMock, console });
[
  'content_modules/site_profiles/index.js',
  'content_modules/site_profiles/shared/cleanup.js',
  'content_modules/site_profiles/shared/dom.js',
  'content_modules/site_profiles/shared/values.js',
  'content_modules/site_profiles/suzitee.js'
].forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx));

const profile = windowMock.STSSiteProfilesV2.resolve('www.suzitee.com');
assert.equal(profile.id, 'suzitee');
const groups = profile.autoScan(documentMock);
assert.deepEqual(groups.map((g) => g.title), ['Choose Pet', 'Choose Size', 'Enter Name']);
assert.deepEqual(groups[0].items.map((item) => item.value), ['Dog', 'Cat']);
assert.equal(groups[0].items[0].image, 'https://cdn.example/Dog.png');
assert.deepEqual(groups[1].items.map((item) => item.value), ['Small', 'Large']);
assert.equal(groups[2].items[0].sourceKind, 'customily-textarea');
assert.equal(groups[2].items[0].placeholder, 'Type name');
assert.equal(groups[2].items[0].maxlength, '24');
assert.deepEqual(profile.getManualTitleElements(documentMock).map((node) => node.textContent), ['Option 1 of 3 Choose Pet * Required', 'Choose Size'], 'manual title list keeps legacy swatch/select groups only');
assert.equal(profile.scanManualGroupFromTitle(textGroup.querySelector('.option_name')), null, 'manual text-only behavior remains unchanged while auto includes it');

console.log('auto suzitee profile test passed');
