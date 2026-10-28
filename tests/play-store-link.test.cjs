'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const source=read('browser-install-offer.js');
const notifications=read('notifications.js');
const settings=read('settings.js');
const install=read('install.js');
const play='https://play.google.com/store/apps/details?id=com.jonas.papercup';
const UA={
 android:'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/132.0 Mobile Safari/537.36',
 ios:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
 mac:'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
 native:'Mozilla/5.0 (Linux; Android 16) MatchAppTVAndroid/1.1.32 MatchAppAiAndroid/1.1.32'
};
function mount(opts={}){
 const dom=new JSDOM('<!doctype html><html lang="'+(opts.lang||'en')+'"><head></head><body class="page-home"><main></main></body></html>',{url:opts.kids?'https://matchapp.tv/kids/':'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window,items=[],timers=[];
 let now=1000000,id=0;w.Date.now=()=>now;
 const jobs=new Map();
 w.setTimeout=(fn,ms)=>{const key=++id;jobs.set(key,{fn,due:now+ms});return key};
 w.clearTimeout=key=>jobs.delete(key);
 Object.defineProperty(w.document,'visibilityState',{value:'visible',configurable:true});
 if(opts.geometry){
  const g=opts.geometry;w.innerWidth=670;w.innerHeight=430;
  w.document.body.insertAdjacentHTML('afterbegin','<header class="app-header"></header><nav class="ma-cinema-dock"></nav>');
  const natural=el=>el.querySelector('p')?.hidden?128:223;
  Object.defineProperties(w.HTMLElement.prototype,{
   scrollHeight:{get(){return this.id==='ma-install-offer'?natural(this):0;}},
   clientHeight:{get(){return this.id==='ma-install-offer'?Math.min(natural(this),parseFloat(this.style.maxHeight)||natural(this)):0;}}
  });
  w.HTMLElement.prototype.getBoundingClientRect=function(){
   const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
   if(this.matches('.app-header'))return rect(0,0,670,g.header);
   if(this.matches('.ma-cinema-dock'))return rect(0,g.dock,670,430-g.dock);
   if(this.id==='ma-install-offer')return rect(147,430-(parseFloat(this.style.bottom)||78)-this.clientHeight,376,this.clientHeight);
   const box=this.closest('#ma-install-offer');if(!box)return rect(0,0,0,0);
   const r=box.getBoundingClientRect();
   if(this.tagName==='BUTTON')return rect(r.right-52,r.top+8,44,44);
   if(this.tagName==='A')return rect(r.left+12,r.bottom-56,352,44);
   return rect(0,0,0,0);
  };
  w.document.elementFromPoint=(x,y)=>g.occluded?w.document.querySelector('header'):[...w.document.querySelectorAll('#ma-install-offer button,#ma-install-offer a')].find(el=>{const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})||w.document.body;
 }
 if(opts.session)w.sessionStorage.setItem('matchapp_play_bubble_session_v1',JSON.stringify(opts.session));
 Object.defineProperty(w.navigator,'userAgent',{value:opts.ua||UA.android,configurable:true});
 Object.defineProperty(w.navigator,'maxTouchPoints',{value:opts.touch||0,configurable:true});
 Object.defineProperty(w.navigator,'getInstalledRelatedApps',{value:opts.related?()=>Promise.resolve(opts.related):undefined,configurable:true});
 w.matchMedia=()=>({matches:!!opts.standalone,addListener(){},removeListener(){}});
 w.matchAppInstallState={isInstalled:()=>!!opts.installed};
 w.MatchNotifications={pushLocal:item=>{items.push(item);return true}};
 if(Number.isFinite(opts.visits))w.localStorage.setItem('matchapp_install_prompt_visits_v2',String(opts.visits));

 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,items,timers,async advance(ms){now+=ms;for(let rounds=0;rounds<8;rounds++){const ready=[...jobs].filter(([,job])=>job.due<=now);if(!ready.length)break;for(const [key,job] of ready){jobs.delete(key);job.fn();}await settle();await settle();}}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function fire(ctx){await ctx.advance(1100);}
const bubble=ctx=>ctx.w.document.getElementById('ma-install-offer');
test('Android opening shows one accessible Play bubble without stealing focus or adding bell spam',async()=>{
 const ctx=mount({visits:99});await fire(ctx);
 assert.equal(ctx.items.length,0);assert.ok(bubble(ctx));assert.equal(bubble(ctx).querySelector('a').href,play);
 assert.equal(bubble(ctx).querySelector('a').target,'_blank');assert.equal(bubble(ctx).querySelector('button').getAttribute('aria-label'),'Close');
 assert.equal(ctx.w.document.activeElement,ctx.w.document.body);
 bubble(ctx).querySelector('button').click();assert.equal(bubble(ctx),null);
 await ctx.advance(299999);assert.equal(bubble(ctx),null);await ctx.advance(1);assert.ok(bubble(ctx));
 bubble(ctx).querySelector('button').click();await ctx.advance(1199999);assert.equal(bubble(ctx),null);await ctx.advance(1);assert.ok(bubble(ctx));
 bubble(ctx).querySelector('button').click();await ctx.advance(9999999);assert.equal(bubble(ctx),null);ctx.dom.window.close();
});
test('new sessions restart the invitation while navigation retains dismissal and store clicks stop reminders',async()=>{
 const ctx=mount({session:{count:1,next:1300000,stopped:false}});await fire(ctx);assert.equal(bubble(ctx),null);
 await ctx.advance(300000);assert.ok(bubble(ctx));
 bubble(ctx).querySelector('a').addEventListener('click',e=>e.preventDefault());bubble(ctx).querySelector('a').click();
 assert.equal(bubble(ctx),null);assert.equal(JSON.parse(ctx.w.sessionStorage.getItem('matchapp_play_bubble_session_v1')).stopped,true);
 await ctx.advance(9999999);assert.equal(bubble(ctx),null);ctx.dom.window.close();
 const fresh=mount();await fire(fresh);assert.ok(bubble(fresh));fresh.dom.window.close();
});
test('bubble defers to forms, dialogs and background tabs and exits when installed',async()=>{
 const ctx=mount();const input=ctx.w.document.createElement('input');ctx.w.document.body.append(input);input.focus();await fire(ctx);assert.equal(bubble(ctx),null);
 input.blur();await ctx.advance(15000);assert.ok(bubble(ctx));
 const dialog=ctx.w.document.createElement('dialog');dialog.setAttribute('open','');ctx.w.document.body.append(dialog);await settle();assert.equal(bubble(ctx),null);
 await ctx.advance(300000);assert.equal(bubble(ctx),null);dialog.remove();await ctx.advance(15000);assert.ok(bubble(ctx));
 ctx.w.dispatchEvent(new ctx.w.Event('appinstalled'));assert.equal(bubble(ctx),null);await ctx.advance(9999999);assert.equal(bubble(ctx),null);ctx.dom.window.close();
 const hidden=mount();Object.defineProperty(hidden.w.document,'visibilityState',{value:'hidden',configurable:true});await fire(hidden);assert.equal(bubble(hidden),null);hidden.dom.window.close();
});
test('short landscape defers the bubble until portrait so the fixed header cannot cover it',async()=>{
 const ctx=mount();ctx.w.innerHeight=320;await fire(ctx);assert.equal(bubble(ctx),null);
 ctx.w.innerHeight=844;ctx.w.dispatchEvent(new ctx.w.Event('resize'));await ctx.advance(0);assert.ok(bubble(ctx));
 ctx.w.innerHeight=320;ctx.w.dispatchEvent(new ctx.w.Event('resize'));assert.equal(bubble(ctx),null);
 ctx.dom.window.close();
});
test('mid-height landscape uses compact copy and keeps both controls between the real header and dock',async()=>{
 const ctx=mount({geometry:{header:162,dock:352}});await fire(ctx);const box=bubble(ctx);assert.ok(box);
 assert.equal(box.querySelector('p').hidden,true);const r=box.getBoundingClientRect();
 assert(r.top>=170);assert(r.bottom<=344);assert.equal(box.style.bottom,'86px');
 box.querySelector('button').click();assert.equal(bubble(ctx),null);ctx.dom.window.close();
});
test('insufficient measured space defers without consuming an impression and resizing restores full copy',async()=>{
 const geometry={header:270,dock:352},ctx=mount({geometry});await fire(ctx);assert.equal(bubble(ctx),null);
 assert.equal(ctx.w.sessionStorage.getItem('matchapp_play_bubble_session_v1'),null);
 geometry.header=100;ctx.w.dispatchEvent(new ctx.w.Event('resize'));await ctx.advance(0);
 assert.ok(bubble(ctx));assert.equal(bubble(ctx).querySelector('p').hidden,false);ctx.dom.window.close();
});
test('an occluded close or store target never produces a visible invitation or consumes a reminder',async()=>{
 const ctx=mount({geometry:{header:100,dock:352,occluded:true}});await fire(ctx);assert.equal(bubble(ctx),null);
 assert.equal(ctx.w.sessionStorage.getItem('matchapp_play_bubble_session_v1'),null);ctx.dom.window.close();
});
for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'])test('Android bubble keeps authored '+lang+' copy and repaints in place',async()=>{
 const ctx=mount({lang});await fire(ctx);const box=bubble(ctx);assert.ok(box);assert.equal(box.lang,lang);assert.equal(box.dir,lang==='ar'?'rtl':'ltr');
 if(lang!=='en')assert.notEqual(box.querySelector('button').getAttribute('aria-label'),'Close');
 ctx.w.MATCH_LANG='pt-BR';ctx.w.document.dispatchEvent(new ctx.w.Event('matchapp:langchange'));assert.equal(bubble(ctx),box);assert.equal(box.querySelector('button').getAttribute('aria-label'),'Fechar');assert.match(box.textContent,/Baixe/);ctx.dom.window.close();
});
test('iPhone and Mac prompts use the real Apple home-screen/app flow through the bell',async()=>{
 const ios=mount({ua:UA.ios});await fire(ios);assert.equal(ios.items.length,1);assert.match(ios.items[0].title,/Home Screen/i);assert.equal(ios.items[0].action,'install');ios.dom.window.close();
 const mac=mount({ua:UA.mac});await fire(mac);assert.equal(mac.items.length,1);assert.match(mac.items[0].body,/Dock/i);assert.equal(mac.items[0].action,'install');mac.dom.window.close();
});
test('native/installed/Kids/associated installs are never prompted',async()=>{
 for(const opts of [{ua:UA.native},{standalone:true},{installed:true},{kids:true},{related:[{platform:'play',id:'com.jonas.papercup'}]}]){
   const ctx=mount(opts);await fire(ctx);assert.equal(ctx.items.length,0,JSON.stringify(opts));assert.equal(bubble(ctx),null);ctx.dom.window.close();
 }
});
test('notification center exposes local install notifications, branded arrival feedback and bulk delete',()=>{
 assert.match(notifications,/function pushLocal\(item\)/);
 assert.match(notifications,/item\?\.action==='install'/);
 assert.match(notifications,/window\.MatchNotifications=\{[^}]*pushLocal/);
 assert.match(notifications,/data-notify-delete-all/);
 assert.match(notifications,/function deleteAll\(\)/);
 assert.match(notifications,/notifications_delete_all/);
 assert.match(notifications,/function playNotificationSound\(\)/);
 assert.match(notifications,/AudioContext/);
 assert.match(notifications,/notification-arrived/);
 const css=read('notifications.css');
 assert.match(css,/has-notification svg\{animation:matchBellRing 3\.2s ease-in-out infinite/);
 assert.match(css,/notification-arrived svg/);
 assert.match(css,/data-notify-delete-all/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const sw=read('sw.js');
 assert.match(sw,/renotify: true/);
 assert.match(sw,/silent: false/);
 assert.match(sw,/vibrate: \[70, 45, 120\]/);
});
test('Android install action itself still routes to the one official Play package',()=>{
 assert.match(install,/MATCHAPP_PLAY_PACKAGE = 'com\.jonas\.papercup'/);
 assert.match(install,/Browser version on Android always leads to the official Google Play app/);
 assert.match(install,/platform\.isAndroid && !platform\.isNativeShell/);
 assert.match(install,/openMatchAppPlayStore\(\)/);
 assert.doesNotMatch(install,/play\.google\.com\/store\/(?:search|apps\?q=)/);
});
test('Profile Settings contains a premium device-aware install destination',()=>{
 assert.ok(settings.includes(play));
 assert.match(settings,/matchapp-app-install-setting/);
 assert.match(settings,/Download now on Google Play/);
 assert.match(settings,/Add to Home Screen/);
 assert.match(settings,/Add to Dock \/ Apps/);
});
test('web manifests keep the verified adult Play package for related-install detection',()=>{
 for(const file of ['manifest.json','manifest-pt-br.json']){
   const manifest=JSON.parse(read(file));
   assert.ok(manifest.related_applications.some(a=>a.platform==='play'&&a.id==='com.jonas.papercup'&&a.url===play));
 }
 assert.doesNotMatch(read('kids/index.html'),/browser-install-offer/);
});

test('bulk notification deletion migration is account-scoped and authenticated-only',()=>{
 const sql=read('supabase/migrations/20261006153308_notification_delete_all.sql');
 assert.match(sql,/where user_id=uid/);
 assert.match(sql,/coalesce\(is_anonymous,false\)=false/);
 assert.match(sql,/revoke all on function public\.notifications_delete_all\(\) from public, anon/);
 assert.match(sql,/grant execute on function public\.notifications_delete_all\(\) to authenticated/);
});

test('bulk-delete RPC keeps the public surface invoker-only',()=>{
 const sql=read('supabase/migrations/20261006153745_harden_notification_delete_all.sql');
 assert.match(sql,/create or replace function match_private\.notifications_delete_all_impl\(\)/);
 assert.match(sql,/where user_id=uid/);
 assert.match(sql,/create or replace function public\.notifications_delete_all\(\)[\s\S]*security invoker/);
 assert.match(sql,/revoke all on function public\.notifications_delete_all\(\) from public, anon/);
});

for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'])test('desktop Play invitation respects '+lang,async()=>{
 const ctx=mount({ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/142.0',lang});await fire(ctx);
 assert.equal(ctx.items.length,1);assert.equal(ctx.items[0].href,play);assert.equal(ctx.items[0].action,'open');assert.equal(ctx.items[0].payload.platform,'desktop');assert.match(ctx.items[0].body,/Android/);
 assert.equal(ctx.w.document.querySelector('main').children.length,0);
 if(lang!=='en')assert.notEqual(ctx.items[0].body,'Use MatchApp Ai on your Android phone or tablet. Open the official Google Play listing to download the app.');
 ctx.dom.window.close();
});
test('desktop Play invitation respects the two-visit limit and installed state',async()=>{
 for(const opts of [{visits:2},{standalone:true},{installed:true},{kids:true}]){const ctx=mount({ua:'Mozilla/5.0 (X11; Linux x86_64) Firefox/142.0',...opts});await fire(ctx);assert.equal(ctx.items.length,0);ctx.dom.window.close();}
});
