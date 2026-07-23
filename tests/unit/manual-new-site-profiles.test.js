const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class MockEl {
  constructor(tag, attrs = {}, text = '') {
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.attrs = Object.assign({}, attrs);
    this.textContent = text;
    this.children = [];
    this.parentElement = null;
    this.hidden = false;
    this.value = attrs.value || '';
    this.currentSrc = attrs.currentSrc || attrs.src || '';
    this.src = attrs.src || '';
    this.options = null;
  }
  append(...kids) {
    kids.forEach((kid) => {
      kid.parentElement = this;
      this.children.push(kid);
    });
    if (this.tagName === 'SELECT') this.options = this.children.filter((kid) => kid.tagName === 'OPTION');
    return this;
  }
  get className() { return this.attrs.class || ''; }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getBoundingClientRect() { return { x: 0, y: 0, width: 80, height: 80, left: 0, top: 0, right: 80, bottom: 80 }; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const out = [];
    String(selector).split(',').map((s) => s.trim()).filter(Boolean).forEach((sel) => {
      const matches = queryWithin(this, sel);
      matches.forEach((el) => { if (!out.includes(el)) out.push(el); });
    });
    return out;
  }
  closest(selector) {
    let cur = this;
    while (cur) {
      if (String(selector).split(',').some((sel) => matchesSimple(cur, sel.trim()))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  matches(selector) { return matchesSimple(this, selector); }
}

function allDesc(el) {
  const out = [];
  el.children.forEach((kid) => { out.push(kid); out.push(...allDesc(kid)); });
  return out;
}

function queryWithin(root, selector) {
  if (/\s/.test(selector.trim())) {
    const parts = selector.trim().split(/\s+/);
    let current = [root];
    parts.forEach((part) => {
      const next = [];
      current.forEach((node) => {
        allDesc(node).forEach((el) => { if (matchesSimple(el, part) && !next.includes(el)) next.push(el); });
      });
      current = next;
    });
    return current;
  }
  return allDesc(root).filter((el) => matchesSimple(el, selector));
}

function matchesSimple(el, selector) {
  if (!selector || !el) return false;
  if (selector.includes(':not([type])')) return el.tagName === 'INPUT' && el.getAttribute('type') == null;
  const tagMatch = selector.match(/^[a-z0-9-]+/i);
  if (tagMatch && el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch && el.getAttribute('id') !== idMatch[1]) return false;
  const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g) || [];
  for (const cls of classMatches) {
    if (!String(el.className).split(/\s+/).includes(cls.slice(1))) return false;
  }
  const attrMatches = selector.matchAll(/\[([^\]=~^*$]+)([*^]?=)?"?([^\]"]*)"?\]/g);
  for (const m of attrMatches) {
    const attr = m[1].trim();
    const op = m[2] || '';
    const expected = m[3] || '';
    const actual = attr === 'class' ? el.className : el.getAttribute(attr);
    if (!op && actual == null) return false;
    if (op === '=' && String(actual) !== expected) return false;
    if (op === '^=' && !String(actual || '').startsWith(expected)) return false;
    if (op === '*=' && !String(actual || '').includes(expected)) return false;
  }
  return true;
}

function img(src, alt = '') { return new MockEl('img', { src, alt }); }
function input(attrs) { return new MockEl('input', attrs); }
function option(text, attrs = {}) { return new MockEl('option', attrs, text); }

function customilyGroup(title, children) {
  return new MockEl('div', { class: 'customily_option' }).append(
    new MockEl('div', { class: 'option_name' }, title),
    ...children
  );
}
function swatch(value, src) {
  return new MockEl('div', { class: 'customily-swatch swatch' }).append(
    input({ value, type: 'radio', name: `properties[${value}]` }),
    img(src, value)
  );
}
function makeCustomilyDocument() {
  const swatches = new MockEl('div', { class: 'swatch-container' }).append(swatch('Vintage', 'https://cdn.example/vintage.png'), swatch('Black & White', 'https://cdn.example/bw.png'));
  const numeric = new MockEl('div', { class: 'swatch-container' }).append(swatch('1', 'https://cdn.example/1.png'), swatch('2', 'https://cdn.example/2.png'));
  const parenthetical = new MockEl('div', { class: 'swatch-container' }).append(swatch('Light', 'https://cdn.example/light.png'), swatch('Tan', 'https://cdn.example/tan.png'));
  const select = new MockEl('select', { name: 'properties[Choose Quote ]' }).append(option('Choose an option', { disabled: '' }), option('Quote 1', { value: 'quote-1' }), option('Quote 2', { value: 'quote-2' }));
  const root = new MockEl('document').append(new MockEl('div', { id: 'customily-options' }).append(new MockEl('div', { id: 'cl_optionsapp' }).append(
    customilyGroup('Choose Design Style * Required', [swatches]),
    customilyGroup('Choose Quote * Required', [select]),
    customilyGroup("Face' Man * Required", [new MockEl('div').append(input({ type: 'text', placeholder: 'Enter' }))]),
    customilyGroup('Upload Photo * Required', [input({ type: 'file', name: 'properties[Upload Photo]', accept: 'image/png' })]),
    customilyGroup('Number Of Kids * Required', [numeric]),
    customilyGroup('Choose 1st Kid Skin Tone (Boy) * Required', [parenthetical])
  )));
  return root;
}

function gossbyGroup(title, children) {
  return new MockEl('div', { class: 'pt-4' }).append(new MockEl('div', { class: 'font-semibold' }).append(new MockEl('span', { class: 'PersonalizedForm_option-title__required__H_wn8' }, title)), ...children);
}
function gossbyCard(value, src) { return new MockEl('div', { class: `at-item relative at-field-value-${value}` }).append(img(src)); }
function makeGossbyDocument() {
  const cards = new MockEl('div', { class: 'at-image-selector' }).append(gossbyCard('flower-one', 'https://ik.example/flower-one.thumb.png?tr=n-w128'), gossbyCard('flower-two', 'https://ik.example/flower-two.thumb.png?tr=n-w128'));
  const root = new MockEl('document').append(new MockEl('form', { class: 'at-product-personalized-form' }).append(
    gossbyGroup('Choose Your Flower Vase', [cards]),
    gossbyGroup('Upload photo', [input({ type: 'file', accept: 'image/jpeg, image/png' })]),
    gossbyGroup("Man's name", [input({ placeholder: 'Enter', maxlength: '12' })]),
    gossbyGroup('Size', [new MockEl('div', { class: 'at-image-selector' }).append(gossbyCard('11oz', 'https://ik.example/11oz.png'), gossbyCard('15oz', 'https://ik.example/15oz.png'))])
  ));
  return root;
}

function loadProfiles() {
  const windowMock = { getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }) };
  const ctx = vm.createContext({ window: windowMock, document: {}, console });
  [
    'content_modules/site_profiles/index.js',
    'content_modules/site_profiles/shared/cleanup.js',
    'content_modules/site_profiles/shared/dom.js',
    'content_modules/site_profiles/shared/values.js',
    'content_modules/site_profiles/personalfury.js',
    'content_modules/site_profiles/interestpod.js',
    'content_modules/site_profiles/gossby.js'
  ].forEach((file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx));
  return windowMock.STSSiteProfilesV2;
}

assert.ok(fs.readFileSync('HTML/personalfury.com 1.txt', 'utf8').includes('customily-options'), 'personalfury fixture has Customily root');
assert.ok(fs.readFileSync('HTML/personalfury.com 1.txt', 'utf8').includes('type="file"'), 'personalfury fixture has upload field');
assert.ok(fs.readFileSync('HTML/interestpod.co 1.txt', 'utf8').includes('Choose Design Style'), 'interestpod fixture has design style group');
assert.ok(fs.readFileSync('HTML/interestpod.co 2.txt', 'utf8').includes('Choose 1st Kid Skin Tone (Boy)'), 'interestpod fixture preserves parenthetical title');
assert.ok(fs.readFileSync('HTML/gossby.com 2.txt', 'utf8').includes('at-product-personalized-form'), 'gossby fixture has personalized form');
assert.ok(fs.readFileSync('HTML/gossby.com 1.txt', 'utf8').includes('type="file"'), 'gossby fixture has upload field');

const reg = loadProfiles();

const personal = reg.resolve('personalfury.com');
assert.equal(personal.id, 'personalfury');
let doc = makeCustomilyDocument();
let root = personal.getRoot(doc);
assert.ok(root, 'personalfury root found');
let groups = personal.autoScan(doc);
assert.ok(groups.some((g) => g.title === 'Choose Design Style' && g.items.length === 2 && g.items[0].image), 'personalfury extracts image swatches');
assert.ok(groups.some((g) => g.title === 'Choose Quote' && g.items.length === 2), 'personalfury extracts select options');
assert.ok(groups.some((g) => g.title === "Face' Man" && g.items.length === 1), 'personalfury extracts text input groups');
assert.ok(groups.some((g) => g.title === 'Upload Photo' && g.items.length === 1), 'personalfury extracts upload groups');

const interest = reg.resolve('interestpod.co');
assert.equal(interest.id, 'interestpod');
doc = makeCustomilyDocument();
groups = interest.autoScan(doc);
assert.ok(groups.some((g) => g.title === 'Choose Design Style'), 'interestpod extracts Choose Design Style');
assert.ok(groups.some((g) => g.title === 'Choose Quote'), 'interestpod extracts Choose Quote');
assert.ok(groups.some((g) => g.title === 'Number Of Kids' && g.items.map((i) => i.value).join(',') === '1,2'), 'interestpod preserves numeric options');
assert.ok(groups.some((g) => g.title === "Face' Man"), 'interestpod preserves apostrophe titles');
assert.ok(groups.some((g) => g.title === 'Choose 1st Kid Skin Tone (Boy)'), 'interestpod preserves parenthetical titles');

const gossby = reg.resolve('gossby.com');
assert.equal(gossby.id, 'gossby');
doc = makeGossbyDocument();
root = gossby.getRoot(doc);
assert.ok(root, 'gossby root found');
groups = gossby.autoScan(doc);
assert.ok(groups.some((g) => g.title === 'Choose Your Flower Vase' && g.items.length === 2 && g.items[0].image), 'gossby extracts image cards');
assert.ok(groups.some((g) => g.title === 'Upload photo' && g.items.length === 1), 'gossby extracts upload field');
assert.ok(groups.some((g) => g.title === "Man's name" && g.items.length === 1), 'gossby extracts text field');
assert.ok(!groups.some((g) => /^(Product type|Color|Size|Quantity|Subtotal)$/i.test(g.title)), 'gossby excludes product variant/non-personalization sections');

console.log('manual new site profiles test passed.');
