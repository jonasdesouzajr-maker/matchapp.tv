#!/usr/bin/env node
'use strict';
// Decision support for the EXISTING coordinator. No timer, network, git writer,
// workflow dispatch or publisher. The caller gathers fresh GitHub evidence.
const fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const OWNERS=['midnight-content-rotation.yml','trending-refresh.yml','news-refresh.yml','sports-refresh.yml','availability.yml','scraper.yml','awareness-rotation.yml','indexnow.yml'];
const ACTIVE=new Set(['queued','in_progress','waiting','pending','requested']);
const UNKNOWN=new Set(['reserved','submitted','unknown']);
const MINUTE=60000;
const SOURCES={
 'sports-refresh.yml':['tools/refresh-sports-discovery.js','tools/sports-partner-feed.js','tools/refresh-news-rss.js','tools/update-sitemap.js'],
 'news-refresh.yml':['tools/refresh-news-rss.js','tools/update-sitemap.js'],
 'trending-refresh.yml':['tools/refresh-trending.mjs','tools/refresh-music-videos.js','tools/refresh-weekly-pick.mjs','tools/live-editorial-data.mjs','tools/search-guide-links.cjs','tools/update-sitemap.js'],
 'midnight-content-rotation.yml':['tools/sync-catalog-media.js','tools/refresh-news-rss.js','tools/build-global-events.js','tools/archive-international-day.mjs','tools/retained-history.cjs','tools/awareness-bot.mjs','tools/build-seo-pages.js','tools/build-watch-pages.js','tools/build-world-discovery-guide.js','tools/search-guide-links.cjs','tools/update-sitemap.js','tools/finalize-brand.js'],
 'availability.yml':['tools/fetch-availability.js','tools/availability-evidence.cjs','tools/build-watch-pages.js','tools/build-seo-pages.js','tools/update-sitemap.js','tools/finalize-brand.js'],
 'scraper.yml':['tools/sync-catalog-media.js'],
 'awareness-rotation.yml':['tools/awareness-bot.mjs','tools/archive-international-day.mjs','tools/retained-history.cjs','tools/update-sitemap.js'],
 'indexnow.yml':[]
};
function repairRevision(owner,root=ROOT){
 if(!OWNERS.includes(owner))throw Error('Unknown recurring owner');
 const hash=crypto.createHash('sha256');
 for(const file of ['.github/workflows/'+owner,...SOURCES[owner]])hash.update(file+'\0').update(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n')).update('\0');
 return hash.digest('hex');
}
function localDate(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
function schedules(owner,root=ROOT){
 if(!OWNERS.includes(owner))throw Error('Unknown recurring owner');
 const text=fs.readFileSync(path.join(root,'.github/workflows',owner),'utf8');
 const crons=[...text.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
 if(!crons.length)throw Error('Owner has no approved cron');
 return crons;
}
function matches(field,value){return field==='*'||field.split(',').some(part=>/^\d+$/.test(part)&&Number(part)===value);}
function latestDue(crons,before){
 // Existing owners use daily or hourly UTC schedules. Refuse new syntax until
 // explicitly supported; never reinterpret a changed schedule silently.
 const parsed=crons.map(cron=>{
  const fields=cron.trim().split(/\s+/);
  if(fields.length!==5||fields.slice(2).some(f=>f!=='*')||fields.slice(0,2).some(f=>!/^\*$|^\d+(?:,\d+)*$/.test(f)))throw Error('Unsupported owner cron: '+cron);
  if(fields.slice(0,2).some((f,i)=>f!=='*'&&f.split(',').some(n=>Number(n)>(i?23:59))))throw Error('Invalid owner cron');
  return fields;
 });
 const end=Math.floor(before/MINUTE)*MINUTE;
 for(let t=end;t>=end-2*86400000;t-=MINUTE){
  const date=new Date(t);
  if(parsed.some(f=>matches(f[0],date.getUTCMinutes())&&matches(f[1],date.getUTCHours())))return new Date(t).toISOString();
 }
 throw Error('No due time found');
}
function evaluate(evidence,ledger={},root=ROOT){
 const e=evidence||{},now=Date.parse(e.now),observed=Date.parse(e.observedAt);
 const base={owner:e.owner,mainSha:e.mainSha,repairedRevision:e.repairedRevision,observedAt:e.observedAt};
 const decision=(action,reason,extra={})=>({...base,action,reason,...extra});
 if(!OWNERS.includes(e.owner)||!Number.isFinite(now)||!Number.isFinite(observed)||now-observed<0||now-observed>MINUTE||
  !/^[a-f0-9]{40}$/.test(e.mainSha||'')||!/^[a-f0-9]{40,64}$/.test(e.repairedRevision||''))return decision('stop','invalid-or-old-evidence');
 if(e.evidenceComplete!==true||e.historyReconciled!==true||!Array.isArray(e.runs)||!Array.isArray(e.activePublishers)||typeof e.openRecovery!=='boolean'||typeof e.materiallyStale!=='boolean')return decision('stop','incomplete-evidence');
 const date=localDate(now),key=[e.owner,date,e.repairedRevision].join(':');
 let dueAt;
 try{dueAt=latestDue(schedules(e.owner,root),e.owner==='news-refresh.yml'?now-75*MINUTE:now);}catch(error){return decision('stop',error.message);}
 const context={key,localDate:date,dueAt,notificationKey:key+':'+(e.failureReason||'missing-equivalent-work')};
 const records=Object.values(ledger.controlledRecoveries||{}).filter(r=>r.owner===e.owner);
 if(records.some(r=>UNKNOWN.has(r.status)))return decision('stop','previous-attempt-outcome-unknown',context);
 if(records.some(r=>r.status==='failed'&&r.repairedRevision===e.repairedRevision))return decision('stop','failed-recovery-requires-code-repair',context);
 if(ledger.controlledRecoveries?.[key])return decision('stop','attempt-already-recorded',context);
 if(e.repairedRevision!==repairRevision(e.owner,root))return decision('stop','revision-is-not-current-owner-code',context);
 if(now-Date.parse(dueAt)<75*MINUTE)return decision('wait','scheduled-owner-within-75-minute-grace',context);
 if(e.openRecovery||e.activePublishers.length)return decision('wait','recovery-or-publication-active',context);
 const relevant=e.runs.filter(r=>r.owner===e.owner||(Array.isArray(r.covers)&&r.covers.includes(e.owner)));
 if(relevant.some(r=>ACTIVE.has(r.status)))return decision('wait','equivalent-owner-active',context);
 if(relevant.some(r=>r.status!=='completed'))return decision('stop','unknown-owner-run-status',context);
 if(relevant.some(r=>!Number.isSafeInteger(r.id)||!Number.isFinite(Date.parse(r.checkedAt||r.created_at))||
  !['success','failure','cancelled','skipped','timed_out','action_required','neutral','startup_failure','stale'].includes(r.conclusion)))return decision('stop','incomplete-owner-run-outcome',context);
 const recent=relevant.filter(r=>Date.parse(r.checkedAt||r.created_at)>=Date.parse(dueAt));
 if(recent.some(r=>r.conclusion==='success'&&(r.published===true||r.unchanged===true)))return decision('done','equivalent-work-completed',context);
 if(recent.some(r=>r.conclusion==='success'))return decision('stop','successful-ingestion-needs-publication-proof',context);
 if(recent.some(r=>['failure','timed_out','startup_failure','action_required'].includes(r.conclusion))&&
  e.repairValidated!==true&&e.sourceRecoveryVerified!==true)return decision('stop','failed-owner-needs-diagnosed-repair',context);
 if(!e.materiallyStale)return decision('done','output-not-materially-stale',context);
 if(e.owner==='news-refresh.yml'&&(!Number.isFinite(e.newsGapMinutes)||e.newsGapMinutes<90))return decision('wait','news-gap-below-90-minutes',context);
 // A stale output must predate the actual grace-eligible due time. Otherwise
 // the latest schedule remains within grace, even if yesterday was stale.
 if(!Number.isFinite(Date.parse(e.outputCheckedAt))||Date.parse(e.outputCheckedAt)>=Date.parse(dueAt))return decision('wait','due-time-grace-or-output-evidence',context);
 if(typeof e.failureReason!=='string'||!e.failureReason.trim())return decision('stop','missing-failure-reason',context);
 return decision('recover','missing-equivalent-work-and-materially-stale-output',context);
}
function readLedger(file){
 try{
  const value=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid recovery ledger');
  if(value.controlledRecoveries!==undefined&&(!value.controlledRecoveries||typeof value.controlledRecoveries!=='object'||Array.isArray(value.controlledRecoveries)||
   Object.values(value.controlledRecoveries).some(r=>!r||!OWNERS.includes(r.owner)||!['reserved','submitted','unknown','success','failed','not_submitted'].includes(r.status))))throw Error('Invalid controlled recovery records');
  return value;
 }
 catch(error){if(error.code==='ENOENT')return {};throw error;}
}
function mutate(file,callback){
 fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});
 const lock=file+'.lock',fd=fs.openSync(lock,'wx'),temporary=file+'.'+process.pid+'.tmp';
 try{
  const ledger=readLedger(file),result=callback(ledger);
  const saved=fs.openSync(temporary,'wx');
  try{fs.writeFileSync(saved,JSON.stringify(ledger,null,2)+'\n');fs.fsyncSync(saved);}finally{fs.closeSync(saved);}
  fs.renameSync(temporary,file);
  return result;
 }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);fs.closeSync(fd);fs.unlinkSync(lock);}
}
function reserve(file,evidence,root=ROOT){
 return mutate(file,ledger=>{
  const result=evaluate(evidence,ledger,root);
  if(result.action!=='recover')throw Error('Recovery reservation refused: '+result.reason);
  ledger.controlledRecoveries||={};
  ledger.controlledRecoveries[result.key]={...result,status:'reserved',reservedAt:evidence.now,failureReason:evidence.failureReason,runId:null};
  return ledger.controlledRecoveries[result.key];
 });
}
function record(file,verification){
 return mutate(file,ledger=>{
  const entry=ledger.controlledRecoveries?.[verification.key];
  if(!entry||!UNKNOWN.has(entry.status))throw Error('No unresolved reservation');
  if(verification.status==='not_submitted'){
   if(entry.status!=='reserved'||entry.runId||verification.owner!==entry.owner||verification.submissionStarted!==false||
    !Number.isFinite(Date.parse(verification.verifiedAt))||Date.parse(verification.verifiedAt)<Date.parse(entry.reservedAt))throw Error('Cannot prove this reservation was never submitted');
   Object.assign(entry,{status:'not_submitted',verifiedAt:verification.verifiedAt,reason:'late work won before any dispatch request'});
   return entry;
  }
  if(verification.owner!==entry.owner||!Number.isSafeInteger(verification.runId)||verification.runId<=0||
   !/^[a-f0-9]{40}$/.test(verification.runSha||'')||!Number.isFinite(Date.parse(verification.verifiedAt))||
   Date.parse(verification.verifiedAt)<Date.parse(entry.reservedAt)||
   !['submitted','unknown','success','failed'].includes(verification.status))throw Error('Invalid verified run evidence');
  if(entry.runId&&entry.runId!==verification.runId)throw Error('Cannot replace an already recorded run');
  Object.assign(entry,{status:verification.status,runId:verification.runId,runSha:verification.runSha,verifiedAt:verification.verifiedAt,
   runUrl:'https://github.com/jonasdesouzajr-maker/matchapp.tv/actions/runs/'+verification.runId});
  return entry;
 });
}
module.exports={OWNERS,SOURCES,repairRevision,schedules,latestDue,evaluate,reserve,record,readLedger,localDate};
if(require.main===module){
 try{
  const [command,input,file]=process.argv.slice(2);
  if(!['evaluate','reserve','record'].includes(command)||!input||!file)throw Error('Usage: editorial-recovery.cjs evaluate|reserve|record evidence.json existing-ledger.json');
  const evidence=JSON.parse(fs.readFileSync(input,'utf8'));
  // A saved evidence file cannot choose its own current time to evade the
  // one-minute preflight limit. Deterministic library callers supply test time.
  if(command!=='record')evidence.now=new Date().toISOString();
  const result=command==='evaluate'?evaluate(evidence,readLedger(file)):command==='reserve'?reserve(file,evidence):record(file,evidence);
  console.log(JSON.stringify(result,null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
