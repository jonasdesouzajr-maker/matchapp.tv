'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const variants=['cinema','ocean','sunrise','arcade'];
const properties=['bg','surface','panel','text','muted','accent','second','ink','border'].map(name=>'--theme-'+name);
const runtime=read('patches/reference-system.js'),tokens=read('patches/reference-palette-tokens.css');
function declarations(body){return Object.fromEntries([...body.matchAll(/(--[a-z-]+)\s*:\s*([^;{}]+);?/g)].map(match=>[match[1],match[2].trim()]));}
function scene(route='/explore.html',stored,preview=null){
 const dom=new JSDOM('<!doctype html><html class="ma-reference" lang="en"><head></head><body><h1>Original heading</h1><p>Original copy</p><input value="Typed value"><button id="original">Original action</button></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 if(stored!==undefined)w.localStorage.setItem('match_settings',stored);
 if(preview){w.document.documentElement.dataset.theme=preview;w.MatchThemes={current:()=>({preview})};}
 const writes=[],network=[],events={document:[],window:[]};
 const set=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(key,value){writes.push({key,value});return set.call(this,key,value);};
 const documentAdd=w.document.addEventListener.bind(w.document),windowAdd=w.addEventListener.bind(w);
 w.document.addEventListener=function(type,...args){events.document.push(type);return documentAdd(type,...args);};
 w.addEventListener=function(type,...args){events.window.push(type);return windowAdd(type,...args);};
 w.fetch=url=>{network.push(String(url));throw Error('Palette restoration cannot request account or other data');};
 let authReads=0;Object.defineProperty(w,'supabaseClient',{configurable:true,get(){authReads++;throw Error('Palette restoration cannot access authentication');}});
 return{dom,w,writes,network,events,authReads:()=>authReads,start:()=>w.eval(runtime),close:()=>w.close()};
}
test('the four reference variants contain exactly the canonical color values and no layout, font or motion styles',()=>{
 const canonical=read('themes.css'),clean=tokens.replace(/\/\*[\s\S]*?\*\//g,'').trim();
 const rules=[...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)];assert.equal(rules.length,4);
 assert.equal(rules.map(match=>match[0]).join('').replace(/\s/g,''),clean.replace(/\s/g,''),'the file contains only these four scoped palette rules');
 rules.forEach((rule,index)=>{
  const id=variants[index];assert.equal(rule[1].trim(),'html.ma-reference[data-theme="'+id+'"]');
  const authored=canonical.match(new RegExp('\\[data-theme="'+id+'"\\]\\s*\\{([^}]+)\\}'));assert.ok(authored);
  const expected=declarations(authored[1]),actual=declarations(rule[2]);assert.deepEqual(Object.keys(actual).sort(),properties.slice().sort());
  for(const property of properties){assert.equal(actual[property],expected[property],id+' exact '+property);assert.match(actual[property],/^#[a-f0-9]{3,8}$/i);}
 });
 assert.doesNotMatch(clean,/:root|aurora|@import|@keyframes|--theme-(?:font|heading|radius|motion)\s*:/);
});
test('the shared stylesheet imports palette tokens once while retaining the new default plum palette',()=>{
 const css=read('patches/reference-system.css');assert.equal((css.match(/@import url\('\/patches\/reference-palette-tokens\.css\?v=20261020-palettes1'\)/g)||[]).length,1);
 assert.match(css,/--cinema-bg:#0b050f/);assert.match(css,/--cinema-gold:#e4ba67/);
 assert.doesNotMatch(tokens,/data-theme=["']aurora["']/);assert.doesNotMatch(css,/@import[^;]*\/(?:themes\.css|settings\.js)/);
});
test('persisted explicit palettes restore across actual shared route families without writes, auth or extra preference engines',()=>{
 for(const route of ['/explore.html','/news/','/profile/profile.html','/guides/worldwide-entertainment-discovery/','/en/us/watch/movie/dune-part-two-693134/'])for(const id of variants){
  const stored=JSON.stringify({theme:id,fontScale:1.2,autoRead:false}),f=scene(route,stored);
  try{
   const button=f.w.document.getElementById('original'),input=f.w.document.querySelector('input'),text=f.w.document.body.textContent;let calls=0;button.onclick=()=>calls++;
   f.start();assert.equal(f.w.document.documentElement.dataset.theme,id,route);assert.equal(f.w.localStorage.getItem('match_settings'),stored);
   assert.equal(f.w.document.getElementById('original'),button);assert.equal(f.w.document.querySelector('input'),input);assert.equal(input.value,'Typed value');assert.ok(f.w.document.body.textContent.includes(text));button.click();assert.equal(calls,1);
   assert.deepEqual(f.writes,[]);assert.deepEqual(f.network,[]);assert.equal(f.authReads(),0);assert.equal(f.w.MatchSettings,undefined);assert.equal(f.w.MatchThemes,undefined);
   assert.equal(f.w.document.querySelector('script[src^="/themes.js"],script[src^="/settings.js"],script[src^="/app.js"],link[href^="/themes.css"]'),null);
   f.start();assert.equal(f.events.document.filter(type=>type==='matchapp:settingschanged').length,1);assert.equal(f.events.window.filter(type=>type==='storage').length,1);
  }finally{f.close();}
 }
});
test('missing, malformed and unsupported stored choices preserve the new default without repairing or writing storage',()=>{
 for(const stored of [undefined,'{broken','null','[]','{}','{"theme":"unknown"}','{"theme":true}','{"theme":"aurora"}']){
  const f=scene('/explore.html',stored);try{f.start();assert.equal(f.w.document.documentElement.dataset.theme,'aurora');assert.equal(f.w.localStorage.getItem('match_settings'),stored===undefined?null:stored);assert.deepEqual(f.writes,[]);assert.equal(f.authReads(),0);}finally{f.close();}
 }
 const blocked=scene();try{Object.defineProperty(blocked.w,'localStorage',{get(){throw Error('Storage blocked');}});blocked.start();assert.equal(blocked.w.document.documentElement.dataset.theme,'aurora');assert.equal(blocked.authReads(),0);}finally{blocked.close();}
});
test('saved changes follow existing settings and cross-tab events while active previews retain control',()=>{
 const f=scene('/profile/profile.html','{"theme":"ocean"}','sunrise');
 try{
  f.start();assert.equal(f.w.document.documentElement.dataset.theme,'sunrise');
  f.w.localStorage.setItem('match_settings','{"theme":"arcade"}');f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:settingschanged'));f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:'match_settings'}));assert.equal(f.w.document.documentElement.dataset.theme,'sunrise','saved state cannot overwrite a live preview');
  f.w.MatchThemes.current=()=>({preview:null});f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:settingschanged'));assert.equal(f.w.document.documentElement.dataset.theme,'arcade');
  f.w.localStorage.setItem('match_settings','{"theme":"cinema"}');f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:'unrelated'}));assert.equal(f.w.document.documentElement.dataset.theme,'arcade');
  f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:'match_settings'}));assert.equal(f.w.document.documentElement.dataset.theme,'cinema');
  f.w.localStorage.removeItem('match_settings');f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:null}));assert.equal(f.w.document.documentElement.dataset.theme,'aurora');assert.equal(f.authReads(),0);assert.deepEqual(f.network,[]);
 }finally{f.close();}
});
test('isolated Kids, private voice and authentication return routes never acquire the palette bootstrap',()=>{
 for(const route of ['/kids/','/private-voice/','/oauth/','/callback.html','/confirm.html']){
  const f=scene(route,'{"theme":"sunrise"}');try{f.start();assert.equal(f.w.document.documentElement.dataset.theme,undefined);assert.deepEqual(f.writes,[]);assert.equal(f.w.MatchCinemaShell,undefined);}finally{f.close();}
 }
});
