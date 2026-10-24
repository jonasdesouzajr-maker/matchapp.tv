const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(r=>setTimeout(r,20));
const html=()=>read('kids/index.html').replace(/<script\b[\s\S]*?<\/script>/g,'');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('Kids browse pagination and exact-filter recovery retain all fourteen languages without spending or weakening filters',async()=>{
 const d=new JSDOM(html(),{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=d.window;let charges=0;
 try{
  w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.tmdbLookup=async()=>null;w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('kids/watch-links.json'))});
  w.KidsAccount={prepare:async()=>{},known:()=>new Set(),consume:async()=>{charges++;return{allowed:true,userId:null}},remember:async()=>{}};
  w.eval(read('kids/match-copy.js'));w.eval(read('kids/kids.js').replace('function tr(key) {','window.__qaUI=UI; function tr(key) {'));await tick();
  for(const language of languages){
   const picker=w.document.getElementById('kids-lang');picker.value=language;picker.dispatchEvent(new w.Event('change'));
   const age=w.document.getElementById('kids-age');age.value='all';age.dispatchEvent(new w.Event('change'));
   const more=w.document.querySelector('.kids-grid-more button');assert(more);assert.equal(more.textContent,w.__qaUI[language].moreTitles);
   if(language!=='en')assert.notEqual(more.textContent,'Show more titles');
   const before=w.document.querySelectorAll('#kids-grid .kids-card').length;more.click();assert.equal(w.document.querySelectorAll('#kids-grid .kids-card').length,before+24);
   w.document.getElementById('kids-match-mood').value='music';w.document.getElementById('kids-match-format').value='movie';
   w.document.getElementById('kids-match-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
   assert.equal(w.document.querySelectorAll('#kids-match-results .kids-card').length,0,'an impossible exact mood/format may not substitute another genre or format');
   assert.equal(w.document.getElementById('kids-match-status').textContent,w.__qaUI[language].refineMatch);
   if(language!=='en')assert.notEqual(w.document.getElementById('kids-match-status').textContent,w.__qaUI.en.refineMatch);
  }
  assert.equal(charges,0);assert.equal(w.localStorage.getItem('match_kids_dailyCount'),null);
 }finally{w.close()}
});
test('the Kids account tour covers every language, points at visible Luma and preserves completion and account data',async()=>{
 const d=new JSDOM(html(),{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=d.window,updates=[];
 try{
  const user={id:'synthetic-tour-user',user_metadata:{matchapp_first_time_onboarding_v1:true,preference:'keep'}};
  w.supabaseClient={auth:{getUser:async()=>({data:{user}}),updateUser:async({data})=>{updates.push(data);return{data:{user}}}}};
  w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};w.requestAnimationFrame=fn=>{fn();return 1};w.cancelAnimationFrame=()=>{};
  const originalTimeout=w.setTimeout.bind(w);w.setTimeout=(fn,delay)=>originalTimeout(fn,delay===1300?0:delay);
  const avatar=w.document.createElement('button');avatar.id='kids-lumi-assistant';avatar.getBoundingClientRect=()=>({left:200,top:600,width:70,height:70});w.document.body.append(avatar);
  w.document.querySelector('.kids-panel').hidden=true;w.localStorage.setItem('match_kids_dailyCount','2');
  w.eval(read('kids/onboarding-tour.js').replace('function t(){','window.__qaTourCopy=copy; function t(){'));
  w.dispatchEvent(new w.Event('load'));await tick();const card=w.document.querySelector('.kids-tour-card');assert(card&&!card.hidden);
  assert.deepEqual(Object.keys(w.__qaTourCopy).sort(),[...languages].sort());
  for(const language of languages){
   w.MATCH_LANG=language;w.document.documentElement.lang=language;w.document.getElementById('kids-lang').value=language;w.document.getElementById('kids-lang').dispatchEvent(new w.Event('change'));
   const copy=w.__qaTourCopy[language];assert.equal(copy.steps.length,5);
   for(let step=0;step<5;step++){
    assert.equal(card.querySelector('h2').textContent,copy.steps[step][0]);assert.equal(card.querySelector('[data-copy]').textContent,copy.steps[step][1]);
    assert.equal(card.querySelector('[data-count]').textContent,(step+1)+' / 5');assert.equal(card.querySelector('[data-skip]').textContent,copy.skip);
    if(step===1){assert(copy.steps[1][0].includes('Luma'));assert.equal(w.document.querySelector('.kids-tour-spotlight').style.width,'88px','the visible avatar owns the voice tour spotlight');}
    if(step<4)card.querySelector('[data-next]').click();
   }
   for(let step=0;step<4;step++)card.querySelector('[data-back]').click();
  }
  card.querySelector('[data-next]').click();w.MATCH_LANG='ar';w.document.getElementById('kids-lang').dispatchEvent(new w.Event('change'));
  assert.equal(card.querySelector('[data-count]').textContent,'2 / 5');assert.equal(card.querySelector('h2').textContent,w.__qaTourCopy.ar.steps[1][0]);
  card.querySelector('[data-skip]').click();await tick();assert(card.hidden);
  assert.equal(updates.length,1);assert.equal(updates[0].matchapp_onboarding_kids_v1,true);assert.equal(user.user_metadata.preference,'keep');
  assert.equal(w.localStorage.getItem('match_kids_dailyCount'),'2');assert.equal(w.localStorage.getItem('matchapp_onboarding_kids_v1_'+user.id),'1');
 }finally{w.close()}
});
