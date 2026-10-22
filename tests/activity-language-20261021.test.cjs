'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','activity.js'),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const types=['match','ai','save','remove','seen','share','purchase','platform','together','settings'];
const now=Date.UTC(2026,9,21,12);
const ages=[0,120000,7200000,86400000,259200000,120000,120000,120000,120000,120000];
const records=types.map((type,index)=>({ts:now-ages[index]-index,type,detail:`Café <Title ${index}> — 作品`,meta:{source:'fixture',index}}));
const justNow=['just now','agora mesmo','ahora mismo','à l’instant','gerade eben','proprio ora','az önce','только что','الآن','अभी-अभी','baru saja','たった今','방금','刚刚'];
function setup(entries=[]){
 const dom=new JSDOM('<!doctype html><html lang="en"><body><details id="activity-panel" open><select id="activity-filter"><option value="">All</option><option value="save">Saved</option><option value="ai">AI</option></select><div id="activity-list"></div><p id="activity-count"></p></details></body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});
 const w=dom.window;w.MATCH_LANG='en';w.Date.now=()=>now;
 Object.defineProperty(w.document,'readyState',{get:()=> 'complete'});
 w.localStorage.setItem('match_activity',JSON.stringify(entries));w.localStorage.setItem('match_watchlater','unrelated saved data');
 let writes=0,events=0;const set=w.Storage.prototype.setItem,remove=w.Storage.prototype.removeItem;
 w.Storage.prototype.setItem=function(key,value){if(key==='match_activity')writes++;return set.call(this,key,value);};
 w.Storage.prototype.removeItem=function(key){if(key==='match_activity')writes++;return remove.call(this,key);};
 w.document.addEventListener('matchapp:historychange',()=>events++);
 w.eval(source);
 return{dom,w,doc:w.document,writes:()=>writes,events:()=>events};
}
function language(w,lang,storage=false){
 w.localStorage.setItem('match_lang',lang);
 if(storage)w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:lang}));
 else w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));
}

test('Activity empty state and filter accessibility follow all14 selected languages without writing records',()=>{
 const t=setup(),{w,doc}=t,filter=doc.getElementById('activity-filter'),emptyCopies=new Set(),filterLabels=new Set();
 try{
  for(const lang of languages){
   language(w,lang);const box=doc.getElementById('activity-list'),copy=box.textContent.trim();
   assert.equal(box.lang,lang);assert.equal(box.dir,lang==='ar'?'rtl':'ltr');
   assert.ok(copy.length>20);assert.doesNotMatch(copy,/undefined|\[object Object\]|\{count\}/);
   assert.equal(doc.getElementById('activity-count').textContent,'');
   emptyCopies.add(copy);filterLabels.add(filter.getAttribute('aria-label'));
   if(lang==='pt-BR')assert.match(copy,/Nada por aqui ainda.*perguntas à IA/);
  }
  assert.equal(emptyCopies.size,14);assert.equal(filterLabels.size,14);
  assert.equal(doc.getElementById('activity-filter'),filter);assert.equal(doc.getElementById('activity-panel').open,true);
  assert.equal(w.MATCH_LANG,'en','rendering does not overwrite the global language owner');
  language(w,'pt-PT',true);assert.equal(doc.getElementById('activity-list').lang,'pt-BR');
  language(w,'ar-SA',true);assert.equal(doc.getElementById('activity-list').lang,'ar');
  assert.equal(t.writes(),0);assert.equal(t.events(),0);assert.equal(w.localStorage.getItem('match_activity'),'[]');
 }finally{w.close();}
});

test('all14 Activity languages translate event labels, count, relative time and delete text while preserving original data and filter grouping',()=>{
 const t=setup(records),{w,doc}=t,original=w.localStorage.getItem('match_activity'),filter=doc.getElementById('activity-filter');
 const english=[...doc.querySelectorAll('.activity-label')].map(node=>node.textContent),counts=new Set(),deleteLabels=new Set();
 try{
  languages.forEach((lang,index)=>{
   language(w,lang);const rows=[...doc.querySelectorAll('.activity-row')],formatter=new w.Intl.RelativeTimeFormat(lang,{numeric:'auto',style:'short'});
   assert.equal(rows.length,10);
   rows.forEach((row,i)=>{
    const label=row.querySelector('.activity-label').textContent,button=row.querySelector('.activity-del');
    assert.ok(label.trim());assert.equal(row.querySelector('.activity-detail').textContent,records[i].detail);
    assert.equal(row.querySelector('.activity-detail').children.length,0,'source title markup is escaped');
    if(types[i]==='together')assert.equal(label,'Match Together');
    else if(lang!=='en')assert.notEqual(label,english[i],lang+' '+types[i]);
    assert.equal(button.getAttribute('aria-label'),button.title);assert.ok(button.title.length>3);
    if(lang!=='en')assert.notEqual(button.title,'Delete this entry');
   });
   const times=rows.map(row=>row.querySelector('.activity-time').textContent);
   assert.equal(times[0],justNow[index]);assert.equal(times[1],formatter.format(-2,'minute'));
   assert.equal(times[2],formatter.format(-2,'hour'));assert.equal(times[3],formatter.format(-1,'day'));assert.equal(times[4],formatter.format(-3,'day'));
   const count=doc.getElementById('activity-count');assert.equal(count.lang,lang);assert.equal(count.dir,lang==='ar'?'rtl':'ltr');
   assert.ok(count.textContent.includes(new w.Intl.NumberFormat(lang).format(10)));counts.add(count.textContent);deleteLabels.add(rows[0].querySelector('button').title);
   assert.equal(w.localStorage.getItem('match_activity'),original);assert.equal(doc.getElementById('activity-panel').open,true);
  });
  assert.equal(counts.size,14);assert.equal(deleteLabels.size,14);
  filter.value='save';w.renderActivity();assert.equal(doc.querySelectorAll('.activity-row').length,3);
  language(w,'pt-BR');assert.equal(filter.value,'save');
  assert.deepEqual([...doc.querySelectorAll('.activity-detail')].map(node=>node.textContent),records.slice(2,5).map(record=>record.detail));
  filter.value='ai';w.renderActivity();assert.equal(doc.querySelectorAll('.activity-row').length,1);
  assert.equal(doc.querySelector('.activity-detail').textContent,records[1].detail);
  assert.equal(t.writes(),0);assert.equal(t.events(),0);assert.equal(w.localStorage.getItem('match_activity'),original);
 }finally{w.close();}
});

test('Activity clear keeps explicit confirmation, cancel safety and localized toast in every language',()=>{
 const prompts=new Set(),toasts=new Set();
 for(const lang of languages){
  const t=setup(records.slice(0,2)),{w,doc}=t,original=w.localStorage.getItem('match_activity');let accepted=false,prompt='',toast='';
  try{
   language(w,lang);w.confirm=text=>{prompt=text;return accepted;};w.showToast=text=>{toast=text;};
   w.clearActivity();prompts.add(prompt);assert.equal(toast,'');assert.equal(t.writes(),0);assert.equal(t.events(),0);
   assert.equal(w.localStorage.getItem('match_activity'),original);assert.equal(doc.querySelectorAll('.activity-row').length,2);
   accepted=true;w.clearActivity();toasts.add(toast);
   assert.equal(w.localStorage.getItem('match_activity'),null);assert.equal(doc.querySelectorAll('.activity-row').length,0);
   assert.equal(t.writes(),1);assert.equal(t.events(),1);assert.equal(w.localStorage.getItem('match_watchlater'),'unrelated saved data');
   if(lang==='pt-BR'){assert.match(prompt,/Excluir todo.*não pode ser desfeita/);assert.equal(toast,'Histórico de atividades excluído.');}
  }finally{w.close();}
 }
 assert.equal(prompts.size,14);assert.equal(toasts.size,14);
});

test('Activity per-entry removal and automatic capture retain their original contract after language repaint',()=>{
 const t=setup(records.slice(0,2)),{w,doc}=t;let confirmations=0;
 try{
  w.confirm=()=>{confirmations++;return false;};language(w,'pt-BR');
  w.deleteActivity(records[0].ts);
  assert.equal(confirmations,0,'per-entry behavior is unchanged');assert.equal(t.events(),1);
  assert.deepEqual(JSON.parse(w.localStorage.getItem('match_activity')),records.slice(1,2));
  w.document.dispatchEvent(new w.CustomEvent('matchapp:settingschanged',{detail:{key:'fontScale'}}));
  w.document.dispatchEvent(new w.CustomEvent('matchapp:creditschanged',{detail:{credits:4}}));
  const stored=JSON.parse(w.localStorage.getItem('match_activity'));
  assert.equal(stored[0].type,'purchase');assert.equal(stored[0].detail,'Credits now 4');
  assert.equal(stored[1].type,'settings');assert.equal(stored[1].detail,'Changed fontScale');
  assert.equal(stored[2].detail,records[1].detail);assert.equal(w.MatchActivity.RETENTION_DAYS,0);
  assert.equal(doc.getElementById('activity-panel').open,true);
 }finally{w.close();}
});

test('Activity uses a selected-language date when relative-time formatting is unavailable',()=>{
 const t=setup(records.slice(1,2)),{w,doc}=t;
 try{
  w.Intl.RelativeTimeFormat=undefined;language(w,'pt-BR');
  assert.equal(doc.querySelector('.activity-time').textContent,new w.Date(records[1].ts).toLocaleString('pt-BR'));
  assert.equal(t.writes(),0);
 }finally{w.close();}
});

test('an unreadable legacy timestamp does not let Intl abort the Activity panel or change stored records',()=>{
 const entries=[{ts:'unreadable-legacy-timestamp',type:'save',detail:'Original saved title'},records[0]];
 const t=setup(entries),{w,doc}=t,original=w.localStorage.getItem('match_activity');
 try{
  language(w,'pt-BR');assert.equal(doc.querySelectorAll('.activity-row').length,2);
  assert.equal(doc.querySelector('.activity-time').textContent,'—');
  assert.equal(doc.querySelector('.activity-detail').textContent,'Original saved title');
  assert.equal(w.localStorage.getItem('match_activity'),original);assert.equal(t.writes(),0);assert.equal(t.events(),0);
 }finally{w.close();}
});
