const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function el(tag, o={}){ const e={tagName:tag.toUpperCase(),className:o.className||'',textContent:o.textContent||'',attrs:{...(o.attrs||{})},children:[],parentElement:null,ownerDocument:null,disabled:!!o.disabled,appendChild(c){c.parentElement=this;c.ownerDocument=this.ownerDocument;this.children.push(c);return c;},getAttribute(n){return this.attrs[n]??null;},querySelector(s){return this.querySelectorAll(s)[0]||null;},querySelectorAll(sel){const sels=sel.split(',').map(x=>x.trim());const hc=(n,c)=>String(n.className||'').split(/\s+/).includes(c);const mt=(n,s)=>{if(s==='.customily_option')return hc(n,'customily_option'); if(s==='.option_name')return hc(n,'option_name'); if(s==='.customily-swatch.swatch')return hc(n,'customily-swatch')&&hc(n,'swatch'); if(s==='.customily-swatch')return hc(n,'customily-swatch'); if(s==='label')return n.tagName==='LABEL'; if(s==='img')return n.tagName==='IMG'; if(s==='select[name^="properties["]')return n.tagName==='SELECT'&&/^properties\[/.test(n.getAttribute('name')||''); if(s==='input[type="radio"]')return n.tagName==='INPUT'&&(n.getAttribute('type')||'')==='radio'; if(s==='select')return n.tagName==='SELECT'; if(s==='input[type="file"]')return n.tagName==='INPUT'&&(n.getAttribute('type')||'')==='file'; if(s==='textarea')return n.tagName==='TEXTAREA'; if(s==='input[type="text"]')return n.tagName==='INPUT'&&(n.getAttribute('type')||'')==='text'; if(s==='input:not([type])')return n.tagName==='INPUT'&&!n.getAttribute('type'); if(s==='input[type="email"]'||s==='input[type="tel"]'||s==='input[type="number"]')return false; return false;}; const out=[]; const walk=n=>n.children.forEach(c=>{if(sels.some(s=>mt(c,s)))out.push(c);walk(c)}); walk(this); return out;}}; if(o.value!=null)e.value=o.value; if(o.name){e.name=o.name;e.attrs.name=o.name;} if(o.src){e.src=o.src;e.attrs.src=o.src;} return e; }

const documentMock={documentElement:{getAttribute:()=>''},_root:null,querySelector(sel){if(sel==='#customily-options')return this._root;return null;}};
const registry=[];
const context=vm.createContext({window:{STSClipartScanner:{profiles:{register:(p)=>registry.push(p)}},getComputedStyle:()=>({backgroundColor:'transparent'})},document:documentMock,console});
vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-profile-pawesomehouse-customily.js','utf8'),context);
const profile=registry.find(p=>p.id==='pawesomehouse-customily-manual');

const root=el('div'); documentMock._root=root;
const g1=root.appendChild(el('div',{className:'customily_option'}));
g1.appendChild(el('div',{className:'option_name',textContent:'Choose your kid'}));
const sw=g1.appendChild(el('div',{className:'customily-swatch swatch'}));
sw.appendChild(el('input',{attrs:{type:'radio',name:'properties[Choose your kid]'},value:'1'}));
const lbl=sw.appendChild(el('label'));
lbl.appendChild(el('img',{attrs:{alt:'1'},src:'https://cdn.example/1.jpg'}));

const g2=root.appendChild(el('div',{className:'customily_option'}));
g2.appendChild(el('div',{className:'option_name',textContent:'Number of kids'}));
const sel=g2.appendChild(el('select',{name:'properties[Number of kids]'}));
sel.appendChild(el('option',{value:'',textContent:'Choose an Option',disabled:true}));
sel.appendChild(el('option',{value:'2',textContent:'2'}));

const groups=profile.scanPage({document:documentMock,location:{hostname:'pawesomehouse.com'}});
const swatchGroup=groups.find(g=>g.name==='Choose your kid');
assert.ok(swatchGroup && swatchGroup.options.length===1);
assert.equal(swatchGroup.options[0].imageUrl,'https://cdn.example/1.jpg');
assert.equal(swatchGroup.options[0].capturedImage,'https://cdn.example/1.jpg');
assert.equal(swatchGroup.options[0].optionType,'image');
assert.equal(swatchGroup.options[0].sourceKind,'customily-swatch');

const selectGroup=groups.find(g=>g.name==='Number of kids');
assert.ok(selectGroup && selectGroup.options.length===1);
assert.equal(selectGroup.options[0].optionType,'text');
assert.equal(selectGroup.options[0].sourceKind,'customily-select');

console.log('pawesomehouse image swatch contract test passed.');

const html = fs.readFileSync('tests/fixtures/pawesomehouse/customily-real-snippet.html', 'utf8');
function buildFromFixture(markup) {
  const fixtureRoot = el('div'); documentMock._root = fixtureRoot;
  const groupRegex = /<div class=\"customily_option\">([\s\S]*?)<\/div>\s*<\/div>?/g;
  const groups = markup.split('<div class="customily_option">').slice(1).map(s => s.split('</div>\n  <div class="customily_option">')[0]);
  groups.forEach(function(groupChunk) {
    const g = fixtureRoot.appendChild(el('div', { className: 'customily_option' }));
    const nameMatch = groupChunk.match(/<div class=\"option_name\">([^<]+)<\/div>/);
    g.appendChild(el('div', { className: 'option_name', textContent: nameMatch ? nameMatch[1] : '' }));
    const swatches = groupChunk.split('<div class="customily-swatch swatch">').slice(1);
    swatches.forEach(function(swatchChunk) {
      const s = g.appendChild(el('div', { className: 'customily-swatch swatch' }));
      const input = swatchChunk.match(/name=\"([^\"]+)\"[^>]*value=\"([^\"]+)\"/);
      s.appendChild(el('input', { attrs: { type: 'radio', name: input ? input[1] : '' }, value: input ? input[2] : '' }));
      const l = s.appendChild(el('label'));
      const img = swatchChunk.match(/img src=\"([^\"]+)\" alt=\"([^\"]*)\"/);
      l.appendChild(el('img', { attrs: { alt: img ? img[2] : '' }, src: img ? img[1] : '' }));
    });
  });
}
buildFromFixture(html);
const fixtureGroups = profile.scanPage({ document: documentMock, location: { hostname: 'pawesomehouse.com' } });
const beard = fixtureGroups.find(g => g.name === "Man's Beard Color");
const black = fixtureGroups.find(g => g.name === 'black');
const body = fixtureGroups.find(g => g.name === "Man's Body Type");
assert.ok(beard && beard.options[0].imageUrl && beard.options[0].capturedImage);
assert.ok(black && black.options[0].imageUrl && black.options[0].capturedImage);
assert.ok(body && body.options[0].imageUrl && body.options[0].capturedImage);
assert.ok(!fixtureGroups.some(g => g.name === 'Color' || g.name === 'Style'));
console.log('pawesomehouse real fixture contract test passed.');
