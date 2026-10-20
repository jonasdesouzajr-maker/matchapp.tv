'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),app=read('app.js'),trigger=app.slice(app.indexOf('window.triggerMatch = async function'),app.indexOf('// THE RENDER ENGINE')),safe=app.match(/function tSafe\([\s\S]*?\n}\n/)[0];
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('the actual failed exact-title branch localizes its no-charge message and retains original fields in all14 languages',async()=>{
 for(const language of languages){
  const dom=new JSDOM('<!doctype html><html lang="en"><body><input id="specific-search-input" value="Unavailable original title"><div id="questionnaire-box"></div><div id="search-box"></div><div id="result-box" hidden></div><div id="loading-box"></div></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,events=[];
  try{
   w.localStorage.setItem('match_lang',language);w.eval(read('i18n.js'));w.setLanguage(language);w.HTMLElement.prototype.scrollIntoView=function(){};
   const field=w.document.getElementById('specific-search-input'),criteria={cat:['movie'],plat:[],genre:[],mood:['scary'],vibe:[],rating:[],decade:[]},before=JSON.stringify(criteria),key=value=>String(value||'').toLowerCase();
   w.matchPolicy={ready:async()=>{},key,history:()=>[],known:()=>new Set(),excludes:()=>false,claim:async()=>{events.push('claim');return true;}};w.getMatchCriteria=()=>criteria;w.showToast=text=>events.push({toast:text});
   const context=vm.createContext({window:w,document:w.document,localStorage:w.localStorage,CONTENT_CATALOG:[],savedList:[],LANG_NAMES_FOR_PROMPT:{en:'English','pt-BR':'Portuguese'},normCriteria:v=>Array.isArray(v)?v:[],matchAllowanceBeforeLookup:async()=>{events.push('allowance');return true;},checkDailyLimit:async()=>{events.push('debit');return true;},fetchGeminiData:async()=>{events.push('source-failure');throw Error('Isolated unavailable source');},renderResult:async()=>events.push('render'),requestAnimationFrame:fn=>{fn();return 1;},setInterval:()=>1,clearInterval(){},console});
   vm.runInContext(safe+'\n'+trigger,context);await w.triggerMatch(true);
   const toast=events.find(e=>typeof e==='object')?.toast;assert.equal(toast,w.t('match.titleUnverified'),language);assert.ok(toast&&toast!=='match.titleUnverified');if(language==='en')assert.equal(toast,"Couldn't verify this title. No Match was used.");if(language==='pt-BR')assert.equal(toast,'Não foi possível verificar este título. Nenhum Match foi usado.');if(language!=='en')assert.notEqual(toast,"Couldn't verify this title. No Match was used.",language);
   assert.equal(events.filter(e=>e==='allowance').length,1);assert.equal(events.filter(e=>e==='source-failure').length,1);assert.ok(!events.some(e=>['claim','debit','render'].includes(e)),language+' source failure must remain uncharged');assert.equal(w.document.getElementById('specific-search-input'),field);assert.equal(field.value,'Unavailable original title');assert.equal(JSON.stringify(criteria),before);assert.equal(w.document.getElementById('result-box').hidden,true);assert.equal(w.document.getElementById('loading-box').style.display,'none');assert.equal(w.document.getElementById('questionnaire-box').style.display,'block');assert.equal(w.localStorage.getItem('match_lang'),language);
  }finally{dom.window.close();}
 }
});
