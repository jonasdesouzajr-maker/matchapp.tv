const fs=require('fs');const p='tools/build-kids-pages.js';let s=fs.readFileSync(p,'utf8');
const oldFn='function page(title,description,url,body,data){return `<!doctype html><html lang="en"><head>${GTM_HEAD}<meta charset=';
const newFn='function page(title,description,url,body,data,includeGtm=false){const headGtm=includeGtm?GTM_HEAD:\'\',bodyGtm=includeGtm?GTM_NOSCRIPT:\'\';return `<!doctype html><html lang="en"><head>${headGtm}<meta charset=';
if(!s.includes(newFn)){if(!s.includes(oldFn))throw new Error('page() GTM template source changed');s=s.replace(oldFn,newFn);}
s=s.replace('</script></head><body>${GTM_NOSCRIPT}<header>','</script></head><body>${bodyGtm}<header>');
const oldCall='fs.writeFileSync(path.join(dir,\'index.html\'),page(titleName(i),desc,url,body,data));';
const newCall='fs.writeFileSync(path.join(dir,\'index.html\'),page(titleName(i),desc,url,body,data,true));';
if(!s.includes(newCall)){if(!s.includes(oldCall))throw new Error('title page call changed');s=s.replace(oldCall,newCall);}
fs.writeFileSync(p,s);console.log('Kids GTM generator scoped to title pages only.');
