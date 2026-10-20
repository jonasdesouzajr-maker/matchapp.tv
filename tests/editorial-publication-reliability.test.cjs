'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function bashExecutable(){
 if(process.platform!=='win32')return 'bash';
 if(process.env.MATCHAPP_BASH&&fs.existsSync(process.env.MATCHAPP_BASH))return process.env.MATCHAPP_BASH;
 const found=spawnSync('where.exe',['git'],{encoding:'utf8'});
 const executable=String(found.stdout||'').split(/\r?\n/).map(x=>x.trim()).find(Boolean);
 if(executable)for(const rel of ['bin/bash.exe','usr/bin/bash.exe']){
  const candidate=path.join(path.dirname(path.dirname(executable)),...rel.split('/'));
  if(fs.existsSync(candidate))return candidate;
 }
 return 'bash';
}
const BASH=bashExecutable();
const bashPath=value=>process.platform==='win32'?String(value).replace(/^([A-Za-z]):[\\/]/,(_,drive)=>'/'+drive.toLowerCase()+'/').replace(/\\/g,'/'):value;
function run(command,args,cwd,env=process.env){return spawnSync(command,args,{cwd,env,encoding:'utf8',timeout:20000});}
function git(cwd,...args){const r=run('git',args,cwd);assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
const realGit=run(BASH,['-c','command -v git'],ROOT);assert.equal(realGit.status,0,realGit.stderr);
function publishScript(owner){
 const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows',owner+'.yml'),'utf8').replace(/\r\n/g,'\n');
 const after=workflow.slice(workflow.indexOf('        id: publish\n'));
 const match=after.match(/        run: \|\n([\s\S]*?)(?=\n {0,8}\S|$)/);
 assert.ok(match,'publish script exists for '+owner);
 return match[1].split('\n').map(line=>line.slice(10)).join('\n');
}
function acknowledgement(script){
 const start=script.indexOf('published="$(git rev-parse HEAD)"');assert.ok(start>=0);
 const part=script.slice(start),marker=Math.max(part.indexOf('Push failed without newer main'),part.indexOf('Archive push outcome cannot be confirmed'));
 assert.ok(marker>=0);const end=part.slice(marker).match(/\n[ \t]*fi\b/);assert.ok(end);
 return part.slice(0,marker+end.index+end[0].length);
}
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editorial-real-publish-')),work=path.join(dir,'work'),remote=path.join(dir,'remote.git');
 git(dir,'init','--bare','--initial-branch=main',remote);git(dir,'clone',remote,work);
 git(work,'config','user.name','Publication Fixture');git(work,'config','user.email','fixture@example.invalid');
 fs.writeFileSync(path.join(work,'content.txt'),'base');git(work,'add','.');git(work,'commit','-m','base');git(work,'push','origin','HEAD:main');
 const base=git(work,'rev-parse','HEAD'),binary=path.join(dir,'bin');fs.mkdirSync(binary);
 const output=path.join(dir,'output'),trace=path.join(dir,'trace');
 fs.writeFileSync(path.join(binary,'git'),`#!/bin/bash
printf 'git %s\\n' "$*" >> "$MATCHAPP_FIXTURE_TRACE"
if [ "$1" = push ]; then
 case "$MATCHAPP_FIXTURE_CASE" in
  lost-ack|unknown-after-push) "$MATCHAPP_FIXTURE_REAL_GIT" "$@"; exit 1;;
  rejected-unchanged) exit 1;;
 esac
fi
if [ "$1" = fetch ] && [ "$MATCHAPP_FIXTURE_CASE" = unknown-after-push ]; then exit 1; fi
exec "$MATCHAPP_FIXTURE_REAL_GIT" "$@"
`,{mode:0o755});
 const env={...process.env,MATCHAPP_FIXTURE_BINARY:bashPath(binary),MATCHAPP_FIXTURE_REAL_GIT:realGit.stdout.trim(),MATCHAPP_FIXTURE_TRACE:bashPath(trace),MATCHAPP_FIXTURE_CASE:'normal',GITHUB_REF_NAME:'main',GITHUB_OUTPUT:bashPath(output)};
 return {dir,work,remote,base,binary,env,output,trace,
  execute(script,scenario='normal'){return run(BASH,['-c','export PATH="$MATCHAPP_FIXTURE_BINARY:/usr/bin:/bin"\nset -euo pipefail\n'+script],work,{...env,MATCHAPP_FIXTURE_CASE:scenario});},
  changed(){return fs.existsSync(output)&&fs.readFileSync(output,'utf8').includes('changed=1');},
  close(){fs.rmSync(dir,{recursive:true,force:true});}};
}
const owners=['unified-refresh','kids-seo-refresh','sitemap-refresh','music-video-refresh','seo-hardening','archive-international-day'];
for(const owner of owners)for(const scenario of ['normal','lost-ack','rejected-unchanged','remote-advance','unknown-after-push'])test(owner+' reconciles actual Git publication: '+scenario,()=>{
 const f=fixture();try{
  if(scenario==='remote-advance'){
   fs.writeFileSync(path.join(f.work,'independent.txt'),'independent main writer');git(f.work,'add','.');git(f.work,'commit','-m','independent');git(f.work,'push','origin','HEAD:main');git(f.work,'reset','--hard',f.base);
  }
  fs.writeFileSync(path.join(f.work,'content.txt'),'candidate');git(f.work,'add','.');git(f.work,'commit','-m','candidate');
  const candidate=git(f.work,'rev-parse','HEAD');
  const result=f.execute(acknowledgement(publishScript(owner))+'\necho REGENERATE',scenario);
  assert.equal(f.changed(),scenario==='normal'||scenario==='lost-ack',result.stderr);
  assert.equal(result.stdout.includes('REGENERATE'),scenario==='remote-advance',result.stderr);
  assert.equal(git(f.work,'rev-parse','HEAD'),candidate,'acknowledgement must not rewrite the candidate');
  const delivered=git(f.work,'ls-remote','origin','refs/heads/main').split(/\s/)[0]===candidate;
  assert.equal(delivered,['normal','lost-ack','unknown-after-push'].includes(scenario));
  if(['rejected-unchanged','unknown-after-push'].includes(scenario))assert.notEqual(result.status,0,'unknown outcome must stop');
  else assert.equal(result.status,0,result.stderr);
 }finally{f.close();}
});
for(const owner of ['unified-refresh','archive-international-day'])for(const gate of ['node tools/check-content-rotation.js','npm test','npm run audit:site'])test(owner+' refuses publication when '+gate+' fails',()=>{
 const f=fixture();try{
  for(const binary of ['node','npm'])fs.writeFileSync(path.join(f.binary,binary),`#!/bin/bash
name="$(basename "$0")"
printf '%s %s\\n' "$name" "$*" >> "$MATCHAPP_FIXTURE_TRACE"
if [ "$name $*" = "$MATCHAPP_FIXTURE_FAIL_GATE" ]; then exit 9; fi
`,{mode:0o755});
  f.env.MATCHAPP_FIXTURE_FAIL_GATE=gate;
  fs.writeFileSync(path.join(f.work,'content.txt'),'unvalidated generation');
  const result=f.execute(publishScript(owner));assert.notEqual(result.status,0,result.stderr);
  assert.equal(git(f.work,'rev-parse','HEAD'),f.base);assert.equal(f.changed(),false);
  assert.ok(!fs.readFileSync(f.trace,'utf8').includes('git push'),'no push before all gates succeed');
 }finally{f.close();}
});
test('unified staging includes every regional watch tree, generated news and music but leaves unrelated sources alone',()=>{
 const f=fixture();try{
  const owned=['en/br/watch','en/us/watch','en/gb/watch','en/pt/watch','pt/br/watch'];
  const files=[...owned.map(route=>route+'/index.html'),'news/sports.json','data/music-video-releases.json','guides/worldwide-entertainment-discovery/index.html'];
  for(const file of files){const p=path.join(f.work,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'Generated output');}
  fs.writeFileSync(path.join(f.work,'app.js'),'Unrelated source must remain unstaged');
  fs.writeFileSync(path.join(f.work,'.env.fixture'),'Unrelated private configuration');
  require('../tools/unified-refresh.cjs').stage(f.work);
  const staged=git(f.work,'diff','--staged','--name-only').split('\n');
  for(const file of files)assert.ok(staged.includes(file),file+' must publish with sitemap');
  assert.ok(!staged.includes('app.js'),'unrelated application source must remain unstaged');
  assert.ok(!staged.includes('.env.fixture'),'unrelated private configuration must remain unstaged');
 }finally{f.close();}
});
