#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CURRENT=path.join(ROOT,'data/international-day.json');
const HISTORY=path.join(ROOT,'data/international-day-history.json');
const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return f;}};
const current=read(CURRENT,null);
if(!current||!current.id||!current.date||!current.title||!current.image){process.exit(0);}
const archived=JSON.parse(JSON.stringify(current));delete archived._contract;delete archived._note;
const history=read(HISTORY,[]);
const byId=new Map([[String(archived.id),archived]]);
for(const item of Array.isArray(history)?history:[])if(item&&item.id&&!byId.has(String(item.id)))byId.set(String(item.id),item);
const out=[...byId.values()].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,45);
fs.mkdirSync(path.dirname(HISTORY),{recursive:true});
const next=JSON.stringify(out,null,2)+'\n',old=fs.existsSync(HISTORY)?fs.readFileSync(HISTORY,'utf8'):'';
if(next!==old)fs.writeFileSync(HISTORY,next);
console.log('International-day history records:',out.length);
