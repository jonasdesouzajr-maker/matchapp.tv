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
function bashPath(value){
 if(process.platform!=='win32')return value;
 return String(value).replace(/^([A-Za-z]):[\\/]/,(_,drive)=>'/'+drive.toLowerCase()+'/').replace(/\\/g,'/');
}
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/unified-refresh.yml'),'utf8').replace(/\r\n/g,'\n');
const section=workflow.split('      - name: Publish verified daily editorial refresh')[1].split('      - name: Validate and deploy')[0];
const script=section.split('        run: |\n')[1].split('\n').map(line=>line.slice(10)).join('\n');
const regionalRoots=['en/br/watch','en/us/watch','en/gb/watch','en/pt/watch','pt/br/watch'];
const ownedFiles=[
 'data/availability.json','where-to-watch/index.html','where-to-watch/fixture/index.html',
 'awareness/fixture-campaign/index.html','awareness/new-campaign/index.html',
 'tools/watch-urls.json','tools/seo-urls.json','sitemap.xml','sitemaps.xml',
 ...regionalRoots.flatMap(root=>[root+'/index.html',root+'/movie/fixture-123/index.html']),
 ...['moods','collections','platforms','languages','decades'].map(root=>root+'/fixture/index.html')
];
const gates=['node --test tests/release-audit.test.cjs','node tools/check-content-rotation.js','npm test','npm run audit:site','npm run build'];
const runnerFile=path.join(__dirname,'../tools/unified-refresh.cjs');
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'availability-publish-'));
 const work=path.join(dir,'work'),remote=path.join(dir,'remote.git'),binary=path.join(dir,'binary');
 const trace=path.join(dir,'trace'),output=path.join(dir,'output');
 fs.mkdirSync(work);fs.mkdirSync(binary);
 function git(args,cwd=work){
  const r=spawnSync('git',args,{cwd,encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(r.status,0,'git '+args.join(' ')+': '+(r.stderr||r.error||''));
  return r.stdout.trim();
 }
 function write(file,content){const target=path.join(work,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
 try{
  git(['init','--bare','--initial-branch=main',remote],dir);
  git(['init','--initial-branch=main']);
  git(['config','user.name','Availability Fixture']);git(['config','user.email','fixture@example.invalid']);
  git(['config','core.autocrlf','false']);
  for(const file of [...ownedFiles.filter(file=>file!=='awareness/new-campaign/index.html'),'app.js','awareness/calendar.json','awareness/source-notes.txt'])write(file,'initial '+file+'\n');
  git(['add','.']);git(['commit','-m','Initial fixture']);
  git(['remote','add','origin',remote]);git(['push','--set-upstream','origin','main']);
  const initial=git(['rev-parse','HEAD']);
  write('tools/unified-refresh.cjs',fs.readFileSync(runnerFile,'utf8'));
  for(const file of ownedFiles)write(file,'updated '+file+'\n');
  write('app.js','Unrelated UI change must stay local\n');
  write('awareness/calendar.json','Unrelated reviewed source calendar change\n');
  write('awareness/source-notes.txt','Unrelated source notes\n');
  write('.env.fixture','UNRELATED_FIXTURE=must-not-publish\n');
  const validator=`#!/bin/bash
set -euo pipefail
name="\${0##*/}"
entry="$name $*"
printf '%s\\n' "$entry" >> "$TRACE"
case "$entry" in
 'node --test tests/release-audit.test.cjs'|'node tools/check-content-rotation.js'|'npm test'|'npm run audit:site'|'npm run build') ;;
 'node tools/unified-refresh.cjs stage') exec \"$MATCHAPP_FIXTURE_REAL_NODE\" \"$@\" ;;
 *) echo 'Unexpected validator or generator command' >&2; exit 2 ;;
esac
if [ "$entry" = "$FAIL_GATE" ]; then exit 9; fi
`;
  for(const name of ['node','npm'])fs.writeFileSync(path.join(binary,name),validator,{mode:0o755});
  fs.writeFileSync(path.join(work,'.git','hooks','post-commit'),'#!/bin/sh\nset -eu\nprintf "commit\\n" >> "$TRACE"\n',{mode:0o755});
  fs.writeFileSync(path.join(remote,'hooks','pre-receive'),'#!/bin/sh\nset -eu\nwhile read -r old new ref; do printf "push %s\\n" "$ref" >> "$TRACE"; done\n',{mode:0o755});
  return {
   initial,git,
   remoteGit(args){return git(args,remote);},
   run(failGate=''){
    return spawnSync(bashExecutable(),['-c','export PATH="$MATCHAPP_FIXTURE_BIN:$PATH"\n'+script],{
     cwd:work,encoding:'utf8',env:{...process.env,MATCHAPP_FIXTURE_BIN:bashPath(binary),TRACE:bashPath(trace),
      FAIL_GATE:failGate,MATCHAPP_FIXTURE_REAL_NODE:process.execPath,GITHUB_OUTPUT:bashPath(output),GITHUB_REF_NAME:'main',GIT_TERMINAL_PROMPT:'0'}
    });
   },
   trace(){return fs.existsSync(trace)?fs.readFileSync(trace,'utf8').trim().split(/\r?\n/):[];},
   output(){return fs.existsSync(output)?fs.readFileSync(output,'utf8'):'';},
   read(file){return fs.readFileSync(path.join(work,file),'utf8');},
   close(){fs.rmSync(dir,{recursive:true,force:true});}
  };
 }catch(error){fs.rmSync(dir,{recursive:true,force:true});throw error;}
}

test('unified refresh publishes all owned regional outputs and leaves unrelated UI and environment files local',()=>{
 const f=fixture();try{
  const run=f.run();assert.equal(run.status,0,run.stderr||String(run.error||''));
  assert.equal(f.output(),'changed=1\n');
  const published=f.remoteGit(['rev-parse','main']);assert.notEqual(published,f.initial);
  assert.equal(f.git(['rev-parse','HEAD']),published);
  assert.deepEqual(f.remoteGit(['diff-tree','--no-commit-id','--name-only','-r',published]).split(/\r?\n/).sort(),[...ownedFiles].sort());
  for(const file of ownedFiles)assert.equal(f.remoteGit(['show','main:'+file]),'updated '+file,file+' must reach the published tree');
  assert.equal(f.remoteGit(['show','main:app.js']),'initial app.js');
  for(const file of ['awareness/calendar.json','awareness/source-notes.txt'])assert.equal(f.remoteGit(['show','main:'+file]),'initial '+file,'awareness source files must remain unpublished');
  assert.equal(f.read('awareness/calendar.json'),'Unrelated reviewed source calendar change\n');
  assert.equal(f.read('awareness/source-notes.txt'),'Unrelated source notes\n');
  assert.ok(!f.remoteGit(['ls-tree','-r','--name-only','main']).split(/\r?\n/).includes('.env.fixture'));
  assert.equal(f.read('app.js'),'Unrelated UI change must stay local\n');
  assert.equal(f.read('.env.fixture'),'UNRELATED_FIXTURE=must-not-publish\n');
  assert.deepEqual(f.trace(),[...gates,'node tools/unified-refresh.cjs stage','commit','push refs/heads/main'],'every gate must precede the real commit and push');
 }finally{f.close();}
});

for(const [index,gate] of gates.entries())test('unified refresh '+gate+' failure prevents any commit, push or changed output',()=>{
 const f=fixture();try{
  const run=f.run(gate);assert.notEqual(run.status,0);assert.equal(f.output(),'');
  assert.equal(f.git(['rev-parse','HEAD']),f.initial);
  assert.equal(f.remoteGit(['rev-parse','main']),f.initial);
  assert.equal(f.git(['diff','--cached','--name-only']),'');
  assert.deepEqual(f.trace(),gates.slice(0,index+1),'a failed validation must stop before real Git publishing');
 }finally{f.close();}
});
