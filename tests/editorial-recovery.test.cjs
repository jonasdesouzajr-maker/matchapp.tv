'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const recovery=require('../tools/editorial-recovery.cjs');
const SHA='a'.repeat(40),REV=recovery.repairRevision('unified-refresh.yml');
const evidence=extra=>({owner:'unified-refresh.yml',now:'2026-10-19T12:32:00Z',observedAt:'2026-10-19T12:31:45Z',mainSha:SHA,repairedRevision:REV,
 evidenceComplete:true,historyReconciled:true,runs:[],activePublishers:[],openRecovery:false,materiallyStale:true,
 outputCheckedAt:'2026-10-18T14:00:00Z',failureReason:'Scheduled work missing and last successful source check predates due time',...extra,repairedRevision:extra&&'repairedRevision' in extra?extra.repairedRevision:recovery.OWNERS.includes(extra?.owner)?recovery.repairRevision(extra.owner):REV});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editorial-ledger-'));return {file:path.join(dir,'existing.json'),close(){fs.rmSync(dir,{recursive:true,force:true});}};}
test('the unified fingerprint covers all former pipeline code and ignores ordinary content changes',()=>{
 const f=fixture(),root=path.dirname(f.file);try{
  const files=new Set(recovery.OWNERS.flatMap(owner=>['.github/workflows/'+owner,...recovery.SOURCES[owner]]));
  for(const file of files){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(__dirname,'..',file),target);}
  for(const file of recovery.SOURCES['unified-refresh.yml']){
   const before=recovery.repairRevision('unified-refresh.yml',root);
   fs.appendFileSync(path.join(root,file),'\n// Actual repaired dependency\n');
   assert.notEqual(recovery.repairRevision('unified-refresh.yml',root),before,file);
  }
  const before=recovery.repairRevision('unified-refresh.yml',root);
  fs.writeFileSync(path.join(root,'index.html'),'Ordinary daily content changed');
  assert.equal(recovery.repairRevision('unified-refresh.yml',root),before);
  assert.ok(recovery.SOURCES['unified-refresh.yml'].includes('tools/refresh-sports-discovery.js'));
  assert.ok(recovery.SOURCES['unified-refresh.yml'].includes('tools/refresh-news-rss.js'));
  assert.ok(recovery.SOURCES['unified-refresh.yml'].includes('tools/fetch-availability.js'));
  assert.ok(recovery.SOURCES['unified-refresh.yml'].includes('tools/sync-catalog-media.js'));
 }finally{f.close();}
});
test('only the unified daily owner is schedulable; recovery waits the full 75-minute grace',()=>{
 assert.deepEqual(recovery.OWNERS,['unified-refresh.yml']);
 assert.deepEqual(recovery.schedules('unified-refresh.yml'),['30 4 * * *']);
 const before=recovery.evaluate(evidence({now:'2026-10-19T05:44:59Z',observedAt:'2026-10-19T05:44:45Z'}));
 assert.notEqual(before.action,'recover');
 const ready=recovery.evaluate(evidence({now:'2026-10-19T05:45:00Z',observedAt:'2026-10-19T05:45:00Z'}));
 assert.equal(ready.action,'recover');assert.equal(ready.dueAt,'2026-10-19T04:30:00.000Z');
 for(const owner of recovery.LEGACY_OWNERS){
  assert.throws(()=>recovery.schedules(owner),/Retired recurring owner/);
  assert.throws(()=>recovery.repairRevision(owner),/Retired recurring owner/);
  assert.equal(recovery.evaluate(evidence({owner})).reason,'retired-owner-use-unified-refresh');
 }
 assert.equal(recovery.localDate('2026-10-19T01:00:00Z'),'2026-10-18');
 assert.throws(()=>recovery.latestDue(['*/5 * * * *'],Date.now()),/Unsupported/);
});
test('fresh output, completed equivalent work, and successful unchanged checks never trigger recovery',()=>{
 assert.equal(recovery.evaluate(evidence({materiallyStale:false})).action,'done');
 for(const proof of [{published:true},{unchanged:true}]){
  const run={id:123,owner:'unified-refresh.yml',status:'completed',conclusion:'success',checkedAt:'2026-10-19T12:00:00Z',...proof};
  assert.equal(recovery.evaluate(evidence({runs:[run]})).reason,'equivalent-work-completed');
 }
 // An old successful component does not cover the whole unified pipeline.
 const old={id:456,owner:'midnight-content-rotation.yml',status:'completed',conclusion:'success',checkedAt:'2026-10-19T12:00:00Z',published:true};
 assert.equal(recovery.evaluate(evidence({runs:[old]})).action,'recover');
 const equivalent={...old,covers:['unified-refresh.yml']};
 assert.equal(recovery.evaluate(evidence({runs:[equivalent]})).action,'done');
});
test('every active or ambiguous owner status and publication lock prevents competing recovery',()=>{
 for(const status of ['queued','in_progress','waiting','pending','requested'])
  assert.equal(recovery.evaluate(evidence({runs:[{owner:'unified-refresh.yml',status}]})).reason,'equivalent-owner-active');
 assert.equal(recovery.evaluate(evidence({runs:[{owner:'unified-refresh.yml',status:'mystery'}]})).action,'stop');
 assert.equal(recovery.evaluate(evidence({activePublishers:[{id:1}]})).action,'wait');
 assert.equal(recovery.evaluate(evidence({openRecovery:true})).action,'wait');
 const green={id:123,owner:'unified-refresh.yml',status:'completed',conclusion:'success',created_at:'2026-10-19T12:00:00Z'};
 assert.equal(recovery.evaluate(evidence({runs:[green]})).reason,'successful-ingestion-needs-publication-proof');
});
test('unified output must predate the actual daily due time before source replay is allowed',()=>{
 assert.equal(recovery.evaluate(evidence({outputCheckedAt:'2026-10-19T04:30:00Z'})).reason,'due-time-grace-or-output-evidence');
 assert.equal(recovery.evaluate(evidence({outputCheckedAt:'2026-10-19T04:29:59Z'})).action,'recover');
 assert.equal(recovery.evaluate(evidence({runs:[{owner:'sports-refresh.yml',status:'mystery'}]})).reason,'unknown-retired-owner-run-status');
 for(const owner of recovery.LEGACY_OWNERS)for(const status of ['queued','in_progress','waiting','pending','requested']){
  assert.equal(recovery.evaluate(evidence({runs:[{owner,status}]})).reason,'retired-owner-still-active');
 }
});
test('stale API snapshots, incomplete pagination/history, missing SHA and source age fail closed',()=>{
 for(const extra of [{observedAt:'2026-10-19T12:30:59Z'},{observedAt:'2026-10-19T12:33:00Z'},{evidenceComplete:false},{historyReconciled:false},{mainSha:''},{repairedRevision:''},{runs:null},{activePublishers:null}])
  assert.equal(recovery.evaluate(evidence(extra)).action,'stop');
 assert.equal(recovery.evaluate(evidence({outputCheckedAt:null})).action,'wait');
});
test('reservation is durable before submission, deduplicated, and preserves the existing coordinator ledger',()=>{
 const f=fixture();try{
  fs.writeFileSync(f.file,JSON.stringify({dedupAlertKeys:['existing-alert'],dailyAudit:{completed:true}}));
  const entry=recovery.reserve(f.file,evidence());assert.equal(entry.status,'reserved');assert.equal(entry.runId,null);
  const ledger=recovery.readLedger(f.file);assert.deepEqual(ledger.dedupAlertKeys,['existing-alert']);assert.equal(ledger.dailyAudit.completed,true);
  assert.throws(()=>recovery.reserve(f.file,evidence()),/outcome-unknown/);
  assert.equal(recovery.evaluate(evidence({repairedRevision:'c'.repeat(64),now:'2026-10-20T12:32:00Z',observedAt:'2026-10-20T12:32:00Z'}),ledger).reason,'previous-attempt-outcome-unknown');
 }finally{f.close();}
});
test('a late schedule is rechecked under the ledger lock and wins over an unsubmitted recovery',()=>{
 const f=fixture();try{
  const late={owner:'unified-refresh.yml',id:1,status:'in_progress'};
  assert.equal(recovery.evaluate(evidence()).action,'recover');
  assert.throws(()=>recovery.reserve(f.file,evidence({runs:[late]})),/equivalent-owner-active/);assert.equal(fs.existsSync(f.file),false);
  fs.writeFileSync(f.file+'.lock','unfinished reservation');
  assert.throws(()=>recovery.reserve(f.file,evidence()),{code:'EEXIST'});assert.equal(fs.existsSync(f.file),false);
 }finally{f.close();}
});
test('failed controlled recovery stops across local dates until a different repaired revision; run IDs cannot be replaced',()=>{
 const f=fixture();try{
  const entry=recovery.reserve(f.file,evidence());
  const update={key:entry.key,owner:entry.owner,runId:1234,runSha:SHA,verifiedAt:'2026-10-19T12:33:00Z',status:'submitted'};
  recovery.record(f.file,update);
  assert.throws(()=>recovery.record(f.file,{...update,runId:5678}),/Cannot replace/);
  recovery.record(f.file,{...update,status:'failed',verifiedAt:'2026-10-19T12:40:00Z'});
  assert.equal(recovery.evaluate(evidence(),recovery.readLedger(f.file)).reason,'failed-recovery-requires-code-repair');
  assert.equal(recovery.evaluate(evidence({now:'2026-10-20T12:32:00Z',observedAt:'2026-10-20T12:32:00Z'}),recovery.readLedger(f.file)).action,'stop');
  const root=path.join(path.dirname(f.file),'repaired-root');
  for(const file of ['.github/workflows/unified-refresh.yml',...recovery.SOURCES['unified-refresh.yml']]){
   const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(__dirname,'..',file),target);
  }
  fs.appendFileSync(path.join(root,'tools/refresh-sports-discovery.js'),'\n// fixture repaired revision\n');
  assert.equal(recovery.evaluate(evidence({repairedRevision:recovery.repairRevision('unified-refresh.yml',root)}),recovery.readLedger(f.file),root).action,'recover');
 }finally{f.close();}
});
test('an unknown dispatch outcome stays blocked; successful reservation cannot be recycled',()=>{
 const f=fixture();try{
  const entry=recovery.reserve(f.file,evidence());
  const update={key:entry.key,owner:entry.owner,runId:1234,runSha:SHA,verifiedAt:'2026-10-19T12:33:00Z',status:'unknown'};
  recovery.record(f.file,update);assert.equal(recovery.evaluate(evidence(),recovery.readLedger(f.file)).action,'stop');
  recovery.record(f.file,{...update,status:'success'});
  assert.equal(recovery.evaluate(evidence(),recovery.readLedger(f.file)).reason,'attempt-already-recorded');
  assert.throws(()=>recovery.record(f.file,update),/No unresolved/);
 }finally{f.close();}
});
test('corrupt persisted state is never treated as an empty retry budget',()=>{
 const f=fixture();try{fs.writeFileSync(f.file,'{invalid');assert.throws(()=>recovery.reserve(f.file,evidence()));assert.equal(fs.readFileSync(f.file,'utf8'),'{invalid');}finally{f.close();}
});

test('failed owner code and incomplete completed outcomes are never blindly rerun',()=>{
 const run={id:123,owner:'unified-refresh.yml',status:'completed',conclusion:'failure',created_at:'2026-10-19T12:00:00Z'};
 assert.equal(recovery.evaluate(evidence({runs:[run]})).reason,'failed-owner-needs-diagnosed-repair');
 assert.equal(recovery.evaluate(evidence({runs:[run],repairValidated:true})).action,'recover');
 assert.equal(recovery.evaluate(evidence({runs:[{...run,conclusion:null}]})).action,'stop');
});

test('ordinary content commits cannot reset the repaired-code recovery budget',()=>{
 const rev=recovery.repairRevision('unified-refresh.yml');
 assert.equal(recovery.evaluate(evidence({mainSha:'d'.repeat(40)})).repairedRevision,rev);
 assert.equal(recovery.evaluate(evidence({repairedRevision:'c'.repeat(64)})).reason,'revision-is-not-current-owner-code');
});
test('malformed recovery record collections cannot be interpreted as unused retry budgets',()=>{
 const f=fixture();try{
  for(const controlledRecoveries of [null,[],{one:{owner:'unified-refresh.yml',status:'invented'}}]){
   const original=JSON.stringify({controlledRecoveries});fs.writeFileSync(f.file,original);
   assert.throws(()=>recovery.reserve(f.file,evidence()),/Invalid controlled/);assert.equal(fs.readFileSync(f.file,'utf8'),original);
  }
 }finally{f.close();}
});
test('a known unsubmitted reservation closes safely when a late owner wins; uncertain submissions cannot use this path',()=>{
 const f=fixture();try{
  const entry=recovery.reserve(f.file,evidence());
  const close={key:entry.key,owner:entry.owner,status:'not_submitted',verifiedAt:'2026-10-19T12:33:00Z',submissionStarted:false};
  assert.throws(()=>recovery.record(f.file,{...close,submissionStarted:true}),/Cannot prove/);
  recovery.record(f.file,close);assert.equal(recovery.readLedger(f.file).controlledRecoveries[entry.key].status,'not_submitted');
  assert.throws(()=>recovery.reserve(f.file,evidence()),/attempt-already-recorded/);
 }finally{f.close();}
});
test('Windows and Linux checkouts share the same repaired-code retry budget',()=>{
 const f=fixture();try{
  const root=path.join(path.dirname(f.file),'windows-checkout');
  for(const file of ['.github/workflows/unified-refresh.yml',...recovery.SOURCES['unified-refresh.yml']]){
   const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/\r?\n/g,'\r\n'));
  }
  assert.equal(recovery.repairRevision('unified-refresh.yml',root),recovery.repairRevision('unified-refresh.yml'));
 }finally{f.close();}
});

test('historical reservations remain readable and block duplicate unified recovery until reconciled',()=>{
 const f=fixture();try{
  for(const owner of recovery.LEGACY_OWNERS)for(const status of ['reserved','submitted','unknown']){
   const legacy={owner,status,repairedRevision:'b'.repeat(64),runId:status==='reserved'?null:99};
   fs.writeFileSync(f.file,JSON.stringify({controlledRecoveries:{legacy},alertKeys:['prior-alert']}));
   const ledger=recovery.readLedger(f.file);
   assert.equal(ledger.controlledRecoveries.legacy.owner,owner);
   assert.equal(recovery.evaluate(evidence(),ledger).reason,'previous-attempt-outcome-unknown');
   assert.throws(()=>recovery.reserve(f.file,evidence()),/outcome-unknown/);
   assert.deepEqual(recovery.readLedger(f.file).alertKeys,['prior-alert']);
  }
  const legacy={owner:'sports-refresh.yml',status:'failed',repairedRevision:'b'.repeat(64),runId:99};
  fs.writeFileSync(f.file,JSON.stringify({controlledRecoveries:{legacy}}));
  const ledger=recovery.readLedger(f.file);
  assert.equal(recovery.evaluate(evidence(),ledger).reason,'legacy-failed-recovery-needs-diagnosed-repair');
  assert.equal(recovery.evaluate(evidence({repairValidated:true}),ledger).action,'recover');
  assert.equal(recovery.evaluate(evidence({sourceRecoveryVerified:true}),ledger).action,'recover');
 }finally{f.close();}
});
test('legacy submitted run outcomes can be reconciled without replacing their recorded run ID',()=>{
 const f=fixture();try{
  const legacy={owner:'availability.yml',status:'submitted',runId:99,reservedAt:'2026-10-19T04:00:00Z'};
  fs.writeFileSync(f.file,JSON.stringify({controlledRecoveries:{legacy}}));
  const update={key:'legacy',owner:'availability.yml',runId:99,runSha:SHA,verifiedAt:'2026-10-19T05:00:00Z',status:'success'};
  assert.throws(()=>recovery.record(f.file,{...update,runId:100}),/Cannot replace/);
  recovery.record(f.file,update);
  assert.equal(recovery.readLedger(f.file).controlledRecoveries.legacy.status,'success');
  assert.equal(recovery.evaluate(evidence(),recovery.readLedger(f.file)).action,'recover');
 }finally{f.close();}
});
