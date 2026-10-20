'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/unified-refresh.yml'),'utf8');
const block=workflow.split('      - name: Validate and deploy')[1];
const match=block.match(/          script: \|\n([\s\S]*?)(?=\n {0,10}\S|$)/);
assert.ok(match,'the delivery action has an executable script');
const script=match[1].split('\n').map(line=>line.slice(12)).join('\n');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const execute=new AsyncFunction('github','context','exec','core','require','fetch','AbortSignal','setTimeout','Date','process',script);
const SHA='a'.repeat(40),OLD='b'.repeat(40);

async function fixture({changed=true,live=SHA,dispatchError=false,conclusion='success',ambiguous=false,noRun=false,discoveryConclusion='success',noDiscovery=false,ambiguousDiscovery=false,discoverySha=SHA,discoveryCreatedAt='2026-10-20T04:30:12Z'}={}){
 let time=Date.parse('2026-10-20T04:30:12.123Z');
 const snapshots=[],dispatches=[],queries=[],markers=[];
 class Clock extends Date{
  constructor(...args){super(...(args.length?args:[time]));}
  static now(){return time;}
 }
 const io={mkdirSync(){},writeFileSync(file,content){snapshots.push(JSON.parse(content));}};
 const github={rest:{actions:{createWorkflowDispatch:async request=>{
  dispatches.push(request);
  assert.equal(snapshots.at(-1)[request.workflow_id==='pages-deploy.yml'?'pages':'discovery'].status,'submitting','durable request evidence precedes submission');
  if(dispatchError)throw Error('Dispatch response lost');
 },listWorkflowRuns(){}}},paginate:async(_method,query)=>{
  queries.push(query);
  if(noRun)return [];
  const discovery=query.workflow_id==='indexnow.yml';
  if(discovery&&noDiscovery)return [];
  const id=discovery?456:123;
  const run={id,head_sha:discovery?discoverySha:SHA,created_at:discovery?discoveryCreatedAt:'2026-10-20T04:30:12Z',status:'completed',conclusion:discovery?discoveryConclusion:conclusion,html_url:'https://github.com/example/actions/runs/'+id};
  return (discovery?ambiguousDiscovery:ambiguous)?[run,{...run,id:id+1}]:[run];
 }};
 const summary={addHeading(){return this;},addRaw(){return this;},async write(){}};
 let error;
 try{
  await execute(github,{repo:{owner:'example',repo:'site'},runId:42},{async getExecOutput(){return {stdout:SHA+'\n'};}},{summary},name=>{assert.equal(name,'node:fs');return io;},async url=>{
   markers.push(url);return {ok:true,async text(){return live;}};
  },AbortSignal,callback=>{time+=10000;callback();},Clock,{env:{CONTENT_CHANGED:changed?'1':'0'}});
 }catch(caught){error=caught;}
 return {snapshots,dispatches,queries,markers,error};
}

test('one changed publication requests Pages once and verifies the existing discovery owner without submitting a duplicate',async()=>{
 const result=await fixture();
 assert.equal(result.error,undefined,result.error?.message);
 assert.deepEqual(result.dispatches.map(x=>x.workflow_id),['pages-deploy.yml']);
 assert.equal(result.snapshots.at(-1).status,'success');
 assert.equal(result.snapshots.at(-1).liveSha,SHA);
 assert.equal(result.snapshots.at(-1).pages.runId,123);
 assert.equal(result.snapshots.at(-1).discovery.runId,456,'the Pages-owned discovery run is confirmed separately');
 assert.deepEqual(result.queries.map(x=>x.workflow_id),['pages-deploy.yml','indexnow.yml']);
 assert.ok(result.queries.every(x=>x.created==='>=2026-10-20T04:30:12Z'),'whole-second API creation timestamps must not lose the matching same-second run');
 assert.ok(result.queries.every(x=>x.head_sha===undefined),'all runs are reconciled before selecting exact-SHA evidence');
});
test('unchanged content already live uses one IndexNow recovery and no unnecessary Pages deployment',async()=>{
 const result=await fixture({changed:false});
 assert.equal(result.error,undefined,result.error?.message);
 assert.deepEqual(result.dispatches.map(x=>x.workflow_id),['indexnow.yml']);
 assert.equal(result.snapshots.at(-1).status,'success');
 assert.ok(result.markers.length,'the production SHA is checked before requesting discovery');
});
test('a successful Pages result cannot certify unpublished unchanged output',async()=>{
 // A successful Pages label with a persistently old live marker remains incomplete.
 const result=await fixture({changed:false,live:OLD});
 assert.deepEqual(result.dispatches.map(x=>x.workflow_id),['pages-deploy.yml']);
 assert.match(result.error?.message||'',/not confirmed on the live domain/);
 assert.equal(result.snapshots.at(-1).status,'failed-or-unconfirmed');
});
test('an uncertain dispatch result is never resubmitted or reported as completed',async()=>{
 const result=await fixture({dispatchError:true});
 assert.match(result.error?.message||'',/Dispatch response lost/);
 assert.equal(result.dispatches.length,1);
 assert.equal(result.queries.length,0);
 assert.equal(result.snapshots.at(-1).status,'failed-or-unconfirmed');
 assert.equal(result.snapshots.at(-1).pages.status,'submitting');
});
for(const options of [{conclusion:'failure'},{ambiguous:true},{noRun:true},{live:OLD}])test('failed, ambiguous, missing or unpublished delivery evidence cannot become green: '+JSON.stringify(options),async()=>{
 const result=await fixture(options);
 assert.ok(result.error,'incomplete or failed evidence must stop delivery');
 assert.equal(result.dispatches.length,1,'never dispatch again to overcome an unknown or failed result');
 assert.equal(result.snapshots.at(-1).status,'failed-or-unconfirmed');
});

for(const options of [{discoveryConclusion:'failure'},{noDiscovery:true},{ambiguousDiscovery:true},{discoverySha:OLD},{discoveryCreatedAt:'2026-10-20T04:30:11Z'}])test('failed or unconfirmed existing discovery prevents unified success without submitting another run: '+JSON.stringify(options),async()=>{
 const result=await fixture(options);
 assert.ok(result.error,'Pages success cannot hide failed or missing discovery');
 assert.deepEqual(result.dispatches.map(x=>x.workflow_id),['pages-deploy.yml'],'the coordinator must never replace the already-requested Pages-owned IndexNow run');
 assert.ok(result.queries.some(x=>x.workflow_id==='indexnow.yml'),'the existing discovery run is inspected');
 assert.equal(result.snapshots.at(-1).pages.conclusion,'success');
 assert.equal(result.snapshots.at(-1).status,'failed-or-unconfirmed');
});
