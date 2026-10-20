#!/usr/bin/env node
'use strict';

// One ordered source pass. This module never dispatches, schedules or commits.
// Publication and its unchanged validation gates belong to unified-refresh.yml.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const generationPlan=Object.freeze([
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
].map(Object.freeze));

// The union of the retired owners' output, including every regional watch tree.
// Do not stage source code, credentials, tests, native files or arbitrary data.
const ownedPaths=Object.freeze([
 'index.html','data/availability.json','data/music-video-releases.json',
 'data/trending-week.json','data/trending-keywords.json','data/weekly-pick.json',
 'weekly-pick-data.js','assets/music-videos','trending/this-week','featured/this-week',
 'news','events','events-archive.html','where-to-watch','awareness/current.json',
 'tools/event-urls.json','tools/awareness-urls.json','tools/news-urls.json',
 'tools/news-sitemap-meta.json','tools/seo-urls.json','tools/watch-urls.json',
 'data/international-day-history.json','sitemap.xml','sitemaps.xml',
 'guides/worldwide-entertainment-discovery','moods','collections','platforms',
 'languages','decades','en/br/watch','en/us/watch','en/gb/watch','en/pt/watch','pt/br/watch'
]);

function stage(root=ROOT){
 const tracked=spawnSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'});
 if(tracked.status!==0)throw Error('Cannot enumerate tracked editorial outputs');
 const files=tracked.stdout.split('\0').filter(Boolean);
 const paths=ownedPaths.filter(p=>fs.existsSync(path.join(root,p))||files.some(f=>f===p||f.startsWith(p+'/')));
 const campaignPages=new Set(files.filter(f=>/^awareness\/[^/]+\/index\.html$/.test(f)));
 const awareness=path.join(root,'awareness');
 if(fs.existsSync(awareness))for(const entry of fs.readdirSync(awareness,{withFileTypes:true})){
  if(entry.isDirectory()&&fs.existsSync(path.join(awareness,entry.name,'index.html')))campaignPages.add('awareness/'+entry.name+'/index.html');
 }
 paths.push(...campaignPages);
 if(!paths.length)throw Error('No generator-owned paths found; refusing broad staging');
 const result=spawnSync('git',['add','-A','--',...paths],{cwd:root,stdio:'inherit'});
 if(result.status!==0)throw Error('Scoped editorial staging failed');
 return paths;
}

function validateMetadata(root=ROOT){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const trend=JSON.parse(read('data/trending-week.json'));
 const pick=JSON.parse(read('data/weekly-pick.json'));
 if(!Array.isArray(trend.titles)||trend.titles.length<16)throw Error('Top Titles refresh produced too few verified entries');
 const music=JSON.parse(read('data/music-video-releases.json'));
 if(!Array.isArray(music.featuredIds)||new Set(music.featuredIds).size!==music.featuredIds.length)throw Error('Duplicated or invalid featured music-video identities');
 const featured=music.featuredIds.map(id=>music.items.find(x=>x.id===id)).filter(Boolean);
 if(featured.length!==music.featuredIds.length)throw Error('Featured music-video record missing');
 if(featured.length<4)throw Error('Too few verified music-video releases');
 for(const v of featured){
  if(!Number.isFinite(Date.parse(v.publishedAt))||!['number','string'].includes(typeof v.viewCount)||!/^\d+$/.test(String(v.viewCount))||!Number.isSafeInteger(Number(v.viewCount))||
   !/^[\w-]{11}$/.test(v.id)||v.url!=='https://www.youtube.com/watch?v='+v.id||!v.seo?.title?.trim()||!v.seo?.description?.trim()||
   !Array.isArray(v.seo?.keywords)||v.seo.keywords.length<5)throw Error('Incomplete verified music-video metadata/SEO: '+v.id);
 }
 if(!pick.title?.trim()||!['number','string'].includes(typeof pick.tmdbId)||!/^\d+$/.test(String(pick.tmdbId))||!Number.isSafeInteger(Number(pick.tmdbId))||Number(pick.tmdbId)<=0||!pick.poster?.trim()||!pick.synopsis?.trim())throw Error('Weekly choice is incomplete');
 if(!fs.existsSync(path.join(root,'featured/this-week/index.html'))||!read('sitemap.xml').includes('https://matchapp.tv/featured/this-week/'))throw Error('Weekly featured page or sitemap entry missing');
 return {topTitles:trend.titles.length,featuredMusic:featured.length,weeklyPick:pick.title};
}

function generate(root=ROOT,{run=spawnSync,now=()=>new Date().toISOString()}={}){
 const output=path.join(root,'artifacts/unified-refresh');
 fs.mkdirSync(output,{recursive:true});
 const file=path.join(output,'generation.json');
 const checkout=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
 const actualSha=checkout.status===0?checkout.stdout.trim():null;
 const ledger={runId:process.env.GITHUB_RUN_ID||null,sourceSha:/^[a-f0-9]{40}$/.test(actualSha||'')?actualSha:null,triggerSha:process.env.GITHUB_SHA||null,
  startedAt:now(),status:'running',steps:[]};
 const save=()=>fs.writeFileSync(file,JSON.stringify(ledger,null,2)+'\n');
 save();
 try{
  for(const [name,script,...args] of generationPlan){
   const entry={name,script,startedAt:now(),status:'running'};
   ledger.steps.push(entry);save();
   console.log('[unified-refresh] '+name);
   const result=run(process.execPath,[script,...args],{cwd:root,stdio:'inherit',timeout:15*60*1000});
   entry.completedAt=now();entry.exitCode=result.status;
   if(result.error||result.status!==0){entry.status='failed';throw Error(name+' failed; no editorial commit is authorized');}
   entry.status='success';save();
  }
  ledger.metadata=validateMetadata(root);
  ledger.status='success';ledger.completedAt=now();save();
  return ledger;
 }catch(error){
  ledger.status='failed';ledger.completedAt=now();ledger.error=error.message;save();throw error;
 }finally{
  if(process.env.GITHUB_STEP_SUMMARY){
   fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n## Unified source refresh\n\n'+
    ledger.steps.map(s=>'- '+s.name+': '+s.status+' ('+(s.completedAt||s.startedAt)+')').join('\n')+
    '\n\nSource/generation result: '+ledger.status+'. Publication and live verification are separate gates.\n');
  }
 }
}

module.exports={generationPlan,ownedPaths,stage,generate,validateMetadata};
if(require.main===module){
 try{
  const command=process.argv[2];
  if(command==='generate')generate();
  else if(command==='stage')stage();
  else if(command==='validate')console.log(JSON.stringify(validateMetadata()));
  else throw Error('Usage: unified-refresh.cjs generate|validate|stage');
 }catch(error){console.error('[unified-refresh] '+error.message);process.exitCode=1;}
}
