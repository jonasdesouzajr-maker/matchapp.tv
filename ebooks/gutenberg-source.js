/* Independent exact-edition Project Gutenberg discovery for adult Bookworms.
 * Gutendex exposes Project Gutenberg metadata; only a strict title+author
 * record with copyright:false can supply an actual US public-domain route.
 * Query its hosted API sparingly, on-demand, and never claim foreign rights. */
(function(root,factory){
 'use strict';
 const service=factory();
 if(typeof module==='object'&&module.exports)module.exports=service;
 if(root)root.MatchAppGutenbergSource=service;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const CACHE=new Map(),MAX_CACHE=70,TTL=8*3600000,TIMEOUT_MS=5500;
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const sameWork=(a,b)=>{
  const expected=norm(a),actual=norm(b);
  return !!expected&&(actual===expected||
    actual.split(/[:;]/)[0].trim()===expected);
 };
 const exactAuthor=(expected,names)=>{
  const coauthors=String(expected||'').split(/\s+(?:&|and|e)\s+/i)
    .map(x=>norm(x).split(' ').filter(Boolean));
  if(!coauthors.length||!Array.isArray(names)||!names.length)return false;
  return coauthors.every(author=>author.length>1&&names.some(record=>{
   const tokens=new Set(norm(record).split(' ').filter(Boolean));
   return author.every(t=>tokens.has(t));
  }));
 };
 function verifiedUS(book,records,market){
  if(String(market||'').toUpperCase()!=='US'||!book?.title||!book?.author)return null;
  for(const record of Array.isArray(records)?records:[]){
   const id=Number(record?.id);
   if(!Number.isSafeInteger(id)||id<=0||record?.copyright!==false||
      record?.media_type!=='Text'||!sameWork(book.title,record.title)||
      !exactAuthor(book.author,record.authors?.map(p=>p?.name).filter(Boolean)))continue;
   return Object.freeze({provider:'Project Gutenberg',title:String(record.title),
      sourceUrl:'https://www.gutenberg.org/ebooks/'+id,
      verified:true,region:'US',kind:'free-us'});
  }
  return null;
 }
 async function search(book,market,fetchImpl) {
  if(String(market||'').toUpperCase()!=='US'||!book?.title||!book?.author)return null;
  const fetchFn=fetchImpl||(typeof fetch==='function'?fetch:null);
  if(typeof fetchFn!=='function')return null;
  const key=norm(book.title)+'|'+norm(book.author);
  const cached=CACHE.get(key);
  if(cached&&Date.now()-cached.at<TTL)return cached.value;
  for(const term of [book.title+' '+book.author,book.title]){
   const ctrl=new AbortController();let timer;
   try{
    timer=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
    const url='https://gutendex.com/books?'+new URLSearchParams({search:term,copyright:'false'});
    const res=await fetchFn(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(!res?.ok)break; // outages and 429 are not catalog absence
    const rows=await res.json();
    const found=verifiedUS(book,rows?.results,market);
    if(found){
     if(CACHE.size>=MAX_CACHE)CACHE.delete(CACHE.keys().next().value);
     CACHE.set(key,{at:Date.now(),value:found});
     return found;
    }
   }catch(_){break;}finally{clearTimeout(timer)}
  }
  return null;
 }
 return Object.freeze({norm,sameWork,exactAuthor,verifiedUS,search});
});