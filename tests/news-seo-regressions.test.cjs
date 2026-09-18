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

test('sitemap news article count exactly matches article index files on disk',()=>{
  const articleRoot=path.join(root,'news','articles');
  const slugs=fs.readdirSync(articleRoot,{withFileTypes:true})
    .filter(entry=>entry.isDirectory()&&fs.existsSync(path.join(articleRoot,entry.name,'index.html')))
    .map(entry=>entry.name)
    .sort();

  const sitemap=read('sitemap.xml');
  const urls=[...sitemap.matchAll(/<loc>https:\/\/matchapp\.tv\/news\/articles\/([^<\/]+)\/<\/loc>/g)]
    .map(m=>m[1])
    .sort();

  assert.equal(urls.length,slugs.length,'every article on disk must have exactly one sitemap URL');
  assert.deepEqual(urls,slugs);
});
