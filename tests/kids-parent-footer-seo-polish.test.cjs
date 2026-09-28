'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Kids parent disclosure is still the original native accordion with the original trust copy',()=>{
 const doc=new JSDOM(read('kids/index.html')).window.document;
 const info=doc.querySelector('details.kids-parent-info');
 assert(info,'parent area must remain a native, keyboard accessible disclosure');
 assert.equal(info.open,false);
 assert.equal(info.querySelector('summary')?.getAttribute('data-k'),'parentInfo');
 assert.equal(info.querySelectorAll('.kids-trust article').length,3);
 assert.equal(info.querySelector('[data-k=parentNote]')?.textContent.includes('not a parental lock'),true);
});
test('polished Kids styling is isolated to the parent accordion and footer, with no new animations or hidden controls',()=>{
 const page=read('kids/index.html'),css=read('kids/parent-footer-polish.css');
 assert.match(page,/\/kids\/parent-footer-polish\.css\?v=20260928-1/);
 for(const token of ['.kids-parent-info','.kids-trust article','.kids-footer-inner','.kids-footer-brand','.kids-footer-guides']){
  assert(css.includes(token),token);
 }
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/focus-visible/);
 assert.doesNotMatch(css,/@keyframes|animation\s*:|requestAnimationFrame|setInterval/);
 assert.doesNotMatch(css,/kids-guardian|kids-match-form|kids-watch-dialog|kids-result|kids-grid/);
 const doc=new JSDOM(page).window.document;
 for(const selector of ['#kids-match-form','#kids-age','#kids-watch-dialog','#kids-ask-form','.kids-parent-info > summary']){
  assert(doc.querySelector(selector),'unchanged working control '+selector);
 }
 assert.doesNotMatch(page,/googletagmanager\.com|adsbygoogle/i);
});
test('Kids footer has branded, distinct real navigation without sacrificing legal links or original translation keys',()=>{
 const doc=new JSDOM(read('kids/index.html')).window.document,footer=doc.querySelector('.kids-footer');
 assert(footer);
 assert.equal(footer.querySelectorAll('a.kids-footer-brand').length,1);
 assert.equal(footer.querySelectorAll('a[href="/privacy.html"]').length,1);
 assert.equal(footer.querySelectorAll('a[href="/terms.html"]').length,1);
 const guideLinks=[...footer.querySelectorAll('nav.kids-footer-guides a')];
 assert.equal(guideLinks.length,3);
 assert(guideLinks.some(a=>a.getAttribute('data-k')==='matchTitle'&&a.href.endsWith('/kids/#kids-match-stage')));
 assert(guideLinks.some(a=>a.getAttribute('data-k')==='nostalgiaTitle'&&a.href.endsWith('/kids/nostalgia/')));
 assert(guideLinks.some(a=>a.href.endsWith('/kids/titles/numberblocks/')));
 for(const href of ['/kids/nostalgia/','/kids/titles/numberblocks/']){
  assert(fs.existsSync(path.join(__dirname,'..',href,'index.html')),'internal destination '+href);
 }
});
test('Kids hub metadata describes actual age, mood, learning and streaming-guide capabilities with honest schema',()=>{
 const doc=new JSDOM(read('kids/index.html')).window.document;
 const meta=name=>doc.querySelector('meta[name="'+name+'"]')?.content;
 assert.match(doc.title,/Kids Movies, Cartoons & Shows by Age/);
 assert(meta('description').length>=115&&meta('description').length<=165);
 assert.match(meta('description'),/educational shows/);
 assert.match(meta('keywords'),/Kids Mode MatchApp/);
 assert.match(meta('keywords'),/classic cartoons by decade/);
 assert.match(meta('keywords'),/family viewing guide Brazil/);
 assert.equal(doc.querySelectorAll('link[rel=canonical]').length,1);
 assert.equal(doc.querySelector('link[rel=canonical]').href,'https://matchapp.tv/kids/');
 assert.equal(doc.querySelector('meta[property="og:description"]')?.content,meta('description'));
 assert.equal(meta('twitter:description'),meta('description'));
 const ld=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
 assert.equal(ld['@graph'][0]['@type'],'CollectionPage');
 assert.equal(ld['@graph'][0].dateModified,'2026-09-28');
 assert.equal(ld['@graph'][0].mainEntity.itemListElement.length,4);
 assert(ld['@graph'][0].hasPart.some(item=>item.url.endsWith('/kids/nostalgia/')));
 assert(ld['@graph'].some(node=>node['@type']==='BreadcrumbList'));
 assert.doesNotMatch(JSON.stringify(ld),/AggregateRating|reviewRating|ratingValue|SearchAction/);
});
test('Kids generator produces original, readable unique title snippets without truncated generic endings',()=>{
 const generator=read('tools/build-kids-pages.js');
 assert.match(generator,/SEO_REVISION='2026-09-28'/);
 const begin=generator.indexOf('function metaDescription(i){'),end=generator.indexOf('function serpTitle(title){',begin);
 assert(begin>=0&&end>begin);
 const metadata=vm.runInNewContext(generator.slice(begin,end)+'\nmetaDescription',{
  ageText:i=>i.ages.filter(x=>x!=='all').join(', ')||'all approved ages'
 });
 const bluey=metadata({title:'Bluey',year:2018,desc:'Imaginative family play, gentle humor and everyday adventures.',ages:['all','3-5','6-8']});
 const learn=metadata({title:'The Magic School Bus',year:1994,desc:'A curious class takes extraordinary field trips into science.',ages:['all','6-8','9-12']});
 const long=metadata({title:'The Many Adventures of Winnie the Pooh',year:1977,desc:'A gentle little bear shares memorable adventures with friends across an enchanted forest.',ages:['all','3-5','6-8']});
 for(const snippet of [bluey,learn,long]){
  assert(snippet.length<=180,snippet);
  assert(!snippet.endsWith('…'),'snippet must finish with meaningful where-to-watch context');
  assert.match(snippet,/Find where to watch and similar picks\./);
  assert.match(snippet,/Ages/);
 }
 assert.notEqual(bluey,learn);
 assert.match(learn,/science/);
 assert.match(read('tools/update-sitemap.js'),/kids\/.*2026-09-28|lastmod: '2026-09-28T00:00:00\+00:00'/);
 assert.match(read('.github/workflows/kids-seo-refresh.yml'),/node tools\/build-kids-pages\.js/);
});
