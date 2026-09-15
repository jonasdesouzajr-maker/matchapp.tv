const fs=require('fs');
const files=['index.html','discover.html','together.html'];
for(const file of files){
  let s=fs.readFileSync(file,'utf8');
  const before=s;
  s=s.replace('/build-meta.js?v=192','/build-meta.js?v=193');
  if(s===before)throw new Error(file+': build-meta cache-bust source not found');
  fs.writeFileSync(file,s);
}
console.log('Bumped build-meta cache key on interactive app pages.');
