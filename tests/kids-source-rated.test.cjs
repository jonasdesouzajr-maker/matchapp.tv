'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const policy=require('../kids/age-rating-policy.js');
const movie={tmdbId:123,kind:'movie',title:'Gentle Forest',originalTitle:'Gentle Forest',year:'2021',adult:false};
const details={...movie,posterLarge:'https://image.tmdb.org/t/p/w780/specific-title.jpg',
 overview:'Young animals learn about kindness and helping each other in a beautiful green forest.',
 contentRating:'G',genres:['Family','Animation'],availability:{BR:{link:'https://www.justwatch.com/br/filme/gentle-forest'}}};
test('source age approval requires exact genuine identity and publisher-provided rating',()=>{
 const good=policy.verify(movie,details,'3-5');
 assert(good);assert.equal(good.identity,'tmdb:movie:123');
 assert.equal(good.source,'https://www.themoviedb.org/movie/123');
 assert.equal(good.editoriallyReviewed,false);assert(good.ageBands.includes('3-5'));
 assert.equal(good.poster,details.posterLarge);
});
test('unrated, adult, contradictory, missing and mismatched results fail closed',()=>{
 const bad=[
 [movie,{...details,tmdbId:234}],[movie,{...details,kind:'tv'}],
 [{...movie,adult:true},details],[movie,{...details,adult:true}],
 [movie,{...details,year:'2018'}],[movie,{...details,originalTitle:'Other Film'}],
 [movie,{...details,contentRating:''}],[movie,{...details,contentRating:'TV-MA'}],
 [movie,{...details,genres:['Horror','Animation']}],
 [movie,{...details,genres:['Crime','Family']}],
 [movie,{...details,genres:['Documentary']}],
 [movie,{...details,posterLarge:'https://evil.example/cover.jpg',poster:null}],
 [movie,{...details,overview:''}],
 [movie,{...details,overview:'A traumatic story about suicide in a family.'}]
 ];
 for(const [candidate,detail] of bad)assert.equal(policy.verify(candidate,detail,'3-5'),null);
});
test('older-child source ratings are never granted to preschool or all-ages by default',()=>{
 assert.equal(policy.verify(movie,{...details,contentRating:'TV-Y7'},'3-5'),null);
 assert(policy.verify(movie,{...details,contentRating:'TV-Y7'},'6-8'));
 assert.equal(policy.verify(movie,{...details,contentRating:'TV-G'},'3-5'),null);
 assert.equal(policy.verify(movie,{...details,contentRating:'PG'},'6-8'),null);
 assert(policy.verify(movie,{...details,contentRating:'PG'},'9-12'));
 assert.equal(policy.verify(movie,{...details,contentRating:'PG'},'all'),null);
 assert.equal(policy.ratingBands('16'),null);
});
test('one responsive cross-device Kids source module never edits editorial allowlist',()=>{
 const page=read('kids/index.html'),kids=read('kids/kids.js'),extra=read('kids/source-rated-discovery.js');
 const css=read('kids/kids.css'),android=read('android-studio/README.md');
 assert(page.includes('id="kids-family-expansion"'));
 assert(page.indexOf('/kids/age-rating-policy.js')<page.indexOf('/kids/source-rated-discovery.js'));
 assert(page.indexOf('/kids/kids.js')<page.indexOf('/kids/source-rated-discovery.js'));
 assert.doesNotMatch(page,/googletagmanager\.com|adsbygoogle/i);
 assert.match(kids,/const LIBRARY = \[/);assert.match(kids,/KIDS_BROWSE_BATCH=24/);
 assert.match(extra,/MAX_CHECKS_PER_CLICK=18,MAX_SHOWN=48/);
 assert.match(extra,/grid\.firstElementChild\?\.remove/);
 assert.doesNotMatch(extra,/\b(?:LIBRARY|byTitle)\.push\b|\.ageBands\s*=/);
 assert.match(css,/\.kids-source-cover img\{[^}]*object-fit:contain/);
 assert(android.includes(':kidsapp'));assert(android.includes(':app'));
});
test('source discovery shows only age-gated exact metadata and resets after changing age',async()=>{
 const html='<select id="kids-age"><option value="3-5">3-5</option><option value="9-12">9-12</option></select>'+
 '<select id="kids-lang"><option value="en">English</option></select>'+
 '<select id="kids-watch-region"><option value="BR">BR</option></select>'+
 '<section id="kids-family-expansion"><h2 id="kids-family-heading"></h2>'+
 '<input id="kids-family-search"><select id="kids-family-format"><option value=""></option></select>'+
 '<button id="kids-family-more"></button><button id="kids-family-find"></button>'+
 '<p id="kids-family-status"></p><div id="kids-family-grid"></div></section>';
 const dom=new JSDOM(html,{url:'https://matchapp.tv/kids/',runScripts:'outside-only'});
 try{
  const w=dom.window;
  w.eval(read('kids/age-rating-policy.js'));
  const older={...movie,tmdbId:456,title:'Magical School',originalTitle:'Magical School'};
  w.tmdbDiscover=async()=>[movie,older];
  w.tmdbDetails=async id=>id===123?details:{...details,...older,contentRating:'PG'};
  w.eval(read('kids/source-rated-discovery.js'));
  const more=w.document.getElementById('kids-family-more');
  async function settle(){
   for(let i=0;i<40;i++){
    await new Promise(resolve=>setImmediate(resolve));
    if(!more.disabled)break;
   }
  }
  more.click();await settle();
  assert.equal(w.document.querySelectorAll('.kids-source-card').length,1);
  assert.match(w.document.getElementById('kids-family-status').textContent,/1 new source-rated/);
  assert.equal(w.document.querySelector('.kids-source-card a').href,'https://www.themoviedb.org/movie/123');
  w.document.getElementById('kids-age').value='9-12';
  w.document.getElementById('kids-age').dispatchEvent(new w.Event('change'));
  assert.equal(w.document.querySelectorAll('.kids-source-card').length,0);
  more.click();await settle();
  assert.equal(w.document.querySelectorAll('.kids-source-card').length,2);
 }finally{dom.window.close()}
});
test('Ask AI verified provider data and TV genre hydration stay regression-guarded',()=>{
 const src=read('discover.js'),page=read('discover.html');
 const hydrate=src.slice(src.indexOf('async function hydrateDiscoverCard('),src.indexOf('window.saveDiscoverItem'));
 assert.match(hydrate,/const rawType=String\(item\?\.type\|\|''\)\.toLowerCase\(\)/);
 assert.match(src,/item\._availabilityVerified=Boolean/);
 assert.match(src,/verifiedModes=new Set\(\['stream','rent','buy','cinema'\]\)/);
 assert.match(page,/discover\.js\?v=20260925-ai-reliability3/);
});