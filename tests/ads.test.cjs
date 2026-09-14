const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'ads-init.js'),'utf8');
test('hidden ads wait for layout and a later visible unit is targeted only once',()=>{
 const d=new JSDOM('<ins class="adsbygoogle" id="hidden"></ins><ins class="adsbygoogle" id="visible"></ins><ins class="adsbygoogle" data-adsbygoogle-status="done"></ins>',{runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 const hidden=w.document.getElementById('hidden'),visible=w.document.getElementById('visible');let width=0,resize;const calls=[];
 for(const slot of w.document.querySelectorAll('ins')){slot.getBoundingClientRect=()=>({width:slot===hidden?width:300,top:0,bottom:90});slot.getClientRects=()=>slot.getBoundingClientRect().width?[{}]:[];}
 w.ResizeObserver=class{constructor(fn){resize=fn;}observe(){}};w.IntersectionObserver=class{observe(){}};
 w.adsbygoogle={push({element}){assert(element.getBoundingClientRect().width>0);calls.push(element);}};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.deepEqual(calls,[visible]);width=300;resize([{target:hidden},{target:visible}]);assert.deepEqual(calls,[visible,hidden]);
 w.eval(source);resize([{target:hidden},{target:visible}]);assert.equal(calls.length,2);w.close();
});
test('manual ad pages have one guarded initializer and no duplicate auto-ad command',()=>{
 for(const p of ['index.html','discover.html','events-archive.html','together.html','profile/profile.html','oauth/consent.html']){
  const s=fs.readFileSync(path.join(root,p),'utf8');assert(!s.includes('enable_page_level_ads'),p);assert(!/adsbygoogle[^<]*\.push\(\{\}\)/.test(s),p);assert.equal((s.match(/src="\/ads-init\.js/g)||[]).length,1,p);
 }
 assert(!fs.readFileSync(path.join(root,'pricing/pricing.html'),'utf8').includes('enable_page_level_ads'));
});
