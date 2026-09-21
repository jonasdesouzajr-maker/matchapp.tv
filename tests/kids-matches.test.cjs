const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),tick=()=>new Promise(r=>setTimeout(r,20));
async function boot(auth,quota={allowed:true,remaining:2},url='https://matchapp.tv/kids/'){
 const d=new JSDOM(read('kids/index.html').replace(/<script\b[\s\S]*?<\/script>/g,''),{url,runScripts:'outside-only'}),w=d.window,calls=[];
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.tmdbLookup=async()=>null;w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('kids/watch-links.json'))});
 w.supabaseClient={auth:{getSession:auth||asyncSession},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='consume_match'?quota:{history:[],keys:[]}};}};
 w.eval(read('matching-policy.js'));w.eval(read('kids/account.js'));w.eval(read('kids/kids.js'));await tick();return {d,w,calls};
}
const asyncSession=async()=>({data:{session:{user:{id:'kid-account',user_metadata:{}}}}});
test('Kids poster opens a metered full match; double taps, viewing, sharing and history do not charge twice',async()=>{
 const {w,d,calls}=await boot();w.localStorage.setItem('match_lang','pt-BR');const lang=w.document.getElementById('kids-lang');lang.value='pt-BR';lang.dispatchEvent(new w.Event('change'));
 const poster=w.document.querySelector('#kids-grid [data-title="Bluey"] .kids-card-poster');assert.equal(poster.tagName,'BUTTON');poster.click();poster.click();await tick();
 const consumes=()=>calls.filter(c=>c.name==='consume_match');assert.equal(consumes().length,1);assert.equal(consumes()[0].args,undefined);assert(w.document.getElementById('kids-watch-dialog').open);assert.equal(w.document.getElementById('kids-watch-name').textContent,'Bluey');assert.match(w.document.getElementById('kids-match-detail').textContent,/A história/);
 const link=w.document.getElementById('kids-watch-continue');assert.match(link.href,/justwatch/);link.addEventListener('click',e=>e.preventDefault());link.click();
 let share;w.navigator.share=async data=>share=data;w.document.getElementById('kids-share').click();await tick();assert.equal(share.url,'https://matchapp.tv/kids/?title=bluey');assert(!share.text.includes('kid-account'));
 w.document.querySelector('[data-match-choice=save]').click();await tick();const remembered=calls.filter(c=>c.name==='portfolio_action'&&c.args.p_action==='remember').flatMap(c=>c.args.p_payload?.items||[]);assert(remembered.some(item=>item.action==='shown'),'displaying a Kids result must sync permanent shown history');assert(remembered.some(item=>item.action==='save'),'Watch Later must sync its distinct save action');assert.equal(w.matchPolicy.history()[0].action,'save');assert(w.matchPolicy.known().has(w.matchPolicy.key('Bluey')));assert.equal(consumes().length,1);d.window.close();
});
test('restoring a session never spends guest quota, and an age change before restoration cancels the match',async()=>{
 let release;const {w,d,calls}=await boot(()=>new Promise(r=>release=r));w.document.querySelector('#kids-grid [data-title="Bluey"] .kids-card-poster').click();await tick();assert.equal(calls.filter(c=>c.name==='consume_match').length,0);const age=w.document.getElementById('kids-age');age.value='3-5';age.dispatchEvent(new w.Event('change'));release(await asyncSession());await tick();assert.equal(calls.filter(c=>c.name==='consume_match').length,0);assert.equal(w.localStorage.getItem('match_dailyCount'),null);assert(!w.document.getElementById('kids-watch-dialog').open);d.window.close();
});
test('quota denial and connection errors leave the Kids result closed without a guest fallback',async()=>{
 for(const failed of [false,true]){const {w,d,calls}=await boot(failed?async()=>({error:{message:'offline'}}):undefined,{allowed:false});w.document.querySelector('#kids-grid [data-title-watch=bluey]').click();await tick();assert(!w.document.getElementById('kids-watch-dialog').open);assert(w.document.getElementById('kids-match-status').textContent);assert.equal(w.localStorage.getItem('match_dailyCount'),null);assert.equal(calls.filter(c=>c.name==='consume_match').length,failed?0:1);d.window.close();}
});
test('guest Kids matches use the same three-per-day counter and shared links never spend on arrival',async()=>{
 const {w,d,calls}=await boot(async()=>({data:{session:null}}),undefined,'https://matchapp.tv/kids/?title=bluey');assert.equal(w.localStorage.getItem('match_dailyCount'),null);
 w.localStorage.setItem('match_lastDate',new Date().toLocaleDateString());w.localStorage.setItem('match_dailyCount','2');const title=w.document.querySelector('#kids-grid [data-title-watch=bluey]');title.click();await tick();assert.equal(w.localStorage.getItem('match_dailyCount'),'3');w.document.getElementById('kids-watch-dialog').close();title.click();await tick();assert(!w.document.getElementById('kids-watch-dialog').open);assert.equal(w.localStorage.getItem('match_dailyCount'),'3');assert.equal(calls.length,0);d.window.close();
});

test('result dialog opens before decorative celebration and cleanup never traps the UI',async()=>{
 const html=read('kids/index.html').replace(/<script\b[\s\S]*?<\/script>/g,'');
 const d=new JSDOM(html,{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=d.window;
 w.matchMedia=q=>({matches:q.includes('max-width')});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.tmdbLookup=async()=>null;w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('kids/watch-links.json'))});
 w.KidsAccount={prepare:async()=>{},consume:async()=>({allowed:true,userId:null}),remember:async()=>{}};
 w.matchPolicy={known:()=>new Set(),key:t=>t.toLowerCase()};
 w.eval(read('kids/kids.js'));await tick();
 const poster=w.document.querySelector('#kids-grid [data-title="Bluey"] .kids-card-poster');poster.click();await tick();
 const dialog=w.document.getElementById('kids-watch-dialog'),submit=w.document.getElementById('kids-match-submit');
 assert.equal(dialog.open,true,'usable result dialog must open without waiting on animation');
 assert.equal(submit.disabled,false,'match input must be released immediately');
 assert(w.document.querySelectorAll('.kids-celebrate').length<=1,'celebration must be single-owner');
 dialog.close();
 assert.equal(w.document.querySelectorAll('.kids-celebrate').length,0,'closing result must synchronously clear decorative overlay');
 assert.equal(w.document.body.style.overflow,'','celebration must not lock body scrolling');
 d.window.close();
});
