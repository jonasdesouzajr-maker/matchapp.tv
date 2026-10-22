'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function fixture(t){
  const dom=new JSDOM(read('profile/profile.html'),{url:'https://matchapp.tv/profile/profile.html?tab=history',runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const w=dom.window,frames=[],calls=[];
  Object.defineProperty(w.document,'readyState',{value:'complete',configurable:true});
  w.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  w.matchPolicy={history:()=>[]};
  w.MatchActivity={all:()=>[]};
  w.MatchAppPortfolioPosters={apply(){},bind(){}};
  w.MatchAppActivatedScroll={toStart(panel){calls.push({panel,visible:panel.style.display==='block'});return true;}};
  w.eval(read('profile.js').match(/window\.switchPortfolioTab = function\(tab\) \{[\s\S]*?\n\};/)[0]);
  // Execute the actual inline target handlers; outside-only prevents unrelated page scripts from booting.
  w.document.querySelectorAll('.portfolio-tabs [onclick]').forEach(button=>{
    button.onclick=new w.Function(button.getAttribute('onclick'));
  });
  w.eval(read('portfolio-history.js'));
  const flush=()=>{while(frames.length)frames.shift()();};
  return {w,calls,frames,flush};
}

test('real Profile tab clicks reveal their selected panel before asking the shared helper to align its start',t=>{
  const {w,calls,frames,flush}=fixture(t);
  const originalUrl=w.location.href;
  const draft=w.document.createElement('input');draft.value='Keep my unsaved draft';w.document.body.appendChild(draft);draft.focus();
  for(const name of ['watchlater','seenit','audio','history']){
    const button=w.document.getElementById('tab-'+name),panel=w.document.getElementById('panel-'+name);
    button.querySelector('span').click();
    assert.equal(button.classList.contains('active'),true,name);
    assert.equal(panel.style.display,'block',name);
    assert.equal(frames.length,1,'one deferred scroll per explicit activation');
    assert.equal(calls.length,0,'the target handler finishes before scrolling');
    flush();
    assert.equal(calls.length,1,name);assert.equal(calls[0].panel,panel);assert.equal(calls[0].visible,true);
    assert.equal(w.document.activeElement,draft,'the scroll listener must not focus a field or heading');
    assert.equal(draft.value,'Keep my unsaved draft');assert.equal(w.location.href,originalUrl);
    calls.length=0;
  }
});

test('hydration, programmatic tab switches, history changes and local refresh never force a portfolio scroll',t=>{
  const {w,calls,frames,flush}=fixture(t);
  assert.equal(frames.length,0,'initial history selection does not scroll');
  w.switchPortfolioTab('audio');
  w.document.dispatchEvent(new w.CustomEvent('matchapp:historychange'));
  assert.equal(w.MatchAppPortfolioHistory.refresh(),true);
  flush();
  assert.equal(calls.length,0);
  assert.equal(w.document.getElementById('panel-audio').style.display,'block');
  assert.equal(w.document.getElementById('tab-audio').classList.contains('active'),true);
});

test('delegation includes the real Not For Me tab inserted after History boot',t=>{
  const {w,calls,flush}=fixture(t);
  const audit=read('final-audit.js');
  const install=audit.match(/  function installNotForMeTab\(\)\{[\s\S]*?\n  \}/)[0];
  const select=audit.match(/  function switchAuditTab\(name\)\{[\s\S]*?\n  \}/)[0];
  w.eval("const $=selector=>document.querySelector(selector);function icon(){return '<svg><path></path></svg>';}function bindPortfolioTab(){}function renderNotForMe(){};"+install+select+'\ninstallNotForMeTab();');
  w.document.querySelector('#tab-notforme svg path').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(w.document.getElementById('panel-notforme').style.display,'block');
  assert.equal(calls.length,0);
  flush();
  assert.equal(calls.length,1);assert.equal(calls[0].panel.id,'panel-notforme');assert.equal(calls[0].visible,true);
});

test('rapid selection scrolls only the current connected visible panel and duplicate loading does not bind twice',t=>{
  const {w,calls,flush}=fixture(t);
  w.eval(read('portfolio-history.js'));
  w.document.getElementById('tab-watchlater').click();
  w.document.getElementById('tab-seenit').click();
  flush();
  assert.deepEqual(calls.map(call=>call.panel.id),['panel-seenit']);
  calls.length=0;
  w.document.getElementById('tab-audio').click();w.document.getElementById('panel-audio').remove();flush();
  assert.equal(calls.length,0);
  w.document.getElementById('tab-history').click();w.document.getElementById('panel-history').hidden=true;flush();
  assert.equal(calls.length,0);
});

test('Profile activation uses the real measured-header helper and respects the disabled auto-scroll preference',t=>{
  const {w,flush}=fixture(t),scrolls=[];
  let y=320;
  const header=w.document.createElement('header');header.id='ma-reference-header';header.style.position='fixed';w.document.body.appendChild(header);
  const panel=w.document.getElementById('panel-watchlater');
  header.getBoundingClientRect=()=>({top:0,bottom:140,height:140,width:390,left:0,right:390});
  panel.getBoundingClientRect=()=>({top:1600-y,bottom:3600-y,height:2000,width:390,left:0,right:390});
  w.Element.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
  Object.defineProperties(w,{scrollY:{get:()=>y},scrollX:{get:()=>0},innerHeight:{value:700}});
  Object.defineProperty(w.document.documentElement,'scrollHeight',{value:6000});
  w.scrollTo=options=>{scrolls.push(options);y=options.top;};
  w.matchMedia=()=>({matches:true});
  delete w.MatchAppActivatedScroll;w.eval(read('patches/activated-scroll.js'));
  w.MatchAppScrollGate={canAutoScroll:()=>false};
  w.document.getElementById('tab-watchlater').click();flush();assert.equal(scrolls.length,0);
  w.MatchAppScrollGate.canAutoScroll=()=>true;
  w.document.getElementById('tab-watchlater').click();flush();
  assert.equal(scrolls.length,1);assert.equal(panel.getBoundingClientRect().top,148);assert.equal(scrolls[0].behavior,'instant');
});
