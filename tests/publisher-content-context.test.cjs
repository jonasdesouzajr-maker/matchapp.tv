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
