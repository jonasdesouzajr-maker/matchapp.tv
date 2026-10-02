import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const src=path.join(root,'data/trending-week.json');
const data=JSON.parse(fs.readFileSync(src,'utf8'));
const today=new Date().toISOString().slice(0,10);
data.updated=today;
data.label='Top titles this week';
fs.writeFileSync(src, JSON.stringify(data,null,2)+'\n');
const items=data.titles.map((t)=>`<li><a href="/discover.html?q=${encodeURIComponent(t.title)}">${t.title}</a> <small>${t.platform||''} · ${t.year||''}</small><p>${t.seo?.description||t.description||''}</p></li>`).join('\n');
const keywords=[...new Set(data.titles.flatMap(t=>t.seo?.keywords||t.keywords||[]))].join(', ');
const list=data.titles.map((t,i)=>({"@type":"ListItem",position:i+1,item:{"@type":t.kind==='movie'?'Movie':'TVSeries',name:t.title,description:t.seo?.description||t.description,datePublished:String(t.year||''),inLanguage:t.inLanguage||'en',genre:t.genre||[],keywords:(t.seo?.keywords||t.keywords||[]).join(', ')}}));
const html=`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Top titles this week | MatchApp Ai</title>
<link rel="canonical" href="https://matchapp.tv/trending/this-week/">
<meta name="description" content="What is trending this week on MatchApp: ${data.titles.slice(0,4).map(t=>t.title).join(', ')}.">
<meta name="keywords" content="${keywords}">
<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"ItemList","name":"Top titles this week","dateModified":today,"itemListElement":list})}</script>
</head><body>
<main>
<h1>Top titles this week</h1>
<p>Updated ${today}. ${data.sourceNote||''}</p>
<ol>${items}</ol>
<p><a href="/">Find where to watch on MatchApp</a></p>
</main>
</body></html>
`;
fs.mkdirSync(path.join(root,'trending/this-week'),{recursive:true});
fs.writeFileSync(path.join(root,'trending/this-week/index.html'), html);
console.log('trending refreshed', data.titles.length, today);
