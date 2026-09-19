const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('news article generator permanently includes the existing GTM container',()=>{
  const src=read('tools/refresh-news-rss.js');
  assert.match(src,/googletagmanager\.com\/gtm\.js\?id=/);
  assert.match(src,/GTM-M7J3NNBN/);
  assert.match(src,/googletagmanager\.com\/ns\.html\?id=GTM-M7J3NNBN/);
  assert.match(src,/for\s*\(const i of archive\)/,'all retained articles must be regenerated when the template changes');
});

test('noindex news source wrappers stay out of the canonical sitemap',()=>{
  const articleRoot=path.join(root,'news','articles');
  const sitemap=read('sitemap.xml');
  assert.match(sitemap,/<loc>https:\/\/matchapp\.tv\/news\/<\/loc>/);
  assert.doesNotMatch(sitemap,/https:\/\/matchapp\.tv\/news\/articles\//);
  for(const entry of fs.readdirSync(articleRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const file=path.join(articleRoot,entry.name,'index.html');
    if(!fs.existsSync(file))continue;
    assert.match(fs.readFileSync(file,'utf8'),/meta name="robots" content="noindex,follow"/);
  }
});
test('every generated news article currently carries GTM script and noscript fallback',()=>{
  const articleRoot=path.join(root,'news','articles');
  const missing=[];
  for(const entry of fs.readdirSync(articleRoot,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const file=path.join(articleRoot,entry.name,'index.html');
    if(!fs.existsSync(file))continue;
    const html=fs.readFileSync(file,'utf8');
    if(!html.includes('GTM-M7J3NNBN')||
       !html.includes('googletagmanager.com/gtm.js?id=')||
       !html.includes('googletagmanager.com/ns.html?id=GTM-M7J3NNBN')){
      missing.push(entry.name);
    }
  }
  assert.deepEqual(missing,[]);
});

