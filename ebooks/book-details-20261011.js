/* MatchApp Ai — source-verified edition art and bibliographic facts.
 * Only exact work-title + author matches. No fabricated covers, ratings, narrator
 * credits, retailer prices, streaming availability or customer reviews. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MatchAppBookDetails=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const cache=new Map(),pending=new Map();
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const equal=(a,b)=>norm(a)===norm(b);
 function authorMatch(asked,found){
  const originals=String(asked||'').split(/\s+(&|and|e)\s+/i).filter(x=>x&&!/^(?:&|and|e)$/i.test(x));
  const all=norm(found).split(' ');
  return originals.every(person=>{
   const toks=norm(person).split(' ').filter(x=>x.length>2);
   if(!toks.length)return false;
   return toks.every(t=>all.includes(t)) || (toks.length>=2 && all.includes(toks[toks.length-1])&&all.some(t=>t.length>3&&t===toks[0]));
  });
 }
 function openLibraryMatch(book,rows){
  const docs=(Array.isArray(rows)?rows:[]).filter(d=>
   equal(book.title,d?.title)&&Array.isArray(d?.author_name)&&
   d.author_name.some(name=>authorMatch(book.author,name)));
  return docs.sort((a,b)=>Number(!!b.cover_i)-Number(!!a.cover_i))[0]||null;
 }
 function cleanCover(url){
  try {
   const u=new URL(url);
   if(u.protocol!=='https:')return null;
   if(u.hostname==='covers.openlibrary.org'&&/^\/b\/id\/\d+-[ML]\.jpg$/.test(u.pathname))return u.href;
   if(['books.google.com','books.googleusercontent.com','books.googleusercontent.com'].includes(u.hostname)&&
      /^\/books\/content/.test(u.pathname))return u.href;
  }catch(_){}
  return null;
 }
 async function getJSON(url){
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),5500);
  try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('source not available');return await r.json()}finally{clearTimeout(t)}
 }
 function result(book,row,source){
  return {
   source,year:Number.isInteger(row?.first_publish_year)?row.first_publish_year:null,
   pages:Number.isFinite(row?.number_of_pages_median)&&row.number_of_pages_median>0?Math.round(row.number_of_pages_median):null,
   rating:Number.isFinite(row?.ratings_average)&&row.ratings_average>=0&&row.ratings_average<=5&&Number(row.ratings_count)>0?Number(row.ratings_average):null,
   count:Number.isInteger(row?.ratings_count)&&row.ratings_count>0?row.ratings_count:null,
   cover:Number.isInteger(row?.cover_i)&&row.cover_i>0?cleanCover('https://covers.openlibrary.org/b/id/'+row.cover_i+'-L.jpg'):null,
   url:row?.key&&/^\/works\/OL\d+W$/.test(row.key)?'https://openlibrary.org'+row.key:null
  };
 }
 async function lookup(book){
  const key=norm(book.title)+'::'+norm(book.author);
  if(cache.has(key))return cache.get(key);
  if(pending.has(key))return pending.get(key);
  const job=(async()=>{
   const params=new URLSearchParams({title:book.title,author:book.author,limit:'8',fields:'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count'});
   let details=null;
   try{
    const data=await getJSON('https://openlibrary.org/search.json?'+params);
    const row=openLibraryMatch(book,data.docs);
    if(row)details=result(book,row,'Open Library');
   }catch(_){}
   // If the exact Open Library work lacks art, reuse the existing independently
   // verified Google Books title+author identity algorithm, never its unrelated
   // prices, ratings or editions. A source outage leaves a readable fallback.
   if(!details?.cover && typeof window!=='undefined' && window.MatchAppBookCoverIdentity?.verifiedGoogleCoverUrl){
    try{
     const query='intitle:"'+book.title+'" inauthor:"'+book.author+'"';
     const url='https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent(query)+'&maxResults=8&printType=books&projection=lite';
     const data=await getJSON(url);
     const verified=cleanCover(window.MatchAppBookCoverIdentity.verifiedGoogleCoverUrl(book,data.items));
     if(verified){details=details||{source:'Google Books',year:null,pages:null,rating:null,count:null,url:null};details.cover=verified}
    }catch(_){}
   }
   if(details)cache.set(key,details);
   // Do not turn a failed edition lookup into an invented rating/cover.
   return details;
  })().finally(()=>pending.delete(key));
  pending.set(key,job);
  return job;
 }
 function label(data,kind){
  const l=String(typeof document!=='undefined'?document.documentElement.lang:'en').toLowerCase();
  const pt=l.startsWith('pt');
  const a=[];
  if(data.year)a.push((pt?'Publicado':'Published')+' '+data.year);
  if(data.pages)a.push(data.pages+(pt?' páginas':' pages'));
  if(data.rating!==null&&data.count)a.push('★ '+data.rating.toFixed(1)+'/5 · '+data.count.toLocaleString(pt?'pt-BR':'en-US')+(pt?' avaliações':' ratings')+' · Open Library');
  else a.push(pt?'Avaliação não disponível':'Rating not available');
  if(kind==='audiobook')a.push(pt?'A capa e a avaliação pertencem à obra, não necessariamente à narração':'Cover and ratings describe the book, not a specific recording');
  return a;
 }
 function injectMeta(host,data,kind){
  const copy=host.querySelector('.ebook-top-copy,.ebook-result-copy');
  if(!copy||!data)return;
  let box=host.querySelector('[data-book-verified-meta]');
  if(!box){box=document.createElement('div');box.className='ebook-verified-meta';box.dataset.bookVerifiedMeta='1'; const actions=copy.querySelector('.ebook-top-actions,.ebook-source-groups,.ebook-why');if(actions)actions.before(box);else copy.append(box);}
  box.replaceChildren();
  const lines=label(data,kind);
  if(!lines.length){box.hidden=true;return}
  box.hidden=false;
  for(const line of lines){const span=document.createElement('span');span.textContent=line;box.append(span)}
  const source=document.createElement('small');source.className='ebook-meta-source';source.textContent= data.url?'Source: Open Library · work-level metadata':'Source: Open Library · bibliographic search';
  if(data.url){const a=document.createElement('a');a.href=data.url;a.rel='noopener noreferrer';a.target='_blank';a.textContent=source.textContent;box.append(a)}
  else box.append(source);
 }
 function setCover(host,data,book){
  if(!data?.cover)return;
  const frame=host.querySelector('.ebook-top-cover,.ebook-cover');
  if(!frame)return;
  // Prefer an already rendered source-verified audiobook or existing edition cover.
  const existing=frame.querySelector('img');
  if(existing&&!existing.hidden&&existing.naturalWidth>0)return;
  const img=existing||document.createElement('img'),fallback=frame.querySelector('[data-top-fallback],[data-ebook-cover-fallback],.ebook-cover-fallback');
  if(!existing){img.hidden=true;frame.prepend(img)}
  img.loading='lazy';img.decoding='async';img.alt=book.title+' — '+book.author+' (source cover)';
  const onLoad=()=>{if(img.naturalWidth>30){img.hidden=false;if(fallback)fallback.hidden=true}};
  const onError=()=>{img.hidden=true;if(fallback)fallback.hidden=false};
  img.addEventListener('load',onLoad,{once:true});img.addEventListener('error',onError,{once:true});
  img.src=data.cover;
  if(img.complete){if(img.naturalWidth>30)onLoad();else if(img.naturalWidth===0)onError()}
 }
 async function hydrate(host,book,options){
  if(!host||!book?.title||!book?.author)return null;
  const data=await lookup(book);
  if(!host.isConnected||!data)return null;
  injectMeta(host,data,options?.format);
  if(!options?.verifiedAudio)setCover(host,data,book);
  return data;
 }
 return Object.freeze({hydrate,lookup,openLibraryMatch,authorMatch,cleanCover});
});