const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const localeSource=read('pricing-locale.js');
const LANGUAGES=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const TITLES={en:'In-App Purchases','pt-BR':'Compras no app',es:'Compras en la app',fr:'Achats dans l’application',de:'In-App-Käufe',it:'Acquisti nell’app',tr:'Uygulama içi satın alımlar',ru:'Покупки в приложении',ar:'المشتريات داخل التطبيق',hi:'ऐप में खरीदारी',id:'Pembelian dalam aplikasi',ja:'アプリ内購入',ko:'앱 내 구매',zh:'应用内购买'};
const BUY_KIDS={en:'Buy for Kids','pt-BR':'Comprar para Kids',es:'Comprar para Kids',fr:'Acheter pour Kids',de:'Für Kids kaufen',it:'Acquista per Kids',tr:'Kids için satın al',ru:'Купить для Kids',ar:'الشراء لـKids',hi:'Kids के लिए खरीदें',id:'Beli untuk Kids',ja:'Kids用に購入',ko:'Kids용 구매',zh:'为Kids购买'};
const PACKS='[data-match-pack],[data-credit-pack],[data-kids-match-pack],[data-kids-credit-pack]';
const OWNED_COPY=[
 ['#purchase-hub-title',0],['#purchase-hub-title + p',1],['#purchase-tab-matches',3],['#purchase-tab-credits',4],
 ['#match-packs-section h3',5],['#match-packs-section > h3 + p',6],['#match-packs-section .purchase-pack small',7],['[data-match-pack]',8],
 ['#ask-ai-credits h3',9],['#ask-ai-credits > h3 + p',10],['#ask-ai-credits .purchase-pack small',11],['[data-credit-pack]',12],
 ['#purchase-tab-kids',15],['#kids-packs-section h3',16],['#kids-packs-section > h3 + p',17],
 ['#kids-packs-section .kids-purchase-group:first-child h4',18],['#kids-packs-section .kids-purchase-group:first-child .kids-purchase-note',19],['#kids-packs-section .kids-purchase-group:first-child .purchase-pack small',20],
 ['#kids-packs-section .kids-purchase-group:last-child h4',21],['#kids-packs-section .kids-purchase-group:last-child .kids-purchase-note',22],['#kids-packs-section .kids-purchase-group:last-child .purchase-pack small',23],
 ['[data-kids-match-pack],[data-kids-credit-pack]',24]
];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settle=async()=>{await tick();await tick();await tick();};

function authoredCopy(){
 const start=localeSource.indexOf('const labels=');
 const end=localeSource.indexOf('\n function render()',start);
 assert.ok(start>=0&&end>start,'the presentation catalog is available without executing billing');
 return vm.runInNewContext(localeSource.slice(start,end)+';labels');
}

async function actualHub({native=false}={}){
 const w=new JSDOM(read('pricing/pricing.html'),{url:'https://matchapp.tv/pricing/pricing.html?lang=fr',runScripts:'outside-only',pretendToBeVisual:true}).window;
 Object.defineProperty(w.navigator,'languages',{configurable:true,value:['ar-SA']});
 Object.defineProperty(w.navigator,'language',{configurable:true,value:'ar-SA'});
 w.MATCHAPP_ANDROID=native;
 w.console.log=()=>{};
 w.matchMedia=()=>({matches:true});
 w.Element.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('match_lang','pt-BR');
 w.localStorage.setItem('preserved-wallet','{"matches":10,"asks":10}');
 w.sessionStorage.setItem('preserved-checkout','existing-receipt');
 const calls=[];
 const blocked=name=>(..._args)=>{calls.push(name);throw Error('presentation must not call '+name);};
 w.fetch=blocked('fetch');
 w.XMLHttpRequest=blocked('XMLHttpRequest');
 w.open=blocked('window.open');
 w.supabaseClient={auth:{getSession:async()=>({data:{session:null}})},rpc:blocked('rpc'),from:blocked('from'),functions:{invoke:blocked('invoke')}};
 w.eval(read('i18n.js'));w.eval(read('pricing.js'));w.eval(localeSource);
 await settle();
 const hub=w.document.getElementById('purchase-hub');
 assert.ok(hub,'the actual pricing.js rendered the hub');
 assert.equal(hub.querySelectorAll(PACKS).length,13);
 assert.equal(hub.querySelectorAll('[role="tab"]').length,3);
 assert.equal(w.MATCH_LANG,'pt-BR','saved selection wins over the French query and Arabic device locale');
 assert.equal(hub.querySelector('#purchase-hub-title').textContent,TITLES['pt-BR']);
 return {w,hub,calls};
}

function assertStaticCopy(hub,copy,lang,{native=false}={}){
 assert.equal(hub.querySelector('#purchase-hub-title').textContent,TITLES[lang]);
 assert.equal(hub.querySelector('.purchase-tabs').getAttribute('aria-label'),copy[2]);
 for(const [selector,index] of OWNED_COPY){
  const nodes=Array.from(hub.querySelectorAll(selector));
  assert.ok(nodes.length,lang+' '+selector+' is an actual rendered owner');
  if(native&&selector==='[data-credit-pack]')continue;
  for(const node of nodes)assert.equal(node.textContent,copy[index],lang+' '+selector);
 }
 assert.ok(hub.querySelector('#kids-packs-section h3').textContent.includes('MatchApp Kids'),'Kids product identity is retained');
 for(const button of hub.querySelectorAll('[data-kids-match-pack],[data-kids-credit-pack]'))assert.equal(button.textContent,BUY_KIDS[lang]);
 const popular=['matches_25','credits_75','kids_matches_25','kids_credits_75'];
 const best=['matches_50','credits_500','kids_matches_50','kids_credits_200'];
 for(const [products,index] of [[popular,13],[best,14]])for(const product of products){
  const button=Array.from(hub.querySelectorAll(PACKS)).find(node=>Object.values(node.dataset).includes(product));
  assert.equal(button.closest('.purchase-pack').querySelector('.purchase-badge').textContent,copy[index],lang+' badge for '+product);
 }
}

function buttonsSnapshot(hub){
 return Array.from(hub.querySelectorAll('button')).map(node=>({node,onclick:node.onclick,attributes:Array.from(node.attributes,attribute=>[attribute.name,attribute.value]),disabled:node.disabled,hidden:node.hidden,tabIndex:node.tabIndex}));
}
function assertButtonsRetained(hub,before){
 assert.deepEqual(Array.from(hub.querySelectorAll('button')),before.map(item=>item.node),'no tab or checkout node was replaced');
 for(const item of before){
  assert.equal(item.node.onclick,item.onclick);
  assert.deepEqual(Array.from(item.node.attributes,attribute=>[attribute.name,attribute.value]),item.attributes);
  assert.equal(item.node.disabled,item.disabled);assert.equal(item.node.hidden,item.hidden);assert.equal(item.node.tabIndex,item.tabIndex);
 }
}
function assertNoAccountChanges(w,calls){
 assert.deepEqual(calls,[],'language presentation issued no network, account, wallet or checkout request');
 assert.equal(w.localStorage.getItem('preserved-wallet'),'{"matches":10,"asks":10}');
 assert.equal(w.sessionStorage.getItem('preserved-checkout'),'existing-receipt');
}

test('purchase labels follow Brazilian Portuguese and English without replacing billing controls or prices',()=>{
 const dom=new JSDOM('<section id="purchase-hub"><h2 id="purchase-hub-title"></h2><p></p><div class="purchase-tabs"><button id="purchase-tab-matches"></button><button id="purchase-tab-credits"></button></div><section id="match-packs-section"><h3></h3><p></p><article class="purchase-pack"><span class="purchase-badge"></span><small></small><b>$2.99</b><button data-match-pack="matches_25" onclick="buyMatches(\'matches_25\')"></button></article></section><section id="ask-ai-credits"><h3></h3><p></p></section></section>',{runScripts:'outside-only'});
 const w=dom.window,button=w.document.querySelector('[data-match-pack]');w.MATCH_LANG='pt-BR';
 w.eval(localeSource);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(button.textContent,'Comprar Matches');assert.equal(w.document.querySelector('.purchase-badge').textContent,'Mais popular');
 assert.equal(w.document.querySelector('b').textContent,'$2.99');assert.equal(button.getAttribute('onclick'),"buyMatches('matches_25')");
 w.MATCH_LANG='en';w.document.dispatchEvent(new w.Event('matchapp:langchange'));
 assert.equal(button.textContent,'Buy Matches');assert.equal(w.document.querySelector('[data-match-pack]'),button);
 dom.window.close();
});

test('all three actual purchase tabs follow 14 real language events while retaining separate pools, prices, selection and handlers',async()=>{
 const copy=authoredCopy();
 assert.deepEqual(Object.keys(copy),LANGUAGES);
 for(const lang of LANGUAGES){
  assert.equal(copy[lang].length,25,lang+' has every authored hub label and caveat');
  copy[lang].forEach((value,index)=>{
   assert.equal(typeof value,'string');assert.ok(value.trim());
   if(lang!=='en')assert.notEqual(value,copy.en[index],lang+' label '+index+' is authored, not an English fallback');
  });
 }
 const {w,hub,calls}=await actualHub();
 try{
  const intro='Adult and Kids allowances are separate. Each experience uses its own daily pool first, then its own top-up balances.';
  assert.equal(copy.en[1],intro);
  assert.equal(copy['pt-BR'][1],'As cotas para adultos e Kids são separadas. Cada experiência usa primeiro sua própria cota diária e depois seus próprios saldos extras.');
  assert.match(copy.en[6],/adult Matches only.*never consume Ask AI credits or Kids balances/);
  assert.match(copy.en[10],/adult Ask AI credits and never affect Kids balances/);
  assert.match(copy.en[17],/Parent-purchased.*never reduce or increase adult Match or Ask AI balances/);
  const kids=hub.querySelector('#purchase-tab-kids');kids.click();kids.focus();
  let handlerCalls=0;
  const checkout=hub.querySelector('[data-kids-credit-pack="kids_credits_25"]');
  checkout.onclick=()=>{handlerCalls++;};
  const price=hub.querySelector('.purchase-pack b');price.textContent='R$\u00a04,90';
  const marketNote=w.document.createElement('p');marketNote.className='brl-pix-note';marketNote.textContent='Verified market hint: R$\u00a04,90 — keep';hub.appendChild(marketNote);
  const marketNoteBefore=marketNote.outerHTML;
  const amounts=Array.from(hub.querySelectorAll('.purchase-pack strong,.purchase-pack b'),node=>node.textContent);
  const before=buttonsSnapshot(hub),url=w.location.href;
  let events=0;w.document.addEventListener('matchapp:langchange',()=>{events++;});
  for(const lang of LANGUAGES){
   w.setLanguage(lang);
   assertStaticCopy(hub,copy[lang],lang);
   assertButtonsRetained(hub,before);
   assert.deepEqual(Array.from(hub.querySelectorAll('.purchase-pack strong,.purchase-pack b'),node=>node.textContent),amounts);
   assert.equal(w.document.activeElement,kids);assert.equal(kids.getAttribute('aria-selected'),'true');assert.equal(w.location.href,url);
   assert.equal(w.document.documentElement.dir,lang==='ar'?'rtl':'ltr');
   assert.equal(marketNote.outerHTML,marketNoteBefore,'a separate market-owned paragraph is not the hub introduction');
   assertNoAccountChanges(w,calls);
  }
  assert.equal(events,14);
  checkout.click();assert.equal(handlerCalls,1,'the original attached handler remains callable without a real checkout');
  assertNoAccountChanges(w,calls);
 }finally{w.close();}
});

test('14 hub translations retain real native unavailable and owned presentation while translating the Kids controls',async()=>{
 const copy=authoredCopy(),{w,hub,calls}=await actualHub({native:true});
 try{
  const pass=w.document.getElementById('btn-ad_free');
  pass.dataset.adFreeOwned='true';delete pass.dataset.androidPurchaseUnavailable;pass.disabled=true;
  const owner=w.MatchBillingPresentation,refresh=owner.refresh;
  const before=buttonsSnapshot(hub);
  const prices=Array.from(hub.querySelectorAll('.purchase-pack b'),node=>node.textContent);
  for(const lang of LANGUAGES){
   w.setLanguage(lang);
   assertStaticCopy(hub,copy[lang],lang,{native:true});
   for(const button of hub.querySelectorAll('[data-credit-pack]')){
    assert.equal(button.textContent,w.t('billing.androidUnavailable'));
    assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-disabled'),'true');assert.equal(button.dataset.androidPurchaseUnavailable,'true');
   }
   assert.equal(pass.textContent,w.t('billing.alreadyOwned'));assert.equal(pass.disabled,true);assert.equal(pass.dataset.adFreeOwned,'true');assert.equal(pass.dataset.androidPurchaseUnavailable,undefined);
   for(const button of hub.querySelectorAll('[data-kids-match-pack],[data-kids-credit-pack]'))assert.equal(button.disabled,false);
   assertButtonsRetained(hub,before);
   assert.deepEqual(Array.from(hub.querySelectorAll('.purchase-pack b'),node=>node.textContent),prices);
   assert.equal(w.MatchBillingPresentation,owner);assert.equal(w.MatchBillingPresentation.refresh,refresh);
   assertNoAccountChanges(w,calls);
  }
 }finally{w.close();}
});

test('language changes leave owned, pending and explicitly unavailable checkout states under their existing owner',async()=>{
 const {w,hub,calls}=await actualHub();
 try{
  const disabled=hub.querySelector('[data-match-pack="matches_5"]');disabled.disabled=true;disabled.textContent='Existing disabled product';
  const busy=hub.querySelector('[data-match-pack="matches_25"]');busy.setAttribute('aria-busy','true');busy.textContent='Existing checkout in progress';
  const unavailable=hub.querySelector('[data-kids-match-pack="kids_matches_5"]');unavailable.setAttribute('aria-disabled','true');unavailable.textContent='Existing unavailable product';
  const owned=hub.querySelector('[data-credit-pack="credits_25"]');owned.dataset.adFreeOwned='true';owned.textContent='Existing owned product';
  const guarded=[disabled,busy,unavailable,owned];
  const originals=guarded.map(node=>node.outerHTML),before=buttonsSnapshot(hub);
  for(const lang of LANGUAGES){
   w.setLanguage(lang);
   assert.equal(hub.querySelector('#purchase-hub-title').textContent,TITLES[lang]);
   assert.deepEqual(guarded.map(node=>node.outerHTML),originals,'translation must not claim that a gated or pending purchase is available');
   assertButtonsRetained(hub,before);
   assertNoAccountChanges(w,calls);
  }
 }finally{w.close();}
});
