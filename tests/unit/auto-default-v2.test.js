const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function E(tag, o = {}) { const e = { tagName: tag.toUpperCase(), className: o.className || '', textContent: o.textContent || '', attrs: { ...(o.attrs || {}) }, children: [], parentElement: null, style: o.style || '', value: o.value || '', disabled: !!o.disabled, selected: !!o.selected, checked: !!o.checked, click(){ if (this.onClick) this.onClick(); }, appendChild(c){ c.parentElement=this; this.children.push(c); return c; }, getAttribute(n){ if (n==='style') return this.style; return this.attrs[n] ?? null; }, setAttribute(n,v){ if (n==='style') this.style=String(v); else this.attrs[n]=String(v); }, querySelector(s){ return this.querySelectorAll(s)[0]||null; }, closest(s){ let n=this; while(n){ if(match(n,s)) return n; n=n.parentElement; } return null; }, contains(n){ while(n){ if(n===this) return true; n=n.parentElement; } return false; }, querySelectorAll(sel){ const sels = sel.split(',').map(x=>x.trim()); const out=[]; const walk=n=>n.children.forEach(c=>{ if(sels.some(s=>match(c,s))) out.push(c); walk(c); }); walk(this); return out; }, getBoundingClientRect(){ return {x:0,y:0,width:24,height:24}; } }; if(o.id) e.attrs.id=o.id; if(o.name) e.attrs.name=o.name; if(o.src) { e.src=o.src; e.attrs.src=o.src; } if(o.currentSrc) e.currentSrc=o.currentSrc; return e; }
function hasClass(n,c){ return String(n.className||'').split(/\s+/).includes(c); }
function match(n,s){ if(!n) return false; if(s==='img') return n.tagName==='IMG'; if(s==='label') return n.tagName==='LABEL'; if(s==='select') return n.tagName==='SELECT'; if(s==='option') return n.tagName==='OPTION'; if(s==='#customily-options') return n.getAttribute('id')==='customily-options'; if(s==='.customily_option') return hasClass(n,'customily_option'); if(s==='.option_name') return hasClass(n,'option_name'); if(s==='.customily-swatch' || s==='.swatch') return hasClass(n,'customily-swatch')||hasClass(n,'swatch'); if(s==='.customily-swatch, .swatch, [class*="swatch"]') return hasClass(n,'customily-swatch')||hasClass(n,'swatch')||String(n.className).includes('swatch'); if(s==='input[type="file"]') return n.tagName==='INPUT'&&n.getAttribute('type')==='file'; if(s==='textarea') return n.tagName==='TEXTAREA'; if(s==='input[type="radio"],input[type="checkbox"]' || s==='input[type="radio"], input[type="checkbox"]') return n.tagName==='INPUT'&&(n.getAttribute('type')==='radio'||n.getAttribute('type')==='checkbox'); return false; }

function loadV2(doc){
  const windowMock = { STSClipartScanner: {}, getComputedStyle:(el)=>({ backgroundImage: String(el.style||'').includes('background-image') ? el.style.split(':')[1] : 'none', backgroundColor: String(el.style||'').includes('background-color') ? 'rgb(10, 20, 30)' : 'transparent', display: String(el.style||'').includes('display:none') ? 'none' : 'block', visibility: 'visible', opacity: '1' }) };
  const ctx = vm.createContext({ window: windowMock, document: doc, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync('content_modules/clipart/scanner-auto-default-v2.js','utf8'), ctx);
  return windowMock.STSClipartScanner.autoDefaultV2;
}

function buildFixture(){
  const doc = { documentElement: { setAttribute(){}, getAttribute(){ return ''; } }, querySelector(sel){ return sel==='#customily-options' ? this.root : null; } };
  doc.outsideVariant = E('div',{className:'customily_option'});
  doc.outsideVariant.appendChild(E('div',{className:'option_name',textContent:'Color'}));
  doc.outsideVariant.appendChild(E('div',{className:'customily-swatch swatch',textContent:'White'}));
  const root = E('div',{id:'customily-options'}); doc.root=root;
  function group(name){ const g=root.appendChild(E('div',{className:'customily_option'})); g.appendChild(E('div',{className:'option_name',textContent:name})); return g; }
  const gt=group('Choose The Title'); const sel=gt.appendChild(E('select',{name:'properties[Choose The Title]'})); sel.appendChild(E('option',{value:'',textContent:'Choose'})); sel.appendChild(E('option',{value:'Dad',textContent:'Dad'}));
  const kids=group('Number Of Kids'); kids.appendChild(E('div',{className:'customily-swatch swatch'})).appendChild(E('img',{src:'https://img/k1.png'}));
  const body=group("Man's Body Type");
  const bodyWrap = body.appendChild(E('div',{className:'swatch-container swatch'}));
  const b1 = bodyWrap.appendChild(E('div',{className:'customily-swatch swatch'}));
  b1.appendChild(E('input',{attrs:{type:'radio',value:'1'}}));
  b1.appendChild(E('label',{textContent:'YOUNG'}));
  const b2 = bodyWrap.appendChild(E('div',{className:'customily-swatch swatch'}));
  b2.appendChild(E('input',{attrs:{type:'radio',value:'2'}}));
  b2.appendChild(E('label',{textContent:'AGED'}));

  const bodyTile=group("Man's Body Type Tile"); bodyTile.appendChild(E('div',{className:'customily-swatch swatch',textContent:'YOUNG'}));
  const skin=group("Man's Skin Color"); const ssw = skin.appendChild(E('div',{className:'customily-swatch swatch'})); ssw.appendChild(E('input',{attrs:{type:'radio',value:'1'}})); ssw.appendChild(E('label',{style:'background-color: rgb(10, 20, 30)'}));
  const hair=group("Man's Hair Color"); const hairSw=hair.appendChild(E('div',{className:'customily-swatch swatch',textContent:'black'})); hairSw.appendChild(E('img',{src:'https://img/hair-black.png'}));
  const dep=group('black'); dep.style='display:none'; dep.appendChild(E('div',{className:'customily-swatch swatch'})).appendChild(E('img',{attrs:{srcset:'https://img/black-style1.png 1x, https://img/black-style2.png 2x'}}));
  hairSw.onClick=()=>{ dep.style=''; };
  const beard=group("Man's Beard Color"); beard.appendChild(E('div',{className:'customily-swatch swatch'})).appendChild(E('img',{src:'https://img/beard-black.png'}));
  const beardStyle=group('Beard Style'); beardStyle.style='display:none'; beardStyle.appendChild(E('div',{className:'customily-swatch swatch',style:"background-image:url('https://img/beard-style-bg.png')"}));
  const glasses=group("Man's Glasses");
  const gNo=glasses.appendChild(E('div',{className:'customily-swatch swatch'})); gNo.appendChild(E('input',{attrs:{type:'radio',value:'1'}})); gNo.appendChild(E('label',{textContent:'NO'}));
  const gIcon=glasses.appendChild(E('div',{className:'customily-swatch swatch'})); gIcon.appendChild(E('input',{attrs:{type:'radio',value:'2'}})); gIcon.appendChild(E('img',{src:'https://img/glasses.png'}));
  const upload=group('Upload Photo'); upload.appendChild(E('input',{attrs:{type:'file'}}));
  return doc;
}

(async function(){
  const doc = buildFixture();
  const v2 = loadV2(doc);
  const res = await v2.runAutoV2({ document: doc }, { rootSelector: '#customily-options', resolvedProfileId: 'pawesomehouse-customily-manual', maxClicks: 4 });
  const names = res.groups.map(g=>g.label);
  ['Choose The Title','Number Of Kids',"Man's Body Type","Man's Body Type Tile","Man's Skin Color","Man's Hair Color",'black',"Man's Beard Color",'Beard Style',"Man's Glasses"].forEach(n=>assert.ok(names.includes(n), n));
  assert.ok(!names.includes('Color'));
  assert.ok(!names.includes('Upload Photo'));
  const kids = res.groups.find(g=>g.label==='Number Of Kids');
  assert.equal(kids.options[0].optionType, 'image');
  assert.equal(kids.options[0].optionKind, 'icon');
  assert.equal(kids.options[0].originalOptionKind, 'icon');
  assert.equal(kids.options[0].displayKind, 'icon');
  assert.ok(kids.options[0].imageUrl);
  assert.equal(kids.options[0].capturedImage, null);
  const title = res.groups.find(g=>g.label==='Choose The Title');
  assert.equal(title.options[0].optionType, 'text');
  assert.equal(title.options[0].optionKind, 'text');
  const tile = res.groups.find(g=>g.label==="Man's Body Type Tile");
  assert.equal(tile.options[0].optionType, 'visual-text');
  assert.equal(tile.options[0].optionKind, 'icon');
  assert.equal(tile.options[0].visualKind, 'tile');
  assert.equal(tile.options[0].hasVisual, true);
  assert.equal(tile.options[0].needsCapture, true);
  assert.equal(tile.options[0].classificationReason, 'customily-swatch-text-tile');
  const body = res.groups.find(g=>g.label==="Man's Body Type");
  assert.equal(body.options.length, 2);
  const bodyTexts = body.options.map(o => o.textContent);
  assert.deepEqual(bodyTexts, ['YOUNG', 'AGED']);
  assert.ok(!bodyTexts.includes("Man's Body Type"));
  assert.ok(!bodyTexts.includes('1') && !bodyTexts.includes('2'));
  assert.ok(body.options.every(o => o.optionType === 'visual-text' && o.needsCapture === true));

  const skin = res.groups.find(g=>g.label==="Man's Skin Color");
  assert.equal(skin.options[0].optionType, 'color');
  assert.ok(skin.options[0].bgColor);

  const glasses = res.groups.find(g=>g.label==="Man's Glasses");
  assert.equal(glasses.options.find(o => o.textContent === 'NO').optionType, 'visual-text');
  assert.equal(glasses.options.find(o => o.textContent === 'NO').needsCapture, true);
  assert.equal(glasses.options.find(o => o.imageUrl).optionType, 'image');
  assert.ok(res.trace && res.trace.engine==='default-v2');
  assert.equal(res.trace.roadmapGoal, 'Auto returns canonical title groups with origin-aware icon/item/text options');
  assert.equal(res.trace.roadmapPhase, 'Phase 2 — Implementation phrases');
  assert.deepEqual(res.trace.roadmapImplementationPhrases, ['Find Title', 'Open Group', 'Collect Options', 'Preserve Origin Kind', 'Normalize Output', 'Record Result']);
  assert.equal(res.trace.targetGroups.find(g => g.groupName === 'Number Of Kids').options[0].optionKind, 'icon');
  assert.ok(Array.isArray(res.trace.clickedTriggers));
  console.log('auto default v2 test passed');
})();
