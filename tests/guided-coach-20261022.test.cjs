'use strict';
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.join(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('tour reveals a control covered by the actual fixed header',()=>{
 const source=read('guided-coach-20261022.js');
 const reveal=source.slice(source.indexOf('function reveal(){'),source.indexOf('\nfunction show('));
 let scrolled=0,rect={top:80,bottom:124};
 const context={target:{getBoundingClientRect:()=>rect,scrollIntoView:()=>scrolled++},document:{getElementById:()=>({getBoundingClientRect:()=>({bottom:96})})},innerHeight:800,reduced:()=>true};
 vm.runInNewContext(reveal+';reveal()',context);
 assert.equal(scrolled,1,'the header covers a control above its real bottom');
 rect={top:140,bottom:184};vm.runInNewContext('reveal()',context);
 assert.equal(scrolled,1,'a fully visible control stays still');
 rect={top:680,bottom:724};vm.runInNewContext('reveal()',context);
 assert.equal(scrolled,2,'bottom navigation clearance remains enforced');
});
test('guide locales cover all 14 site languages with every key',()=>{
 const ctx={window:{}};vm.runInNewContext(read('guided-coach-locales-20261022.js'),ctx);
 const L=ctx.window.MatchAppCoachLocales,K=ctx.window.MatchAppCoachLocaleKeys;
 assert.deepStrictEqual(Object.keys(L).sort(),['ar','de','en','es','fr','hi','id','it','ja','ko','pt-BR','ru','tr','zh'].sort());
 for(const [code,set] of Object.entries(L))for(const k of K)assert.ok(set[k]&&set[k].trim(),code+' '+k);
 for(const set of Object.values(L))assert.ok(!/MatchApp iA/.test(JSON.stringify(set)),'brand stays MatchApp Ai');
});
test('guide is presentation-only, Kids-excluded and tap-driven',()=>{
 const js=read('guided-coach-20261022.js');
 assert.match(js,/\^\\\/kids/);
 assert.match(js,/e\.isTrusted/);
 assert.ok(!js.replace(/\[onclick\*="triggerMatch\(false\)"\]/g,'').includes('triggerMatch('),'never calls matching');
 assert.strictEqual((js.match(/preventDefault\(\)/g)||[]).length,1,'only the How it works entry is intercepted');
 assert.ok(!/adsbygoogle|ca-pub-/.test(js+read('guided-coach-20261022.css')));
 assert.match(read('guided-coach-20261022.css'),/prefers-reduced-motion/);
});
test('guide loads on Home, Explore, Profile and How it works; never on Kids',()=>{
 for(const f of ['index.html','explore.html','profile/profile.html','how-it-works.html']){
  const h=read(f);assert.match(h,/guided-coach-locales-20261022\.js/,f);assert.match(h,/guided-coach-20261022\.js/,f);assert.match(h,/guided-coach-20261022\.css/,f);
 }
 assert.ok(!/guided-coach/.test(read('kids/index.html')));
 assert.match(read('how-it-works.html'),/data-coach-start/);
});
test('permission primer only requests features the app uses and skips native WebView',()=>{
 const js=read('guided-coach-20261022.js');
 for(const api of ['getUserMedia','getCurrentPosition','Notification.requestPermission'])assert.ok(js.includes(api),api);
 assert.ok(!/camera|clipboard|bluetooth|midi/i.test(js));
 assert.match(js,/if\(native\(\)\)return false/);
});
