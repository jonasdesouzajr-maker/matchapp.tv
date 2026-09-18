const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const adsScript=/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-9541435081010948/;
const slot=/<ins class="adsbygoogle"/;

test('AdSense is restricted to the content-rich homepage',()=>{
  const home=read('index.html');
  assert.match(home,adsScript);
  assert.match(home,/google-adsense-account" content="ca-pub-9541435081010948"/);
  const unsafe=['oauth/consent.html','discover.html','together.html','pricing/pricing.html','profile/profile.html'];
  for(const file of unsafe){
    const html=read(file);
    assert.doesNotMatch(html,adsScript,file+' must not load AdSense');
    assert.doesNotMatch(html,slot,file+' must not contain AdSense slots');
  }
  const serve=read('ads-serve.js');
  assert.match(serve,/adAllowedPath=location\.pathname==='\/'\|\|location\.pathname==='\/index\.html'/);
  assert.match(serve,/classList\.add\('ads-empty'\);return/);
});

test('automated news is not monetized directly',()=>{
  const news=read('latest-news.js');
  assert.doesNotMatch(news,/ma-news-ad/);
  assert.doesNotMatch(news,/adsbygoogle/);
});

test('default match CTA does not make an unverified streaming claim',()=>{
  const home=read('index.html');
  assert.match(home,/id="res-direct-link"[\s\S]{0,500}data-i18n="res\.findwhere">▶ Where to Watch<\/a>/);
  assert.doesNotMatch(home,/id="res-direct-link"[\s\S]{0,500}>▶ Stream Now<\/a>/);
});
