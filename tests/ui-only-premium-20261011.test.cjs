const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=['index.html','discover.html','profile/profile.html','register.html','pricing/pricing.html','together.html','friends.html','about.html'];
for(const file of html){
 const s=read(file);
 assert.match(s,/premium-finish-20261011\.css/,'missing shared polish in '+file);
 assert.match(s,/brand-lock-20261011\.js/,'missing immutable wordmark in '+file);
}
const pageShell=read('page-shell.js');
assert.match(pageShell,/brandName\(\)\s*\{\s*return 'MatchApp Ai'/);
assert.match(pageShell,/lockup\.setAttribute\('translate', 'no'\)/);
for(const [cls,name] of [['ma-word-match','Match'],['ma-word-app','App'],['data-ma-brand-ai','Ai']]){
 assert.ok(pageShell.includes(cls));
 assert.ok(pageShell.includes("'"+name+"'"));
}
const guard=read('brand-lock-20261011.js');
assert.match(guard,/new MutationObserver/);
assert.match(guard,/observer\.observe\(brand/);
assert.match(guard,/restore\(brand\)/);
const css=read('premium-finish-20261011.css');
assert.match(css,/body:not\(\.page-kids\)/);
assert.match(css,/\.discover-card/);
assert.match(css,/object-fit:contain/);
const discover=read('discover.js');
assert.match(discover,/function shareDiscoverItem\(idx\)/);
assert.match(discover,/reward\.click\(\)/);
assert.match(discover,/MatchAppJonasTitlePresentation\?\.fromAnswer/);
assert.match(discover,/discover-share/);
const js=read('jonas/title-card-presentation-20261011.js');
const window={MatchAppCatalogMedia:{
 async lookup(title){return title==='The Nice Guys'?{title:'The Nice Guys',year:2016,media_kind:'movie',overview:'Two detectives investigate.',poster_url:'https://image.tmdb.org/t/p/original/poster.jpg'}:null;},
 async lookupLive(){return null;}
}};
vm.runInNewContext(js,{window,console},{timeout:1000});
(async()=>{
 const yes=await window.MatchAppJonasTitlePresentation.fromAnswer('I recommend "The Nice Guys" for a funny evening.');
 assert.equal(yes.title,'The Nice Guys');
 assert.equal(yes.synopsis,'Two detectives investigate.');
 assert.equal(yes.type,'movie');
 assert.equal(yes._catalogMedia.poster_url,'https://image.tmdb.org/t/p/original/poster.jpg');
 const no=await window.MatchAppJonasTitlePresentation.fromAnswer('Enjoy the weather today!');
 assert.equal(no,null);
 assert.equal(window.MatchAppJonasTitlePresentation.candidates('Watch the film "Not A Real Film"').includes('Not A Real Film'),true);
 console.log('PASS: 8 core pages, canonical brand guard, adult-only polish, existing rewards, exact catalog cards, unknown-title rejection');
})().catch(e=>{console.error(e);process.exitCode=1});
