'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
function bashExecutable(){
 if(process.platform!=='win32')return 'bash';
 const override=process.env.MATCHAPP_BASH;
 if(override&&fs.existsSync(override))return override;
 const found=spawnSync('where.exe',['git'],{encoding:'utf8'});
 const gitPath=String(found.stdout||'').split(/\r?\n/).map(x=>x.trim()).find(Boolean);
 if(gitPath){
  const root=path.dirname(path.dirname(gitPath));
  for(const rel of ['bin/bash.exe','usr/bin/bash.exe']){
   const candidate=path.join(root,...rel.split('/'));
   if(fs.existsSync(candidate))return candidate;
  }
 }
 return 'bash';
}
const BASH=bashExecutable();
function bashPath(value){
 if(process.platform!=='win32')return value;
 return String(value).replace(/^([A-Za-z]):[\\/]/,(_,drive)=>'/'+drive.toLowerCase()+'/').replace(/\\/g,'/');
}
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/trending-refresh.yml'),'utf8').replace(/\r\n/g,'\n');
const section=workflow.split('      - name: Publish verified daily editorial refresh')[1].split('      - name: Validate and deploy')[0];
const script=section.split('        run: |\n')[1].split('\n').map(line=>line.slice(10)).join('\n');
function simulate({conflicts=1,failGate='',noop=false,lostAck='',remoteUnchanged=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daily-publish-'));
 try{
  const binary=path.join(dir,'binary');fs.mkdirSync(binary);
  const state=path.join(dir,'git-state');fs.mkdirSync(state);
  const initial='0000000000000000000000000000000000000001';
  for(const name of ['head','remote','tracking'])fs.writeFileSync(path.join(state,name),initial+'\n');
  fs.writeFileSync(path.join(state,'graph'),initial+' \n');
  const fake=`#!/bin/bash
set -euo pipefail
name="$(basename "$0")"
printf '%s %s\\n' "$name" "$*" >> "$TRACE"
if [ "$name" = git ]; then
 parent_of() {
  while read -r candidate parent; do
   if [ "$candidate" = "$1" ]; then printf '%s\\n' "$parent"; return 0; fi
  done < "$STATE/graph"
  return 1
 }
 case "$1" in
  diff) [ "$NOOP" = 1 ] && exit 0; exit 1;;
  commit)
   count=0; [ ! -f "$STATE/commits" ] || count=$(cat "$STATE/commits")
   count=$((count+1)); echo "$count" > "$STATE/commits"
   candidate=$(printf '%040x' "$((100+count))")
   printf '%s %s\\n' "$candidate" "$(cat "$STATE/head")" >> "$STATE/graph"
   echo "$candidate" > "$STATE/head"; exit 0;;
  rev-parse)
   case "$2" in
    HEAD) cat "$STATE/head";;
    HEAD~1) parent_of "$(cat "$STATE/head")";;
    origin/main) cat "$STATE/tracking";;
    *) exit 2;;
   esac
   exit $?;;
  fetch) cp "$STATE/remote" "$STATE/tracking"; exit 0;;
  reset) cp "$STATE/tracking" "$STATE/head"; exit 0;;
  merge-base)
   [ "$2" = --is-ancestor ] && [ "$4" = origin/main ] || exit 2
   current=$(cat "$STATE/tracking")
   while [ -n "$current" ]; do
    [ "$current" != "$3" ] || exit 0
    current=$(parent_of "$current")
   done
   exit 1;;
  push)
   count=0; [ ! -f "$COUNT" ] || count=$(cat "$COUNT")
   count=$((count+1)); echo "$count" > "$COUNT"
   if [ "$count" -gt "$CONFLICTS" ]; then cp "$STATE/head" "$STATE/remote"; exit 0; fi
   if [ -n "$LOST_ACK" ]; then
    cp "$STATE/head" "$STATE/remote"
    if [ "$LOST_ACK" = descendant ]; then
     advanced=$(printf '%040x' "$((2000+count))")
     printf '%s %s\\n' "$advanced" "$(cat "$STATE/remote")" >> "$STATE/graph"
     echo "$advanced" > "$STATE/remote"
    fi
   elif [ "$REMOTE_UNCHANGED" != 1 ]; then
    advanced=$(printf '%040x' "$((1000+count))")
    printf '%s %s\\n' "$advanced" "$(cat "$STATE/remote")" >> "$STATE/graph"
    echo "$advanced" > "$STATE/remote"
   fi
   exit 1;;
 esac
fi
if [ "$name $*" = "$FAIL_GATE" ]; then exit 9; fi
if [ "$name" = node ] && [ "$1" = - ]; then cat >/dev/null; fi
`;
  for(const name of ['git','node','npm'])fs.writeFileSync(path.join(binary,name),fake,{mode:0o755});
  const trace=path.join(dir,'trace'),output=path.join(dir,'output');
  const shellScript='export PATH="'+bashPath(binary)+':/usr/bin:/bin"\n'+script;
  const run=spawnSync(BASH,['-c',shellScript],{encoding:'utf8',env:{...process.env,TRACE:bashPath(trace),COUNT:bashPath(path.join(dir,'count')),STATE:bashPath(state),CONFLICTS:String(conflicts),FAIL_GATE:failGate,NOOP:noop?'1':'0',LOST_ACK:lostAck,REMOTE_UNCHANGED:remoteUnchanged?'1':'0',GITHUB_OUTPUT:bashPath(output)}});
  return {status:run.status,stdout:run.stdout,stderr:run.stderr,trace:fs.readFileSync(trace,'utf8').trim().split('\n'),output:fs.existsSync(output)?fs.readFileSync(output,'utf8'):'',head:fs.readFileSync(path.join(state,'head'),'utf8').trim(),remote:fs.readFileSync(path.join(state,'remote'),'utf8').trim()};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('daily publisher discards conflicted generation, refreshes latest main and reruns every gate before publishing',()=>{
 const r=simulate();assert.equal(r.status,0,r.stderr);assert.equal(r.output,'changed=1\n');
 const pushes=r.trace.map((x,i)=>x==='git push origin HEAD:main'?i:-1).filter(i=>i>=0);assert.equal(pushes.length,2);
 const retry=r.trace.slice(pushes[0]+1,pushes[1]);
 const required=['git fetch origin main','git reset --hard origin/main','node tools/refresh-music-videos.js','node tools/sync-catalog-media.js','node tools/refresh-trending.mjs','node tools/refresh-weekly-pick.mjs','node tools/update-sitemap.js','node --check weekly-pick.js','node --check trending-rail.js','node --check tools/refresh-trending.mjs','node --check tools/refresh-music-videos.js','node --check tools/refresh-weekly-pick.mjs','node tools/check-content-rotation.js','node -','npm run audit:site','npm test','npm run build'];
 let last=-1;for(const command of required){const i=retry.indexOf(command);assert.ok(i>last,command+' must run in sequence before the retry');last=i;}
 assert.ok(retry.findIndex(x=>x.startsWith('git add -- '))>last);
 assert.ok(!r.trace.some(x=>/git rebase|git add -A$|gh workflow/.test(x)));
});
test('failed regenerated audit or regression prevents another commit and push',()=>{
 for(const failGate of ['node tools/check-content-rotation.js','node -','npm run audit:site','npm test','npm run build']){
  const r=simulate({failGate});assert.notEqual(r.status,0,failGate);assert.equal(r.output,'');
  assert.equal(r.trace.filter(x=>x==='git push origin HEAD:main').length,1);
  assert.equal(r.trace.filter(x=>x.startsWith('git commit ')).length,1);
 }
});
test('no-op never publishes, and repeated conflicts stop after three validated attempts',()=>{
 const noop=simulate({noop:true});assert.equal(noop.status,0);assert.equal(noop.output,'changed=0\n');assert.ok(!noop.trace.some(x=>x.startsWith('git push')));
 const exhausted=simulate({conflicts:3});assert.notEqual(exhausted.status,0);assert.equal(exhausted.output,'');assert.equal(exhausted.trace.filter(x=>x==='git push origin HEAD:main').length,3);assert.equal(exhausted.trace.filter(x=>x==='npm test').length,2);
});
test('an accepted push with a lost acknowledgement succeeds without regenerating or resubmitting',()=>{
 for(const lostAck of ['head','descendant']){
  const r=simulate({lostAck});assert.equal(r.status,0,r.stderr);assert.equal(r.output,'changed=1\n');
  assert.equal(r.trace.filter(x=>x==='git push origin HEAD:main').length,1);
  assert.equal(r.trace.filter(x=>x.startsWith('git commit ')).length,1);
  assert.ok(r.trace.some(x=>x==='git fetch --no-tags origin main'));
  assert.ok(r.trace.some(x=>x==='git merge-base --is-ancestor '+r.head+' origin/main'));
  assert.ok(!r.trace.some(x=>x.startsWith('git reset ')||x.startsWith('node ')||x.startsWith('npm ')));
  assert.ok(!r.trace.some(x=>x==='git rev-parse HEAD~1'));
  if(lostAck==='head')assert.equal(r.remote,r.head);
  else assert.notEqual(r.remote,r.head,'a newer remote descendant still contains the accepted publication');
 }
});
test('a failed push with unchanged remote stops without a changed output or another attempt',()=>{
 const r=simulate({remoteUnchanged:true});assert.notEqual(r.status,0);assert.equal(r.output,'');
 assert.equal(r.trace.filter(x=>x==='git push origin HEAD:main').length,1);
 assert.equal(r.trace.filter(x=>x.startsWith('git commit ')).length,1);
 assert.ok(r.trace.some(x=>x==='git rev-parse HEAD~1'));
 assert.ok(r.trace.some(x=>x==='git rev-parse origin/main'));
 assert.ok(!r.trace.some(x=>x.startsWith('git reset ')||x.startsWith('node ')||x.startsWith('npm ')));
 assert.match(r.stdout,/Push failed without newer main; stop rather than resubmit an unknown outcome/);
 assert.notEqual(r.remote,r.head,'the unpublished candidate must not become remote main');
});
