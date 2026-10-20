'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const flow=n=>read('.github/workflows/'+n+'.yml');
const publishers=['unified-refresh','kids-seo-refresh','sitemap-refresh','seo-hardening','archive-international-day','music-video-refresh'];
const retired=['midnight-content-rotation','trending-refresh','news-refresh','sports-refresh','availability','scraper','awareness-rotation'];

test('GrokBot and other agents inherit permanent owner-only workflow and data contracts',()=>{
 const agents=read('AGENTS.md'),policy=read('docs/EDITORIAL_AUTOMATION_LOCK.md'),owners=read('.github/CODEOWNERS');
 assert.match(agents,/EDITORIAL AUTOMATION LOCK/);
 assert.match(policy,/GrokBot/);
 assert.ok(policy.includes('branch ruleset')&&policy.includes('required checks'),'Owner-enforced branch ruleset requirement must be documented');
 assert.match(owners,/\/\.github\/workflows\/\* @jonasdesouzajr-maker/);
 for(const item of ['/tools/check-content-rotation.js','/tests/editorial-workflow-contract.test.cjs','/docs/EDITORIAL_AUTOMATION_LOCK.md'])assert.ok(owners.includes(item+' @jonasdesouzajr-maker'));
});

test('every repository-writing editorial workflow shares one serialized publisher and never cancels current work',()=>{
 for(const name of publishers){
   const yml=flow(name);
   assert.match(yml,/group: matchapp-content-publish\b/,'Shared publisher lock missing: '+name);
   assert.match(yml,/cancel-in-progress: false/,'Publisher must finish without interruptions: '+name);
 }
});

test('one daily refresh replaces every superseded recurring source writer',()=>{
 const yml=flow('unified-refresh');
 assert.match(yml,/cron: '30 4 \* \* \*'/);
 assert.match(yml,/workflow_dispatch:/);
 assert.match(yml,/push:[\s\S]*branches: \[main\][\s\S]*paths:[\s\S]*\.github\/workflows\/unified-refresh\.yml/);
 assert.equal((yml.match(/cron:/g)||[]).length,1,'only one daily trigger');
 for(const name of retired)assert.equal(fs.existsSync(path.join(root,'.github/workflows',name+'.yml')),false,name+' must not remain a competing owner');
 for(const name of publishers.filter(x=>x!=='unified-refresh'))assert.doesNotMatch(flow(name),/schedule:|cron:/,name+' is event/manual only');
 assert.doesNotMatch(yml,/continue-on-error:|git rebase|git add -A\s*(?:\n|$)/,'never hide failed gates or publish unrelated files');
});

test('unified generation keeps source integrity, ordering and one news generator',()=>{
 const yml=flow('unified-refresh'),runner=read('tools/unified-refresh.cjs');
 for(const script of ['sync-catalog-media.js','fetch-availability.js','refresh-music-videos.js','refresh-trending.mjs','refresh-weekly-pick.mjs','refresh-sports-discovery.js','refresh-news-rss.js','build-global-events.js','archive-international-day.mjs','awareness-bot.mjs','build-seo-pages.js','build-watch-pages.js','build-world-discovery-guide.js','update-sitemap.js'])assert.ok(runner.includes('tools/'+script),'Unified refresh lost '+script);
 assert.ok(runner.indexOf('tools/refresh-music-videos.js')<runner.indexOf('tools/refresh-trending.mjs'),'verified music discovery precedes presentation');
 assert.ok(runner.indexOf('tools/refresh-sports-discovery.js')<runner.indexOf('tools/refresh-news-rss.js'),'one news generation consumes the sports snapshot');
 assert.match(yml,/node tools\/unified-refresh\.cjs generate/);
 assert.match(yml,/node tools\/unified-refresh\.cjs stage/);
 assert.match(yml,/git reset --hard origin\/main/);
 for(const gate of ['node --test tests/release-audit.test.cjs','node tools/check-content-rotation.js','npm test','npm run audit:site','npm run build'])assert.ok(yml.includes(gate),'Pre-publication gate missing: '+gate);
 assert.match(yml,/id-token: write/);
 assert.doesNotMatch(yml,/gh workflow run (?:availability|scraper|news-refresh|sports-refresh|trending-refresh|awareness-rotation|midnight-content-rotation)\.yml/,'retired owner jobs may not be dispatched');
 const manual=flow('music-video-refresh');assert.match(manual,/workflow_dispatch:/);assert.doesNotMatch(manual,/schedule:|cron:/);
 const agents=read('AGENTS.md'),lock=read('docs/EDITORIAL_AUTOMATION_LOCK.md');for(const text of ['music-video discovery + SEO','VideoObject','manual recovery only'])assert.ok(agents.includes(text)||lock.includes(text),text);
});

test('changed content uses Pages discovery; only unchanged verified production uses daily IndexNow recovery',()=>{
 const deploy=flow('pages-deploy'),now=flow('indexnow');
 assert.match(deploy,/actions: write/);
 assert.match(deploy,/npm run audit:site/);
 assert.match(deploy,/node tools\/check-content-rotation\.js/);
 assert.match(flow('site-validation'),/node tools\/check-content-rotation\.js/);
 assert.doesNotMatch(deploy,/id!=='world-alzheimers-month-2026'/,'Deployment may never pin an expiring campaign');
 assert.ok(deploy.indexOf('uses: actions/deploy-pages@v4')<deploy.indexOf('gh workflow run indexnow.yml --ref main'));
 assert.doesNotMatch(now,/  push:/,'Raw commits may not ping still-unpublished pages');
 assert.match(now,/workflow_dispatch:/);
 assert.doesNotMatch(now,/schedule:|cron:/,'IndexNow recovery belongs inside the sole daily refresh');
 assert.match(flow('unified-refresh'),/dispatchAndConfirm\('indexnow\.yml', 'discovery'\)/);
 assert.match(flow('unified-refresh'),/deployment-sha\.txt/,'unchanged discovery dispatch must first confirm live production');
 const unified=flow('unified-refresh');
 assert.equal((unified.match(/dispatchAndConfirm\('pages-deploy\.yml', 'pages'\)/g)||[]).length,1,'the unified refresh requests one Pages deployment');
 assert.match(unified,/CONTENT_CHANGED: \$\{\{ steps\.publish\.outputs\.changed \}\}/);
 for(const name of publishers.filter(x=>x!=='unified-refresh')){
   const yml=flow(name);
   assert.equal((yml.match(/gh workflow run pages-deploy\.yml --ref main/g)||[]).length,1,name+' must dispatch exactly once after a bot content commit');
   assert.match(yml,/if: steps\.publish\.outputs\.changed == '1'/);
   assert.doesNotMatch(yml,/gh workflow run indexnow\.yml/);
 }
 assert.match(deploy,/push:\s*\n\s*branches: \[main\]/,'Non-bot main pushes still trigger automatic validation/deployment');
});

test('ended global/day/awareness events preserve three-day visibility and SEO',()=>{
 const global=read('global-events.js'),day=read('international-day.js'),aware=read('tools/awareness-bot.mjs'),html=read('awareness/world-maritime-day-2026/index.html');
 assert.match(global,/RETAIN_ENDED_DAYS=3/);
 assert.match(global,/retainedEnded/);
 assert.match(day,/RETAIN_ENDED_DAYS=3/);
 assert.match(day,/ended\.forEach/);
 assert.match(aware,/days\(c\.endExclusive,t\)>=0&&days\(c\.endExclusive,t\)<3/);
 assert.doesNotMatch(html,/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"Event"/,'Observance is not a fabricated venue event');
});

test('unified TMDB refresh stays OIDC-secured and does not fabricate Home Top Titles',()=>{
 const ingest=read('supabase/functions/catalog-media-ingest/index.ts'),client=read('tools/sync-catalog-media.js'),lock=read('tools/check-content-rotation.js');
 assert.match(flow('unified-refresh'),/id-token: write/);
 assert.match(ingest,/origin_countries:originCountries\(record\),cast_members:castMembers\(record\)/);
 assert.match(ingest,/stage==="authorization"\?403:500/);
 assert.match(client,/homepageTrending/);
 assert.match(lock,/posters\.length===HOME_TOP_TITLES_COUNT\*2/);
 assert.match(lock,/news\.items\.length>=5/);
 assert.match(lock,/awareness\/current\.json/);
});
