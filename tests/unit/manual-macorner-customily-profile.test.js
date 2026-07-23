const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function el(tag, cls='') { return { tagName:tag.toUpperCase(), className:cls, textContent:'', attrs:{}, children:[], parentElement:null,
  appendChild(c){c.parentElement=this;this.children.push(c);return c;}, getAttribute(n){return this.attrs[n]??null;},
  querySelector(s){return this.querySelectorAll(s)[0]||null;},
  querySelectorAll(s){ const sels=s.split(',').map(x=>x.trim()); const out=[]; const has=(n,c)=>String(n.className||'').split(/\s+/).includes(c);
    const m=(n,sel)=> sel==='.customily_option'?has(n,'customily_option'):sel==='.option_name'?has(n,'option_name'):sel==='input[type="text"]'?(n.tagName==='INPUT'&&(n.attrs.type==='text')):sel==='input[type="email"]'?false:sel==='input[type="tel"]'?false:sel==='input[type="number"]'?false:sel==='input:not([type])'?false:sel==='label'?n.tagName==='LABEL':false;
    (function walk(n){n.children.forEach(ch=>{if(sels.some(ss=>m(ch,ss))) out.push(ch); walk(ch);});})(this); return out; },
  closest(sel){let n=this; while(n){ if(sel==='.customily_option'&&String(n.className).includes('customily_option')) return n; n=n.parentElement;} return null;},
  contains(node){let n=node; while(n){ if(n===this) return true; n=n.parentElement;} return false; }
};}

const reg=[];
const root = el('div'); root.attrs.id='customily-options';
const g = root.appendChild(el('div','customily_option')); const t=g.appendChild(el('div','option_name')); t.textContent='Enter Name';
const lbl=g.appendChild(el('label')); lbl.textContent='Kid Name'; const inp=g.appendChild(el('input')); inp.attrs.type='text'; inp.attrs.name='properties[Kid Name]'; inp.attrs.placeholder='Enter name'; inp.attrs.maxlength='20';
const outside = el('div'); const outsideTitle = outside.appendChild(el('div','option_name')); outsideTitle.textContent='Outside';

const doc={ querySelector(s){ if(s==='#customily-options') return root; return null; }, documentElement:{setAttribute(){},getAttribute(){return '';}} };
const ctx=vm.createContext({ window:{ STSClipartScanner:{ profiles:{ register:p=>reg.push(p) } }, getComputedStyle(){ return { backgroundColor:'transparent' }; }, location:{ hostname:'macorner.co' } }, document:doc, console });
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-macorner-customily.js','utf8'), ctx);
const p=reg[0];
const inside = p.scanManualGroupFromTitle(t, { document: doc, location: { hostname: 'macorner.co' } });
assert.equal(inside.name, 'Enter Name');
assert.ok(inside.options.some(o => o.sourceKind === 'text-input'));
const out = p.scanManualGroupFromTitle(outsideTitle, { document: doc, location: { hostname: 'macorner.co' } });
assert.equal(Array.isArray(out.options) && out.options.length, 0);
assert.equal(ctx.window.__STS_LAST_MANUAL_TRACE_REASON, 'outside-macorner-customily-root');
console.log('manual macorner customily profile test passed');
