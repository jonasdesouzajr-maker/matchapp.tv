const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');

test('home keeps requested entertainment search intents in metadata, not hidden body copy',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const d=new JSDOM(html).window.document;
  const meta=d.querySelector('meta[name="keywords"]')?.content||'';
  for(const term of [
    'find what is new on entertainment','entertainment','find what to watch now','watch all movies','watch all series',
    'listen to Spotify','listen to Apple Music','what to listen to now','latest streaming releases','AI entertainment recommendations'
  ]) assert.ok(meta.includes(term),'missing metadata search intent: '+term);
  const ld=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
  const site=ld.find(x=>x['@type']==='WebSite');
  const app=ld.find(x=>x['@type']==='SoftwareApplication');
  assert.ok(site?.keywords?.includes('find what to watch now'));
  assert.ok(app?.keywords?.includes('listen to Spotify'));
  assert.ok(app?.keywords?.includes('listen to Apple Music'));
  assert.equal(d.body.querySelector('[data-seo-keywords],.seo-keywords,#seo-keywords'),null,'do not hide keyword-stuffing elements in body');
});
