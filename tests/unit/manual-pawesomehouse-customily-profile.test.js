const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function makeElement(tagName, opts = {}) {
  const el = {
    tagName: String(tagName || 'div').toUpperCase(),
    className: opts.className || '',
    textContent: opts.textContent || '',
    attrs: Object.assign({}, opts.attrs || {}),
    children: [],
    parentElement: null,
    ownerDocument: null,
    disabled: !!opts.disabled,
    appendChild(child) { child.parentElement = this; child.ownerDocument = this.ownerDocument; this.children.push(child); return child; },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) {
      const sels = selector.split(',').map((s) => s.trim()).filter(Boolean);
      const hasClass = (node, cls) => String(node.className || '').split(/\s+/).includes(cls);
      const isInputType = (node, t) => node.tagName === 'INPUT' && (node.getAttribute('type') || '').toLowerCase() === t;
      const inputType = (node) => (node.getAttribute('type') || '').toLowerCase();
      const matchOne = (node, sel) => {
        if (sel === '.customily_option') return hasClass(node, 'customily_option');
        if (sel === '.option_name') return hasClass(node, 'option_name');
        if (sel === 'label[role="tab"]') return node.tagName === 'LABEL' && String(node.getAttribute('role') || '').toLowerCase() === 'tab';
        if (sel === '.cl-option-content') return hasClass(node, 'cl-option-content');
        if (sel === '.swatch-container') return hasClass(node, 'swatch-container');
        if (sel === '.customily-swatch.swatch') return hasClass(node, 'customily-swatch') && hasClass(node, 'swatch');
        if (sel === '.customily-swatch') return hasClass(node, 'customily-swatch');
        if (sel === 'label') return node.tagName === 'LABEL';
        if (sel === 'img') return node.tagName === 'IMG';
        if (sel === 'select') return node.tagName === 'SELECT';
        if (sel === 'option') return node.tagName === 'OPTION';
        if (sel === 'textarea') return node.tagName === 'TEXTAREA';
        if (sel === 'input[type="radio"]') return isInputType(node, 'radio');
        if (sel === 'input[type="checkbox"]') return isInputType(node, 'checkbox');
        if (sel === 'input[type="file"]') return isInputType(node, 'file');
        if (sel === 'input[type="text"]') return isInputType(node, 'text');
        if (sel === 'input[type="email"]') return isInputType(node, 'email');
        if (sel === 'input[type="tel"]') return isInputType(node, 'tel');
        if (sel === 'input[type="number"]') return isInputType(node, 'number');
        if (sel === 'input:not([type])') return node.tagName === 'INPUT' && !node.getAttribute('type');
        if (sel === 'textarea[name]') return node.tagName === 'TEXTAREA' && !!node.getAttribute('name');
        if (sel === 'input[name]') return node.tagName === 'INPUT' && !!node.getAttribute('name');
        if (sel === 'select[name]') return node.tagName === 'SELECT' && !!node.getAttribute('name');
        if (sel === 'select[name^="properties["]') return node.tagName === 'SELECT' && /^properties\[/.test(String(node.getAttribute('name') || ''));
        if (sel === 'input[name^="properties["]') return node.tagName === 'INPUT' && /^properties\[/.test(String(node.getAttribute('name') || ''));
        if (sel === 'textarea[name^="properties["]') return node.tagName === 'TEXTAREA' && /^properties\[/.test(String(node.getAttribute('name') || ''));
        return false;
      };
      const out = [];
      const walk = (node) => node.children.forEach((ch) => { if (sels.some((s) => matchOne(ch, s))) out.push(ch); walk(ch); });
      walk(this);
      return out;
    },
    closest(selector) {
      let cur = this;
      while (cur) {
        if (selector === '.customily_option' && String(cur.className || '').split(/\s+/).includes('customily_option')) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
  };
  if (opts.value != null) el.value = opts.value;
  if (opts.name) { el.name = opts.name; el.attrs.name = opts.name; }
  if (opts.checked) el.checked = true;
  if (opts.src) { el.src = opts.src; el.attrs.src = opts.src; }
  return el;
}

const documentMock = {
  documentElement: { getAttribute: () => '' },
  _signals: new Set(),
  _root: null,
  _outsideRoot: null,
  querySelector(sel) {
    if (sel === '#customily-options') return this._root;
    if (sel === '#customily-options .customily_option') {
      return this._root && this._root.querySelector('.customily_option') ? this._root.querySelector('.customily_option') : null;
    }
    if (sel === '#customily-options .customily-swatch.swatch') {
      return this._root && this._root.querySelector('.customily-swatch.swatch') ? this._root.querySelector('.customily-swatch.swatch') : null;
    }
    if (sel === '#customily-options select[name^="properties["]') {
      return this._root && this._root.querySelector('select[name]') ? this._root.querySelector('select[name]') : null;
    }
    if (sel === '#customily-options input[name^="properties["]') {
      return this._root && this._root.querySelector('input[name]') ? this._root.querySelector('input[name]') : null;
    }
    if (sel === '#customily-options textarea[name^="properties["]') {
      return this._root && this._root.querySelector('textarea[name]') ? this._root.querySelector('textarea[name]') : null;
    }
    if (sel === '.customily-swatch.swatch, select[name^="properties["], input[name^="properties["], textarea[name^="properties["]') {
      if (!this._root) return null;
      return this._root.querySelector('.customily-swatch.swatch') || this._root.querySelector('select[name]') || this._root.querySelector('input[name]') || this._root.querySelector('textarea[name]') || null;
    }
    if (sel === '.customily_option') {
      if (this._root && this._root.querySelector('.customily_option')) return this._root.querySelector('.customily_option');
      if (this._outsideRoot && this._outsideRoot.querySelector('.customily_option')) return this._outsideRoot.querySelector('.customily_option');
      return this._signals.has(sel) ? {} : null;
    }
    return this._signals.has(sel) ? {} : null;
  },
  querySelectorAll(sel) {
    const inRoot = this._root ? this._root.querySelectorAll(sel) : [];
    const outside = this._outsideRoot ? this._outsideRoot.querySelectorAll(sel) : [];
    return inRoot.concat(outside);
  }
};

const registry = [];
const context = vm.createContext({
  window: { STSClipartScanner: { profiles: { register: (p) => registry.push(p) } }, getComputedStyle: () => ({ backgroundColor: 'transparent' }) },
  document: documentMock,
  console
});

vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-pawesomehouse-customily.js', 'utf8'), context);
const profile = registry.find((p) => p.id === 'pawesomehouse-customily-manual');
assert.ok(profile);

documentMock._signals = new Set(['#customily-options', '.customily_option']);
documentMock._root = makeElement('div');
const detectSelectOnlyGroup = documentMock._root.appendChild(makeElement('div', { className: 'customily_option' }));
const detectSelectOnly = detectSelectOnlyGroup.appendChild(makeElement('select', { name: 'properties[Choose The Title]' }));
detectSelectOnly.appendChild(makeElement('option', { value: '', textContent: 'Choose an Option', disabled: true }));
detectSelectOnly.appendChild(makeElement('option', { value: 'daddy', textContent: 'daddy' }));
assert.equal(!!profile.detect({ document: documentMock, location: { hostname: 'pawesomehouse.com' } }), true);

documentMock._root = makeElement('div');
const detectSwatchGroup = documentMock._root.appendChild(makeElement('div', { className: 'customily_option' }));
const detectSwatch = detectSwatchGroup.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
detectSwatch.appendChild(makeElement('input', { attrs: { type: 'radio', name: 'properties[Number Of Kids]' }, value: '1' }));
assert.equal(!!profile.detect({ document: documentMock, location: { hostname: 'pawesomehouse.com' } }), true);

const root = makeElement('div');
root.ownerDocument = documentMock;
documentMock._root = root;

const outsideRoot = makeElement('div');
outsideRoot.ownerDocument = documentMock;
documentMock._outsideRoot = outsideRoot;

// Product variant controls outside personalized root (must be ignored)
const outsideVariant = outsideRoot.appendChild(makeElement('div', { className: 'product-variant' }));
outsideVariant.appendChild(makeElement('div', { textContent: 'Style: Square' }));
['Square', 'Circle', 'Lace Square', 'Lace Circle'].forEach((v) => {
  outsideVariant.appendChild(makeElement('button', { textContent: v }));
});

// Group: Choose Your Option (5 swatches)
const gOption = root.appendChild(makeElement('div', { className: 'customily_option' }));
const tOption = gOption.appendChild(makeElement('div', { className: 'option_name', textContent: 'Option 1 of 12 Choose Your Option * Required' }));
for (let i = 1; i <= 5; i += 1) {
  const sw = gOption.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: 'properties[Choose Your Option]' }, value: `opt-${i}` }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: `Option ${i}` }, src: `https://cdn.example/opt${i}.png` }));
}

// Group: Choose Quote (2 select options)
const gQuote = root.appendChild(makeElement('div', { className: 'customily_option' }));
gQuote.appendChild(makeElement('div', { className: 'option_name', textContent: 'Choose Quote * Required' }));
const quoteSelect = gQuote.appendChild(makeElement('select', { name: 'properties[Choose Quote]' }));
quoteSelect.appendChild(makeElement('option', { value: '', textContent: 'Select' }));
quoteSelect.appendChild(makeElement('option', { value: 'To The World, You Are A (...), But To Me, You Are My Whole World', textContent: 'To The World, You Are A (...), But To Me, You Are My Whole World' }));
quoteSelect.appendChild(makeElement('option', { value: 'To The World, You Are A (...), But To Us, You Are Our Whole World', textContent: 'To The World, You Are A (...), But To Us, You Are Our Whole World' }));

// Group: Choose Background (3 swatches)
const gBg = root.appendChild(makeElement('div', { className: 'customily_option' }));
gBg.appendChild(makeElement('div', { className: 'option_name', textContent: 'Option 3 of 12 Choose Background' }));
for (let i = 1; i <= 3; i += 1) {
  const sw = gBg.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: 'properties[Choose Background]' }, value: `bg-${i}` }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: `Background ${i}` }, src: `https://cdn.example/bg${i}.png` }));
}

// Group: Choose Birth Month (12 options)
const gMonth = root.appendChild(makeElement('div', { className: 'customily_option' }));
gMonth.appendChild(makeElement('div', { className: 'option_name', textContent: 'Choose Birth Month' }));
const monthSelect = gMonth.appendChild(makeElement('select', { name: 'properties[Choose Birth Month]' }));
monthSelect.appendChild(makeElement('option', { value: '', textContent: 'Select month' }));
['January','February','March','April','May','June','July','August','September','October','November','December'].forEach((m) => {
  monthSelect.appendChild(makeElement('option', { value: m, textContent: m }));
});

// Upload/text-only groups to skip
const gUpload = root.appendChild(makeElement('div', { className: 'customily_option' }));
gUpload.appendChild(makeElement('div', { className: 'option_name', textContent: 'Upload Your Photo * Required' }));
gUpload.appendChild(makeElement('input', { attrs: { type: 'file', name: 'properties[Upload Your Photo]', accept: 'image/*' } }));

const gTextOnly = root.appendChild(makeElement('div', { className: 'customily_option' }));
gTextOnly.appendChild(makeElement('div', { className: 'option_name', textContent: 'Enter Message' }));
gTextOnly.appendChild(makeElement('textarea', { attrs: { name: 'properties[Enter Message]', placeholder: 'Type your message', maxlength: '120' } }));

const gCheckbox = root.appendChild(makeElement('div', { className: 'customily_option' }));
gCheckbox.appendChild(makeElement('div', { className: 'option_name', textContent: 'Add Gift Wrap' }));
const cbSw = gCheckbox.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
cbSw.appendChild(makeElement('input', { attrs: { type: 'checkbox', name: 'properties[Add Gift Wrap]' }, value: 'yes', checked: true }));
cbSw.appendChild(makeElement('label', { textContent: 'Yes' }));

// Fake group outside root that must be ignored by auto
const fakeOutside = outsideRoot.appendChild(makeElement('div', { className: 'customily_option' }));
fakeOutside.appendChild(makeElement('div', { className: 'option_name', textContent: 'FAKE OUTSIDE ROOT' }));
const fakeSel = fakeOutside.appendChild(makeElement('select', { name: 'properties[Choose Quote]' }));
fakeSel.appendChild(makeElement('option', { value: 'INTRUDER', textContent: 'INTRUDER' }));

let auto;

const noRootDoc = Object.assign({}, documentMock, { _root: null, querySelector(sel) { return sel === '#customily-options' ? null : null; } });
const noRoot = profile.scanPage({ document: noRootDoc, location: { hostname: 'pawesomehouse.com' } });
assert.deepEqual(noRoot, [], 'no root must return empty');

console.log('manual pawesomehouse customily profile test passed.');
// Group: Number Of Kids (6 swatches)
const gKids = root.appendChild(makeElement('div', { className: 'customily_option' }));
gKids.appendChild(makeElement('div', { className: 'option_name', textContent: 'Number Of Kids' }));
for (let i = 1; i <= 6; i += 1) {
  const sw = gKids.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: 'properties[Number Of Kids]' }, value: `${i}` }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: `${i}` }, src: `https://cdn.example/kids-${i}.png` }));
}

// Group: Choose The Title (12 options + disabled placeholder)
const gTitle = root.appendChild(makeElement('div', { className: 'customily_option' }));
gTitle.appendChild(makeElement('div', { className: 'option_name', textContent: 'Choose The Title' }));
const titleSelect = gTitle.appendChild(makeElement('select', { name: 'properties[Choose The Title]' }));
titleSelect.appendChild(makeElement('option', { value: '', textContent: 'Choose an Option', disabled: true }));
['abuelo','daddy','grampy','grandpa','grandpop','nonno','papa','paw-paw','pop-pop','poppy','pops','uncle'].forEach((v) => {
  titleSelect.appendChild(makeElement('option', { value: v, textContent: v }));
});

// Group: Man's Body Type (2 swatches)
const gBodyType = root.appendChild(makeElement('div', { className: 'customily_option' }));
gBodyType.appendChild(makeElement('div', { className: 'option_name', textContent: "Man's Body Type" }));
['bodytype-1', 'bodytype-2'].forEach((v, idx) => {
  const sw = gBodyType.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: "properties[Man's Body Type]" }, value: v }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: `body ${idx + 1}` }, src: `https://cdn.example/body-type-${idx + 1}.png` }));
});

// Group: Man's Skin Color (4 swatches)
const gSkin = root.appendChild(makeElement('div', { className: 'customily_option' }));
gSkin.appendChild(makeElement('div', { className: 'option_name', textContent: "Man's Skin Color" }));
['body-tre-01', 'body-tre-02', 'body-tre-03', 'body-tre-04'].forEach((v) => {
  const sw = gSkin.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: "properties[Man's Skin Color]" }, value: v }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: v }, src: `https://cdn.example/${v}.png` }));
});

// Group: Man's Glasses (2 swatches)
const gGlasses = root.appendChild(makeElement('div', { className: 'customily_option' }));
gGlasses.appendChild(makeElement('div', { className: 'option_name', textContent: "Man's Glasses" }));
['0', 'kinh'].forEach((v) => {
  const sw = gGlasses.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: "properties[Man's Glasses]" }, value: v }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: v }, src: `https://cdn.example/glasses-${v}.png` }));
});

// Group: Man's Hair Color (11 swatches)
const gHairColor = root.appendChild(makeElement('div', { className: 'customily_option' }));
gHairColor.appendChild(makeElement('div', { className: 'option_name', textContent: "Man's Hair Color" }));
['black', 'blonde', 'dark brown', 'ginger', 'light blonde', 'light brown', 'red', 'rose gold', 'salt and pepper', 'silver', 'zBALD'].forEach((v) => {
  const sw = gHairColor.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: "properties[Man's Hair Color]" }, value: v }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: v }, src: `https://cdn.example/hair-${encodeURIComponent(v)}.png` }));
});

// Group: black (literal lowercase title preserved)
const gBlack = root.appendChild(makeElement('div', { className: 'customily_option' }));
gBlack.appendChild(makeElement('div', { className: 'option_name', textContent: 'black' }));
['black-1', 'black-2'].forEach((v) => {
  const sw = gBlack.appendChild(makeElement('div', { className: 'customily-swatch swatch' }));
  sw.appendChild(makeElement('input', { attrs: { type: 'radio', name: 'properties[black]' }, value: v }));
  const lbl = sw.appendChild(makeElement('label'));
  lbl.appendChild(makeElement('img', { attrs: { alt: v }, src: `https://cdn.example/${v}.png` }));
});

auto = profile.scanPage({ document: documentMock, location: { hostname: 'pawesomehouse.com' } });

assert.equal(auto.some((g) => g.name === 'FAKE OUTSIDE ROOT'), false, 'outside-root groups ignored');
const names = auto.map((g) => g.name);
assert.equal(names.includes('Upload Your Photo'), true, 'upload-only group included as file input metadata');
assert.equal(names.includes('Enter Message'), true, 'textarea-only group included as personalization input metadata');
assert.equal(names.some((n) => /style|square|circle|lace square|lace circle/i.test(n)), false, 'outside style variant labels ignored');

const uploadPhoto = auto.find((g) => g.name === 'Upload Your Photo');
assert.ok(uploadPhoto);
assert.equal(uploadPhoto.options[0].sourceKind, 'customily-file-input');
assert.equal(uploadPhoto.options[0].accept, 'image/*');

const enterMessage = auto.find((g) => g.name === 'Enter Message');
assert.ok(enterMessage);
assert.equal(enterMessage.options[0].sourceKind, 'customily-textarea');
assert.equal(enterMessage.options[0].placeholder, 'Type your message');
assert.equal(enterMessage.options[0].maxlength, '120');

const giftWrap = auto.find((g) => g.name === 'Gift Wrap');
assert.ok(giftWrap);
assert.equal(giftWrap.options[0].value, 'yes');
assert.equal(giftWrap.options[0].isSelected, true, 'checkbox selected state should be preserved');

const chooseQuote = auto.find((g) => g.name === 'Choose Quote');
assert.ok(chooseQuote);
assert.equal(chooseQuote.options.length, 2, 'Choose Quote should return exactly 2 options');

const chooseYourOption = auto.find((g) => g.name === 'Choose Your Option');
assert.ok(chooseYourOption);
assert.equal(chooseYourOption.options.length, 5, 'Choose Your Option should return exactly 5 swatches');

const chooseBg = auto.find((g) => g.name === 'Choose Background');
assert.ok(chooseBg);
assert.deepEqual(chooseBg.options.map((o) => o.value), ['bg-1', 'bg-2', 'bg-3']);

const chooseMonth = auto.find((g) => g.name === 'Choose Birth Month');
assert.ok(chooseMonth);
assert.equal(chooseMonth.options.length, 12, 'Choose Birth Month should return exactly 12 options');

assert.equal(chooseQuote.options.some((o) => /^bg-/.test(o.value)), false, 'no cross-group option leakage');
assert.equal(chooseBg.options.some((o) => o.value === 'INTRUDER'), false, 'ignore fake outside options');
const outsideVariantRe = /style|square|circle|lace square|lace circle/i;
auto.forEach((g) => {
  (g.options || []).forEach((o) => {
    const blob = [o.label, o.textContent, o.value, o.name].join(' ');
    assert.equal(outsideVariantRe.test(blob), false, 'outside style variant options must be ignored');
  });
});
const numberOfKids = auto.find((g) => g.name === 'Number Of Kids');
assert.ok(numberOfKids);
assert.equal(numberOfKids.options.length, 6, 'Number Of Kids should return exactly 6 image swatches');
assert.equal(numberOfKids.options.every((o) => !!o.imageUrl && !!o.capturedImage), true, 'Number Of Kids should preserve imageUrl/capturedImage');

const chooseTheTitle = auto.find((g) => g.name === 'Choose The Title');
assert.ok(chooseTheTitle);
assert.equal(chooseTheTitle.options.length, 12, 'Choose The Title should return exactly 12 valid options');
assert.equal(chooseTheTitle.options.some((o) => /choose an option/i.test([o.value, o.textContent, o.label].join(' '))), false, 'Choose The Title placeholder must be skipped');

const manBodyType = auto.find((g) => g.name === "Man's Body Type");
assert.ok(manBodyType);
assert.equal(manBodyType.options.length, 2);

const manSkinColor = auto.find((g) => g.name === "Man's Skin Color");
assert.ok(manSkinColor);
assert.equal(manSkinColor.options.length, 4);

const manGlasses = auto.find((g) => g.name === "Man's Glasses");
assert.ok(manGlasses);
assert.equal(manGlasses.options.length, 2);

const manHairColor = auto.find((g) => g.name === "Man's Hair Color");
assert.ok(manHairColor);
assert.equal(manHairColor.options.every((o) => !!o.imageUrl && !!o.capturedImage), true, "Man's Hair Color should preserve imageUrl/capturedImage for all swatches");
assert.equal(manHairColor.options.every((o) => String(o.textContent || '').trim().length > 0), true, 'image swatch options keep text fallback while preserving images');

const manual = profile.scanManualGroupFromTitle(tOption, { document: documentMock });
assert.ok(manual);
assert.equal(manual.name, 'Choose Your Option');
assert.equal(manual.options.length, 5, 'manual should only return clicked group');
assert.equal(manual.name, chooseYourOption.name, 'auto and manual titles are identical for same group');

const blackGroup = auto.find((g) => g.name === 'black');
assert.ok(blackGroup, 'black literal title should be preserved exactly');
assert.equal(blackGroup.options.length, 2);

const manualTextOnly = profile.scanManualGroupFromTitle(gTextOnly.querySelector('.option_name'), { document: documentMock });
assert.equal(manualTextOnly, null, 'manual text-only behavior remains unchanged while auto includes it');

const manualKids = profile.scanManualGroupFromTitle(gKids.querySelector('.option_name'), { document: documentMock });
assert.ok(manualKids);
assert.equal(manualKids.name, numberOfKids.name, 'same group name between auto/manual for Number Of Kids');
assert.equal(manualKids.options.length, numberOfKids.options.length, 'same option count between auto/manual for Number Of Kids');

assert.ok(String(profile.scanPage).includes('extractCustomilyGroupFromGroupEl'), 'auto scanPage should use shared extractor path');
assert.ok(String(profile.scanManualGroupFromTitle).includes('extractCustomilyGroupFromGroupEl'), 'manual scan should use shared extractor path');
