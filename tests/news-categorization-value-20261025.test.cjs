'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {createRequire,stripTypeScriptTypes}=require('node:module');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),file=path.join(root,'tools/refresh-news-rss.js');
const src=fs.readFileSync(file,'utf8'),now='2026-10-25T23:30:00.000Z';
function definitions(temp=root){
  return vm.runInNewContext(src.slice(0,src.indexOf('(async()=>{'))+'\n;({event,fold,TOPIC,normalizeStory,eligibleStory,page,hub,repairOrphanArticles,seoFor})',{
    require:createRequire(file),__dirname:path.join(temp,'tools'),URL,console,Date,Buffer
  });
}
function story(extra={}){const i={id:'fixture',title:'Singer announces new album and concert tour',source:'BBC',source_home:'https://www.bbc.com',source_domain:'bbc.com',url:'https://www.bbc.com/news/articles/fixture',country:'GB',language:'en',category:'entertainment',event_type:'Music',person:'',description:'Music discovery',published_at:'2026-10-25T10:00:00.000Z',discovered_at:now,matchapp_url:'https://matchapp.tv/news/articles/fixture/',landing_url:'https://matchapp.tv/?news=fixture#latest-news',...extra};i.seo=definitions().seoFor(i,[],now);return i;}
test('world weather, political wins and deaths never become entertainment events',()=>{
 const d=definitions();
 for(const title of ['Overnight winds hit 85mph as Scotland is hit by Storm Beolo','President wins election after recount','Death toll rises after flooding','Presidente vence eleição após recontagem','Mortes após temporal no Brasil']){
  for(const oldEvent of ['Entertainment','Awards','Obituary']){
   const row=d.normalizeStory(story({title,source:'BBC World',category:'world',event_type:oldEvent}),now);
   assert.equal(row.category,'world');assert.equal(row.event_type,'World');
   const html=d.page(row);assert.match(html,/data-news-ui-event="World"/);assert.doesNotMatch(html,/data-news-ui-event="(?:Awards|Obituary|Entertainment)"/);
  }
 }
 assert.equal(d.TOPIC.test(d.fold('Astronomers discover a star after storm winds')) ,false);
});
test('English and Portuguese music, film and actual awards survive classification',()=>{
 const d=definitions();
 for(const [title,event] of [['Sam Fender calls out ticket prices ahead of tour','Music'],['Singer wins Grammy award for album','Awards'],['Cantora lança álbum e anuncia turnê','Music'],['Filme brasileiro ganha prêmio no Oscar','Awards'],['Atriz entra para elenco de filme','Casting'],['New film premiere announced for October','Release']]){
  const row=d.normalizeStory(story({title,event_type:'Entertainment',description:'Music and film news'}),now);
  assert.equal(row.event_type,event,title);assert.ok(d.eligibleStory(row),title);
 }
 assert.equal(d.eligibleStory(story({title:'Singer reportedly announces album'})),false);
 assert.equal(d.eligibleStory(story({title:'Film shopping coupon offers'})),false);
});
test('real RSS ingestion filters unrelated entertainment rows while preserving Portuguese and separate world reporting',async()=>{
 const files=new Map([[path.join(root,'news/archive.json'),'{"items":[]}'],[path.join(root,'news/data.json'),'{"items":[]}']]);
 const row=(title,id,host='www.bbc.com')=>`<item><title>${title}</title><link>https://${host}/news/${id}</link><pubDate>Sun, 25 Oct 2026 10:00:00 GMT</pubDate><media:thumbnail url="https://images.example.test/${id}.jpg"/></item>`;
 const en=row('Singer wins Grammy award for new album','award')+row('New film premiere announced this month','film')+row('Singer announces new concert tour','music')+row('Astronomers discover a distant star','unrelated')+row('Singer reportedly announces an album','rumor');
 const pt=row('Cantora lança álbum e anuncia turnê','musica','g1.globo.com')+row('Filme brasileiro ganha prêmio no Oscar','cinema','g1.globo.com');
 const world=row('Overnight winds hit 85mph as Scotland is hit by Storm Beolo','storm')+row('President wins election after recount','election')+row('Death toll rises after severe flooding','death');
 const errors=[];
 await vm.runInNewContext(src,{__dirname:path.join(root,'tools'),URL,URLSearchParams,AbortController,Buffer,setTimeout,clearTimeout,console:{log(){},warn(){},error:e=>errors.push(e)},process:{exit:code=>{throw Error('Publisher exit '+code);}},
  require(name){if(name==='node:fs')return {existsSync:p=>files.has(p),readFileSync:p=>{if(!files.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return files.get(p);},mkdirSync(){},writeFileSync:(p,v)=>files.set(p,String(v)),readdirSync:()=>[]};return createRequire(file)(name);},
  fetch:async url=>({ok:true,text:async()=>'<rss>'+((String(url).includes('entertainment_and_arts'))?en:String(url).includes('pop-arte')?pt:String(url).includes('/world/rss')?world:'')+'</rss>'})});
 assert.deepEqual(errors,[]);
 const result=JSON.parse(files.get(path.join(root,'news/data.json'))).items;
 assert.equal(result.length,8);assert.equal(result.filter(i=>i.language==='pt'&&i.category==='entertainment').length,2);
 for(const item of result){if(['storm','election','death'].some(x=>item.url.endsWith('/'+x))){assert.equal(item.category,'world');assert.equal(item.event_type,'World');}assert.doesNotMatch(item.url,/unrelated|rumor/);}
});
test('orphan wrappers receive category repair, keep their URLs, and remain noindex and ad-free',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ma-news-orphan-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const d=definitions(temp),dir=path.join(temp,'news/articles/fixture');fs.mkdirSync(dir,{recursive:true});
 const p=path.join(dir,'index.html');fs.writeFileSync(p,d.page(story({title:'President wins election after recount',source:'BBC World',category:'world',event_type:'Awards'})));
 assert.equal(d.repairOrphanArticles(new Set(),now),1);
 const html=fs.readFileSync(p,'utf8');assert.match(html,/data-news-ui-event="World"/);assert.match(html,/content="noindex,follow"/);assert.match(html,/https:\/\/matchapp\.tv\/news\/articles\/fixture\//);
 assert.doesNotMatch(html,/adsbygoogle|data-ad-slot=/);
 assert.equal(html.includes('pagead2.googlesyndication.com'),false);
 assert.equal(d.repairOrphanArticles(new Set(),now),0,'a second repair is stable');
});
test('hub gives decision guidance and directs to useful guides without repeated per-card attribution paragraphs',()=>{
 const d=definitions(),html=d.hub([story()],now),w=new JSDOM(html).window;
 try{assert.ok(w.document.querySelector('[data-news-ui="guideChoice"]'));assert.ok(w.document.querySelector('a[href="/where-to-watch/roma/"]'));assert.ok(w.document.querySelector('a[href="/guides/streaming-music-books-october-2026/"]'));assert.equal(w.document.querySelectorAll('[data-native-news-feed] [data-news-ui="sourceNote"]').length,0);assert.doesNotMatch(html,/refresh hourly|hourly refreshed|twice-daily/);
  assert.ok(w.document.querySelector('[data-news-editorial]'));assert.match(w.document.querySelector('[data-news-ui="albumComparison"]').textContent,/Rubber Soul|Blossoms/);assert.match(w.document.querySelector('[data-news-ui="filmComparison"]').textContent,/1993|2027/);assert.ok(w.document.querySelector('a[href="https://www.officialcharts.com/chart-news/new-music-friday-october-2-2026/"]'));assert.ok(w.document.querySelector('time[datetime="2026-10-25"]'));
 }finally{w.close();}
});
test('actual regional parser preserves source instants and labels missing, invalid and future dates as discovery only',async()=>{
 const source=fs.readFileSync(path.join(root,'supabase/functions/regional-news-rss/index.ts'),'utf8');
 const code=stripTypeScriptTypes(source.replace(/^import .*;\r?\n/,''),{mode:'strip'});
 let handler;const rows=[['dated','Sun, 25 Oct 2026 10:00:00 GMT'],['missing',''],['invalid','not a date'],['future','Sun, 25 Oct 2099 10:00:00 GMT']];
 const xml='<rss>'+rows.map(([id,date])=>`<item><title>General world report ${id} &amp;lt;safe&amp;gt; - BBC</title><link>https://news.google.com/articles/${id}</link><pubDate>${date}</pubDate><source url="https://www.bbc.com">BBC</source></item>`).join('')+'</rss>';
 const ctx={URL,Response,crypto:require('node:crypto').webcrypto,TextEncoder,AbortSignal,setTimeout,clearTimeout,Intl,Date,console,Deno:{serve:fn=>{handler=fn;}},fetch:async()=>({ok:true,text:async()=>xml})};
 vm.runInNewContext(code,ctx);
 const r=await handler(new Request('https://test.invalid/?country=BR&language=pt'));const payload=await r.json();
 assert.equal(payload.items.length,8);assert.equal(payload.language,'pt');
 for(const row of payload.items){assert.ok(row.title.includes('&lt;safe&gt;'),'XML entities decode once, without turning nested entities into markup');assert.equal(row.category,'general');assert.equal(row.language,'pt');assert.ok(['BR','GLOBAL'].includes(row.country));assert.ok(row.discovered_at);if(row.title.includes('dated')){assert.equal(row.published_at,'2026-10-25T10:00:00.000Z');assert.equal(row.timestamp_kind,'published');}else{assert.equal(row.published_at,null);assert.equal(row.timestamp_kind,'discovered');}}
});
