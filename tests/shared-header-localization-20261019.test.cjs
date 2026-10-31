'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=process.env.MATCHAPP_TEST_SOURCE_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'matchapp-ia.js'),'utf8');
const donate=fs.readFileSync(path.join(root,'patches/donate-shortcut.js'),'utf8');
const locales=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
function readCopy(name){return Function('return '+source.match(new RegExp('const '+name+'=(\\{[\\s\\S]*?\\});\\n'))[1])();}
const copy=readCopy('PRICING_HEADER_COPY'),toasts=readCopy('PRICING_MENU_TOASTS');
const homeSource=fs.readFileSync(path.join(root,'ai-composer.js'),'utf8');
const authoredHeader=Function('return '+homeSource.match(/const headerCopy=(\{[\s\S]*?\});\nfunction paintHeader/)[1])();
const tick=()=>new Promise(resolve=>setTimeout(resolve,8));
function scene(route='/pricing/pricing.html'){
 const dom=new JSDOM('<html lang="en"><body><header class="app-header"><a class="header-brand-area" href="/">MatchApp Ai</a><nav><button id="nav-reg-btn">Sign in</button><button id="account-control">Account</button></nav></header><input id="unsaved" value="keep me"></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let network=0;w.fetch=()=>{network++;throw Error('network is forbidden')};w.matchMedia=()=>({matches:true});w.MATCH_LANG='en';const settings={autoRead:false,theme:'aurora'},changes=[],messages=[];
 w.MatchSettings={get:key=>settings[key],set:(key,value)=>{settings[key]=value;changes.push([key,value])}};w.showToast=message=>messages.push(message);
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,changes,messages,settings,network:()=>network};
}
test('Pricing menu labels, aria, icons, routes and listeners follow all 14 locales reversibly',async()=>{
 assert.deepEqual(copy,authoredHeader,'reuse all authored header wording exactly');
 const f=scene(),{w}=f;try{
  const account=w.document.getElementById('account-control'),input=w.document.getElementById('unsaved'),button=w.document.querySelector('.ma-menu-button');
  const items=[...w.document.querySelectorAll('.ma-menu>[role="menuitem"]')],icons=items.map(n=>n.firstChild.nodeValue),links=items.map(n=>n.getAttribute('href'));
  assert.equal(items.length,11);let clicks=0;button.addEventListener('click',()=>clicks++);
  for(const lang of [...locales,'en']){
   w.MATCH_LANG=lang;w.document.dispatchEvent(new w.Event('matchapp:langchange'));await tick();
   const row=copy[lang],expected=[...row.slice(3,9),'Jonas',...row.slice(9)];
   assert.equal(button.querySelector('span').textContent,row[2]);assert.equal(button.getAttribute('aria-label'),row[2]);assert.equal(button.title,row[2]);
   items.forEach((node,index)=>{assert.equal(node,w.document.querySelectorAll('.ma-menu>[role="menuitem"]')[index]);assert.equal(node.querySelector('[data-ma-menu-caption]').textContent,expected[index]);assert.equal(node.getAttribute('aria-label'),expected[index]);assert.equal(node.firstChild.nodeValue,icons[index]);assert.equal(node.getAttribute('href'),links[index]);assert.equal(node.querySelectorAll('[data-ma-menu-caption]').length,1)});
   button.click();assert.equal(button.getAttribute('aria-expanded'),'true');button.click();assert.equal(button.getAttribute('aria-expanded'),'false');
  }
  assert.equal(clicks,30);assert.equal(w.document.getElementById('account-control'),account);assert.equal(input.value,'keep me');assert.equal(f.network(),0);
 }finally{w.close()}
});
test('Pricing action toasts use complete locale copy with unchanged settings branches and theme identities',async()=>{
 for(const lang of locales){const f=scene(),{w}=f;try{
  w.MATCH_LANG=lang;w.document.dispatchEvent(new w.Event('matchapp:langchange'));await tick();const items=w.document.querySelectorAll('.ma-menu>[role="menuitem"]');
  items[1].click();assert.equal(f.messages.pop(),toasts[lang][0]);
  items[2].click();assert.equal(f.messages.pop(),toasts[lang][1]);items[2].click();assert.equal(f.messages.pop(),toasts[lang][2]);
  items[3].click();assert.equal(f.messages.pop(),copy[lang][6]+': cinema');assert.equal(w.document.documentElement.dataset.theme,'cinema');
  items[4].click();assert.equal(f.messages.pop(),toasts[lang][3]);
  assert.deepEqual(f.changes,[['autoRead',true],['autoRead',false],['theme','cinema']]);assert.equal(f.network(),0);
 }finally{w.close()}}
});
test('Donate follows delayed html locale initialization and every language switch without replacing the action',async()=>{
 const w=new JSDOM('<html lang="en"><body><header class="app-header"><nav></nav></header></body></html>',{url:'https://matchapp.tv/sponsor/',runScripts:'outside-only'}).window;
 try{let calls=0;w.fetch=()=>{calls++;throw Error('network is forbidden')};w.eval(donate);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));const action=w.document.getElementById('ma-donate-shortcut'),icon=action.querySelector('svg'),href=action.getAttribute('href');
  for(const lang of locales){w.document.documentElement.lang=lang;await tick();const label=action.querySelector('span').textContent;assert.ok(label);if(lang==='en')assert.equal(label,'Help me grow the business');assert.equal(action.title,label);assert.equal(action.querySelector('span').style.display,'none');assert.equal(action.getAttribute('aria-label'),label);assert.equal(w.document.getElementById('ma-donate-shortcut'),action);assert.equal(action.querySelector('svg'),icon);assert.equal(action.getAttribute('href'),href)}
  assert.equal(calls,0);assert.equal(w.document.querySelectorAll('#ma-donate-shortcut').length,1);
 }finally{w.close()}
});
test('Home retains its existing menu labels and toast presentation ownership',async()=>{
 const f=scene('/'),{w}=f;try{w.MATCH_LANG='pt-BR';w.document.dispatchEvent(new w.Event('matchapp:langchange'));await tick();assert.equal(w.document.querySelector('.ma-menu-button span').textContent,'Settings');assert.equal(w.document.querySelectorAll('[data-ma-menu-caption]').length,0);w.document.querySelectorAll('.ma-menu>[role="menuitem"]')[2].click();assert.equal(f.messages.pop(),'Sound on');assert.equal(f.network(),0)}finally{w.close()}
});
test('Pricing dropdown fits offscreen geometry and releases its stacking position when closed',async()=>{
 const f=scene(),{w}=f;try{
  w.innerWidth=320;w.innerHeight=710;const menu=w.document.querySelector('.ma-menu'),button=w.document.querySelector('.ma-menu-button'),wrap=button.parentElement;
  menu.getBoundingClientRect=()=>({left:-121.1875,right:154,top:285,bottom:765,width:275.1875,height:480});
  button.click();await tick();const [dx,dy]=menu.style.translate.split(' ').map(parseFloat);
  assert.ok(-121.1875+dx>=16);assert.ok(154+dx<=304);assert.equal(dy,0);assert.equal(menu.style.maxHeight,'409px');assert.equal(menu.style.overflowY,'auto');assert.equal(wrap.style.zIndex,'50');
  w.innerWidth=390;w.innerHeight=844;menu.getBoundingClientRect=()=>({left:200,right:475,top:290,bottom:770,width:275,height:480});w.dispatchEvent(new w.Event('resize'));
  const resizeX=parseFloat(menu.style.translate);assert.ok(475+resizeX<=374);assert.equal(menu.style.maxHeight,'538px');
  w.document.body.click();await tick();assert.equal(menu.hidden,true);assert.equal(wrap.style.zIndex,'auto');assert.equal(f.network(),0);
 }finally{w.close()}
});