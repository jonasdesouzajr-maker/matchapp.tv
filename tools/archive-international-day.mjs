#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {updateHistory} from './retained-history.cjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CURRENT=path.join(ROOT,'data/international-day.json');
const HISTORY=path.join(ROOT,'data/international-day-history.json');
const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(error){if(error.code==='ENOENT')return f;throw error;}};
const current=read(CURRENT,null);
if(!current||!current.id||!current.date||!current.title||!current.image)throw new Error('Invalid current International Day');
const archived=JSON.parse(JSON.stringify(current));delete archived._contract;delete archived._note;
const result=updateHistory(HISTORY,history=>{
 const byId=new Map([[String(archived.id),archived]]);
 for(const item of history)if(item&&item.id&&!byId.has(String(item.id)))byId.set(String(item.id),item);
 return [...byId.values()].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,45);
});
console.log('International-day history records:',result.count);
