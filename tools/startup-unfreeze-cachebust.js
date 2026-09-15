const fs=require('fs');
const files=['index.html','discover.html','together.html'];
for(const file of files){
  let s=fs.readFileSync(file,'utf8');
  const before=s;
  s=s.replace('/build-meta.js?v=193','/build-meta.js?v=194');
  if(file==='index.html')s=s.replace('/ambient.js?v=187','/ambient.js?v=188');
  if(s===before)throw new Error(file+': expected cache-bust source not found');
  fs.writeFileSync(file,s);
}
console.log('Bumped build-meta on interactive pages and ambient on homepage.');
