'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function website(){
 const source=new JSDOM(read('index.html')).window.document;
 const controls=['q-mood','q-genre'].map(id=>source.getElementById(id).parentElement.outerHTML).join('');
 const dom=new JSDOM('<!doctype html><body><main>'+controls+'</main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 dom.window.eval(read('matching-policy.js'));
 dom.window.eval(read('criteria.js'));
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 return dom;
}
function books(preferences={}){
 const dom=new JSDOM('<!doctype html><body class="page-home"><main><div id="questionnaire-box"></div><section id="ebook-matcher-root"></section></main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 dom.window.MATCHAPP_EBOOK_CATALOG=[];
 dom.window.localStorage.setItem('match_ebook_criteria_v1',JSON.stringify({mood:'any',genre:'any',format:'ebook',access:'any',...preferences}));
 dom.window.eval(read('ebooks/catalog.js'));
 dom.window.eval(read('ebooks/ebook-matcher.js'));
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 return dom;
}
test('Comfort disables Thriller and Horror and restored contradictions cannot override it',()=>{
 const dom=website(),w=dom.window;
 const mood=w.document.querySelector('[data-value="cozy comfort watch"]');
 mood.click();
 assert.equal(w.document.querySelector('[data-value="Thriller"]').disabled,true);
 assert.equal(w.document.querySelector('[data-value="Horror"]').disabled,true);
 w.setMatchCriteria({mood:['cozy comfort watch'],genre:['Thriller']});
 assert.deepEqual(Array.from(w.getMatchCriteria().mood),['cozy comfort watch']);
 assert.deepEqual(Array.from(w.getMatchCriteria().genre),[]);
 mood.click();
 w.document.querySelector('[data-value="Thriller"]').click();
 assert.equal(w.document.querySelector('[data-value="cozy comfort watch"]').disabled,true);
 assert.deepEqual(Array.from(w.getMatchCriteria().genre),['Thriller']);
 dom.window.close();
});
test('Comfort is also a strict recommendation gate, not only a disabled chip',()=>{
 const dom=website(),policy=dom.window.matchPolicy;
 const gentle={title:'Quiet evenings',cats:['movie'],moods:['cozy comfort watch'],synopsis:'A gentle family story.'};
 assert.equal(policy.genreFits(gentle,{mood:['cozy comfort watch']}),true);
 assert.equal(policy.genreFits({...gentle,cats:['movie','Thriller']},{mood:['cozy comfort watch']}),false);
 assert.equal(policy.genreFits({...gentle,synopsis:'A serial killer disrupts the family.'},{mood:['cozy comfort watch']}),false);
 assert.equal(policy.incompatible('Thriller',{mood:['cozy comfort watch'],genre:[]}),true);
 assert.equal(policy.incompatible('cozy comfort watch',{mood:[],genre:['Thriller']}),true);
 const app=read('app.js');
 assert(!app.includes("['broaden-mood'"),'fallback must not relax the mood');
 assert(app.includes("if (mood === 'cozy comfort watch')"),'iTunes must block heavy themes');
 dom.window.close();
});
test('Bookworms Home and the shared audiobook form disable contradictory moods and genres',()=>{
 const dom=books({mood:'cozy',genre:'classics'}),w=dom.window;
 const genre=w.document.querySelector('[data-ebook-select="genre"]'),mood=w.document.querySelector('[data-ebook-select="mood"]');
 assert.equal(genre.value,'classics');
 assert.equal(genre.querySelector('option[value="thriller"]').disabled,true);
 assert.equal(genre.querySelector('option[value="horror"]').disabled,true);
 genre.value='thriller';genre.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(JSON.parse(w.localStorage.getItem('match_ebook_criteria_v1')).genre,'classics');
 assert.equal(genre.value,'classics');
 mood.value='any';mood.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(genre.querySelector('option[value="thriller"]').disabled,false);
 genre.value='thriller';genre.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(mood.querySelector('option[value="cozy"]').disabled,true);
 w.close();
});
test('Saved incompatible Bookworms preferences normalize to keep the explicit mood',()=>{
 const dom=books({format:'audiobook',mood:'cozy',genre:'thriller'}),w=dom.window;
 assert.equal(w.document.querySelector('[data-ebook-select="mood"]').value,'cozy');
 assert.equal(w.document.querySelector('[data-ebook-select="genre"]').value,'any');
 assert.equal(w.document.querySelector('option[value="thriller"]').disabled,true);
 w.close();
});
test('Unsupported BR free audiobook rights show honest source discovery without taking quota',async()=>{
 const dom=books({format:'audiobook',mood:'cozy',genre:'classics',access:'free'}),w=dom.window;
 w.localStorage.setItem('match_user_country','br');
 let quota=0;w.checkDailyLimit=async()=>{quota++;return true};
 w.MatchAppAudiobooks={verify:async()=>{throw Error('should not call out-of-region free verifier')},
 sourceSearches:()=>[{provider:'Audible',url:'https://www.audible.com.br/search?keywords=classic'}]};
 w.document.querySelector('[data-ebook-match]').click();
 await new Promise(resolve=>setTimeout(resolve,20));
 const result=w.document.querySelector('[data-ebook-result]');
 assert.equal(result.hidden,false);
 assert.match(result.textContent,/Free recordings are not yet rights-verified|Ainda não verificamos/);
 assert.match(result.textContent,/unverified search/);
 assert.equal(quota,0);
 w.close();
});
