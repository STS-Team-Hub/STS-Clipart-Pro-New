const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const fixture = fs.readFileSync('tests/fixtures/macorner/personalized-sample.html', 'utf8');
assert.ok(fixture.includes('id="customily-options"'));
assert.ok(fixture.includes('customily_option'));

function mk(tag, cls=''){ return { tagName:tag.toUpperCase(), className:cls, attrs:{}, textContent:'', children:[], parentElement:null,
  appendChild(c){c.parentElement=this;this.children.push(c);return c;}, getAttribute(n){return this.attrs[n]??null;},
  querySelector(s){return this.querySelectorAll(s)[0]||null;},
  querySelectorAll(s){ const sels=s.split(',').map(x=>x.trim()); const out=[]; const has=(n,c)=>String(n.className||'').split(/\s+/).includes(c);
    const m=(n,sel)=> sel==='.customily_option'?has(n,'customily_option'):sel==='.title-customize'?has(n,'title-customize'):sel==='.option_name'?has(n,'option_name'):sel==='input[type="text"]'?(n.tagName==='INPUT'&&n.attrs.type==='text'):sel==='input[type="email"]'?false:sel==='input[type="tel"]'?false:sel==='input[type="number"]'?false:sel==='input:not([type])'?false:false;
    (function walk(n){ n.children.forEach(ch=>{ if(sels.some(ss=>m(ch,ss))) out.push(ch); walk(ch);});})(this); return out;},
  contains(node){let n=node; while(n){if(n===this)return true; n=n.parentElement;} return false; }
};}

const root=mk('div'); root.attrs.id='customily-options';
const title=root.appendChild(mk('div','title-customize')); title.textContent='PERSONALIZED';
const g1=root.appendChild(mk('div','customily_option')); g1.attrs['sort-id']='1'; g1.attrs['opt-id']='g1'; const o1=g1.appendChild(mk('div','option_name')); o1.textContent='Option 1 of 4 Choose Style (0|20) * Required';
const g2=root.appendChild(mk('div','customily_option')); g2.attrs['sort-id']='2'; g2.attrs['opt-id']='g2'; const o2=g2.appendChild(mk('div','option_name')); o2.textContent='Enter Name'; const inp=g2.appendChild(mk('input')); inp.attrs.type='text'; inp.attrs.name='properties[Kid Name]'; inp.attrs.placeholder='Enter name'; inp.attrs.maxlength='20';

const doc={ querySelector(s){ if(s==='#customily-options') return root; return null; }, documentElement:{setAttribute(){},getAttribute(){return '';}} };
const reg=[];
const ctx=vm.createContext({ window:{ STSClipartScanner:{ profiles:{ register:p=>reg.push(p) }, autoDefaultV2:{ async runAutoV2(){ return { groups:[ { label:'Option 1 of 4 Choose Style (0|20) * Required', element:g1, options:[{ textContent:'Classic', value:'Classic', imageUrl:'https://cdn.example/style-classic.png', sourceKind:'customily-swatch', optionType:'image' },{ textContent:'Modern', value:'Modern', bgColor:'rgb(255,0,0)', sourceKind:'customily-swatch', optionType:'color' }] }, { label:'Enter Name', element:g2, options:[] } ] }; } } }, getComputedStyle(){ return { backgroundColor:'rgb(255,0,0)' }; }, location:{ hostname:'www.macorner.co' } }, document:doc, console });
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-macorner-customily.js','utf8'), ctx);
const p=reg[0];
assert.equal(p.detect({ document: doc, location: { hostname: 'www.macorner.co' } }), true);
assert.equal(p.detect({ document: doc, location: { hostname: 'example.com' } }), false);
(async()=>{
  const groups=await p.scanPage({ document:doc, location:{ hostname:'www.macorner.co' } });
  const style=groups.find(g=>g.label==='Choose Style');
  assert.ok(style.options.some(o=>o.imageUrl));
  assert.ok(style.options.some(o=>o.bgColor));
  const tg=groups.find(g=>g.label==='Enter Name');
  const t=tg.options.find(o=>o.sourceKind==='text-input');
  assert.equal(t.optionType,'text');
  assert.equal(t.hasVisual,false);
  assert.equal(t.needsCapture,false);
  assert.equal(t.placeholder,'Enter name');
  assert.equal(t.maxlength,'20');
  console.log('auto macorner customily profile test passed');
})();
