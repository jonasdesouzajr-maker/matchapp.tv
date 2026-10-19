/* Preserve outgoing International Day records so ENDED cards survive for 72 hours. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const ROOT=path.join(__dirname,'..'),CURRENT=path.join(ROOT,'data','international-day.json'),HISTORY=path.join(ROOT,'data','international-day-history.json');
const read=(p,f)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch(error){if(error.code==='ENOENT')return f;throw error;}};
const valid=x=>x&&typeof x==='object'&&x.id&&x.date&&x.title&&x.image;
const current=read(CURRENT,null);if(!valid(current))throw new Error('Invalid current International Day');
let previous=null;
if(process.env.GITHUB_EVENT_NAME==='push'&&!/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||''))throw new Error('Invalid original archive event SHA');
const source=process.env.GITHUB_EVENT_NAME==='push'?process.env.GITHUB_SHA:'HEAD';
try{previous=JSON.parse(cp.execFileSync('git',['show',source+'^:data/international-day.json'],{cwd:ROOT,encoding:'utf8'}));}catch(error){throw new Error('Cannot verify outgoing International Day: '+error.message);}
if(!valid(previous))throw new Error('Invalid outgoing International Day');
if(previous.id===current.id)process.exit(0);
// Match the nightly owner: execution notes are not editorial content. Without
// this normalization the two owners alternately add/remove these same fields.
previous={...previous};delete previous._contract;delete previous._note;
let history=read(HISTORY,[]);if(!Array.isArray(history))throw new Error('Invalid International Day history');
history=history.filter(x=>x&&x.id!==previous.id);
history.push(previous);
history.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
const next=JSON.stringify(history,null,2)+'\n';
if(!fs.existsSync(HISTORY)||fs.readFileSync(HISTORY,'utf8')!==next)fs.writeFileSync(HISTORY,next);
console.log('Archived International Day:',previous.id);
