const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const data=JSON.parse(fs.readFileSync('data/availability.json','utf8'));
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
test('adult availability guides show exact dated sources and distinguish missing listings from paid offers',()=>{
 for(const [name,record] of Object.entries(data.titles)){
  const d=new JSDOM(fs.readFileSync('where-to-watch/'+slug(name)+'/index.html','utf8')).window.document;
  const guidance=d.querySelector('[aria-label="Source context and comparison"]');assert.ok(guidance,name);assert.ok(guidance.textContent.includes(name));assert.equal(guidance.querySelector('time').dateTime,new Date(data.generated).toISOString());
  assert.ok(guidance.querySelector('a[href="https://www.themoviedb.org/'+record.kind+'/'+record.tmdbId+'"]'),name);
  for(const [code,region] of Object.entries(record.regions))if(!['stream','rent','buy'].some(k=>region[k]?.length))assert.match(d.querySelector('[aria-label="Availability by region"]').textContent,/No subscription, rental or purchase provider is confirmed/);
 }
});
test('original public guidance and correction routes are available in static HTML',()=>{
 const home=new JSDOM(fs.readFileSync('index.html','utf8')).window.document,about=new JSDOM(fs.readFileSync('about.html','utf8')).window.document;
 assert.ok(home.getElementById('discovery-editorial-heading'));assert.ok(about.body.textContent.includes('Sources, dates and corrections'));assert.ok(about.querySelector('a[href="mailto:support@matchapp.tv"]'));
});
test('adult About credits use TMDB’s approved asset and keep the required notice across selected locales', () => {
 const dom = new JSDOM(fs.readFileSync('about.html', 'utf8'), {
  url: 'https://matchapp.tv/about.html?lang=fr', runScripts: 'outside-only'
 });
 try {
  const {document, localStorage} = dom.window;
  const section = document.querySelector('section[aria-labelledby="data-credits"]');
  const logo = section.querySelector('a[href="https://www.themoviedb.org"] img');
  const bytes = fs.readFileSync('.' + logo.getAttribute('src'));
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'), '8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c');
  const notice = section.querySelector('[lang="en"][translate="no"]');
  const credit = section.querySelector('#availability-credit');
  const english = credit.textContent;
  localStorage.setItem('match_lang', 'pt-BR');
  dom.window.eval(fs.readFileSync('patches/about-data-credits.js', 'utf8'));
  assert.equal(credit.lang, 'pt-BR');
  for (const lang of ['pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','en']) {
   dom.window.MATCH_LANG = lang;
   document.dispatchEvent(new dom.window.Event('matchapp:langchange'));
   assert.equal(credit.lang, lang);
   assert.match(credit.textContent, /JustWatch/);
   assert.equal(credit.textContent === english, lang === 'en');
   assert.equal(notice.textContent, 'This product uses the TMDB API but is not endorsed or certified by TMDB.');
  }
 } finally { dom.window.close(); }
});
test('Tokyo guide, event cards and link previews use the original MatchApp Ai illustration', () => {
 const event = require('../tools/global-events.json').find(e => e.slug === 'tokyo-international-film-festival-2026');
 assert.equal(event.poster, '/assets/events/tokyo-film-festival-2026.jpg');
 assert.match(event.posterCredit, /original editorial illustration by MatchApp Ai/i);
 assert.ok(fs.existsSync('.' + event.poster));
 assert.ok(fs.existsSync('.' + event.poster.replace('.jpg', '.svg')));
 for (const file of ['index.html','events-archive.html','events/' + event.slug + '/index.html']) {
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  try {
   const page = dom.window.document;
   const img = page.querySelector('[data-event-slug="' + event.slug + '"] img');
   assert.equal(img.getAttribute('src'), event.poster, file);
   assert.match(img.alt, /original independent MatchApp editorial illustration/, file);
   if (file.startsWith('events/')) {
    const url = 'https://matchapp.tv' + event.poster;
    assert.equal(page.querySelector('meta[property="og:image"]').content, url);
    assert.equal(page.querySelector('meta[name="twitter:image"]').content, url);
    const graph = JSON.parse(page.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
    assert.equal(graph.find(item => item['@type'] === 'Event').image, url);
    assert.ok(page.body.textContent.includes(event.posterCredit));
   }
  } finally { dom.window.close(); }
 }
});
