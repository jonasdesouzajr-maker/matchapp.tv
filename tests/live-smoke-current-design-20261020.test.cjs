'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','tools/live-production-smoke.cjs'),'utf8');
function focused(markup){const d=new JSDOM(markup,{url:'https://matchapp.tv/'});d.window.Element.prototype.getClientRects=function(){return this.hidden?[]:[{}]};const start=source.indexOf('const focused=await page.evaluate(()=>({'),end=source.indexOf('\n    record(',start);assert(start>=0&&end>start);const expression=source.slice(start,end).replace('const focused=await page.evaluate(','').replace(/;\s*$/,'').slice(0,-1);return{dom:d,state:vm.runInNewContext('('+expression+')()',{document:d.window.document})};}
test('current smoke requires the visible exact Explore route and keeps hidden Home families excluded',()=>{const markup='<div id="trending-rail"></div><nav class="ma-cinema-dock"><a data-cinema-route="explore" href="/explore.html">Explore</a></nav>';for(const [label,html,pass]of[['approved dock',markup,true],['wrong target',markup.replace('/explore.html','/discover.html'),false],['hidden route',markup.replace('<a ','<a hidden '),false],['visible duplicate family',markup+'<section id="ebook-matcher-root"></section>',false]]){const f=focused(html);try{assert.equal(f.state.titles&&f.state.explore&&f.state.hidden,pass,label)}finally{f.dom.window.close()}}});
test('smoke brand whitelist accepts exact approved local artwork and rejects lookalikes or unmarked replacement',()=>{const expression=source.match(/logo:(\(\(\)=>\{[\s\S]*?\}\)\(\)),\n\s*gradient:/)?.[1];assert.ok(expression,'actual smoke icon check');for(const [src,marked,pass]of[['/assets/brand/matchapp-icon-approved.png?v=1',false,true],['/assets/brand/matchapp-official-icon-512.webp?v=1',true,true],['/assets/brand/matchapp-official-icon-512.webp',false,false],['https://evil.example/assets/brand/matchapp-icon-approved.png',false,false],['/assets/brand/matchapp-icon-approved.png.fake',true,false]]){const d=new JSDOM('<div class="brand"><img class="ma-brand-orb"></div>',{url:'https://matchapp.tv/'}),icon=d.window.document.querySelector('img');icon.src=src;if(marked)icon.setAttribute('data-matchapp-canonical-logo','1');try{assert.equal(vm.runInNewContext(expression,{brand:d.window.document.querySelector('.brand'),URL,location:d.window.location}),pass,src)}finally{d.window.close()}}});
test('the updated smoke retains every live request and locked inventory guarantee',()=>{for(const text of ["name:'desktop'","name:'tablet'","name:'phone'","name:'small-phone'",'sponsor.sameLockedContainer&&sponsor.adjacent','sponsor.manualCount===5','LIVE normal movie matching and source poster','LIVE Bookworms real e-book matching and verified original cover','LIVE verified audiobook matching','LIVE magazine matching and authentic publisher cover route','LIVE Ask AI movie and audiobook intents','identity.gradient&&identity.textInside','poster.fit!==\'fill\''])assert.ok(source.includes(text),text);assert.match(source,/if\(!await matchAction\.isVisible\(\)\)/);assert.match(source,/destinations\.primary\.length===6&&destinations\.secondary\.length===6/);assert.doesNotMatch(source,/window\.triggerMatch\s*=|window\.checkDailyLimit\s*=/)});

test('every actual Match smoke branch clicks the visible action and opens only a reachable legacy fold',async()=>{
 for(const [file,name]of [['tools/live-production-smoke.cjs','matchAction'],['tools/live-production-deep-matching.cjs','matchAction'],['tools/mobile-runtime-smoke.cjs','btn']]){
  const content=fs.readFileSync(path.join(__dirname,'..',file),'utf8'),start=content.indexOf('const '+name+'=page.locator(\'button[onclick="triggerMatch(false)"]\')'),click=content.indexOf('await '+name+'.click(',start),end=content.indexOf(';',click)+1;assert.ok(start>=0&&click>start&&end>click,file+' actual click branch');const body=content.slice(start,end);
  for(const state of [{button:true,fold:false,expanded:'false',expected:['match']},{button:false,fold:true,expanded:'false',expected:['fold','match']},{button:false,fold:false,expanded:'false',reject:true}]){
   const events=[];let buttonVisible=state.button;
   const button={isVisible:async()=>buttonVisible,scrollIntoViewIfNeeded:async()=>{},click:async()=>{assert.ok(buttonVisible,'do not bypass an inaccessible Match action');events.push('match')}};
   const fold={isVisible:async()=>state.fold,getAttribute:async()=>state.expanded,click:async()=>{assert.ok(state.fold,'never click the CSS-hidden legacy fold');events.push('fold');buttonVisible=true}};
   const page={locator:selector=>selector.startsWith('button[')?button:selector.includes('data-fold-key="concierge"')?fold:assert.fail('Unexpected selector '+selector)};
   const run=()=>vm.runInNewContext('(async()=>{'+body+'})()',{page,assert});if(state.reject){await assert.rejects(run(),/actual Match action or its original fold must be reachable/);assert.deepEqual(events,[])}else{await run();assert.deepEqual(events,state.expected,file)}
  }
 }
});

test('the actual History smoke opens the current controls menu and closes it after the original action',async()=>{
 const start=source.indexOf("const visibleHistory=page.locator('.jonas-top-history');"),end=source.indexOf('\n    await page.waitForFunction',start);
 assert.ok(start>0&&end>start);const body=source.slice(start,end);
 for(const state of[{tools:true,open:false},{tools:true,open:true},{tools:false}]){
  let open=!!state.open;const calls=[];
  const history={waitFor:async()=>assert.ok(state.tools&&open,'An unreachable history action must fail'),click:async()=>{assert.ok(open);calls.push('history')}};
  const summary={click:async()=>{open=!open;calls.push(open?'open':'close')}};
  const tools={count:async()=>state.tools?1:0,evaluate:async()=>open,locator:selector=>{assert.equal(selector,':scope > summary');return summary},filter:()=>tools};
  const page={locator:selector=>selector==='.jonas-top-history'?history:selector==='.ma-reference-header-tools'?tools:selector==='#ma-reference-header .ma-reference-header-tools .jonas-top-history'?{waitFor:async()=>assert.ok(state.tools,'An unreachable history action must fail')}:assert.fail(selector)};
  const run=()=>vm.runInNewContext('(async()=>{'+body+'})()',{page,assert});
  if(!state.tools)await assert.rejects(run(),/unreachable history/);else{await run();assert.deepEqual(calls,state.open?['history','close']:['open','history','close']);assert.equal(open,false)}
 }
});
