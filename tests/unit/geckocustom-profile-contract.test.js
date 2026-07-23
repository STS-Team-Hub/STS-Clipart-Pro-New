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
    this.checked = Object.prototype.hasOwnProperty.call(attrs, 'checked');
    this.currentSrc = attrs.currentSrc || attrs.src || '';
    this.src = attrs.src || '';
  }
  append(...kids) { kids.forEach(k => { k.parentElement = this; this.children.push(k); }); return this; }
  get className() { return this.attrs.class || ''; }
  get id() { return this.attrs.id || ''; }
  get name() { return this.attrs.name || ''; }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const out = [];
    String(selector).split(',').map(s => s.trim()).filter(Boolean).forEach(sel => {
      queryWithin(this, sel).forEach(el => { if (!out.includes(el)) out.push(el); });
    });
    return out;
  }
  closest(selector) {
    let cur = this;
    while (cur) {
      if (String(selector).split(',').some(sel => matchesSimple(cur, sel.trim()))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  matches(selector) { return String(selector).split(',').some(sel => matchesSimple(this, sel.trim())); }
  getBoundingClientRect() { return { left: 0, top: 0, right: 50, bottom: 50, width: 50, height: 50 }; }
}

function descendants(el) { return el.children.flatMap(k => [k, ...descendants(k)]); }
function queryWithin(root, selector) {
  const parts = selector.trim().split(/\s+/);
  let current = [root];
  for (const part of parts) {
    const next = [];
    current.forEach(node => descendants(node).forEach(el => { if (matchesSimple(el, part) && !next.includes(el)) next.push(el); }));
    current = next;
  }
  return current;
}
function matchesSimple(el, selector) {
  if (!el || !selector) return false;
  const tag = selector.match(/^[a-z0-9-]+/i);
  if (tag && el.tagName.toLowerCase() !== tag[0].toLowerCase()) return false;
  const id = selector.match(/#([a-zA-Z0-9_-]+)/);
  if (id && el.getAttribute('id') !== id[1]) return false;
  const classes = selector.match(/\.([a-zA-Z0-9_-]+)/g) || [];
  for (const cls of classes) if (!String(el.className).split(/\s+/).includes(cls.slice(1))) return false;
  const attrs = selector.matchAll(/\[([^\]=~^*$]+)([*^]?=)?"?([^\]"]*)"?\]/g);
  for (const m of attrs) {
    const attr = m[1].trim(); const op = m[2] || ''; const expected = m[3] || '';
    const actual = el.getAttribute(attr);
    if (!op && actual == null) return false;
    if (op === '=' && String(actual) !== expected) return false;
    if (op === '^=' && !String(actual || '').startsWith(expected)) return false;
    if (op === '*=' && !String(actual || '').includes(expected)) return false;
  }
  return true;
}

function makeGeckoDoc() {
  const design = new MockEl('div', { class: 'sl-option-set-item', 'data-type': 'swatch' }).append(
    new MockEl('div', { class: 'sl-option-set-item_title' }).append(new MockEl('div', { class: 'sl-option-set-item_label' }, 'Choose Design *')),
    new MockEl('div', { class: 'sl-swatches' }).append(
      new MockEl('div', { class: 'sl-swatch-item' }).append(
        new MockEl('input', { required: '', checked: '', type: 'radio', id: 'd-1', name: 'properties[Choose Design]', value: '1' }),
        new MockEl('label', { for: 'd-1', style: '--sl-image: url(https://cdn.example/design-1.jpg);' }, '1')
      ),
      new MockEl('div', { class: 'sl-swatch-item' }).append(
        new MockEl('input', { type: 'radio', id: 'd-2', name: 'properties[Choose Design]', value: '2' }),
        new MockEl('label', { for: 'd-2', style: '--sl-image: url(https://cdn.example/design-2.jpg);' }, '2')
      )
    )
  );
  const familyName = new MockEl('div', { class: 'sl-option-set-item', 'data-type': 'text' }).append(
    new MockEl('div', { class: 'sl-option-set-item_title' }).append(new MockEl('label', { class: 'sl-option-set-item_label' }, 'Enter Family Name * (0|25)')),
    new MockEl('div', { class: 'sl-text-group' }).append(new MockEl('input', { class: 'st-text-input', type: 'text', name: 'properties[Enter Family Name]', value: '', placeholder: 'Your family name', maxlength: '25' }))
  );
  return new MockEl('document').append(new MockEl('div', { id: 'customily-options' }).append(new MockEl('div', { class: 'sl-option-set' }).append(design, familyName)));
}

function run(file, ctx) { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file }); }

assert.ok(fs.existsSync('tests/fixtures/site-profiles/geckocustom/group-basic.html'), 'geckocustom group-basic fixture exists');
assert.ok(fs.existsSync('tests/fixtures/site-profiles/geckocustom/group-with-images.html'), 'geckocustom group-with-images fixture exists');
const expected = JSON.parse(fs.readFileSync('tests/fixtures/site-profiles/geckocustom/expected.json', 'utf8'));
assert.equal(expected.siteId, 'geckocustom');

const windowMock = { getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none' }) };
const doc = makeGeckoDoc();
const ctx = vm.createContext({
  window: windowMock,
  document: doc,
  location: { hostname: 'geckocustom.com', href: 'https://geckocustom.com/products/example' },
  console,
  getComputedStyle: windowMock.getComputedStyle,
  CSS: { escape: (s) => String(s).replace(/"/g, '\\"') }
});
ctx.window = ctx;

[
  'content_modules/site_profiles/index.js',
  'content_modules/site_profiles/shared/cleanup.js',
  'content_modules/site_profiles/shared/dom.js',
  'content_modules/site_profiles/shared/values.js',
  'content_modules/site_profiles/geckocustom.js'
].forEach(file => run(file, ctx));

const v2 = ctx.window.STSSiteProfilesV2.resolve('geckocustom.com');
assert.equal(v2.id, 'geckocustom');
const groups = v2.autoScan(doc);
assert.ok(groups.some(g => g.title === 'Choose Design' && g.items.length === 2 && g.items[0].image), 'V2 geckocustom extracts image swatches');
assert.ok(groups.some(g => g.title === 'Enter Family Name' && g.items.length === 1), 'V2 geckocustom extracts text input group');
assert.equal(v2.scanManualGroupFromTitle(doc.querySelector('.sl-option-set-item_label')).title, 'Choose Design', 'V2 manual title maps to nearest group');

[
  'content_modules/clipart/scanner-profile-registry.js',
  'content_modules/clipart/scanner-profile-default.js',
  'content_modules/clipart/scanner-profile-geckocustom.js'
].forEach(file => run(file, ctx));

const effective = ctx.window.STSClipartScanner.profiles.resolve({ document: doc, location: ctx.location, window: ctx.window });
assert.equal(effective.id, 'geckocustom');
['scanPage','scanVisibleState','scanManualGroupFromTitle','collectOptionsInContainer','collectOptionsInRegion','detectNearestGroupTitleFromOption','normalizeGroup','normalizeOption'].forEach(method => {
  assert.equal(typeof effective[method], 'function', `effective profile must expose ${method}`);
});
const manual = effective.scanManualGroupFromTitle(doc.querySelector('.sl-option-set-item_label'), { document: doc, location: ctx.location, window: ctx.window });
assert.equal(manual.name, 'Choose Design');
assert.equal(manual.options.length, 2);
assert.ok(manual.options[0].imageUrl && manual.options[0].capturedImage, 'clipart geckocustom keeps --sl-image as imageUrl and capturedImage for render');

[
  'content_modules/manual_profiles/index.js',
  'content_modules/manual_profiles/geckocustom.js'
].forEach(file => run(file, ctx));
const manualLegacy = ctx.window.STSManualProfiles.resolve('www.geckocustom.com');
assert.equal(manualLegacy.key, 'geckocustom');
assert.ok(manualLegacy.getGroups().length >= 2, 'legacy manual profile is available for GeckoCustom fallback paths');

console.log('geckocustom profile contract test passed.');
