const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('kids/source-rated-discovery.js'),copy=JSON.parse(source.match(/const SOURCE_COPY = (\{[\s\S]*?\n\});/)[1]);
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('all fourteen family-discovery languages have complete authored controls, warnings and status copy',()=>{
 assert.deepEqual(Object.keys(copy).sort(),[...languages].sort());const keys=Object.keys(copy.en);assert.equal(keys.length,26);
 for(const language of languages){assert.deepEqual(Object.keys(copy[language]).sort(),[...keys].sort());
  for(const key of keys){assert.equal(typeof copy[language][key],'string');assert(copy[language][key].trim(),language+' '+key);}
  assert(copy[language].found.includes('{count}'));assert(copy[language].caution.includes('MatchApp Ai'));
  assert(copy[language].note.includes('TMDB'));assert(copy[language].note.includes('Ask AI'));
 }
});
test('real family-discovery handlers repaint every language, preserve controls and display only verified metadata',async()=>{
 const d=new JSDOM(read('kids/index.html').replace(/<script\b[\s\S]*?<\/script>/g,''),{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=d.window;
 try{
  w.MatchAppKidsAgePolicy=require('../kids/age-rating-policy.js');
  const identity={tmdbId:123,kind:'movie',title:'Gentle Forest',originalTitle:'Gentle Forest',year:'2021',adult:false};
  const details={...identity,posterLarge:'https://image.tmdb.org/t/p/w780/specific-title.jpg',overview:'Young animals learn about kindness and helping each other in a beautiful green forest.',contentRating:'G',genres:['Family','Animation']};
  let lookups=0;w.tmdbLookup=async()=>{lookups++;return identity};w.tmdbDiscover=async()=>[];w.tmdbDetails=async()=>details;
  w.eval(source);const picker=w.document.getElementById('kids-lang'),format=w.document.getElementById('kids-family-format'),input=w.document.getElementById('kids-family-search'),button=w.document.getElementById('kids-family-find');
  for(const language of languages){
   picker.value=language;picker.dispatchEvent(new w.Event('change'));const ui=copy[language];
   assert.equal(w.document.getElementById('kids-family-heading').textContent,ui.heading);
   assert.equal(w.document.querySelector('.kids-source-lead').textContent,ui.lead);assert.equal(w.document.querySelector('.kids-source-note').textContent,ui.note);
   assert.equal(w.document.querySelector('.kids-source-section .kids-eyebrow').textContent,'✦ '+ui.eyebrow);
   assert.equal(w.document.getElementById('kids-family-status').textContent,ui.idle);assert.equal(button.textContent,ui.verify);
   assert.equal(input.placeholder,ui.placeholder);assert.equal(w.document.getElementById('kids-family-grid').getAttribute('aria-label'),ui.gridLabel);
   assert.deepEqual([...format.options].map(o=>o.value),['','movie','tv']);assert.deepEqual([...format.options].map(o=>o.textContent),[ui.formatsAll,ui.movies,ui.shows]);
   assert.equal(w.document.getElementById('kids-family-format'),format);assert.equal(w.document.getElementById('kids-family-search'),input);
   input.value='Gentle Forest';button.click();
   for(let i=0;button.disabled&&i<20;i++)await new Promise(r=>setTimeout(r,5));
   assert.equal(button.disabled,false);const card=w.document.querySelector('.kids-source-card');assert(card);
   assert.equal(card.dataset.identity,'tmdb:movie:123');assert.equal(card.querySelector('h3').textContent,'Gentle Forest (2021)');
   assert.equal(card.querySelector('.kids-source-caution').textContent,ui.caution);assert.equal(card.querySelector('.kids-source-badge').textContent,ui.badge+' · G');
   assert.equal(card.querySelector('a').href,'https://www.themoviedb.org/movie/123');assert.equal(card.querySelector('a').textContent,ui.details);
   assert.equal(w.document.getElementById('kids-family-status').textContent,ui.found.replace('{count}','1'));
  }
  assert.equal(lookups,14);assert.equal(w.localStorage.getItem('match_kids_dailyCount'),null,'translation and source checks never spend a match');
 }finally{w.close()}
});
