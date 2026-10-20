'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {generationPlan,generate,validateMetadata}=require('../tools/unified-refresh.cjs');

const repository=path.resolve(__dirname,'..');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-unified-runner-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const file of ['data/trending-week.json','data/weekly-pick.json','data/music-video-releases.json','featured/this-week/index.html','sitemap.xml']){
  fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
  fs.copyFileSync(path.join(repository,file),path.join(root,file));
 }
 return root;
}
function alter(root,file,change){
 const target=path.join(root,file);
 const data=JSON.parse(fs.readFileSync(target,'utf8'));
 change(data);
 fs.writeFileSync(target,JSON.stringify(data));
}
function ledger(root){return JSON.parse(fs.readFileSync(path.join(root,'artifacts/unified-refresh/generation.json'),'utf8'));}
function clock(){let tick=0;return ()=>new Date(Date.UTC(2026,9,20,4,30,tick++)).toISOString();}
function generateFixture(root,options){
 // Injected failures are test evidence, never real CI source freshness or job
 // summaries. The source runner is synchronous, so restore the environment
 // before another test can run.
 const originalSummary=process.env.GITHUB_STEP_SUMMARY;
 process.env.GITHUB_STEP_SUMMARY=path.join(root,'source-summary.md');
 try{return generate(root,options);}
 finally{
  if(originalSummary===undefined)delete process.env.GITHUB_STEP_SUMMARY;
  else process.env.GITHUB_STEP_SUMMARY=originalSummary;
 }
}

test('one source pass covers every retired owner and orders dependent generators before SEO and sitemap',()=>{
 const expected=[
  ['catalog-input','tools/sync-catalog-media.js','--dry-run'],
  ['catalog','tools/sync-catalog-media.js'],
  ['availability','tools/fetch-availability.js'],
  ['music','tools/refresh-music-videos.js'],
  ['trending','tools/refresh-trending.mjs'],
  ['weekly-choice','tools/refresh-weekly-pick.mjs'],
  ['sports','tools/refresh-sports-discovery.js'],
  ['news','tools/refresh-news-rss.js'],
  ['events','tools/build-global-events.js'],
  ['day-history','tools/archive-international-day.mjs'],
  ['awareness','tools/awareness-bot.mjs'],
  ['catalog-seo','tools/build-seo-pages.js'],
  ['watch-pages','tools/build-watch-pages.js'],
  ['world-guide','tools/build-world-discovery-guide.js'],
  ['sitemap','tools/update-sitemap.js']
 ];
 assert.deepEqual(generationPlan,expected);
 assert.equal(new Set(generationPlan.map(([name])=>name)).size,generationPlan.length,'each named source stage runs once');
 const scripts=generationPlan.map(([,script])=>script);
 for(const script of ['tools/fetch-availability.js','tools/refresh-trending.mjs','tools/refresh-sports-discovery.js','tools/refresh-news-rss.js','tools/build-global-events.js','tools/archive-international-day.mjs','tools/awareness-bot.mjs']){
  assert.equal(scripts.filter(value=>value===script).length,1,script+' has exactly one owner');
 }
 assert.ok(scripts.indexOf('tools/refresh-music-videos.js')<scripts.indexOf('tools/refresh-trending.mjs'));
 assert.ok(scripts.indexOf('tools/refresh-sports-discovery.js')<scripts.indexOf('tools/refresh-news-rss.js'));
 assert.ok(scripts.indexOf('tools/build-seo-pages.js')<scripts.indexOf('tools/build-watch-pages.js'));
 assert.equal(scripts.at(-1),'tools/update-sitemap.js');
});

test('successful generation invokes real Node child argv once per stage and saves source-only evidence',t=>{
 const root=fixture(t),calls=[];
 const result=generateFixture(root,{now:clock(),run(executable,args,options){
  const pending=ledger(root),stage=generationPlan[calls.length];
  assert.equal(pending.status,'running');
  assert.equal(pending.steps.at(-1).name,stage[0]);
  assert.equal(pending.steps.at(-1).status,'running','reserve evidence before starting child');
  assert.equal(executable,process.execPath,'use the current actual Node executable');
  assert.deepEqual(args,stage.slice(1),'script is the first argv, followed by its CLI options');
  assert.deepEqual(options,{cwd:root,stdio:'inherit',timeout:15*60*1000});
  calls.push([executable,args]);
  return {status:0};
 }});
 assert.equal(calls.length,generationPlan.length);
 assert.equal(result.status,'success');
 assert.equal(result.runId,process.env.GITHUB_RUN_ID||null);
 assert.equal(result.sourceSha,null,'a fixture without a checkout must not invent provenance from the trigger');
 assert.equal(result.triggerSha,process.env.GITHUB_SHA||null);
 assert.deepEqual(result.metadata,validateMetadata(root));
 assert.deepEqual(ledger(root),result);
 assert.deepEqual(result.steps.map(s=>s.name),generationPlan.map(([name])=>name));
 for(const step of result.steps){
  assert.equal(step.status,'success');assert.equal(step.exitCode,0);
  assert.ok(Date.parse(step.completedAt)>Date.parse(step.startedAt));
 }
 assert.ok(Date.parse(result.completedAt)>Date.parse(result.steps.at(-1).completedAt));
 assert.ok(calls.every(([,args])=>!args.some(arg=>/publish|deploy|commit|dispatch/.test(arg))),'source runner must not publish');
});

test('generation provenance follows actual checkout HEAD after a rebuild instead of the original trigger SHA',t=>{
 const root=fixture(t);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 git(['init','-q']);
 git(['config','user.name','Refresh fixture']);
 git(['config','user.email','fixture@example.invalid']);
 git(['commit','--allow-empty','-qm','Original source']);
 const original=git(['rev-parse','HEAD']);
 const previous=process.env.GITHUB_SHA;
 process.env.GITHUB_SHA=original;
 try{
  const first=generateFixture(root,{run:()=>({status:0})});
  assert.equal(first.sourceSha,original);
  git(['commit','--allow-empty','-qm','Fresh source after main advanced']);
  const current=git(['rev-parse','HEAD']);
  assert.notEqual(current,original);
  const rebuilt=generateFixture(root,{run:()=>({status:0})});
  assert.equal(rebuilt.sourceSha,current);
  assert.equal(rebuilt.triggerSha,original);
 }finally{
  if(previous===undefined)delete process.env.GITHUB_SHA;
  else process.env.GITHUB_SHA=previous;
 }
});

test('failed sports ingestion stops before news, leaves an accurate failed ledger and authorizes no publication',t=>{
 const root=fixture(t),called=[];
 assert.throws(()=>generateFixture(root,{now:clock(),run(executable,args){
  assert.equal(executable,process.execPath);
  called.push(args[0]);
  return {status:args[0]==='tools/refresh-sports-discovery.js'?23:0};
 }}),/sports failed; no editorial commit is authorized/);
 const saved=ledger(root),failedIndex=generationPlan.findIndex(([name])=>name==='sports');
 assert.deepEqual(called,generationPlan.slice(0,failedIndex+1).map(([,script])=>script));
 assert.ok(!called.includes('tools/refresh-news-rss.js'));
 assert.ok(!called.includes('tools/update-sitemap.js'));
 assert.equal(saved.status,'failed');
 assert.match(saved.error,/sports failed/);
 assert.equal(saved.steps.length,failedIndex+1);
 assert.ok(saved.steps.slice(0,-1).every(step=>step.status==='success'));
 assert.equal(saved.steps.at(-1).name,'sports');
 assert.equal(saved.steps.at(-1).status,'failed');
 assert.equal(saved.steps.at(-1).exitCode,23);
 assert.ok(saved.steps.at(-1).completedAt);
 assert.ok(saved.completedAt);
 assert.equal(saved.metadata,undefined);
 const summary=fs.readFileSync(path.join(root,'source-summary.md'),'utf8');
 assert.match(summary,/- sports: failed/);
 assert.doesNotMatch(summary,/- news:/);
 assert.match(summary,/Source\/generation result: failed\. Publication and live verification are separate gates\./);
});

test('child timeout is a failed source check rather than a successful empty generation',t=>{
 const root=fixture(t),called=[];
 assert.throws(()=>generateFixture(root,{now:clock(),run(executable,args){
  called.push(args[0]);
  return {status:null,error:Object.assign(new Error('spawn timed out'),{code:'ETIMEDOUT'})};
 }}),/catalog-input failed/);
 assert.deepEqual(called,['tools/sync-catalog-media.js']);
 const saved=ledger(root);
 assert.equal(saved.status,'failed');
 assert.equal(saved.steps.length,1);
 assert.equal(saved.steps[0].status,'failed');
 assert.equal(saved.steps[0].exitCode,null);
});

test('metadata gate accepts committed verified output without network or source mutations',t=>{
 const root=fixture(t),result=validateMetadata(root);
 assert.ok(result.topTitles>=16);
 assert.ok(result.featuredMusic>=4);
 assert.equal(result.weeklyPick,JSON.parse(fs.readFileSync(path.join(root,'data/weekly-pick.json'),'utf8')).title);
});

test('verified digit-string and zero view counts remain valid without accepting missing values',t=>{
 const root=fixture(t);
 alter(root,'data/music-video-releases.json',d=>{
  d.items.find(x=>x.id===d.featuredIds[0]).viewCount='1234567';
  d.items.find(x=>x.id===d.featuredIds[1]).viewCount=0;
 });
 assert.ok(validateMetadata(root).featuredMusic>=4);
});

test('metadata gate rejects incomplete Top Titles, music, weekly choice and generated discovery',async t=>{
 const invalid=[
  ['too few titles','data/trending-week.json',d=>{d.titles=d.titles.slice(0,15);},/too few verified entries/],
  ['missing title array','data/trending-week.json',d=>{delete d.titles;},/too few verified entries/],
  ['too few music releases','data/music-video-releases.json',d=>{d.featuredIds=d.featuredIds.slice(0,3);},/Too few verified music/],
  ['unresolved music identities','data/music-video-releases.json',d=>{d.featuredIds=['missing-video'];},/music|Music/],
  ['duplicate featured music identities','data/music-video-releases.json',d=>{d.featuredIds=Array(4).fill(d.featuredIds[0]);},/music|Music|featured/],
  ['music URL does not match verified identity','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).url='https://www.youtube.com/watch?v=abcdefghijk';},/Incomplete verified music/],
  ['invalid music date','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).publishedAt='not-a-date';},/Incomplete verified music/],
  ['negative music views','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).viewCount=-1;},/Incomplete verified music/],
  ['fractional music views','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).viewCount=1.5;},/Incomplete verified music/],
  ['unsafe music view integer','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).viewCount=Number.MAX_SAFE_INTEGER+1;},/Incomplete verified music/],
  ...[null,true,false,'',' ','1.5','1e3','0x10'].map(value=>['unverified music view count '+JSON.stringify(value),'data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).viewCount=value;},/Incomplete verified music/]),
  ['unofficial music URL','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).url='https://unofficial.example/watch?v=abcdefghijk';},/Incomplete verified music/],
  ['missing music SEO title','data/music-video-releases.json',d=>{delete d.items.find(x=>x.id===d.featuredIds[0]).seo.title;},/Incomplete verified music/],
  ['missing music SEO description','data/music-video-releases.json',d=>{delete d.items.find(x=>x.id===d.featuredIds[0]).seo.description;},/Incomplete verified music/],
  ['blank music SEO title','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).seo.title='  ';},/Incomplete verified music/],
  ['blank music SEO description','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).seo.description='  ';},/Incomplete verified music/],
  ['too few music SEO keywords','data/music-video-releases.json',d=>{d.items.find(x=>x.id===d.featuredIds[0]).seo.keywords=['one'];},/Incomplete verified music/],
  ...['title','tmdbId','poster','synopsis'].map(field=>['missing weekly '+field,'data/weekly-pick.json',d=>{delete d[field];},/Weekly choice is incomplete/]),
  ...['title','poster','synopsis'].map(field=>['blank weekly '+field,'data/weekly-pick.json',d=>{d[field]='  ';},/Weekly choice is incomplete/]),
  ...['not-an-id',0,-1,1.5,null,true,'',' '].map(value=>['invalid weekly TMDB ID '+JSON.stringify(value),'data/weekly-pick.json',d=>{d.tmdbId=value;},/Weekly choice is incomplete/])
 ];
 for(const [name,file,change,error] of invalid)await t.test(name,t=>{
  const root=fixture(t);alter(root,file,change);
  assert.throws(()=>validateMetadata(root),error);
 });
 await t.test('missing featured page',t=>{
  const root=fixture(t);fs.unlinkSync(path.join(root,'featured/this-week/index.html'));
  assert.throws(()=>validateMetadata(root),/Weekly featured page or sitemap entry missing/);
 });
 await t.test('missing featured sitemap entry',t=>{
  const root=fixture(t),file=path.join(root,'sitemap.xml');
  fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('https://matchapp.tv/featured/this-week/','https://matchapp.tv/unrelated/'));
  assert.throws(()=>validateMetadata(root),/Weekly featured page or sitemap entry missing/);
 });
});

test('metadata failure after zero-exit child scripts still fails the unified generation ledger',t=>{
 const root=fixture(t),called=[];
 alter(root,'data/weekly-pick.json',d=>{delete d.poster;});
 assert.throws(()=>generateFixture(root,{now:clock(),run(executable,args){called.push(args[0]);return {status:0};}}),/Weekly choice is incomplete/);
 const saved=ledger(root);
 assert.equal(called.length,generationPlan.length);
 assert.equal(saved.steps.length,generationPlan.length);
 assert.ok(saved.steps.every(step=>step.status==='success'));
 assert.equal(saved.status,'failed','green child exits do not bypass metadata validation');
 assert.match(saved.error,/Weekly choice is incomplete/);
 assert.equal(saved.metadata,undefined);
});
