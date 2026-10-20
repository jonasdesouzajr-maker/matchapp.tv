'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const originalValues=['any','Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance','Science Fiction','TV Movie','Thriller','War','Western','Action & Adventure','Kids','News','Reality','Sci-Fi & Fantasy','Soap','Talk','War & Politics','Buddhism','Christian','Fitness','Fitness & Workout','Hip-Hop/Rap','Jazz','Mental Health','Metal','New Age','Pop','Rock'];
function originalForm(){
 const dom=new JSDOM(read('index.html'));
 try{return '<section class="container">'+['.home-hero','#questionnaire-box','#search-box'].map(selector=>dom.window.document.querySelector(selector).outerHTML).join('')+'</section>';}
 finally{dom.window.close();}
}
async function fixture(language='pt-BR'){
 const dom=new JSDOM(originalForm(),{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()}),w=dom.window,calls=[];
 await new Promise(resolve=>{if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',resolve,{once:true});else resolve();});
 w.matchMedia=()=>({matches:true});
 w.localStorage.setItem('match_lang',language);
 w.localStorage.setItem('match_settings',JSON.stringify({fontScale:1.4,blockedGenres:['Horror']}));
 w.localStorage.setItem('preserved-account-balance','17');
 w.fetch=()=>{calls.push('fetch');throw Error('Language copy must not fetch');};
 w.supabaseClient={rpc:()=>{calls.push('quota');throw Error('Language copy must not consume');},functions:{invoke:()=>{calls.push('provider');throw Error('Language copy must not request a provider');}}};
 // These are the actual production owners in their original first-load order:
 // the compatibility selects mount first, canonical translation paints next,
 // then the information-architecture owner creates its exclusions link.
 const englishLabels=Array.from(w.document.querySelector('#q-genre').options,o=>o.textContent);
 w.eval(read('criteria.js'));
 w.eval(read('i18n.js')+'\nwindow.__advancedDictionary=I18N;');
 w.eval(read('matchapp-ia.js'));
 return {w,calls,englishLabels};
}
const nonLanguageStorage=w=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>w.localStorage.key(i)).filter(k=>k!=='match_lang').sort().map(k=>[k,w.localStorage.getItem(k)]));

test('real advanced genre options and late-created exclusions link have explicit canonical copy in all14 languages',async t=>{
 const {w,calls,englishLabels}=await fixture();t.after(()=>w.close());const doc=w.document,genre=doc.getElementById('q-genre'),link=doc.querySelector('.ma-fine-link'),group=genre.querySelector('optgroup');
 assert.deepEqual(Array.from(genre.options,o=>o.value),originalValues,'every matcher identity and option order stays exact');
 const keys=[doc.querySelector('[data-i18n="q.genre"]').dataset.i18n,...Array.from(genre.options,o=>o.dataset.i18n),group.dataset.i18nLabel,link.dataset.i18n];
 assert.equal(keys.length,42);assert.equal(new Set(keys).size,42);assert.ok(keys.every(Boolean));
 for(const lang of languages)for(const key of keys){assert.ok(Object.hasOwn(w.__advancedDictionary[lang],key),lang+' owns '+key);assert.ok(w.__advancedDictionary[lang][key].trim(),lang+' nonempty '+key);}
 Array.from(genre.options).forEach((option,index)=>assert.equal(w.t(option.dataset.i18n,'en'),englishLabels[index],'existing English copy is unchanged'));
 assert.equal(link.textContent,'Exclusões e ajustes de “não quero assim” →','late generator uses saved PT immediately');
 assert.equal(doc.querySelector('#q-vibe').parentElement.querySelector('.crit-toggle-label').textContent,'Estilo / Ritmo','existing pacing owner stays translated from first paint');
 assert.deepEqual(calls,[]);
});

test('actual criteria chips, headings, summaries and generated link repaint all14 without changing fields, values, state or handlers',async t=>{
 const {w,calls}=await fixture();t.after(()=>w.close());const doc=w.document,genre=doc.getElementById('q-genre'),vibe=doc.getElementById('q-vibe'),question=doc.getElementById('specific-search-input');
 w.setMatchCriteria({cat:['movie'],genre:['Action','Crime'],vibe:['slow burn']});
 question.value='Keep this unsent question';
 const fields=[...doc.querySelectorAll('#questionnaire-box select')],options=[...genre.options],values=options.map(o=>o.value),toggle=genre.parentElement.querySelector('.crit-toggle'),heading=toggle.querySelector('.crit-toggle-label'),host=genre.parentElement.querySelector('.crit-chips'),link=doc.querySelector('.ma-fine-link');
 let directChanges=0;const originalHandler=()=>directChanges++;genre.onchange=originalHandler;let originalClicks=0;const originalClick=()=>originalClicks++;toggle.addEventListener('click',originalClick);
 const state=JSON.stringify(w.getMatchCriteria()),saved=nonLanguageStorage(w),writes=[],set=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(key,value){writes.push(key);return set.call(this,key,value);};
 // Open the original fold and its original delegated expander; every source
 // option is then compared with the visible chip created by the real owner.
 toggle.click();host.querySelector('[data-toggle-more]').click();assert.equal(originalClicks,1);assert.equal(toggle.getAttribute('aria-expanded'),'true');
 for(const lang of languages){
  w.setLanguage(lang);
  assert.equal(doc.getElementById('q-genre'),genre);assert.equal(doc.getElementById('q-vibe'),vibe);assert.equal(genre.parentElement.querySelector('.crit-toggle'),toggle);assert.equal(toggle.querySelector('.crit-toggle-label'),heading);assert.equal(doc.querySelector('.ma-fine-link'),link);
  assert.deepEqual([...doc.querySelectorAll('#questionnaire-box select')],fields);assert.deepEqual([...genre.options],options);assert.deepEqual(options.map(o=>o.value),values);
  assert.equal(genre.value,'Action');assert.equal(vibe.value,'slow burn');assert.equal(genre.onchange,originalHandler);assert.equal(question.value,'Keep this unsent question');assert.equal(JSON.stringify(w.getMatchCriteria()),state);assert.deepEqual(nonLanguageStorage(w),saved);
  assert.equal(heading.textContent,w.t('q.genre',lang));assert.equal(doc.querySelector('#q-vibe').parentElement.querySelector('.crit-toggle-label').textContent,w.t('q.vibe',lang));assert.equal(host.getAttribute('aria-label'),w.t('q.genre',lang));assert.equal(genre.querySelector('optgroup').label,w.t('genre.audiowellness',lang));assert.equal(link.textContent,w.t('filters.exclusions',lang));assert.equal(link.getAttribute('href'),'/profile/profile.html');
  assert.equal(toggle.querySelector('.crit-toggle-summary').textContent,[w.t('genre.action',lang),w.t('genre.crime',lang)].join(', '));
  for(const option of options){assert.equal(option.textContent,w.t(option.dataset.i18n,lang));if(option.value==='any')continue;const chip=[...host.querySelectorAll('button[data-value]')].find(b=>b.dataset.value===option.value);assert.ok(chip,lang+' visible '+option.value);assert.equal(chip.textContent,option.textContent);assert.equal(chip.getAttribute('aria-pressed'),['Action','Crime'].includes(option.value)?'true':'false');}
  assert.equal(doc.documentElement.dir,lang==='ar'?'rtl':'ltr');
 }
 assert.deepEqual(writes,languages.map(()=> 'match_lang'),'switching presentation writes only the existing selected-language preference');
 const before=directChanges;genre.dispatchEvent(new w.Event('change'));assert.equal(directChanges,before+1,'original field listener remains attached once');toggle.click();assert.equal(originalClicks,2);assert.equal(toggle.getAttribute('aria-expanded'),'false');
 assert.deepEqual(calls,[]);
});
