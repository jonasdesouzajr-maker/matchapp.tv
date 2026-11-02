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
  {item:{'@type':'VideoObject',description:'Official trailer for the fixture title.',name:'no source',url:'https://www.youtube.com/watch?v=abc'}},
  {item:{'@type':'VideoObject',description:'Official trailer for the fixture title.',name:'valid',embedUrl:'https://www.youtube.com/embed/abc'}},
  {item:{'@type':'VideoObject',description:'Official trailer for the fixture title.',contentUrl:'https://www.youtube.com/watch?v=abc'}},
  {item:{'@type':'VideoObject',description:'Official trailer for the fixture title.',contentUrl:'https://www.youtube.com/watch?v=abc',embedUrl:'https://www.youtube.com/embed/abc'}}
 ]},'test',issues);
 assert.equal(issues.length,3);
 assert.match(issues[0],/missing valid contentUrl or embedUrl/);
 assert.match(issues[1],/YouTube watch URL is not a video file/);
 assert.match(issues[2],/YouTube watch URL is not a video file/);
});
test('real external video preview with embedUrl is compliant',()=>{
 const issues=[];
 guard.inspectHtml('<html><head><script type="application/ld+json">'+JSON.stringify({
  '@type':'VideoObject',description:'Official trailer for the fixture title.',name:'Trailer',
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

test('video descriptions reject missing, blank and non-text values inside nested graphs',()=>{
 for(const description of [undefined,null,'',' \n\t ',42,{},['A trailer']]){
  const issues=[];
  guard.inspectHtml('<script type="application/ld+json">'+JSON.stringify({
   '@graph':[{'@type':'ItemList',itemListElement:[{item:{
    '@type':['CreativeWork','VideoObject'],description,
    embedUrl:'https://www.youtube-nocookie.com/embed/abc'
   }}]}]
  })+'</script>','fixture',issues);
  assert.equal(issues.length,1,JSON.stringify(description));
  assert.match(issues[0],/VideoObject missing nonblank text description/);
 }
});

test('featured video descriptions identify the existing embedded preview, not the guide page',()=>{
 const {JSDOM}=require('jsdom');
 for(const [slug,title,source,id] of [
  ['american-horror-story-13','American Horror Story season 13','FX','gQf4Vya5PbI'],
  ['a-gata-comeu','A Gata Comeu (1985)','Globoplay','sLCptaI_N-Y']
 ]){
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'..','featured',slug,'index.html'),'utf8'));
  try{
   const doc=dom.window.document;
   const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
   const video=graph.find(row=>row['@type']==='VideoObject');
   assert.ok(video.description.includes(title));
   assert.ok(video.description.includes(source));
   assert.match(video.description,/trailer|preview/);
   assert.notEqual(video.description,graph.find(row=>row['@type']==='WebPage').description);
   assert.equal(video.embedUrl,'https://www.youtube-nocookie.com/embed/'+id);
   assert.ok(doc.querySelector('iframe').src.startsWith(video.embedUrl));
  }finally{dom.window.close();}
 }
});

test('weekly runtime generates described playable videos for both manual and automatic picks',()=>{
 const {JSDOM}=require('jsdom'),vm=require('node:vm');
 const source=fs.readFileSync(path.join(__dirname,'..','weekly-pick.js'),'utf8');
 const generate=source.slice(source.indexOf('function enrichSeo(){'),source.indexOf('\nfunction hash(){'));
 for(const auto of [false,true]){
  const dom=new JSDOM('<html><head></head><body></body></html>');
  try{
   const PICK={title:'Fixture title',year:2026,synopsis:'Fixture synopsis.',previewId:'VtxQvbsGNIk',auto};
   const context={document:dom.window.document,PICK,AHS:{trailerId:'gQf4Vya5PbI'}};
   vm.runInNewContext(generate+';enrichSeo();enrichSeo();',context);
   const scripts=dom.window.document.querySelectorAll('#weekly-pick-schema');
   assert.equal(scripts.length,1,'repeated enrichment must not duplicate markup');
   const data=JSON.parse(scripts[0].textContent),issues=[];
   guard.videoIssues(data,'runtime',issues);
   assert.deepEqual(issues,[]);
   const videos=data['@graph'].filter(row=>row['@type']==='VideoObject');
   assert.equal(videos.length,auto?1:2);
   assert.ok(videos.every(video=>!video.contentUrl));
   if(!auto)assert.ok(videos[0].description.includes(PICK.title));
   // Existing dedicated pages own their static schema and must not be overwritten.
   scripts[0].remove();dom.window.document.body.setAttribute('data-weekly-page','ahs');
   vm.runInNewContext('enrichSeo();',context);
   assert.equal(dom.window.document.querySelector('#weekly-pick-schema'),null);
  }finally{dom.window.close();}
 }
});
