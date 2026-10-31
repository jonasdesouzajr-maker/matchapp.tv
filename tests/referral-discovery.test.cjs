const fs=require('fs');const assert=require('assert');const read=p=>fs.readFileSync(p,'utf8');
{
 const page=read('events/worlds-2026/index.html'); const ics=read('events/worlds-2026/worlds-2026.ics');
 assert(page.includes('Save all 8 dates to calendar')); assert(page.includes('lolesports.com/en-GB/news/worlds-2026-primer'));
 assert.strictEqual((ics.match(/BEGIN:VEVENT/g)||[]).length,8); assert(ics.includes('DTSTART:20261114T190000Z'));
}
{
 const page=read('where-to-watch/a-different-world/index.html');
 assert(page.includes('September 24, 2026')); assert(page.includes('Season 2 renewal'));
 assert(page.includes('netflix.com/tudum/articles/a-different-world-sequel-series-hillman-college'));
}
{
 const page=read('where-to-watch/index.html'); const js=read('where-to-watch/search.js'); const os=read('opensearch.xml');
 assert(page.includes('name="q"')); assert(page.includes('/where-to-watch/search.js')); assert(js.includes("URLSearchParams"));
 assert(os.includes('q={searchTerms}')); assert(os.includes('<ShortName>MatchApp Ai</ShortName>'));
}
{
 const en=read('feed.xml'); const pt=read('pt-br/feed.xml'); const home=read('index.html');
 assert.strictEqual((en.match(/<item>/g)||[]).length,6); assert.strictEqual((pt.match(/<item>/g)||[]).length,6);
 assert(home.includes('type="application/rss+xml"')); assert(home.includes('application/opensearchdescription+xml'));
}
console.log('referral discovery checks passed');
