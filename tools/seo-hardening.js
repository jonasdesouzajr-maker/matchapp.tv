#!/usr/bin/env node
'use strict';

/* Surgical SEO hardening for MatchApp.
   This script only corrects verified metadata/schema issues and generated-news
   SEO output. It does not change matching, pricing, auth, catalog behavior or UI. */

const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const LOGO='https://matchapp.tv/assets/brand/matchapp-icon-512.png';
const FAV='<link rel="icon" href="/assets/brand/matchapp-favicon-32.png" type="image/png">';

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function write(rel,text){fs.writeFileSync(path.join(ROOT,rel),text);}
function patch(rel,fn){
  const before=read(rel);const after=fn(before);
  if(after!==before){write(rel,after);console.log(`[seo] updated ${rel}`);}else console.log(`[seo] ${rel} already compliant`);
}
function replaceOnce(text,from,to,label){
  if(text.includes(to))return text;
  if(!text.includes(from))throw new Error(`Missing expected ${label}`);
  return text.replace(from,to);
}

const matchAppOrg='{"@type":"Organization","name":"MatchApp TV Ai","url":"https://matchapp.tv/"}';
const matchAppOrgLogo='{"@type":"Organization","name":"MatchApp TV Ai","url":"https://matchapp.tv/","logo":{"@type":"ImageObject","url":"'+LOGO+'","width":512,"height":512}}';

patch('index.html',src=>replaceOnce(src,matchAppOrg,matchAppOrgLogo,'homepage Service provider organization'));

patch('discover.html',src=>{
  src=src.replace(
    'Ask MatchApp’s AI what to watch. Get a synopsis, where it streams, when it starts, and a direct play link for movies, K-drama, anime and micro-dramas. Free daily.',
    'Ask MatchApp what to watch by mood or topic. Get a synopsis, streaming options, timing details and direct links for movies, K-drama, anime and more.'
  );
  src=src.replace(
    /"publisher"\s*:\s*\{"@type"\s*:\s*"Organization",\s*"name"\s*:\s*"MatchApp",\s*"url"\s*:\s*"https:\/\/matchapp\.tv\/"\}/g,
    '"publisher":{"@type":"Organization","name":"MatchApp","url":"https://matchapp.tv/","logo":{"@type":"ImageObject","url":"'+LOGO+'","width":512,"height":512}}'
  );
  return src;
});

patch('kids/index.html',src=>{
  src=src.replace(
    /<title>MatchApp TV Ai Kids[^<]*<\/title>/,
    '<title>Kids Movies & Shows by Age & Mood | MatchApp TV</title>'
  );
  src=src.replace(
    /<meta name="description" content="Make a Kids match[^">]*">/,
    '<meta name="description" content="Find age-appropriate kids movies, cartoons and family shows by age, mood and decade, with Kids Mode picks, complete covers and where-to-watch guides.">'
  );
  return src;
});

patch('tools/build-seo-pages.js',src=>src.replace(
  "const metaDesc = `${lede} ${items.length} hand-picked titles on MatchApp — plus an AI concierge that finds your next watch in seconds.`.slice(0, 158);",
  "const metaDesc = `${lede} ${items.length} hand-picked titles on MatchApp — plus an AI concierge that finds your next watch in seconds.`.slice(0, 150).replace(/\\s+\\S*$/,'').trim();"
));

patch('tools/refresh-news-rss.js',src=>{
  src=src.replace(
    "const metaTitle=truncateWords(`${i.title} | Latest Entertainment News | MatchApp TV`,68);",
    "const metaTitle=truncateWords(`${i.title} | Entertainment News | MatchApp TV`,60);"
  );
  src=src.replaceAll(
    "publisher:{'@type':'Organization',name:'MatchApp TV',url:SITE}",
    "publisher:{'@type':'Organization',name:'MatchApp TV',url:SITE,logo:{'@type':'ImageObject',url:`${SITE}/assets/brand/matchapp-icon-512.png`,width:512,height:512}}"
  );
  src=src.replace(
    '<title>Latest Entertainment News | Actors, Singers, Film & Music | MatchApp TV</title>',
    '<title>Latest Entertainment News | MatchApp TV</title>'
  );
  const newsStyle='<link rel="stylesheet" href="/style.css?v=187">';
  src=src.replaceAll(FAV+'\n','').replaceAll(FAV,'');
  src=src.replaceAll(newsStyle,FAV+'\n'+newsStyle);
  return src;
});

function patchGeneratedNews(){
  const hub=path.join(ROOT,'news','index.html');
  if(fs.existsSync(hub)){
    let src=fs.readFileSync(hub,'utf8');
    src=src.replace('<title>Latest Entertainment News | Actors, Singers, Film & Music | MatchApp TV</title>','<title>Latest Entertainment News | MatchApp TV</title>');
    if(!src.includes('matchapp-favicon-32.png'))src=src.replace('<link rel="stylesheet" href="/style.css?v=187">',FAV+'\n<link rel="stylesheet" href="/style.css?v=187">');
    src=src.replaceAll(
      '"publisher":{"@type":"Organization","name":"MatchApp TV","url":"https://matchapp.tv"}',
      '"publisher":{"@type":"Organization","name":"MatchApp TV","url":"https://matchapp.tv","logo":{"@type":"ImageObject","url":"'+LOGO+'","width":512,"height":512}}'
    );
    fs.writeFileSync(hub,src);
  }
  const dir=path.join(ROOT,'news','articles');
  if(!fs.existsSync(dir))return;
  for(const name of fs.readdirSync(dir)){
    const file=path.join(dir,name,'index.html');if(!fs.existsSync(file))continue;
    let src=fs.readFileSync(file,'utf8');
    if(!src.includes('matchapp-favicon-32.png'))src=src.replace('<link rel="stylesheet" href="/style.css?v=187">',FAV+'\n<link rel="stylesheet" href="/style.css?v=187">');
    src=src.replaceAll(
      '"publisher":{"@type":"Organization","name":"MatchApp TV","url":"https://matchapp.tv"}',
      '"publisher":{"@type":"Organization","name":"MatchApp TV","url":"https://matchapp.tv","logo":{"@type":"ImageObject","url":"'+LOGO+'","width":512,"height":512}}'
    );
    fs.writeFileSync(file,src);
  }
  console.log('[seo] hardened generated news pages');
}
patchGeneratedNews();

console.log('[seo] hardening complete');
