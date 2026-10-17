'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {renderGuideLinks}=require('../tools/search-guide-links.cjs');
const ROOT=path.resolve(__dirname,'..');
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-editorial-order-'));fs.mkdirSync(path.join(root,'tools'));return root;}
function page(root,route,title,robots=''){const file=path.join(root,route,'index.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'<!doctype html><html><head>'+robots+'</head><body><h1>'+title+'</h1></body></html>');}
function sitemap(root,routes){fs.writeFileSync(path.join(root,'sitemap.xml'),'<urlset>'+routes.map(route=>'<url><loc>https://matchapp.tv'+route+'</loc></url>').join('')+'</urlset>');}
function manifest(root,name,urls){fs.writeFileSync(path.join(root,'tools',name),JSON.stringify(urls));}
test('owner manifests keep guide navigation identical before and after the nightly sitemap rebuild',()=>{
 const root=fixture();try{
  const current='/awareness/current-day/',old='/awareness/ended-outside-retention/',family='/kids/titles/reviewed-title/',featured='/featured/weekly/';
  for(const route of [current,old,family,featured])page(root,route,route);
  sitemap(root,[old,featured]);
  manifest(root,'awareness-urls.json',['https://matchapp.tv'+current]);manifest(root,'kids-urls.json',['https://matchapp.tv'+family]);
  const before=renderGuideLinks(root);assert.ok(before.includes(current));assert.ok(before.includes(family));assert.ok(before.includes(featured));assert.ok(!before.includes(old));
  sitemap(root,[family,current,featured]);assert.equal(renderGuideLinks(root),before);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('current owner manifests remain canonical, noindex-filtered, deduplicated and deterministically ordered',()=>{
 const root=fixture();try{
  sitemap(root,[]);page(root,'/awareness/z/','Z');page(root,'/awareness/a/','A');page(root,'/awareness/private/','Private','<meta name="robots" content="noindex,follow">');
  const urls=['https://matchapp.tv/awareness/z/','https://other.example/awareness/a/','https://matchapp.tv/awareness/private/','https://matchapp.tv/awareness/a/','https://matchapp.tv/awareness/z/'];
  manifest(root,'awareness-urls.json',urls);const output=renderGuideLinks(root);
  assert.ok(!output.includes('other.example'));assert.ok(!output.includes('/awareness/private/'));assert.equal((output.match(/href="\/awareness\/z\/"/g)||[]).length,1);assert.ok(output.indexOf('/awareness/a/')<output.indexOf('/awareness/z/'));
  manifest(root,'awareness-urls.json',urls.reverse());assert.equal(renderGuideLinks(root),output);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('malformed owner manifest blocks output rather than silently clearing previously valid navigation',()=>{
 const root=fixture();try{sitemap(root,[]);manifest(root,'awareness-urls.json',{urls:[]});assert.throws(()=>renderGuideLinks(root),/Invalid guide URL manifest/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('event archive generator retains the currently approved shared-runtime URL',()=>{
 const template=fs.readFileSync(path.join(ROOT,'tools/build-global-events.js'),'utf8'),archive=fs.readFileSync(path.join(ROOT,'events-archive.html'),'utf8');
 const script=/<script src="(\/app\.js\?[^\"]+)"/;
 assert.equal(template.match(script)?.[1],archive.match(script)?.[1]);assert.ok(template.match(script)?.[1].includes('&amp;regional=20261016-1'));
});
test('only the event archive shell retains the existing token assets before its shared runtime',()=>{
 const source=fs.readFileSync(path.join(ROOT,'tools/build-global-events.js'),'utf8');
 const start=source.indexOf('function shell('),end=source.indexOf('\nconst urls=[];',start);
 assert.ok(start>=0&&end>start);
 const shell=vm.runInNewContext(source.slice(start,end)+'\nshell');
 const args={headHtml:'<title>Verified events</title>',body:'<section id="original-events">Original event details</section>'};
 const archive=shell({...args,archive:true}),guide=shell(args);
 const script='/match-tokens.js?v=20261017-3',style='/match-tokens.css?v=20261017-3';
 assert.equal(archive.split(script).length-1,1);assert.equal(archive.split(style).length-1,1);
 assert.ok(archive.indexOf(style)<archive.indexOf('</head>'));
 assert.ok(archive.indexOf(script)<archive.indexOf('/app.js?v='));
 assert.ok(archive.includes(args.body)&&guide.includes(args.body));
 assert.ok(!guide.includes('/match-tokens.js')&&!guide.includes('/match-tokens.css'));
});
test('Awareness regeneration preserves the approved shared shell and committed source content',()=>{
 const source=fs.readFileSync(path.join(ROOT,'tools/awareness-bot.mjs'),'utf8');
 const start=source.indexOf('const today='),end=source.indexOf('\nconst cal=read(CAL,');
 assert.ok(start>=0&&end>start,'evaluate render definitions without the network/publishing entry point');
 const render=vm.runInNewContext(source.slice(start,end)+'\n({expand,generic})',{
  fetch(){throw Error('Template parity must not fetch or refresh editorial sources');}
 });
 const hub=fs.readFileSync(path.join(ROOT,'news/index.html'),'utf8');
 const assets=[
  hub.match(/<link rel="stylesheet" href="\/brand\.css\?[^\"]+">/)?.[0],
  hub.match(/<script defer src="\/patches\/jonas-adult-page\.js\?[^\"]+"><\/script>/)?.[0],
  hub.match(/<script defer src="\/patches\/immersive-feedback-20261014\.js\?[^\"]+"><\/script>/)?.[0]
 ];
 assert.ok(assets.every(Boolean),'the approved adult hub owns all three shell assets');
 const calendar=JSON.parse(fs.readFileSync(path.join(ROOT,'awareness/calendar.json'),'utf8'));
 for(const key of ['breast-cancer-awareness-month','world-aids-day','world-diabetes-day']){
  const entry=calendar.events.find(item=>item.key===key);assert.ok(entry,key);
  const campaign=render.expand(entry,2026),output=render.generic(campaign);
  for(const asset of assets){
   assert.equal(output.split(asset).length-1,1,key+' retains one exact approved asset');
   assert.ok(output.indexOf(asset)<output.indexOf('</head>'),key+' keeps the shell in the head');
  }
  assert.equal(output,fs.readFileSync(path.join(ROOT,'awareness',campaign.id,'index.html'),'utf8'),key+' template retains the committed source, metadata and body');
 }
});
