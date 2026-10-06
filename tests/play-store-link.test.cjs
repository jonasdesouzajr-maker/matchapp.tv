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
 Object.defineProperty(w.navigator,'userAgent',{value:opts.ua||UA.android,configurable:true});
 Object.defineProperty(w.navigator,'maxTouchPoints',{value:opts.touch||0,configurable:true});
 Object.defineProperty(w.navigator,'getInstalledRelatedApps',{value:opts.related?()=>Promise.resolve(opts.related):undefined,configurable:true});
 w.matchMedia=()=>({matches:!!opts.standalone,addListener(){},removeListener(){}});
 w.matchAppInstallState={isInstalled:()=>!!opts.installed};
 w.MatchNotifications={pushLocal:item=>{items.push(item);return true}};
 if(Number.isFinite(opts.visits))w.localStorage.setItem('matchapp_install_prompt_visits_v2',String(opts.visits));
 const real=w.setTimeout.bind(w);
 w.setTimeout=(fn,ms)=>{if(ms===1100){timers.push(fn);return 991}return real(fn,ms)};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,items,timers};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function fire(ctx){if(ctx.timers.length)ctx.timers.shift()();await settle();await settle();}
test('Android browser prompting uses the notification bell and Google Play, never a floating/browser-install offer',async()=>{
 const ctx=mount({ua:UA.android,visits:0});await fire(ctx);
 assert.equal(ctx.items.length,1);assert.equal(ctx.items[0].kind,'install');assert.equal(ctx.items[0].action,'install');
 assert.equal(ctx.items[0].href,play);assert.match(ctx.items[0].title,/Google Play/i);assert.match(ctx.items[0].body,/instead of installing from the browser/i);
 assert.equal(ctx.w.localStorage.getItem('matchapp_install_prompt_visits_v2'),'1');
 assert.equal(ctx.w.document.getElementById('ma-install-offer'),null);
 ctx.dom.window.close();
});
test('install bell prompt appears only on the first and second eligible Home visits',async()=>{
 const second=mount({visits:1});await fire(second);assert.equal(second.items.length,1);assert.match(second.items[0].localKey,/-2$/);assert.equal(second.w.localStorage.getItem('matchapp_install_prompt_visits_v2'),'2');second.dom.window.close();
 const third=mount({visits:2});await fire(third);assert.equal(third.items.length,0);third.dom.window.close();
});
test('iPhone and Mac prompts use the real Apple home-screen/app flow through the bell',async()=>{
 const ios=mount({ua:UA.ios});await fire(ios);assert.equal(ios.items.length,1);assert.match(ios.items[0].title,/Home Screen/i);assert.equal(ios.items[0].action,'install');ios.dom.window.close();
 const mac=mount({ua:UA.mac});await fire(mac);assert.equal(mac.items.length,1);assert.match(mac.items[0].body,/Dock/i);assert.equal(mac.items[0].action,'install');mac.dom.window.close();
});
test('native/installed/Kids/associated installs are never prompted',async()=>{
 for(const opts of [{ua:UA.native},{standalone:true},{installed:true},{kids:true},{related:[{platform:'play',id:'com.jonas.papercup'}]}]){
   const ctx=mount(opts);await fire(ctx);assert.equal(ctx.items.length,0,JSON.stringify(opts));ctx.dom.window.close();
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
