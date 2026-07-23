const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

class El {
  constructor(tag, cls = '', text = '', attrs = {}) { this.tagName = tag.toUpperCase(); this.className = cls; this.textContent = text; this.children = []; this.parentElement = null; this.attrs = attrs; }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  get nextElementSibling() { if (!this.parentElement) return null; const a = this.parentElement.children; const i = a.indexOf(this); return i >= 0 ? a[i + 1] || null : null; }
  get firstElementChild() { return this.children[0] || null; }
  cloneNode(deep) { const c = new El(this.tagName, this.className, this.textContent); if (deep) this.children.forEach(ch => c.appendChild(ch.cloneNode(true))); return c; }
  matches(sel) {
    return sel.split(',').some((s) => {
      const t = s.trim();
      if (t === 'button') return this.tagName === 'BUTTON';
      if (t === 'img') return this.tagName === 'IMG';
      if (t === 'select') return this.tagName === 'SELECT';
      if (t === 'label') return this.tagName === 'LABEL';
      if (t === '[role="button"]') return (this.getAttribute('role') || '') === 'button';
      if (t === '[role="radio"]') return (this.getAttribute('role') || '') === 'radio';
      if (t === '[role="option"]') return (this.getAttribute('role') || '') === 'option';
      if (t === '[data-value]') return !!this.getAttribute('data-value');
      if (t === '[data-label]') return !!this.getAttribute('data-label');
      if (t === '[data-title]') return !!this.getAttribute('data-title');
      if (t === 'legend') return this.tagName === 'LEGEND';
      if (/^h[3-5]$/.test(t)) return this.tagName === t.toUpperCase();
      if (t === 'strong') return this.tagName === 'STRONG';
      if (t.startsWith('.')) return this.className.split(/\s+/).includes(t.slice(1));
      if (t.includes('[class*="')) { const m = t.match(/\[class\*="([^"]+)"\]/); return m ? this.className.includes(m[1]) : false; }
      return false;
    });
  }
  getAttribute(k) { return (this.attrs && this.attrs[k]) || ''; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => { n.children.forEach((ch) => { if (ch.matches(sel)) out.push(ch); walk(ch); }); };
    walk(this);
    return out;
  }
  closest(sel) { let c = this; while (c) { if (c.matches(sel)) return c; c = c.parentElement; } return null; }
}

const documentMock = { createElement: (tag) => new El(tag) };
const registry = { profile: null };
const windowMock = { STSClipartScanner: { profiles: { register: (p) => { registry.profile = p; } }, schema: { normalizeText: (s) => String(s || '').replace(/\s+/g,' ').replace(/\s*\*\s*$/, '').trim(), createOption: (o) => o, createCategory: (g) => g }, collectors: { collectOptionsInContainer: (container) => {
  const opts = [];
  container.querySelectorAll('button').forEach((b) => opts.push({ textContent: b.textContent }));
  if (container.matches && container.matches('.ant-radio-button-wrapper')) opts.push({ textContent: container.textContent });
  container.querySelectorAll('.ant-radio-button-wrapper').forEach((lb) => opts.push({ textContent: lb.textContent }));
  container.querySelectorAll('img').forEach((i) => opts.push({ imageUrl: i.textContent || 'img' }));
  return opts;
} } } };

const ctx = vm.createContext({ window: windowMock, document: documentMock, console });
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-default.js','utf8'), ctx);
const p = registry.profile;

const root = new El('div', 'personalized');
const t1 = root.appendChild(new El('div', 'group-title sts-highlight-title', "Graduate's Gender *"));
const o1 = root.appendChild(new El('label', 'ant-radio-button-wrapper', 'WOMAN'));
root.appendChild(new El('label', 'ant-radio-button-wrapper', 'MAN'));
const t2 = root.appendChild(new El('div', 'group-title sts-highlight-title', "Graduate's Eyes Color *"));
const o2 = root.appendChild(new El('div', 'options'));
o2.appendChild(new El('img', '', 'eye1')); o2.appendChild(new El('img', '', 'eye2'));
const t3 = root.appendChild(new El('div', 'group-title sts-highlight-title', "Graduate's Glasses *"));
const o3 = root.appendChild(new El('div', 'options'));
o3.appendChild(new El('button', '', 'NO'));


const rawGroup = p.scanManualGroupFromTitle(t1);
assert.equal(Object.prototype.hasOwnProperty.call(rawGroup, 'optionCount'), false, 'default profile manual should return raw group, not normalized category');
assert.equal(Object.prototype.hasOwnProperty.call(rawGroup, 'prefix'), false, 'default profile manual should not prefill category prefix');
assert.equal(p.scanManualGroupFromTitle(t1).options.length, 2);
assert.equal(p.scanManualGroupFromTitle(t2).options.length, 2);
assert.equal(p.scanManualGroupFromTitle(t3).options.length, 1);
assert.deepEqual(p.scanManualGroupFromTitle(t1).options.map(o => o.textContent), ['WOMAN','MAN']);
assert.equal(p.scanManualGroupFromTitle(t2).options.some(o => o.textContent === 'NO'), false);

console.log('manual default profile range test passed.');
