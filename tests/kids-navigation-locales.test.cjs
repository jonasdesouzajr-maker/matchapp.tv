const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(r=>setTimeout(r,20));
async function boot(){
 const d=new JSDOM(read('kids/index.html').replace(/<script\b[\s\S]*?<\/script>/g,''),{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=d.window;
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.tmdbLookup=async()=>null;w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('kids/watch-links.json'))});
 const spoken=[];w.speechSynthesis={getVoices:()=>[],cancel(){},speak:u=>spoken.push(u.text)};w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 w.KidsAccount={prepare:async()=>{},known:()=>new Set(),status:async()=>({remaining:3,limit:3})};
 for(const file of ['kids/match-copy.js','kids/kids.js','kids/immersive.js','kids/lumi-assistant.js'])w.eval(read(file));
 await tick();return {d,w,spoken};
}
test('every Kids language translates navigation, onboarding, install and stop controls without starting speech',async()=>{
 const {d,w,spoken}=await boot();
 try{
  const picker=w.document.getElementById('kids-lang'),keys=['navHome','navFind','navClassic','stepMood','stepAge','stepPlay','installApp','stopVoice'];
  const text=key=>w.document.querySelector('[data-k="'+key+'"]').textContent;
  const english=Object.fromEntries(keys.map(key=>[key,text(key)]));let languages=0;
  for(const option of picker.options){
   picker.value=option.value;picker.dispatchEvent(new w.Event('change'));await tick();languages++;
   assert.equal(w.document.documentElement.lang,option.value);assert.equal(w.localStorage.getItem('match_lang'),option.value);
   assert.equal(w.document.documentElement.dir,option.value==='ar'?'rtl':'ltr');
   for(const key of keys){assert(text(key).trim()&&text(key)!==key,option.value+' has authored '+key);if(option.value!=='en')assert.notEqual(text(key),english[key],option.value+' must not fall back to English '+key);}
   const assistant=w.document.getElementById('kids-lumi-assistant');
   assert.equal(assistant.getAttribute('aria-label'),w.MatchAppLumi.t('assistantLabel'));
   assert.equal(w.document.querySelector('.kids-mascot').getAttribute('aria-label'),assistant.getAttribute('aria-label'));
   assert.equal(spoken.length,0,'a language switch must not start narration');
  }
  assert.equal(languages,14);assert.equal(w.document.querySelector('[data-k="navHome"]').closest('a').getAttribute('href'),'/kids/');
  assert.equal(w.document.querySelector('[data-k="navClassic"]').closest('a').getAttribute('href'),'/kids/nostalgia/');
 }finally{d.window.close()}
});
test('Kids effects retain their selected state and receive localized names after language changes',async()=>{
 const {d,w}=await boot();
 try{
  const toggle=w.document.getElementById('kids-fx-toggle'),picker=w.document.getElementById('kids-lang');
  toggle.click();assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(w.localStorage.getItem('match_kids_fx_enabled'),'false');
  for(const code of ['pt-BR','ar','ja','en']){
   picker.value=code;picker.dispatchEvent(new w.Event('change'));await tick();
   assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(toggle.getAttribute('aria-label'),w.MatchAppLumi.t('effectsOff'));
   assert.equal(toggle.lastElementChild.textContent,w.MatchAppLumi.t('effectsMuted'));
  }
  toggle.click();assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(toggle.getAttribute('aria-label'),w.MatchAppLumi.t('effectsOn'));
 }finally{d.window.close()}
});
test('the real update runtime preserves Kids label bindings, icons and click handlers in install and update states',async()=>{
 const {d,w}=await boot();
 try{
  let installed=false,clicks=0;w.matchMedia=()=>({matches:installed});
  const button=w.document.querySelector('.kids-install'),icon=button.querySelector('.kids-pill-ico'),label=button.querySelector('[data-k]');
  button.removeAttribute('onclick');button.addEventListener('click',()=>clicks++);
  w.eval(read('app-updates.js'));await tick();
  const picker=w.document.getElementById('kids-lang');
  for(const state of [false,true,false]){
   installed=state;w.syncMatchAppUpdateButtons();
   assert.equal(button.querySelector('[data-k]'),label);assert.equal(button.querySelector('.kids-pill-ico'),icon);
   assert.equal(label.dataset.k,state?'updateApp':'installApp');
   for(const code of ['ar','pt-BR','ja','en']){
    picker.value=code;picker.dispatchEvent(new w.Event('change'));await tick();
    assert.notEqual(label.textContent,label.dataset.k);assert(label.textContent.trim());
    if(code!=='en')assert(!/Install|Update/.test(label.textContent),'the selected language survives asynchronous update labeling');
    assert.equal(label.dataset.k,state?'updateApp':'installApp');
   }
  }
  button.click();assert.equal(clicks,1);
 }finally{d.window.close()}
});
