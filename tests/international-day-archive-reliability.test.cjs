'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync,spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const day=(date)=>({_contract:'docs/DAILY_EVENT_AND_FEATURED_TITLE_CONTRACT.md',_note:'Execution note, not editorial content',id:'fixture-'+date,date,title:'Fixture observance '+date,image:'/event-posters/fixture.svg',officialUrl:'https://official.example/observance'});
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'day-archive-'));fs.mkdirSync(path.join(dir,'tools'));fs.mkdirSync(path.join(dir,'data'));
 for(const script of ['archive-international-day.cjs','archive-international-day.mjs'])fs.copyFileSync(path.join(ROOT,'tools',script),path.join(dir,'tools',script));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','--initial-branch=main');git('config','user.name','Archive Fixture');git('config','user.email','archive@example.invalid');
 const write=(name,value)=>fs.writeFileSync(path.join(dir,'data',name),JSON.stringify(value,null,2)+'\n');
 const commit=()=>{git('add','.');git('commit','-m','fixture');return git('rev-parse','HEAD');};
 write('international-day.json',day('2026-10-18'));write('international-day-history.json',[]);commit();
 write('international-day.json',day('2026-10-19'));const eventSha=commit();
 const run=(script,env={})=>spawnSync(process.execPath,[path.join(dir,'tools',script)],{cwd:dir,encoding:'utf8',env:{...process.env,GITHUB_EVENT_NAME:'',GITHUB_SHA:'',...env}});
 const history=()=>fs.readFileSync(path.join(dir,'data/international-day-history.json'),'utf8');
 return {dir,git,write,commit,eventSha,run,history,close(){fs.rmSync(dir,{recursive:true,force:true});}};
}
test('outgoing archive and nightly archive share note-free records without alternating metadata commits',()=>{
 const f=fixture();try{
  const old={...day('2026-10-18')};delete old._contract;delete old._note;
  f.write('international-day-history.json',[old]);const before=f.history();
  assert.equal(f.run('archive-international-day.cjs').status,0);assert.equal(f.history(),before);
  assert.equal(f.run('archive-international-day.mjs').status,0);const nightly=f.history();
  assert.equal(f.run('archive-international-day.cjs').status,0);assert.equal(f.history(),nightly);
  assert.deepEqual(JSON.parse(nightly).map(r=>r.date),['2026-10-19','2026-10-18']);
  assert.ok(JSON.parse(nightly).every(r=>!('_contract' in r)&&!('_note' in r)));
 }finally{f.close();}
});
test('a regenerated archive uses the original triggering source revision after main advances',()=>{
 const f=fixture();try{
  fs.writeFileSync(path.join(f.dir,'unrelated.txt'),'Later independent main change');f.commit();
  const result=f.run('archive-international-day.cjs',{GITHUB_EVENT_NAME:'push',GITHUB_SHA:f.eventSha});
  assert.equal(result.status,0,result.stderr);const history=JSON.parse(f.history());assert.equal(history.length,1);assert.equal(history[0].id,day('2026-10-18').id);
  const saved=f.history();assert.equal(f.run('archive-international-day.cjs',{GITHUB_EVENT_NAME:'push',GITHUB_SHA:f.eventSha}).status,0);assert.equal(f.history(),saved);
 }finally{f.close();}
});
test('missing or malformed source/history fails without erasing retained International Days',()=>{
 const f=fixture();try{
  for(const content of ['{invalid','{"not":"an array"}'])for(const script of ['archive-international-day.cjs','archive-international-day.mjs']){
   fs.writeFileSync(path.join(f.dir,'data/international-day-history.json'),content);
   assert.notEqual(f.run(script).status,0);assert.equal(f.history(),content);
  }
  f.write('international-day-history.json',[day('2026-10-17')]);const before=f.history();
  assert.notEqual(f.run('archive-international-day.cjs',{GITHUB_EVENT_NAME:'push',GITHUB_SHA:'f'.repeat(40)}).status,0);assert.equal(f.history(),before);
 }finally{f.close();}
});
