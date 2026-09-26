'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const source=read('browser-install-offer.js');
const play='https://play.google.com/store/apps/details?id=com.jonas.papercup';
const UA={
  chrome:'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/132.0 Mobile Safari/537.36',
  desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/132.0 Safari/537.36',
  ios:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
  native:'Mozilla/5.0 (Linux; Android 16) MatchAppTVAndroid/1.1.32 MatchAppAiAndroid/1.1.32'
};
function mount(opts={}){
  const page=opts.kids?'https://matchapp.tv/kids/':'https://matchapp.tv/';
  const dom=new JSDOM('<!doctype html><html lang="'+(opts.lang||'en')+'"><head></head><body class="page-home"><div id="chrome-install-card"></div><div id="ma-install-chip"></div><main></main></body></html>',{url:page,runScripts:'outside-only'});
  const w=dom.window;
  Object.defineProperty(w.navigator,'userAgent',{value:opts.ua||UA.desktop,configurable:true});
  Object.defineProperty(w.navigator,'getInstalledRelatedApps',{value:opts.related?()=>Promise.resolve(opts.related):undefined,configurable:true});
  w.matchMedia=()=>({matches:!!opts.standalone,addListener(){},removeListener(){}});
  w.matchAppInstallState={isInstalled:()=>!!opts.installed};
  if(opts.never)w.localStorage.setItem('matchapp_install_offer_never_v1','1');
  const timers=[],expiry=[];
  const realTimeout=w.setTimeout.bind(w);
  w.setTimeout=(fn,ms)=>{
    if(ms===1100){timers.push(fn);return 991;}
    if(ms===15000){expiry.push(fn);return 992;}
    return realTimeout(fn,ms);
  };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {dom,w,timers,expiry};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function open(ctx){
  if(ctx.timers.length)ctx.timers.shift()();
  await settle();
  return ctx.w.document.getElementById('ma-install-offer');
}
test('persistent top Install boxes are gone; optional offer links existing Play package',async()=>{
  const ctx=mount({ua:UA.chrome}),offer=await open(ctx);
  assert.ok(offer,'One Home opening gets a transient nonblocking offer');
  assert.equal(ctx.w.document.getElementById('ma-install-chip'),null);
  assert.equal(ctx.w.document.getElementById('chrome-install-card'),null);
  assert.equal(offer.getAttribute('role'),'region');
  assert.equal(offer.querySelector('.ma-offer-play').href,play);
  assert.equal(offer.querySelector('.ma-offer-play').getAttribute('target'),'_blank');
  assert.equal(offer.querySelector('.ma-offer-play').hidden,false);
  assert.match(read('index.html'),/browser-install-offer\.js\?v=20260926-visitoffer1/);
  assert.doesNotMatch(read('index.html'),/<aside id="chrome-install-card"/);
  assert.doesNotMatch(read('home-approved.js'),/mountInstall\(/);
  assert.match(read('home-approved.css'),/position:fixed;right:18px;bottom:18px/);
  assert.match(source,/intent:\/\/details\?id=com\.jonas\.papercup/);
  assert.equal(ctx.timers.length,0,'Never schedule more than once in this opening');
  ctx.dom.window.close();
});
test('Never show again persists across new page openings, unlike ordinary dismissal',async()=>{
  const first=mount(),offer=await open(first);
  offer.querySelector('.ma-offer-never').click();
  assert.equal(first.w.localStorage.getItem('matchapp_install_offer_never_v1'),'1');
  assert.equal(first.w.document.getElementById('ma-install-offer'),null);
  first.dom.window.close();
  const later=mount({never:true});
  assert.equal(await open(later),null,'A new release must not reset this opt-out');
  later.dom.window.close();
  const ordinary=mount(),visible=await open(ordinary);
  visible.querySelector('.ma-offer-close').click();
  assert.equal(ordinary.w.localStorage.getItem('matchapp_install_offer_never_v1'),null);
  ordinary.dom.window.close();
  const nextOpening=mount();
  assert.ok(await open(nextOpening),'Simple dismissal returns at the next opening');
  nextOpening.dom.window.close();
});
test('offer goes away automatically, and browser installation keeps the native tap',async()=>{
  const ctx=mount(),offer=await open(ctx);
  assert.equal(ctx.expiry.length,1);
  ctx.expiry[0]();
  assert.equal(ctx.w.document.getElementById('ma-install-offer'),null);
  assert.equal(ctx.w.localStorage.getItem('matchapp_install_offer_never_v1'),null);
  ctx.dom.window.close();
  const other=mount();
  const visible=await open(other);
  let taps=0;other.w.installMatchApp=()=>{taps++;};
  visible.querySelector('.ma-offer-browser').click();
  assert.equal(taps,1,'Must invoke real browser install path from the user's click');
  assert.equal(other.w.document.getElementById('ma-install-offer'),null);
  other.dom.window.close();
});
test('never prompt existing PWA, native Android app, Kids, or verified associated Play install',async()=>{
  for(const opts of [{standalone:true},{installed:true},{ua:UA.native},{kids:true},{related:[{platform:'play',id:'com.jonas.papercup'}]},{related:[{platform:'webapp',id:'https://matchapp.tv/'}]}]){
    const ctx=mount(opts);
    assert.equal(await open(ctx),null,'Excluded install visitor: '+JSON.stringify(opts));
    ctx.dom.window.close();
  }
  const live=mount();
  assert.ok(await open(live));
  live.w.dispatchEvent(new live.w.Event('appinstalled'));
  assert.equal(live.w.document.getElementById('ma-install-offer'),null);
  live.dom.window.close();
});
test('Portuguese copy and browser-only iOS installation are supported',async()=>{
  const ctx=mount({lang:'pt-BR',ua:UA.ios}),offer=await open(ctx);
  assert.match(offer.querySelector('.ma-offer-title').textContent,/MatchApp iA/);
  assert.match(offer.querySelector('.ma-offer-never').textContent,/Nunca mostrar/);
  assert.equal(offer.querySelector('.ma-offer-play').hidden,true,'Do not imply an iOS Play app exists');
  ctx.w.document.documentElement.lang='en';
  ctx.w.document.dispatchEvent(new ctx.w.Event('matchapp:langchange'));
  assert.equal(offer.querySelector('.ma-offer-never').textContent,'Never show this again');
  ctx.dom.window.close();
});
test('web manifests declare same existing adult Play package only for optional verified installation detection',()=>{
  for(const file of ['manifest.json','manifest-pt-br.json']){
    const manifest=JSON.parse(read(file));
    assert.ok(manifest.related_applications.some(a=>a.platform==='play'&&a.id==='com.jonas.papercup'&&a.url===play));
    assert.equal(manifest.prefer_related_applications,false,'Browser PWA must remain a valid choice');
  }
  assert.doesNotMatch(read('kids/index.html'),/browser-install-offer/);
});
