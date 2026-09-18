const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function htmlFiles(dir=root){
 const out=[];
 for(const name of fs.readdirSync(dir,{withFileTypes:true})){
  if(name.name==='node_modules'||name.name==='tests'||name.name==='.git')continue;
  const p=path.join(dir,name.name);
  if(name.isDirectory())out.push(...htmlFiles(p));
  else if(name.name.endsWith('.html'))out.push(p);
 }
 return out;
}
test('hreflang never advertises query-string language duplicates',()=>{
 const bad=[];
 for(const file of htmlFiles()){
  const t=fs.readFileSync(file,'utf8');
  if(/\bhreflang\s*=\s*["'][^"']+["'][^>]*\?lang=/i.test(t)||/\?lang=[^"']*["'][^>]*hreflang/i.test(t))bad.push(path.relative(root,file));
 }
 assert.deepEqual(bad,[],'query-string hreflang must not appear');
});
test('runtime i18n keeps the clean canonical and does not rewrite it to ?lang=',()=>{
 const src=read('i18n.js');
 assert.match(src,/split\('\?'\)\[0\]/);
 assert.doesNotMatch(src,/\?lang='\s*\+\s*qp/);
 assert.doesNotMatch(src,/base\s*\+\s*'\?lang='/);
});
test('sitemaps list real public documents on matchapp.tv and never ads.txt',()=>{
 const sm=read('sitemap.xml'),legal=read('legal-sitemap.xml');
 for(const doc of [sm,legal]){
  assert.match(doc,/https:\/\/matchapp\.tv\//);
  assert.doesNotMatch(doc,/matchapp\.cc/);
  assert.doesNotMatch(doc,/ads\.txt/);
 }
 for(const page of ['about.html','cookies.html','copyright.html','privacy.html','terms.html']){
  assert.match(sm,new RegExp('/'+page.replace('.','\\.')+'</loc>'));
 }
 assert.match(read('robots.txt'),/Disallow:\s*\/oauth\//);
 const robots=read('robots.txt');
 assert.match(robots,/Sitemap: https:\/\/matchapp\.tv\/sitemaps\.xml/);
 assert.doesNotMatch(robots,/Sitemap: https:\/\/matchapp\.tv\/sitemap\.xml/);
 assert.doesNotMatch(robots,/Sitemap: https:\/\/matchapp\.tv\/legal-sitemap\.xml/);
});
test('directory stubs stop /pricing/ and /profile/ from 404ing',()=>{
 const pricing=read('pricing/index.html'),profile=read('profile/index.html');
 assert.match(pricing,/canonical[^>]+https:\/\/matchapp\.tv\/pricing\/pricing\.html/);
 assert.match(pricing,/pricing\/pricing\.html/);
 assert.match(pricing,/noindex/i);
 assert.match(profile,/canonical[^>]+https:\/\/matchapp\.tv\/profile\/profile\.html/);
 assert.match(profile,/noindex/i);
 assert.match(read('_redirects'),/https:\/\/matchapp\.tv\/:splat/);
});
test('legacy .cc host is bounced to the canonical .tv host',()=>{
 const settings=read('settings.js'),i18n=read('i18n.js'),four=read('404.html');
 for(const src of [settings,i18n,four]){
  assert.match(src,/matchapp\.cc/);
  assert.match(src,/https:\/\/matchapp\.tv/);
 }
});
test('core pages carry unique 2026 entertainment keywords and stay ads/search ready',()=>{
 const home=read('index.html'),discover=read('discover.html'),pricing=read('pricing/pricing.html');
 const kids=read('kids/index.html'),together=read('together.html');
 assert.match(home,/name="keywords"[^>]+K-drama 2026/);
 assert.match(home,/micro-drama/);
 assert.match(home,/google-adsense-account" content="ca-pub-9541435081010948"/);
 assert.match(home,/dateModified":"2026-\d{2}-\d{2}"/);
 assert.match(discover,/where to stream a title/);
 assert.match(discover,/micro-drama finder/);
 assert.match(pricing,/Ask AI credits/);
 assert.match(pricing,/OfferCatalog/);
 assert.match(kids,/Kids Mode MatchApp/);
 assert.match(together,/what should we watch tonight/);
 assert.match(read('purchase.html'),/noindex/);
 assert.match(read('ads.txt'),/google.com, pub-9541435081010948, DIRECT, f08c47fec0942fa0/);
 const llms=read('llms.txt');
 assert.match(llms,/https:\/\/matchapp\.tv\/discover\.html/);
 assert.match(llms,/\/purchase\.html/);
 assert.match(read('robots.txt'),/llms\.txt/);
 assert.doesNotMatch(read('sitemap.xml'),/llms\.txt/);
 assert.doesNotMatch(read('sitemap.xml'),/purchase\.html/);
});
