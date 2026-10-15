const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const guard=require('../tools/gsc-index-video-guard-20261012.cjs');
test('breadcrumbs cannot advertise missing section roots, including nested graphs',()=>{
 const os=require('node:os'),root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-breadcrumb-'));
 try{
  fs.writeFileSync(path.join(root,'index.html'),'Home');
  fs.mkdirSync(path.join(root,'collections','movie'),{recursive:true});
  fs.writeFileSync(path.join(root,'collections','movie','index.html'),'Movies');
  const issues=[];
  guard.breadcrumbIssues({'@graph':[{'@type':'BreadcrumbList',itemListElement:[
   {item:'https://matchapp.tv/'},
   {item:'https://matchapp.tv/collections/'},
   {item:{'@id':'https://matchapp.tv/collections/movie/'}},
   {name:'Current page'}
  ]}]},'fixture',issues,root);
  assert.deepEqual(issues,['fixture: Breadcrumb target missing: https://matchapp.tv/collections/']);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('all submitted pages remain indexable and dynamic video markup stays valid',()=>{
 const r=guard.audit();
 assert.ok(r.sitemapUrls>=100);
 assert.equal(r.sitemapMissing,0);
 assert.equal(r.noindexInSitemap,0);
 assert.equal(r.examplePrivateExcluded,true,'profile must remain out of sitemap');
 assert.ok(r.filesWithVideoMarkup>0);
 assert.deepEqual(r.errors,[]);
});
test('video schemas require a real content URL or embeddable URL, even when nested',()=>{
 const issues=[];
 guard.videoIssues({'@context':'https://schema.org','@type':'ItemList',itemListElement:[
  {item:{'@type':'VideoObject',name:'no source',url:'https://www.youtube.com/watch?v=abc'}},
  {item:{'@type':'VideoObject',name:'valid',embedUrl:'https://www.youtube.com/embed/abc'}},
  {item:{'@type':'VideoObject',contentUrl:'https://www.youtube.com/watch?v=abc'}},
  {item:{'@type':'VideoObject',contentUrl:'https://www.youtube.com/watch?v=abc',embedUrl:'https://www.youtube.com/embed/abc'}}
 ]},'test',issues);
 assert.equal(issues.length,3);
 assert.match(issues[0],/missing valid contentUrl or embedUrl/);
 assert.match(issues[1],/YouTube watch URL is not a video file/);
 assert.match(issues[2],/YouTube watch URL is not a video file/);
});
test('real external video preview with embedUrl is compliant',()=>{
 const issues=[];
 guard.inspectHtml('<html><head><script type="application/ld+json">'+JSON.stringify({
  '@type':'VideoObject',name:'Trailer',
  embedUrl:'https://www.youtube-nocookie.com/embed/abc'})+'</script></head></html>','test',issues);
 assert.deepEqual(issues,[]);
});
test('noindex private/auth pages stay deliberately excluded from sitemap',()=>{
 const root=path.join(__dirname,'..');
 const raw=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 for(const url of ['/profile/profile.html','/callback.html','/ai-check.html','/billing-check.html']){
  assert.ok(!raw.includes('https://matchapp.tv'+url),url+' should never appear in indexable sitemap');
 }
 assert.match(fs.readFileSync(path.join(root,'profile/profile.html'),'utf8'),/noindex/i);
});
