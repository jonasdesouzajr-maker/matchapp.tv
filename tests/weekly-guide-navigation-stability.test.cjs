'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{JSDOM}=require('jsdom');
const {renderGuideLinks}=require('../tools/search-guide-links.cjs');
function fixture(run){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-weekly-guide-'));
 const write=(route,html)=>{const file=path.join(root,route,'index.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);};
 try{
  fs.writeFileSync(path.join(root,'sitemap.xml'),'<urlset><url><loc>https://matchapp.tv/featured/this-week/</loc></url><url><loc>https://matchapp.tv/featured/exact-title/</loc></url></urlset>');
  write('/featured/exact-title/','<h1>Exact &amp; &lt;script&gt; title</h1>');
  run(root,write);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('weekly title rotation leaves the discovery link stable while exact-title labels remain source-derived',()=>{
 fixture((root,write)=>{
  write('/featured/this-week/','<h1>Animals (2026)</h1>');
  const before=renderGuideLinks(root);
  write('/featured/this-week/','<h1>Tenzing (2026)</h1>');
  assert.equal(renderGuideLinks(root),before,'daily title rotation must not invalidate the independently generated guide');
  const dom=new JSDOM(before);
  try{
   const weekly=dom.window.document.querySelector('a[href="/featured/this-week/"]');
   assert.equal(weekly.textContent,"This week's featured title");
   assert.equal(dom.window.document.querySelectorAll('a[href="/featured/this-week/"]').length,1);
   assert.equal(dom.window.document.querySelector('a[href="/featured/exact-title/"]').textContent,'Exact & <script> title');
   assert.equal(dom.window.document.querySelectorAll('script').length,0);
   assert.ok(before.includes('This week&#39;s featured title'),'the stable label still uses the shared escaping');
  }finally{dom.window.close();}
 });
});
test('the weekly link still honors robots and Googlebot noindex exclusions',()=>{
 fixture((root,write)=>{
  for(const robots of ['<meta name="robots" content="noindex,follow">','<meta name="googlebot" content="noindex">','<meta name="robots" content="none">']){
   write('/featured/this-week/',robots+'<h1>Tenzing (2026)</h1>');
   const output=renderGuideLinks(root);
   assert.ok(!output.includes('href="/featured/this-week/"'),'a stable label must not bypass indexing exclusions');
   assert.ok(output.includes('href="/featured/exact-title/"'));
  }
 });
});
test('the weekly link still requires a real, nonempty source heading',()=>{
 fixture((root,write)=>{
  for(const html of ['<p>No title heading</p>','<h1>   </h1>']){
   write('/featured/this-week/',html);
   assert.throws(()=>renderGuideLinks(root),/Guide lacks a visible heading: https:\/\/matchapp\.tv\/featured\/this-week\//);
  }
 });
});
