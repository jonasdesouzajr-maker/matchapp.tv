'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function eventFixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'event-runtime-fixture-'));fs.mkdirSync(path.join(dir,'tools'));
 for(const file of ['build-global-events.js','event-lifecycle.js'])fs.copyFileSync(path.join(ROOT,'tools',file),path.join(dir,'tools',file));
 const record=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/global-events.json'),'utf8'))[0];
 fs.writeFileSync(path.join(dir,'tools/global-events.json'),JSON.stringify([{...record,slug:'fixture-event',start:'2026-01-01T00:00:00Z',end:'2026-12-31T23:59:59Z'}]));
 fs.writeFileSync(path.join(dir,'tools/finalize-brand.js'),'module.exports={finalizeBrand(){return 0;}};');
 fs.writeFileSync(path.join(dir,'fixture-clock.cjs'),"Date.now=()=>Date.parse('2026-10-19T19:00:00Z');");
 const home=(script='fixture-js1',style='fixture-css1')=>'<!doctype html><html><head><link rel="stylesheet" href="/match-tokens.css?v='+style+'&amp;mode=css"></head><body><section id="global-events">Previous events</section><script src="/match-tokens.js?v='+script+'&amp;feature=1"></script></body></html>';
 fs.writeFileSync(path.join(dir,'index.html'),home());
 return {dir,home,run(){return spawnSync(process.execPath,['--require',path.join(dir,'fixture-clock.cjs'),path.join(dir,'tools/build-global-events.js')],{encoding:'utf8'});},read(file){return fs.readFileSync(path.join(dir,file),'utf8');},write(file,value){fs.writeFileSync(path.join(dir,file),value);},close(){fs.rmSync(dir,{recursive:true,force:true});}};
}
test('event regeneration preserves actual Home token URLs and archive-only load order',()=>{
 const f=eventFixture();try{
  const result=f.run();assert.equal(result.status,0,result.stderr);const archive=f.read('events-archive.html'),guide=f.read('events/fixture-event/index.html');
  const script='/match-tokens.js?v=fixture-js1&amp;feature=1',style='/match-tokens.css?v=fixture-css1&amp;mode=css';
  assert.equal(archive.split(script).length-1,1);assert.equal(archive.split(style).length-1,1);
  assert.ok(archive.indexOf(style)<archive.indexOf('</head>'));assert.ok(archive.indexOf(script)<archive.indexOf('/app.js?'));
  assert.ok(!guide.includes('/match-tokens.js')&&!guide.includes('/match-tokens.css'));
 }finally{f.close();}
});
test('future approved token pins propagate on regeneration and identical event builds remain byte-stable',()=>{
 const f=eventFixture();try{
  assert.equal(f.run().status,0);f.write('index.html',f.home('future-js2','future-css2'));
  assert.equal(f.run().status,0);const paths=['index.html','events-archive.html','events/fixture-event/index.html','tools/event-urls.json'],saved=paths.map(p=>f.read(p));
  assert.ok(saved[1].includes('/match-tokens.js?v=future-js2&amp;feature=1'));
  assert.ok(saved[1].includes('/match-tokens.css?v=future-css2&amp;mode=css'));
  assert.equal(f.run().status,0);assert.deepEqual(paths.map(p=>f.read(p)),saved);
 }finally{f.close();}
});
test('missing authoritative Home token pins fail before replacing last-good generated pages',()=>{
 const f=eventFixture();try{
  f.write('events-archive.html','Last-good archive must remain exact');f.write('index.html','<section id="global-events">Last-good Home</section>');
  const result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/token.*(?:asset|URL|cache|pin)/i);
  assert.equal(f.read('events-archive.html'),'Last-good archive must remain exact');assert.equal(f.read('index.html'),'<section id="global-events">Last-good Home</section>');
 }finally{f.close();}
});
function awarenessFixture(){
 const source=fs.readFileSync(path.join(ROOT,'tools/awareness-bot.mjs'),'utf8');
 const start=source.indexOf('const today='),end=source.indexOf('\nconst cal=read(CAL,');
 let html='',writes=0;
 const api=vm.runInNewContext(source.slice(start,end)+'\n({expand,block,syncHome})',{
  HOME:'fixture-home',fs:{readFileSync(){return html;},writeFileSync(file,value){assert.equal(file,'fixture-home');writes++;html=value;}},
  fetch(){throw Error('Idempotency fixtures must never fetch editorial sources');}
 });
 const calendar=JSON.parse(fs.readFileSync(path.join(ROOT,'awareness/calendar.json'),'utf8'));
 const campaign=api.expand(calendar.events.find(x=>x.key==='breast-cancer-awareness-month'),2026);
 return {...api,campaign,set(value){html=value;},get(){return html;},writes(){return writes;}};
}
test('unchanged awareness rotation never accumulates Home whitespace on repeated passes',()=>{
 const f=awarenessFixture(),before='<main>Unrelated Home content stays exact.</main>\n\n'+f.block(f.campaign)+'\n\n    <footer class="seo-footer">Original footer</footer>';
 f.set(before);for(let i=0;i<3;i++){f.syncHome(f.campaign);assert.equal(f.get(),before,'same campaign must be byte-identical');}
});
test('awareness replacement and duplicate cleanup keep their owned separators stable',()=>{
 const f=awarenessFixture();f.set('<main>Unrelated content</main>\n'+f.block(f.campaign)+'\n\n'+f.block(f.campaign)+'\n\n    <footer class="seo-footer">Original footer</footer>');
 f.syncHome(null);const saved=f.get();assert.equal((saved.match(/AWARENESS-SPOTLIGHT:START/g)||[]).length,1);assert.ok(saved.startsWith('<main>Unrelated content</main>\n'));assert.ok(saved.endsWith('    <footer class="seo-footer">Original footer</footer>'));
 f.syncHome(null);assert.equal(f.get(),saved);
});
test('missing Home placement leaves the last-good document untouched and remains an error',()=>{
 const f=awarenessFixture(),before='<main>No approved footer</main>'+f.block(f.campaign);f.set(before);
 assert.throws(()=>f.syncHome(f.campaign),/Home footer missing/);assert.equal(f.get(),before);assert.equal(f.writes(),0);
});
function sitemapFixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sitemap-clock-fixture-'));fs.mkdirSync(path.join(dir,'tools'));
 const source=fs.readFileSync(path.join(ROOT,'tools/update-sitemap.js'),'utf8');fs.writeFileSync(path.join(dir,'tools/update-sitemap.js'),source);
 const core=vm.runInNewContext(source.slice(source.indexOf('const CORE ='),source.indexOf('function readList'))+'\nCORE',{SITE:'https://matchapp.tv'});
 for(const entry of [...core,{loc:'https://matchapp.tv/news/'}]){const u=new URL(entry.loc),rel=u.pathname==='/'?'index.html':u.pathname.endsWith('/')?u.pathname.slice(1)+'index.html':u.pathname.slice(1),file=path.join(dir,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'<!doctype html><title>Fixture</title>');}
 fs.writeFileSync(path.join(dir,'fixture-clock.cjs'),"const NativeDate=Date;global.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[process.env.MATCHAPP_FIXTURE_NOW]));}static now(){return new NativeDate(process.env.MATCHAPP_FIXTURE_NOW).valueOf();}};");
 const git=(...args)=>{const r=spawnSync('git',args,{cwd:dir,encoding:'utf8',env:{...process.env,GIT_AUTHOR_DATE:'2026-10-18T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-18T12:00:00Z'}});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 git('init','--initial-branch=main');git('config','user.name','Sitemap Fixture');git('config','user.email','fixture@example.invalid');git('add','.');git('commit','-m','baseline');
 return {dir,git,run(now){const r=spawnSync(process.execPath,['--require',path.join(dir,'fixture-clock.cjs'),path.join(dir,'tools/update-sitemap.js')],{encoding:'utf8',env:{...process.env,MATCHAPP_FIXTURE_NOW:now}});assert.equal(r.status,0,r.stderr);},read(file){return fs.readFileSync(path.join(dir,file),'utf8');},close(){fs.rmSync(dir,{recursive:true,force:true});}};
}
test('an unchanged committed sitemap does not acquire a new index timestamp on the next owner check',()=>{
 const f=sitemapFixture();try{
  f.run('2026-10-19T12:00:00Z');f.git('add','sitemap.xml','sitemaps.xml');f.git('commit','-m','generated sitemap');
  const saved=[f.read('sitemap.xml'),f.read('sitemaps.xml')];f.run('2026-10-20T12:00:00Z');
  assert.deepEqual([f.read('sitemap.xml'),f.read('sitemaps.xml')],saved);assert.equal(f.git('status','--porcelain'),'','unchanged checks must not cause commits or Pages requests');
 }finally{f.close();}
});
test('a genuine sitemap URL-set change advances its index timestamp and includes the new canonical route',()=>{
 const f=sitemapFixture();try{
  f.run('2026-10-19T12:00:00Z');f.git('add','.');f.git('commit','-m','generated sitemap');
  const page=path.join(f.dir,'collections/fixture/index.html');fs.mkdirSync(path.dirname(page),{recursive:true});fs.writeFileSync(page,'<!doctype html><title>New canonical fixture</title>');
  fs.writeFileSync(path.join(f.dir,'tools/seo-urls.json'),JSON.stringify(['https://matchapp.tv/collections/fixture/']));f.git('add','.');f.git('commit','-m','real new URL');
  f.run('2026-10-20T12:00:00Z');assert.ok(f.read('sitemap.xml').includes('<loc>https://matchapp.tv/collections/fixture/</loc>'));assert.ok(f.read('sitemaps.xml').includes('<lastmod>2026-10-20T12:00:00+00:00</lastmod>'));
 }finally{f.close();}
});
test('a co-published page and sitemap keep their real render date instead of creating a commit-time-only update',()=>{
 const f=sitemapFixture();try{
  f.run('2026-10-19T12:00:00Z');f.git('add','.');f.git('commit','-m','initial sitemap');
  fs.appendFileSync(path.join(f.dir,'index.html'),'<!-- Genuine page update -->');f.run('2026-10-19T12:10:00Z');
  f.git('add','.');const commit=spawnSync('git',['commit','-m','page and sitemap published together'],{cwd:f.dir,encoding:'utf8',env:{...process.env,GIT_AUTHOR_DATE:'2026-10-19T12:15:00Z',GIT_COMMITTER_DATE:'2026-10-19T12:15:00Z'}});assert.equal(commit.status,0,commit.stderr);
  const saved=[f.read('sitemap.xml'),f.read('sitemaps.xml')];f.run('2026-10-20T12:00:00Z');
  assert.deepEqual([f.read('sitemap.xml'),f.read('sitemaps.xml')],saved);assert.equal(f.git('status','--porcelain'),'');
 }finally{f.close();}
});
function brandFixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brand-owner-scope-'));fs.mkdirSync(path.join(dir,'tools'));
 const initial='<!doctype html><html><head><title>Owned fixture</title><link rel="stylesheet" href="/brand.css?v=fixture"></head><body><header><a href="/">MatchApp Ai</a></header><main>Existing content</main></body></html>';
 const files=['index.html','events-archive.html','events/fixture/index.html','moods/fixture/index.html','where-to-watch/fixture/index.html','en/us/watch/index.html','trending/this-week/index.html','featured/this-week/index.html','events-other/fixture/index.html'];
 for(const rel of files){const p=path.join(dir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,initial);}
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'tools/finalize-brand.js'),'utf8'),{require,module,__dirname:path.join(dir,'tools'),URLSearchParams});
 return {dir,files,initial,finalize:module.exports.finalizeBrand,read(rel){return fs.readFileSync(path.join(dir,rel),'utf8');},close(){fs.rmSync(dir,{recursive:true,force:true});}};
}
for(const generator of ['build-global-events.js','build-seo-pages.js','build-watch-pages.js'])test(generator+' finalizes only existing owned output paths, preserving other publishers byte-for-byte',()=>{
 const source=fs.readFileSync(path.join(ROOT,'tools',generator),'utf8'),match=source.match(/\.finalizeBrand\((\[[^\]]*\])\)/);assert.ok(match,'generator must declare its existing owned finalization paths');
 const scopes=vm.runInNewContext(match[1]),f=brandFixture();try{
  f.finalize(scopes);
  for(const rel of f.files){
   const owned=scopes.some(scope=>rel===scope||(scope.endsWith('/')&&rel.startsWith(scope)));
   if(owned){assert.notEqual(f.read(rel),f.initial);assert.ok(f.read(rel).includes('matchapp-wordmark'));}
   else assert.equal(f.read(rel),f.initial,'unrelated '+rel+' must not acquire unstaged changes or new sitemap dates');
  }
 }finally{f.close();}
});
test('the dedicated brand owner retains its global default and byte-stable normalization',()=>{
 const f=brandFixture();try{
  assert.equal(f.finalize(),f.files.length);const saved=f.files.map(file=>f.read(file));assert.equal(f.finalize(),0);assert.deepEqual(f.files.map(file=>f.read(file)),saved);
 }finally{f.close();}
});
