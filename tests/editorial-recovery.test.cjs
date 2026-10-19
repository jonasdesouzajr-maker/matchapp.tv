'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const recovery=require('../tools/editorial-recovery.cjs');
const SHA='a'.repeat(40),REV=recovery.repairRevision('sports-refresh.yml');
const evidence=extra=>({owner:'sports-refresh.yml',now:'2026-10-19T12:32:00Z',observedAt:'2026-10-19T12:31:45Z',mainSha:SHA,repairedRevision:REV,
 evidenceComplete:true,historyReconciled:true,runs:[],activePublishers:[],openRecovery:false,materiallyStale:true,
 outputCheckedAt:'2026-10-18T14:00:00Z',failureReason:'Scheduled work missing and last successful source check predates due time',...extra,repairedRevision:extra&&'repairedRevision' in extra?extra.repairedRevision:recovery.repairRevision(extra?.owner||'sports-refresh.yml')});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editorial-ledger-'));return {file:path.join(dir,'existing.json'),close(){fs.rmSync(dir,{recursive:true,force:true});}};}
test('all audited owners retain their own exact cron; sports grace expires at 75 minutes',()=>{
 assert.deepEqual(recovery.schedules('sports-refresh.yml'),['17 11,23 * * *']);
 for(const owner of recovery.OWNERS)assert.ok(recovery.latestDue(recovery.schedules(owner),Date.parse('2026-10-19T12:32:00Z')));
 const before=recovery.evaluate(evidence({now:'2026-10-19T12:31:59Z',observedAt:'2026-10-19T12:31:45Z'}));
 assert.notEqual(before.action,'recover');
 const ready=recovery.evaluate(evidence());assert.equal(ready.action,'recover');assert.equal(ready.dueAt,'2026-10-19T11:17:00.000Z');
 assert.equal(recovery.localDate('2026-10-19T01:00:00Z'),'2026-10-18');
 assert.throws(()=>recovery.latestDue(['*/5 * * * *'],Date.now()),/Unsupported/);
});
test('fresh output, completed equivalent work, and successful unchanged checks never trigger recovery',()=>{
 assert.equal(recovery.evaluate(evidence({materiallyStale:false})).action,'done');
 for(const proof of [{published:true},{unchanged:true}]){
  const run={id:123,owner:'sports-refresh.yml',status:'completed',conclusion:'success',checkedAt:'2026-10-19T12:00:00Z',...proof};
  assert.equal(recovery.evaluate(evidence({runs:[run]})).reason,'equivalent-work-completed');
 }
 const midnight={id:456,owner:'midnight-content-rotation.yml',covers:['news-refresh.yml'],status:'completed',conclusion:'success',checkedAt:'2026-10-19T12:00:00Z',published:true};
 assert.equal(recovery.evaluate(evidence({owner:'news-refresh.yml',runs:[midnight],newsGapMinutes:100})).action,'done');
});
test('every active or ambiguous owner status and publication lock prevents competing recovery',()=>{
 for(const status of ['queued','in_progress','waiting','pending','requested'])
  assert.equal(recovery.evaluate(evidence({runs:[{owner:'sports-refresh.yml',status}]})).reason,'equivalent-owner-active');
 assert.equal(recovery.evaluate(evidence({runs:[{owner:'sports-refresh.yml',status:'mystery'}]})).action,'stop');
 assert.equal(recovery.evaluate(evidence({activePublishers:[{id:1}]})).action,'wait');
 assert.equal(recovery.evaluate(evidence({openRecovery:true})).action,'wait');
 const green={id:123,owner:'sports-refresh.yml',status:'completed',conclusion:'success',created_at:'2026-10-19T12:00:00Z'};
 assert.equal(recovery.evaluate(evidence({runs:[green]})).reason,'successful-ingestion-needs-publication-proof');
});
test('news needs both the schedule grace and at least a genuine 90-minute source check gap',()=>{
 const e=evidence({owner:'news-refresh.yml',now:'2026-10-19T12:52:00Z',observedAt:'2026-10-19T12:52:00Z'});
 assert.equal(recovery.evaluate({...e,newsGapMinutes:89.99}).reason,'news-gap-below-90-minutes');
 assert.equal(recovery.evaluate({...e,newsGapMinutes:90}).action,'recover');
 assert.equal(recovery.evaluate({...e,newsGapMinutes:90}).dueAt,'2026-10-19T11:37:00.000Z');
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
  const late={owner:'sports-refresh.yml',id:1,status:'in_progress'};
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
  for(const file of ['.github/workflows/sports-refresh.yml',...recovery.SOURCES['sports-refresh.yml']]){
   const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(__dirname,'..',file),target);
  }
  fs.appendFileSync(path.join(root,'tools/refresh-sports-discovery.js'),'\n// fixture repaired revision\n');
  assert.equal(recovery.evaluate(evidence({repairedRevision:recovery.repairRevision('sports-refresh.yml',root)}),recovery.readLedger(f.file),root).action,'recover');
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
 const run={id:123,owner:'sports-refresh.yml',status:'completed',conclusion:'failure',created_at:'2026-10-19T12:00:00Z'};
 assert.equal(recovery.evaluate(evidence({runs:[run]})).reason,'failed-owner-needs-diagnosed-repair');
 assert.equal(recovery.evaluate(evidence({runs:[run],repairValidated:true})).action,'recover');
 assert.equal(recovery.evaluate(evidence({runs:[{...run,conclusion:null}]})).action,'stop');
});

test('ordinary content commits cannot reset the repaired-code recovery budget',()=>{
 const rev=recovery.repairRevision('sports-refresh.yml');
 assert.equal(recovery.evaluate(evidence({mainSha:'d'.repeat(40)})).repairedRevision,rev);
 assert.equal(recovery.evaluate(evidence({repairedRevision:'c'.repeat(64)})).reason,'revision-is-not-current-owner-code');
});
test('malformed recovery record collections cannot be interpreted as unused retry budgets',()=>{
 const f=fixture();try{
  for(const controlledRecoveries of [null,[],{one:{owner:'sports-refresh.yml',status:'invented'}}]){
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
  for(const file of ['.github/workflows/sports-refresh.yml',...recovery.SOURCES['sports-refresh.yml']]){
   const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/\r?\n/g,'\r\n'));
  }
  assert.equal(recovery.repairRevision('sports-refresh.yml',root),recovery.repairRevision('sports-refresh.yml'));
 }finally{f.close();}
});
