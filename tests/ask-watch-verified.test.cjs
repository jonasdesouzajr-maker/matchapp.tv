const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ask-watch-verified.js','utf8');
function setup(records={},lang='en',country='US') {
 const window={MATCH_LANG:lang,MatchAppCatalogMedia:{regionCode:()=>country,countryName:r=>r,
  availability:(meta,r)=>({streams:meta.availability?.[r]?.stream||[]}),
  lookupLive:async title=>records[title]||null,
  viewingTarget:(meta,title,r)=>({mode:'stream',provider:meta.availability[r].stream[0],href:'https://www.netflix.com/search?q='+encodeURIComponent(title)})}};
 const context={window,localStorage:{getItem:()=>null},Intl,setTimeout,clearTimeout};
 vm.runInNewContext(source,context);
 return {api:window.MatchAppWatchVerified,window};
}
function record(title,changes={}) {return {title,year:2020,tmdb_id:123,media_kind:'tv',genres:['Documentary'],overview:'A documentary examining Greek mythology and ancient gods.',poster_url:'https://image.tmdb.org/t/p/w500/real.jpg',availability:{source:'tmdb-watch-providers',BR:{stream:['Netflix']},CA:{stream:['CBC Gem']},US:{stream:[]}},...changes};}
test('documentary follow-ups retain subject, series format and viewing region using USER turns only',()=>{
 const {api}=setup();
 const history=[{role:'user',text:'Find mythology docu series streaming in Brazil'},{role:'assistant',text:'Watch Paw Patrol or Age of Samurai on Netflix.'}];
 for(const q of ['Find one for me.','Not at all what I’m looking for; find a proper documentary as I asked.']){
  const c=api.constraints(q,history);assert(c.active);assert(c.documentary);assert.equal(c.kind,'tv');assert.equal(c.region,'BR');assert.equal(c.topic,'mythology');
 }
 assert(!api.constraints('Recommend a Jane Austen audiobook',history).active);
 assert(!api.constraints('Find one for me',[{role:'user',text:'Recommend an audiobook'}]).active);
 assert(!api.constraints('Who directed this documentary?',history).active);
});
test('all ISO viewing regions and localized country names override saved country without changing settings',()=>{
 for(const [question,lang,expected] of [
  ['Recommend documentaries streaming in Canada','en','CA'],
  ['Recomende documentários em Moçambique','pt-BR','MZ'],
  ['Find docuseries in New Zealand','en','NZ'],
  ['Documentales en México','es','MX'],
  ['Documentaires en Côte d’Ivoire','fr','CI'],
  ['Find documentary series; country=ZA','en','ZA'],
  ['Find documentaries in English streaming in Japan','en','JP']]){
  const {api}=setup({},lang,'BR');assert.equal(api.constraints(question).region,expected,question);
 }
 assert.equal(setup().api.constraints('Find Brazilian mythology documentaries').region,'US','production/topic adjectives do not imply viewing region');
});
test('source gate rejects children fiction, wrong topic, unavailable region, rental-only and AI-invented genre',()=>{
 const {api}=setup();const c=api.constraints('Find mythology docu series streaming in Brazil');
 assert(api.sourceFits(record('Myths'),c));
 for(const meta of [record('Paw Patrol',{genres:['Animation','Kids']}),record('Samurai',{overview:'Warfare in feudal Japan.'}),record('Unavailable',{availability:{source:'tmdb-watch-providers',US:{stream:['Netflix']}}}),record('Rent only',{availability:{source:'tmdb-watch-providers',BR:{rent:['Amazon Video']}}}),record('Generated',{availability:{source:'ai',BR:{stream:['Netflix']}}}),record('Movie',{media_kind:'movie'})])assert(!api.sourceFits(meta,c),meta.title);
 assert(!api.sourceFits(record('Marvel Studios Legends',{overview:'Revisit memorable moments from the Marvel Cinematic Universe.'}),c));
 assert(!api.sourceFits(record('Bill Nye Saves the World',{overview:'Bill Nye explores science, dispels myths, and debunks anti-scientific claims.'}),c));
 assert(!api.sourceFits(record('Invalid genres',{genres:undefined}),c));
});
test('specific documentary subjects cannot broaden into an unrelated documentary',()=>{
 const {api}=setup();const c=api.constraints('Find documentary series about Antarctic expeditions streaming in Canada');
 assert.equal(c.subject.join(' '),'antarctic expeditions');
 assert(!api.sourceFits(record('Myths'),c));
 assert(api.sourceFits(record('Antarctic Expeditions',{overview:'Antarctic expeditions across the ice.'}),c));
});
test('answer and cards are built from the SAME verified regional evidence before charging',async()=>{
 const good=record('Myths');const {api}=setup({'Myths':good,'Samurai':record('Samurai',{overview:'Feudal warfare.'})});
 const c=api.constraints('Find mythological docuseries streaming in Brazil');
 const payload=await api.resolve({answer:'Watch Paw Patrol and Samurai anywhere!',_live:true,results:[{title:'Myths',year:2020},{title:'Samurai',year:2020}]},c);
 assert.equal(payload.results.length,1);assert.equal(payload.results[0].title,'Myths');assert.equal(payload.results[0]._watchRegion,'BR');assert(payload._live);
 assert.match(payload.answer,/Myths.*Netflix/);assert.doesNotMatch(payload.answer,/Paw Patrol|Samurai|anywhere/);
 const ca=await api.resolve({results:[{title:'Myths',year:2020}]},api.constraints('Find mythology docuseries in Canada'));
 assert.match(ca.answer,/CBC Gem/);assert.doesNotMatch(ca.answer,/Netflix/);
});
test('empty exact-filter searches do not charge, invent replies or repeat previously rejected titles',async()=>{
 const {api}=setup({'Myths':record('Myths')});
 const c=api.constraints('Find mythology docuseries in Brazil');
 const p=await api.resolve({answer:'Sure, Netflix.',_live:true,results:[{title:'Myths',year:2020}]},c,[{title:'Myths'}]);
 assert.equal(p.results.length,0);assert.equal(p._live,false);assert(p._watchChecked);assert.match(p.answer,/No exact streaming match/);assert.doesNotMatch(p.answer,/Sure|Netflix/);
});
test('source recovery discovers documentary genre, preserves country/topic and verifies alternatives',async()=>{
 const {api,window}=setup({'Myths':record('Myths')});let criteria;
 window.tmdbDiscover=async c=>{criteria=c;return [{title:'Myths',year:2020,kind:'tv',tmdbId:123,overview:'Greek mythology.'},{title:'Unrelated',overview:'Football.'}];};
 const p=await api.resolve({answer:'Unable to help',results:[]},api.constraints('Find mythology docuseries streaming in Brazil'));
 assert.equal(criteria.region,'BR');assert.equal(criteria.kind,'tv');assert.equal(criteria.genre_ids[0],99);assert.equal(p.results.length,1);
});
test('generated wrong-title numeric IDs and wrong editions cannot pass exact source verification',async()=>{
 const {api}=setup({'Myths':record('Another Work')});
 const p=await api.resolve({results:[{title:'Myths',year:2020,tmdbId:123}]},api.constraints('Find mythology docuseries in Brazil'));
 assert.equal(p.results.length,0);assert.equal(p._live,false);
});
test('shared adult route verifies before debit and rendering and never appends unchecked related titles',()=>{
 const discover=fs.readFileSync('discover.js','utf8'),html=fs.readFileSync('discover.html','utf8');
 assert(discover.indexOf('MatchAppWatchVerified.resolve')<discover.indexOf("!(await checkDailyLimit('ask_ai'))"));
 assert.match(discover,/!payload\?\._watchChecked/);assert.match(discover,/if \(!items.some\(item => item._watchVerified\)\) await attachRelated/);
 assert.match(discover,/region: item\._watchRegion/);assert.match(html,/ask-watch-verified.js\?v=20261006-1/);
 assert(!fs.readFileSync('kids/index.html','utf8').includes('ask-watch-verified'));
 assert.match(fs.readFileSync('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt','utf8'),/https:\/\/matchapp\.tv\//);
});
