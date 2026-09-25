'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const flow=n=>read('.github/workflows/'+n+'.yml');
const publishers=['midnight-content-rotation','news-refresh','awareness-rotation','availability','kids-seo-refresh','sitemap-refresh','seo-hardening','archive-international-day'];

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

test('daily midnight coordinates existing verified data owners and retries from latest main',()=>{
 const yml=flow('midnight-content-rotation');
 for(const step of ['node tools/sync-catalog-media.js','node tools/refresh-news-rss.js','node tools/build-global-events.js','node tools/archive-international-day.mjs','node tools/awareness-bot.mjs','node tools/build-seo-pages.js','node tools/build-watch-pages.js','node tools/update-sitemap.js','node tools/check-content-rotation.js','node tools/audit-search.js']) assert.ok(yml.includes(step),'Midnight lost '+step);
 assert.match(yml,/cron: '0 3 \* \* \*'/);
 assert.match(yml,/git reset --hard origin\/main/);
 assert.match(yml,/node tools\/check-content-rotation\.js[\s\S]*?git add -A -- index\.html/);
 assert.doesNotMatch(yml,/\bgit add -A\s*(?:\n|\r|$)/,'Unscoped staging could commit unrelated private configuration');
 assert.match(yml,/if: steps\.publish\.outputs\.changed == '1'[\s\S]*?gh workflow run pages-deploy\.yml --ref main/,'GITHUB_TOKEN commits need an explicit validated Pages dispatch');
 assert.doesNotMatch(yml,/gh workflow run indexnow\.yml/,'IndexNow must wait for confirmed Pages deployment');
});

test('hourly NEWS remains publisher sourced; awareness recovery cannot start another midnight refresh',()=>{
 const news=flow('news-refresh'),events=flow('awareness-rotation');
 assert.match(news,/cron: '37 \* \* \* \*'/);
 assert.match(news,/node tools\/refresh-news-rss\.js/);
 assert.match(news,/git add news tools\/news-urls\.json/);
 assert.match(events,/cron: '45 3 \* \* \*'/);
 assert.match(events,/node tools\/awareness-bot\.mjs/);
 assert.match(events,/git add index\.html awareness\/current\.json/);
 assert.match(news,/gh workflow run pages-deploy\.yml --ref main/);
 assert.match(events,/gh workflow run pages-deploy\.yml --ref main/);
 assert.doesNotMatch(news,/- '\.github\/workflows\/news-refresh\.yml'/,'News workflow must not trigger itself from multi-workflow metadata merges');
 assert.doesNotMatch(flow('kids-seo-refresh'),/- '\.github\/workflows\/kids-seo-refresh\.yml'/);
 assert.doesNotMatch(flow('seo-hardening'),/- '\.github\/workflows\/seo-hardening\.yml'/);
});

test('only successful production Pages deployment initiates immediate IndexNow',()=>{
 const deploy=flow('pages-deploy'),now=flow('indexnow');
 assert.match(deploy,/actions: write/);
 assert.match(deploy,/npm run audit:site/);
 assert.match(deploy,/node tools\/check-content-rotation\.js/);
 assert.match(flow('site-validation'),/node tools\/check-content-rotation\.js/);
 assert.doesNotMatch(deploy,/id!=='world-alzheimers-month-2026'/,'Deployment may never pin an expiring campaign');
 assert.ok(deploy.indexOf('uses: actions/deploy-pages@v4')<deploy.indexOf('gh workflow run indexnow.yml --ref main'));
 assert.doesNotMatch(now,/  push:/,'Raw commits may not ping still-unpublished pages');
 assert.match(now,/workflow_dispatch:/);
 assert.match(now,/schedule:/,'Scheduled IndexNow recovery retained');
 for(const name of publishers){
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

test('separate TMDB refresh stays OIDC-secured and does not fabricate Home Top Titles',()=>{
 const ingest=read('supabase/functions/catalog-media-ingest/index.ts'),client=read('tools/sync-catalog-media.js'),lock=read('tools/check-content-rotation.js');
 assert.match(flow('scraper'),/id-token: write/);
 assert.match(ingest,/origin_countries:originCountries\(record\),cast_members:castMembers\(record\)/);
 assert.match(ingest,/stage==="authorization"\?403:500/);
 assert.match(client,/homepageTrending/);
 assert.match(lock,/posters\.length===20/);
 assert.match(lock,/news\.items\.length>=5/);
 assert.match(lock,/awareness\/current\.json/);
});
