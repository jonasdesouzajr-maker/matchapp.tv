const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom');
function recovery(file,pathname,search='',hash=''){
 const d=new JSDOM(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
 const code=[...d.window.document.scripts].find(s=>s.textContent.includes('cached root redirect'))?.textContent;
 assert(code,'Recovery must run before loading the app or analytics');
 const replacements=[];vm.runInNewContext(code,{location:{hostname:'matchapp.tv',pathname,search,hash,replace:url=>replacements.push(url)}});d.window.close();return replacements;
}
test('malformed home addresses recover to the explicit home document without a cached root redirect loop',()=>{
 for(const file of ['404.html','$/index.html'])for(const pathname of ['/$','/$/','/%24','/%24/','/$/index.html','/%24/index.html']){
  assert.deepEqual(recovery(file,pathname,'?lang=pt-BR&appUpdate=2026.09.14.3','#browse'),['/?lang=pt-BR&appUpdate=2026.09.14.3#browse']);
 }
});
test('recovery preserves normal home and genuine missing pages and never accepts a redirect destination from a query',()=>{
 for(const file of ['404.html','$/index.html']){
  for(const pathname of ['/','/index.html','/missing-page','/$/other','/kids/'])assert.deepEqual(recovery(file,pathname),[]);
  assert.deepEqual(recovery(file,'/$','?next=https://example.invalid'),['/?next=https://example.invalid']);
 }
 assert.deepEqual(recovery('404.html','/pricing'),['/pricing/pricing.html']);
 assert.deepEqual(recovery('404.html','/profile'),['/profile/profile.html']);
});
