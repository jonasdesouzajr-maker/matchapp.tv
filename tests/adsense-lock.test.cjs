const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');

const CLIENT='ca-pub-9541435081010948';
const SLOT='2595698117';

const EXPECTED_UNITS=[
  '<ins class="adsbygoogle" style="display:block; width:100%; min-height:600px;" data-ad-client="'+CLIENT+'" data-ad-slot="'+SLOT+'" data-ad-format="vertical" data-full-width-responsive="true"></ins>',
  '<ins class="adsbygoogle" style="display:block; width:100%; min-height:600px;" data-ad-client="'+CLIENT+'" data-ad-slot="'+SLOT+'" data-ad-format="vertical" data-full-width-responsive="true"></ins>',
  '<ins class="adsbygoogle" style="display:block; min-height: 90px;" data-ad-client="'+CLIENT+'" data-ad-slot="'+SLOT+'" data-ad-format="auto" data-full-width-responsive="true"></ins>',
  '<ins class="adsbygoogle" style="display:block; width:100%; min-height:120px;" data-ad-client="'+CLIENT+'" data-ad-slot="'+SLOT+'" data-ad-format="auto" data-full-width-responsive="true"></ins>',
  '<ins class="adsbygoogle" style="display:block; min-height: 90px;" data-ad-client="'+CLIENT+'" data-ad-slot="'+SLOT+'" data-ad-format="auto" data-full-width-responsive="true"></ins>'
];

const EXPECTED_ADS_INIT=`/* MatchApp AdSense manual units — one initializer, fixed slots, no layout polling. */
(function(){
'use strict';
const path=location.pathname||'/';
if(path!=='/'&&path!=='/index.html')return;
if(/MatchAppTVAndroid/i.test(navigator.userAgent||'')){
 window.MATCHAPP_IS_AD_FREE=true;try{localStorage.setItem('match_ad_free','true')}catch(_){}
 document.documentElement.classList.add('matchapp-android');return;
}
try{if(localStorage.getItem('match_ad_free')==='true')return}catch(_){}
if(window.MATCHAPP_IS_AD_FREE===true||window.matchAppAdsInitialized)return;
window.matchAppAdsInitialized=true;
function adFreeAccount(){
 try{return /"is_ad_free"\\s*:\\s*true/.test(localStorage.getItem('match_profile')||'')}catch(_){return false}
}
function hostFor(slot){return slot.closest('.sidebar-ad-left,.sidebar-ad-right,.ad-banner-container,.mobile-ad-bottom,.premium-ad-frame,.ma-inline-ad')||slot.parentElement}
function label(slot){
 const host=hostFor(slot);if(!host||host.querySelector('.ma-ad-label'))return;
 const tag=document.createElement('span');tag.className='ma-ad-label';tag.textContent='Advertisement';host.prepend(tag);
}
function monitor(slot){
 const host=hostFor(slot);if(!host||!window.MutationObserver)return;
 const paint=()=>{
   const status=(slot.getAttribute('data-ad-status')||'').toLowerCase();
   if(status==='unfilled')host.classList.add('is-ad-empty');
   else if(status==='filled')host.classList.remove('is-ad-empty');
 };
 new MutationObserver(paint).observe(slot,{attributes:true,attributeFilter:['data-ad-status']});paint();
}
function init(){
 if(adFreeAccount())return;
 const slots=[...document.querySelectorAll('ins.adsbygoogle')];
 const requested=new WeakSet();
 const request=slot=>{
   if(requested.has(slot)||slot.hasAttribute('data-adsbygoogle-status'))return;
   const r=slot.getBoundingClientRect(),style=getComputedStyle(slot);
   if(style.display==='none'||style.visibility==='hidden'||r.width<=0||!slot.getClientRects().length)return;
   requested.add(slot);label(slot);monitor(slot);
   try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}
   catch(err){console.warn('[MatchApp ads] slot request failed',err)}
 };
 if('IntersectionObserver' in window){
   const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)request(e.target)}),{rootMargin:'320px'});
   slots.forEach(slot=>{label(slot);monitor(slot);io.observe(slot)});
 }else slots.forEach(request);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
`;

test('AdSense publisher, engine and exact manual inventory are immutable',()=>{
  const html=read('index.html');
  const engine='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+CLIENT+'" crossorigin="anonymous"></script>';
  assert.equal((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=/g)||[]).length,1);
  assert.ok(html.includes(engine),'AdSense engine/client changed');
  const units=[...html.matchAll(/<ins class="adsbygoogle"[^>]*><\/ins>/g)].map(m=>m[0]);
  assert.deepEqual(units,EXPECTED_UNITS,'manual AdSense inventory/configuration drifted');
  assert.equal((html.match(new RegExp('data-ad-slot="'+SLOT+'"','g'))||[]).length,5);
});

test('desktop AdSense rails remain a locked matched pair before content',()=>{
  const html=read('index.html');
  assert.equal((html.match(/class="sidebar-ad-left premium-ad-frame"/g)||[]).length,1);
  assert.equal((html.match(/class="sidebar-ad-right premium-ad-frame"/g)||[]).length,1);
  const left=html.indexOf('class="sidebar-ad-left premium-ad-frame"');
  const right=html.indexOf('class="sidebar-ad-right premium-ad-frame"');
  const content=html.indexOf('<section class="container">',left);
  assert.ok(left>=0&&right>left&&content>right,'desktop rails moved/reordered');
});

test('Match Together full-width sponsored unit is immutable',()=>{
  const html=read('index.html');
  assert.equal((html.match(/class="ad-banner-container premium-ad-frame ma-together-ad"/g)||[]).length,1);
  assert.match(html,/MATCH TOGETHER SPONSORED UNIT — full-width responsive AdSense canvas[\s\S]*class="ad-banner-container premium-ad-frame ma-together-ad"[\s\S]*style="display:block; width:100%; min-height:120px;"[\s\S]*data-ad-format="auto"[\s\S]*data-full-width-responsive="true"[\s\S]*<!-- MATCH TOGETHER ENTRY -->/);
});

test('manual AdSense initializer is byte-for-byte locked',()=>{
  assert.equal(read('ads-init.js'),EXPECTED_ADS_INIT);
});

test('desktop/tablet/mobile AdSense responsive rules are locked',()=>{
  const css=read('matchapp-ia.css');
  assert.match(css,/Desktop web: keep real AdSense-ready rails visible on both sides[\s\S]*@media\(min-width:1180px\)[\s\S]*--ma-ad-rail:clamp\(132px,10\.8vw,160px\);[\s\S]*grid-template-columns:var\(--ma-ad-rail\) minmax\(0,var\(--ma-stage-width\)\) var\(--ma-ad-rail\)!important;/);
  assert.match(css,/\.sidebar-ad-left,\s*\n\s*html body\.page-home \.sidebar-ad-right\s*\{[\s\S]*display:flex!important;[\s\S]*position:sticky!important;[\s\S]*top:104px!important;[\s\S]*max-width:160px!important;[\s\S]*min-height:600px!important;/);
  assert.match(css,/\.sidebar-ad-left\{grid-column:1!important;justify-self:end!important\}/);
  assert.match(css,/\.sidebar-ad-right\{grid-column:3!important;justify-self:start!important\}/);
  assert.match(css,/@media\(min-width:1180px\)[\s\S]*\.ad-banner-container\.ma-inline-ad\s*\{[\s\S]*display:none!important;/);
  assert.match(css,/@media\(min-width:768px\) and \(max-width:1179px\)[\s\S]*\.sidebar-ad-left,\s*\n\s*html body\.page-home \.sidebar-ad-right\s*\{[\s\S]*display:none!important;[\s\S]*\.ad-banner-container\.ma-inline-ad\s*\{[\s\S]*width:min\(100%,760px\)!important;[\s\S]*min-height:104px!important;[\s\S]*ins\.adsbygoogle\s*\{[\s\S]*min-height:88px!important;/);
  assert.match(css,/@media\(max-width:767px\)[\s\S]*\.sidebar-ad-left,\s*\n\s*html body\.page-home \.sidebar-ad-right\s*\{[\s\S]*display:none!important;[\s\S]*\.ad-banner-container\.ma-inline-ad\s*\{[\s\S]*width:100%!important;[\s\S]*min-height:92px!important;[\s\S]*ins\.adsbygoogle\s*\{[\s\S]*min-height:78px!important;/);
});

test('Match Together desktop AdSense canvas dimensions are locked',()=>{
  const css=read('home-8k-layout.css');
  assert.match(css,/MATCH TOGETHER DESKTOP ADSENSE CANVAS[\s\S]*@media\(min-width:1180px\)[\s\S]*\.ad-banner-container\.ma-together-ad\{[\s\S]*align-items:stretch!important;[\s\S]*width:100%!important;[\s\S]*min-height:148px!important;[\s\S]*margin:12px 0 18px!important;[\s\S]*padding:8px 10px 10px!important;[\s\S]*overflow:visible!important;[\s\S]*\.ad-banner-container\.ma-together-ad ins\.adsbygoogle\{[\s\S]*width:100%!important;[\s\S]*min-height:120px!important;[\s\S]*height:auto!important;[\s\S]*align-self:stretch!important;/);
});

test('repository instructions keep Auto ads on and forbid automated AdSense rewrites',()=>{
  const agents=read('AGENTS.md');
  assert.match(agents,/ABSOLUTE ADSENSE IMMUTABILITY LOCK — OWNER-ONLY/);
  assert.match(agents,/Auto ads remain ON/);
  assert.match(agents,/Do not weaken the guard/);
  assert.match(agents,/Only the owner can unlock it/);
});
