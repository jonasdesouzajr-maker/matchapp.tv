const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('grown-up Home loads E-books Ai data, current suggestions and matcher in safe order',()=>{
 const html=read('index.html');
 const catalog=html.indexOf('/ebooks/catalog.js?v=20260924-ebooks2');
 const top=html.indexOf('/ebooks/top-ebooks.js?v=20260924-top1');
 const audio=html.indexOf('/ebooks/audiobooks.js?v=20260925-audioverify2');
 const cover=html.indexOf('/ebooks/cover-identity.js?v=20260925-original2');
 const matcher=html.indexOf('/ebooks/ebook-matcher.js?v=20260926-compact1');
 assert(catalog>0);
 assert(top>catalog);
 assert(audio>top);
 assert(cover>audio);
 assert(matcher>cover);
 assert.match(html,/id="ebook-matcher-root"/);
 assert.match(html,/\/ebooks\/ebook-matcher\.css\?v=20260926-compact1/);
 assert.match(html,/\/ebooks\/ebook-matcher\.js\?v=20260926-compact1/);
});


test('expanded E-book catalog exposes rich taxonomy and per-book keyword metadata',()=>{
 const catalog=read('ebooks/catalog.js'),matcher=read('ebooks/ebook-matcher.js'),hub=read('ebooks/index.html');
 const ids=(catalog.match(/\{id:'[^']+'/g)||[]);
 assert(ids.length>=110,'expected at least 110 curated e-books');
 assert.match(catalog,/AI ebook recommendation/);
 for(const genre of ['psychology','philosophy','business','technology','true-crime','dystopian','magical-realism','gothic','contemporary']){
  assert(matcher.includes("['"+genre+"'"),genre+' matcher category missing');
 }
 for(const mood of ['witty','inspiring','practical','curious','awe','quirky','nostalgic','mythic','glamorous','dreamy','epic','melancholy']){
  assert(matcher.includes("['"+mood+"'"),mood+' matcher category missing');
 }
 assert.match(hub,/(?:more than 100 hand-tagged reading profiles|over 100 curated reading profiles)/i);
 assert.match(hub,/verified audiobook editions/i);
 assert.match(hub,/"@type":"CollectionPage"/);
 assert.match(hub,/"@type":"ItemList"/);
});

test('Kids Mode stays isolated from E-books Ai',()=>{
 const kids=read('kids/index.html');
 assert.doesNotMatch(kids,/ebook-matcher|MATCHAPP_TOP_EBOOKS|MATCHAPP_EBOOK_CATALOG/i);
});

test('E-book matching uses the shared Match allowance and cannot silently run unmetered',()=>{
 const js=read('ebooks/ebook-matcher.js');
 assert.match(js,/typeof window\.checkDailyLimit!=='function'/);
 assert.match(js,/const allowed=await window\.checkDailyLimit\(\)/);
 assert.match(js,/if\(!allowed\)return/);
 assert.match(js,/match_ebook_saved_v1/);
 assert.match(js,/match_ebook_disliked_v1/);
});

test('E-book providers are legal-source or official-store routes only',()=>{
 const js=read('ebooks/ebook-matcher.js');
 for(const expected of [
  'gutenberg.org','standardebooks.org','openlibrary.org','amazon.com',
  'books.apple.com','play.google.com','kobo.com','barnesandnoble.com','books.google.com'
 ]) assert(js.includes(expected),expected+' missing');
 assert.doesNotMatch(js,/libgen|z-library|zlibrary|pdfdrive|annas-archive|anna['’]s archive|oceanofpdf|epdf|drm.?bypass/i);
});

test('current E-book suggestions carry source labels and refresh metadata',()=>{
 const top=read('ebooks/top-ebooks.js');
 assert.match(top,/Refreshed 2026-09-24/);
 assert.match(top,/Apple Books BR/);
 assert.match(top,/Kobo Brasil/);
 assert.match(top,/Current US bestseller list/);
 assert((top.match(/\{title:/g)||[]).length>=10);
 const hub=read('ebooks/index.html');
 assert.match(hub,/Top E-books right now/);
 assert.match(hub,/UPDATED SEPTEMBER 24, 2026/);
});

test('E-books hub is indexable and preserved by the sitemap generator',()=>{
 const hub=read('ebooks/index.html'),tool=read('tools/update-sitemap.js'),map=read('sitemap.xml');
 assert.match(hub,/rel="canonical" href="https:\/\/matchapp\.tv\/ebooks\/"/);
 assert.match(hub,/name="robots" content="index,follow/);
 assert(tool.includes('`\${SITE}/ebooks/`'));
 assert(map.includes('<loc>https://matchapp.tv/ebooks/</loc>'));
});

test('grown-up Android build is advanced for the E-books release',()=>{
 const gradle=read('android-studio/app/build.gradle.kts');
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(gradle,/versionCode = 34/);
 assert.match(gradle,/versionName = "1\.1\.32"/);
 assert.match(main,/appBuild=34/);
 assert.match(main,/MatchAppAiAndroid\/1\.1\.31/);
});
