'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

const banned=/\bMatchApp\s+TV\b|\bMatchApp\s+(?:AI|iA|IA)\b|\bMatchApp Ai\s+(?:TV|Ai|AI|iA|IA)\b/g;
const kidsLegacy=/\bMatchApp(?:\.tv)?\s+(?:Kids Mode|Kids)\b|\bKids Mode MatchApp\b/g;
const kidsBare=/\bMatchApp Ai\b(?!\s+KIDS\b)/g;

function walk(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  if(['node_modules','.git','docs','.github','tests','android-studio'].includes(e.name))return[];
  const p=path.join(dir,e.name);
  return e.isDirectory()?walk(p):[p];
 });
}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function firstHits(text,re){
 re.lastIndex=0;
 const out=[];let m;
 while((m=re.exec(text))&&out.length<8)out.push(m[0]+'@'+m.index);
 return out;
}

test('every public HTML page uses only MatchApp Ai or MatchApp Ai KIDS',()=>{
 const failures=[];
 for(const file of walk(root).filter(f=>f.endsWith('.html'))){
  const r=rel(file);if(r.includes('yandex_'))continue;
  const text=fs.readFileSync(file,'utf8');
  const bad=firstHits(text,banned);
  if(r.startsWith('kids/')){
    bad.push(...firstHits(text,kidsLegacy),...firstHits(text,kidsBare));
  }
  if(bad.length)failures.push(r+': '+[...new Set(bad)].join(', '));
 }
 assert.deepEqual(failures,[]);
});

test('public runtime and page generators cannot reintroduce legacy brand names',()=>{
 const runtime=walk(root).filter(f=>{
  const r=rel(f);
  if(!r.endsWith('.js'))return false;
  if(!r.includes('/'))return true;
  if(r.startsWith('kids/'))return true;
  if(r.startsWith('tools/'))return /^tools\/(?:build-|refresh-)|^tools\/(?:discovery-metadata|finalize-brand)\.js$/.test(r);
  return false;
 });
 const failures=[];
 for(const file of runtime){
  const r=rel(file),text=fs.readFileSync(file,'utf8');
  const bad=firstHits(text,banned);
  if(r.startsWith('kids/'))bad.push(...firstHits(text,kidsLegacy),...firstHits(text,kidsBare));
  if(bad.length)failures.push(r+': '+[...new Set(bad)].join(', '));
 }
 assert.deepEqual(failures,[]);
});

test('shared Adult wordmark asset visibly identifies MatchApp Ai without TV',()=>{
 const svg=fs.readFileSync(path.join(root,'assets/brand/matchapp-tv-ai-v2.svg'),'utf8');
 assert.match(svg,/aria-label="MatchApp Ai"/);
 assert.match(svg,/<title>MatchApp Ai — orbital intelligence wordmark<\/title>/);
 assert.doesNotMatch(svg,/>TV<\/text>/);
});
