/* Preserve outgoing International Day records so ENDED cards survive for 72 hours. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const ROOT=path.join(__dirname,'..'),CURRENT=path.join(ROOT,'data','international-day.json'),HISTORY=path.join(ROOT,'data','international-day-history.json');
const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return f;}};
const valid=x=>x&&typeof x==='object'&&x.id&&x.date&&x.title&&x.image;
const current=read(CURRENT,null);if(!valid(current))process.exit(0);
let previous=null;
try{previous=JSON.parse(cp.execFileSync('git',['show','HEAD^:data/international-day.json'],{cwd:ROOT,encoding:'utf8'}));}catch(_){process.exit(0);}
if(!valid(previous)||previous.id===current.id)process.exit(0);
let history=read(HISTORY,[]);if(!Array.isArray(history))history=[];
history=history.filter(x=>x&&x.id!==previous.id);
history.push(previous);
history.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
fs.writeFileSync(HISTORY,JSON.stringify(history,null,2)+'\n');
console.log('Archived International Day:',previous.id);
