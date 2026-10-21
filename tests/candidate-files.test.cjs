'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {candidateFiles}=require('../tools/candidate-files.cjs');

test('candidate inventory includes generated additions and excludes tracked deletions before staging',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-candidate-files-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const write=(file,value='fixture')=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),value);};
 git('init','--quiet');
 write('.gitignore','ignored/\n');
 write('retained.html');write('unstaged-deletion.html');write('staged-deletion.html');
 write('ignored/tracked.html');
 git('add','.gitignore','retained.html','unstaged-deletion.html','staged-deletion.html');
 git('add','--force','ignored/tracked.html');
 fs.unlinkSync(path.join(root,'unstaged-deletion.html'));
 git('rm','--force','staged-deletion.html');
 const generated=['generated/new page.html'];
 if(process.platform!=='win32')generated.push('generated/new\nline.html');
 for(const file of generated)write(file);
 write('staged-addition.html');
 git('add','staged-addition.html');
 write('ignored/untracked.html');
 assert.deepEqual(candidateFiles(root).sort(),[
  '.gitignore','retained.html','ignored/tracked.html',...generated,'staged-addition.html'
 ].sort());
});

test('candidate inventory fails when Git cannot enumerate the worktree',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-candidate-not-git-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.throws(()=>candidateFiles(root),/not a git repository/);
});
