'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const repo=path.resolve(__dirname,'..');
const base=process.env.MATCH_PROFILE_TEST_BASE||repo;
const read=name=>fs.readFileSync(fs.existsSync(path.join(repo,name))?path.join(repo,name):path.join(base,name),'utf8');
const source=read('taste-profile.js').replace(/\r\n/g,'\n');
const helper=read('profile-details-i18n.js');
const copy=JSON.parse(source.match(/  const COPY = ([\s\S]*?);\n  function copy\(/)[1]);
const questions=Function('return ('+source.match(/  const Q = (\[[\s\S]*?\n  \]);/)[1]+')')();
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const expectedContract=[
  {
    "id": "afterglow",
    "map": "mood",
    "choices": [
      {
        "id": "light",
        "moods": [
          "light and feel-good",
          "cozy comfort watch"
        ]
      },
      {
        "id": "moved",
        "moods": [
          "heartbreaking",
          "inspiring"
        ]
      },
      {
        "id": "wired",
        "moods": [
          "intense and thrilling",
          "epic and adventurous"
        ]
      },
      {
        "id": "thinking",
        "moods": [
          "mind-bending",
          "dark and gritty"
        ]
      }
    ]
  },
  {
    "id": "pace",
    "map": "vibe",
    "choices": [
      {
        "id": "one",
        "vibes": [
          "prestige and critically acclaimed"
        ]
      },
      {
        "id": "binge",
        "vibes": [
          "fast-paced binge-worthy"
        ]
      },
      {
        "id": "background",
        "vibes": [
          "easy background watch"
        ]
      },
      {
        "id": "slow",
        "vibes": [
          "slow burn",
          "long running series"
        ]
      }
    ]
  },
  {
    "id": "heat",
    "map": "rating",
    "choices": [
      {
        "id": "family",
        "ratings": [
          "all ages family friendly",
          "kids"
        ]
      },
      {
        "id": "teen",
        "ratings": [
          "teen PG-13",
          "any"
        ]
      },
      {
        "id": "adult",
        "ratings": [
          "mature adults only R rated",
          "teen PG-13",
          "any"
        ]
      },
      {
        "id": "any",
        "ratings": [
          "any"
        ]
      }
    ]
  },
  {
    "id": "world",
    "map": "mood",
    "choices": [
      {
        "id": "real",
        "moods": [
          "dark and gritty",
          "inspiring"
        ]
      },
      {
        "id": "heightened",
        "moods": [
          "epic and adventurous",
          "funny"
        ]
      },
      {
        "id": "spec",
        "moods": [
          "mind-bending",
          "epic and adventurous"
        ]
      },
      {
        "id": "past",
        "moods": [
          "nostalgic",
          "romantic"
        ]
      }
    ]
  },
  {
    "id": "laugh",
    "map": "mood",
    "choices": [
      {
        "id": "none",
        "moods": [
          "intense and thrilling"
        ]
      },
      {
        "id": "warm",
        "moods": [
          "funny",
          "light and feel-good"
        ]
      },
      {
        "id": "sharp",
        "moods": [
          "funny",
          "dark and gritty"
        ]
      },
      {
        "id": "dark",
        "moods": [
          "funny",
          "dark and gritty"
        ]
      }
    ]
  },
  {
    "id": "tension",
    "map": "mood",
    "choices": [
      {
        "id": "comfort",
        "moods": [
          "cozy comfort watch",
          "light and feel-good"
        ]
      },
      {
        "id": "dread",
        "moods": [
          "scary",
          "dark and gritty"
        ]
      },
      {
        "id": "twist",
        "moods": [
          "mind-bending",
          "intense and thrilling"
        ]
      },
      {
        "id": "nonstop",
        "moods": [
          "intense and thrilling",
          "epic and adventurous"
        ]
      }
    ]
  },
  {
    "id": "company",
    "map": "meta",
    "choices": [
      {
        "id": "solo"
      },
      {
        "id": "partner"
      },
      {
        "id": "family",
        "ratings": [
          "all ages family friendly",
          "teen PG-13"
        ]
      },
      {
        "id": "friends"
      }
    ]
  },
  {
    "id": "format",
    "map": "cat",
    "multi": true,
    "max": 4,
    "choices": [
      {
        "id": "film",
        "cats": [
          "movie"
        ]
      },
      {
        "id": "series",
        "cats": [
          "series"
        ]
      },
      {
        "id": "limited",
        "cats": [
          "limited series"
        ]
      },
      {
        "id": "kdrama",
        "cats": [
          "K-drama"
        ]
      },
      {
        "id": "anime",
        "cats": [
          "anime"
        ]
      },
      {
        "id": "novela",
        "cats": [
          "novela brasileira"
        ]
      },
      {
        "id": "docs",
        "cats": [
          "documentary"
        ]
      },
      {
        "id": "audio",
        "cats": [
          "music album",
          "podcast"
        ]
      }
    ]
  },
  {
    "id": "avoid",
    "map": "avoid",
    "multi": true,
    "max": 4,
    "choices": [
      {
        "id": "horror",
        "moods": [
          "scary"
        ]
      },
      {
        "id": "reality",
        "cats": [
          "reality show"
        ]
      },
      {
        "id": "sport",
        "cats": [
          "sports"
        ]
      },
      {
        "id": "news",
        "cats": [
          "news"
        ]
      },
      {
        "id": "kids",
        "cats": [
          "kids"
        ]
      },
      {
        "id": "romance",
        "moods": [
          "romantic"
        ]
      }
    ]
  },
  {
    "id": "seen",
    "map": "seen",
    "multi": true,
    "max": 3,
    "choices": [
      {
        "id": "stranger",
        "titles": [
          "Stranger Things"
        ]
      },
      {
        "id": "got",
        "titles": [
          "Game of Thrones",
          "House of the Dragon"
        ]
      },
      {
        "id": "office",
        "titles": [
          "The Office"
        ]
      },
      {
        "id": "friends",
        "titles": [
          "Friends"
        ]
      },
      {
        "id": "mandalorian",
        "titles": [
          "The Mandalorian"
        ]
      },
      {
        "id": "last-of-us",
        "titles": [
          "The Last of Us"
        ]
      },
      {
        "id": "squid",
        "titles": [
          "Squid Game"
        ]
      },
      {
        "id": "bridgerton",
        "titles": [
          "Bridgerton"
        ]
      },
      {
        "id": "harry",
        "titles": [
          "Harry Potter and the Sorcerer's Stone",
          "Harry Potter and the Chamber of Secrets"
        ]
      },
      {
        "id": "none",
        "titles": []
      }
    ]
  }
];
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture({lang='pt-BR',state={answers:{},done:false},withHelper=true}={}){
 const errors=[],calls={storage:[],auth:0,upserts:[],fetch:[]};
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM('<!doctype html><html lang="en"><body>'+
  '<section id="account-card" class="profile-hub-target" hidden><div class="premium-card"><button id="save-profile-btn">Save identity</button></div></section>'+
  '<details id="settings-panel"><div class="settings-body"></div></details></body></html>',
  {url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window;
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 w.MATCH_LANG='en';w.localStorage.setItem('match_lang',lang);
 w.localStorage.setItem('match_taste',JSON.stringify(state));
 w.localStorage.setItem('match_seenList','[]');
 w.localStorage.setItem('match_owned_wallet_test',JSON.stringify({match:10,ask:10}));
 const rawSet=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(key,value){calls.storage.push({key,value:String(value)});return rawSet.call(this,key,value);};
 w.SESSION_SHOWN=new Set();w.isBlockedEntry=entry=>entry.blocked===true;
 w.fetch=async url=>{calls.fetch.push(url);throw new Error('Live transport is forbidden in this fixture');};
 let finishAuth;
 const userReady=new Promise(resolve=>{finishAuth=resolve;});
 w.supabaseClient={
  auth:{getUser:()=>{calls.auth++;return userReady;}},
  from:table=>({upsert:async row=>{calls.upserts.push({table,row:plain(row)});return {error:null};}})
 };
 if(withHelper)w.eval(helper);
 w.eval(source);
 const select=(language,event='matchapp:langchange')=>{
  rawSet.call(w.localStorage,'match_lang',language);
  if(event==='storage')w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:language}));
  else w.document.dispatchEvent(new w.CustomEvent(event));
 };
 const snapshot=()=>Object.fromEntries(Object.keys(w.localStorage).filter(key=>key!=='match_lang').map(key=>[key,w.localStorage.getItem(key)]));
 return {dom,w,calls,errors,select,snapshot,finishAuth:()=>finishAuth({data:{user:{id:'synthetic-taste-user'}}})};
}
function setAnswers(w,answers){
 for(const [name,picked]of Object.entries(answers)){
  const values=Array.isArray(picked)?picked:[picked];
  for(const input of w.document.querySelectorAll('#taste-form [name="'+name+'"]'))input.checked=values.includes(input.value);
 }
}

test('taste copy covers 69 UI keys in all 14 languages while preserving the canonical question contract',()=>{
 assert.deepEqual(Object.keys(copy),languages);
 const keys=Object.keys(copy.en);assert.equal(keys.length,69);
 const contract=questions.map(({id,map,multi,max,choices})=>({id,map,...(multi?{multi,max}:{}),choices:choices.map(({label,...choice})=>choice)}));
 assert.deepEqual(contract,expectedContract);
 assert.equal(questions.length,10);assert.equal(questions.reduce((n,q)=>n+q.choices.length,0),52);
 for(const lang of languages){
  assert.deepEqual(Object.keys(copy[lang]),keys,lang);
  for(const key of keys){
   assert.equal(typeof copy[lang][key],'string');assert.ok(copy[lang][key].trim(),lang+'/'+key);
   assert.deepEqual(copy[lang][key].match(/\{\w+\}/g)||[],copy.en[key].match(/\{\w+\}/g)||[],lang+'/'+key);
  }
  if(lang!=='en'){
   assert.notEqual(copy[lang].title,copy.en.title,lang);
   for(const q of questions)assert.notEqual(copy[lang]['question.'+q.id],copy.en['question.'+q.id],lang+'/'+q.id);
  }
  for(const choice of questions[9].choices.slice(0,8))
   assert.equal(copy[lang]['choice.seen.'+choice.id],choice.label,lang+'/'+choice.id);
  assert.ok(copy[lang]['choice.seen.harry'].includes('Harry Potter'),lang);
 }
});

test('all questions, all 52 choices, hints and validation render from the selected language with no account writes',t=>{
 for(const lang of languages){
  const f=fixture({lang});t.after(()=>f.dom.window.close());const {w}=f;
  const fields=[...w.document.querySelectorAll('#taste-form fieldset')];
  assert.equal(w.MatchProfileDetailsI18n.language(),lang);
  assert.equal(w.document.querySelector('#taste-quiz h2').textContent,copy[lang].title);
  assert.equal(w.document.querySelector('.taste-lead').textContent,copy[lang].help);
  assert.equal(w.document.querySelector('#taste-save').textContent,copy[lang].save);
  assert.equal(w.document.querySelector('#taste-edit').textContent,copy[lang].edit);
  assert.equal(w.document.querySelector('#taste-quiz').dir,lang==='ar'?'rtl':'ltr');
  assert.equal(fields.length,10);
  questions.forEach((q,i)=>{
   const legend=fields[i].querySelector('legend');
   assert.equal(legend.firstElementChild.textContent,copy[lang]['question.'+q.id],lang+'/'+q.id);
   if(q.multi)assert.equal(legend.querySelector('.taste-multi').textContent,copy[lang].multi.replace('{max}',String(q.max)));
   else assert.equal(legend.querySelector('.taste-multi'),null);
   for(const c of q.choices){
    const input=w.document.getElementById('taste-'+q.id+'-'+c.id);
    assert.ok(input);assert.equal(input.name,q.id);assert.equal(input.value,c.id);
    assert.equal(input.type,q.multi?'checkbox':'radio');
    assert.equal(input.nextElementSibling.textContent,copy[lang]['choice.'+q.id+'.'+c.id]);
   }
  });
  const before=f.snapshot();w.document.getElementById('taste-save').click();
  assert.equal(w.document.querySelector('.taste-status').hidden,false);
  assert.equal(w.document.querySelector('.taste-status').textContent,copy[lang].required);
  assert.deepEqual(f.snapshot(),before);assert.deepEqual(f.calls.storage,[]);
  assert.equal(f.calls.auth,0);assert.deepEqual(f.calls.upserts,[]);assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
 }
});

test('language and storage events repaint text in place while preserving input identity, choices, focus and validation',async t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f;
 w.document.getElementById('taste-edit').click();
 const box=w.document.getElementById('taste-quiz'),form=w.document.getElementById('taste-form');
 const edit=w.document.getElementById('taste-edit'),save=w.document.getElementById('taste-save');
 const inputs=[...form.querySelectorAll('input')],labels=inputs.map(input=>input.nextElementSibling);
 setAnswers(w,{afterglow:'moved',format:['film','docs'],seen:['stranger','harry']});
 const focus=w.document.getElementById('taste-format-docs');focus.focus();
 const inputState=inputs.map(input=>({name:input.name,id:input.id,value:input.value,type:input.type,checked:input.checked}));
 save.click();focus.focus();
 const before=f.snapshot(),compiled=w.MATCH_TASTE;
 const status=w.document.querySelector('.taste-status');
 for(const [lang,event]of [['ar','matchapp:langchange'],['ja','matchapp:languagechange'],['de','storage'],['pt-BR','matchapp:langchange']]){
  f.select(lang,event);await turn();
  assert.equal(w.document.getElementById('taste-quiz'),box);
  assert.equal(w.document.getElementById('taste-form'),form);
  assert.equal(w.document.getElementById('taste-edit'),edit);
  assert.equal(w.document.getElementById('taste-save'),save);
  assert.equal(w.document.activeElement,focus);
  assert.deepEqual([...form.querySelectorAll('input')],inputs);
  assert.deepEqual(inputs.map(input=>input.nextElementSibling),labels);
  assert.deepEqual(inputs.map(input=>({name:input.name,id:input.id,value:input.value,type:input.type,checked:input.checked})),inputState);
  assert.equal(box.hidden,false);assert.equal(edit.getAttribute('aria-expanded'),'true');
  assert.equal(status.hidden,false);assert.equal(status.textContent,copy[lang].required);
  assert.equal(w.document.getElementById('taste-seen-stranger').nextElementSibling.textContent,'Stranger Things');
  assert.equal(w.document.getElementById('taste-seen-stranger').nextElementSibling.dir,'auto');
  assert.equal(w.MATCH_TASTE,compiled);
 }
 assert.deepEqual(f.snapshot(),before);assert.deepEqual(f.calls.storage,[]);
 assert.equal(f.calls.auth,0);assert.deepEqual(f.calls.upserts,[]);assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
});

test('saving retains canonical criteria, multi-choice limits and original title arrays; current-language toast survives pending remote save',async t=>{
 const f=fixture({lang:'ar'});t.after(()=>f.dom.window.close());const {w}=f;
 w.document.getElementById('taste-edit').click();
 setAnswers(w,{
  afterglow:'light',pace:'slow',heat:'family',world:'spec',laugh:'warm',tension:'twist',company:'family',
  format:['film','series','kdrama','docs','audio'],
  avoid:['horror','reality','sport','news','kids'],
  seen:['stranger','got','harry','none']
 });
 const wallet=w.localStorage.getItem('match_owned_wallet_test');
 w.document.getElementById('taste-save').click();
 const expected={
  done:true,
  moods:['light and feel-good','cozy comfort watch','mind-bending','epic and adventurous','funny','intense and thrilling'],
  vibes:['slow burn','long running series'],cats:['movie','series','K-drama','documentary'],
  ratings:['all ages family friendly','kids','teen PG-13'],
  avoidMoods:['scary'],avoidCats:['reality show','sports','news'],
  exclude:['Stranger Things','Game of Thrones','House of the Dragon',"Harry Potter and the Sorcerer's Stone",'Harry Potter and the Chamber of Secrets']
 };
 assert.deepEqual(plain(w.MATCH_TASTE),expected);
 const saved=JSON.parse(w.localStorage.getItem('match_taste'));
 assert.equal(saved.done,true);
 assert.deepEqual(saved.answers.format,['film','series','kdrama','docs']);
 assert.deepEqual(saved.answers.avoid,['horror','reality','sport','news']);
 assert.deepEqual(saved.answers.seen,['stranger','got','harry']);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('match_seenList')).map(row=>row.title),expected.exclude);
 assert.deepEqual([...w.SESSION_SHOWN],expected.exclude);
 assert.equal(w.tasteAllowsEntry({title:'Stranger Things',cats:['series']}),false);
 assert.equal(w.tasteAllowsEntry({title:'New horror',moods:['scary'],cats:['movie']}),false);
 assert.equal(w.tasteAllowsEntry({title:'New film',cats:['movie'],ratings:['all ages family friendly']}),true);
 assert.equal(w.tasteAllowsEntry({title:'Adult film',cats:['movie'],ratings:['mature adults only R rated']}),false);
 assert.equal(w.isBlockedEntry({title:'Upstream block',blocked:true,cats:['movie']}),true);
 const box=w.document.getElementById('taste-quiz'),edit=w.document.getElementById('taste-edit');
 const toast=w.document.getElementById('taste-saved-toast');
 assert.equal(box.hidden,true);assert.equal(edit.getAttribute('aria-expanded'),'false');
 assert.equal(w.document.getElementById('settings-panel').open,true);assert.equal(w.document.activeElement,edit);
 assert.equal(toast.textContent,copy.ar.saved);assert.equal(toast.getAttribute('role'),'status');assert.equal(toast.getAttribute('aria-live'),'polite');
 assert.equal(f.calls.auth,1);assert.deepEqual(f.calls.upserts,[]);
 const before=f.snapshot(),writeCount=f.calls.storage.length,compiled=w.MATCH_TASTE;
 f.select('ja','storage');assert.equal(toast.textContent,copy.ja.saved);
 f.finishAuth();await turn();await turn();
 assert.equal(w.document.getElementById('taste-saved-toast'),toast);
 assert.equal(toast.textContent,copy.ja.saved);assert.equal(w.MATCH_TASTE,compiled);
 assert.equal(f.calls.upserts.length,1);assert.equal(f.calls.upserts[0].table,'user_taste');
 const row=f.calls.upserts[0].row;
 assert.equal(row.user_id,'synthetic-taste-user');assert.deepEqual(row.answers,saved.answers);
 for(const [key,expectedValue]of Object.entries(expected).filter(([key])=>!['done','avoidMoods','avoidCats'].includes(key)))
  assert.deepEqual(row[key==='exclude'?'exclude_titles':key],expectedValue,key);
 assert.match(row.completed_at,/^\d{4}-\d{2}-\d{2}T/);assert.match(row.updated_at,/^\d{4}-\d{2}-\d{2}T/);
 assert.deepEqual(f.snapshot(),before);assert.equal(f.calls.storage.length,writeCount);
 assert.equal(w.localStorage.getItem('match_owned_wallet_test'),wallet);
 edit.click();assert.equal(box.hidden,false);assert.equal(edit.getAttribute('aria-expanded'),'true');
 assert.equal(w.document.getElementById('account-card').hidden,false);
 assert.equal(w.document.activeElement,w.document.querySelector('#taste-form input'));
 assert.deepEqual([...w.document.querySelectorAll('#taste-form [name="seen"]:checked')].map(input=>input.value),['stranger','got','harry','none']);
 assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
});

test('saved state hydrates without replacing controls, and the legacy standalone caller remains renderable',t=>{
 const answers={afterglow:'wired',format:['series','anime'],seen:['none']};
 const f=fixture({lang:'fr',state:{answers,done:true}});t.after(()=>f.dom.window.close());const {w}=f;
 const form=w.document.getElementById('taste-form'),input=w.document.getElementById('taste-afterglow-wired');
 assert.equal(w.document.getElementById('taste-quiz').hidden,true);
 assert.equal(w.document.getElementById('taste-edit').getAttribute('aria-expanded'),'false');
 assert.equal(input.checked,true);assert.equal(w.document.getElementById('taste-format-anime').checked,true);
 w.document.dispatchEvent(new w.CustomEvent('matchapp:profilehydrated'));
 assert.equal(w.document.getElementById('taste-form'),form);assert.equal(w.document.getElementById('taste-afterglow-wired'),input);
 assert.equal(w.document.querySelectorAll('#taste-quiz').length,1);
 assert.equal(w.document.querySelectorAll('#taste-edit').length,1);
 assert.deepEqual(f.calls.storage,[]);assert.equal(f.calls.auth,0);assert.deepEqual(f.errors,[]);
 const legacy=fixture({lang:'ja',withHelper:false});t.after(()=>legacy.dom.window.close());
 assert.equal(legacy.w.document.querySelector('#taste-quiz h2').textContent,copy.en.title);
 assert.equal(legacy.w.document.querySelectorAll('#taste-form input').length,52);
 assert.deepEqual(legacy.errors,[]);
});
