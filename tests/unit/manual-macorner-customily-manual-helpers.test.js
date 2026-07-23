const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function el(tag, cls='') { return { tagName:tag.toUpperCase(), className:cls, textContent:'', attrs:{}, children:[], parentElement:null,
  appendChild(c){c.parentElement=this;this.children.push(c);return c;}, getAttribute(n){return this.attrs[n]??null;},
  querySelector(s){return this.querySelectorAll(s)[0]||null;},
  querySelectorAll(s){ const sels=s.split(',').map(x=>x.trim()); const out=[]; const has=(n,c)=>String(n.className||'').split(/\s+/).includes(c);
    const m=(n,sel)=> sel==='.customily_option'?has(n,'customily_option'):sel==='.option_name'?has(n,'option_name'):false;
    (function walk(n){n.children.forEach(ch=>{if(sels.some(ss=>m(ch,ss))) out.push(ch); walk(ch);});})(this); return out; },
  closest(sel){let n=this; while(n){ if(sel==='.customily_option'&&String(n.className).includes('customily_option')) return n; if(sel==='#customily-options'&&n.attrs.id==='customily-options') return n; n=n.parentElement;} return null;},
  contains(node){let n=node; while(n){ if(n===this) return true; n=n.parentElement;} return false; }
};}

const reg=[];
const root = el('div'); root.attrs.id='customily-options';
const g1 = root.appendChild(el('div','customily_option')); const t1=g1.appendChild(el('div','option_name')); t1.textContent='Option 1 of 4 Your Title (0|20) * Required';
const g2 = root.appendChild(el('div','customily_option')); const t2=g2.appendChild(el('div','option_name')); t2.textContent="Man's Name *";
const outside = el('div','customily_option'); const outsideTitle = outside.appendChild(el('div','option_name'));
outsideTitle.textContent='Outside';

const doc={ querySelector(s){ if(s==='#customily-options') return root; return null; }, documentElement:{setAttribute(){},getAttribute(){return '';}} };
const ctx=vm.createContext({ window:{ STSClipartScanner:{ profiles:{ register:p=>reg.push(p) } }, location:{ hostname:'macorner.co' } }, document:doc, console });
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-macorner-customily.js','utf8'), ctx);
const p=reg[0];

assert.equal(p.getRoot(doc), root);
assert.equal(p.getGroups(root).length, 2);
assert.equal(p.getTitleElement(g1), t1);
assert.equal(p.cleanupTitle(t1.textContent), 'Your Title');
assert.equal(p.isValidGroup(g1), true);
assert.equal(p.isValidGroup(outside), false);
console.log('manual macorner customily helper test passed');
