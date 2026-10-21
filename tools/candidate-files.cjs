'use strict';
const {execFileSync}=require('node:child_process');

// Generators can add or remove files before the candidate is staged for publication.
function candidateFiles(root){
 const list=(...args)=>execFileSync('git',['ls-files',...args,'-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const candidates=new Set(list('--cached','--others','--exclude-standard'));
 const deleted=new Set(list('--deleted'));
 return [...candidates].filter(file=>!deleted.has(file));
}

module.exports={candidateFiles};
