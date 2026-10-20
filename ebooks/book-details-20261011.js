/* MatchApp Ai — source-verified edition art and bibliographic facts.
 * Only exact work-title + author matches. No fabricated covers, ratings, narrator
 * credits, retailer prices, streaming availability or customer reviews. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MatchAppBookDetails=api;
})(typeof window!=='undefined'?window:null,function(root){
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
   if(['books.google.com','books.googleusercontent.com'].includes(u.hostname)&&
      /^\/books\/content/.test(u.pathname))return u.href;
   if(/^is[0-9]+-ssl\.mzstatic\.com$/.test(u.hostname)&&
      /^\/image\/thumb\/.+\/(?:100x100|600x600)bb\.jpg$/.test(u.pathname))return u.href;
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
 // Same-origin source-verified snapshot avoids cross-origin browser CORS failures.
 // The generators store only exact title+author Open Library or Apple Books records.
 let verifiedIndexPromise=null;
 async function fromVerifiedIndex(book){
  if(typeof window==='undefined')return null;
  if(!verifiedIndexPromise)verifiedIndexPromise=getJSON('/ebooks/verified-book-index-20261011.json?v=20261011-a2')
   .then(data=>Array.isArray(data?.entries)?data.entries:[]).catch(()=>{verifiedIndexPromise=null;return[]});
  const rows=await verifiedIndexPromise;
  const match=rows.find(entry=>equal(entry?.title,book.title)&&equal(entry?.author,book.author));
  if(!match||!['Open Library','Apple Books'].includes(match.source)||!cleanCover(match.cover))return null;
  return {
   source:match.source,
   cover:cleanCover(match.cover),
   year:Number.isInteger(match.year)&&match.year>=1500&&match.year<=2026?match.year:null,
   pages:Number.isInteger(match.pages)&&match.pages>0?match.pages:null,
   rating:Number.isFinite(match.rating)&&match.rating>=0&&match.rating<=5&&Number.isInteger(match.count)&&match.count>0?match.rating:null,
   count:Number.isInteger(match.count)&&match.count>0?match.count:null,
   url:(()=>{
    if(typeof match.url!=='string')return null;
    try{
     const u=new URL(match.url);
     if(u.protocol!=='https:')return null;
     if(match.source==='Open Library'&&u.hostname==='openlibrary.org'&&/^\/works\/OL\d+W$/.test(u.pathname))return u.href;
     if(match.source==='Apple Books'&&u.hostname==='books.apple.com'&&/^\/(?:br|us)\/book\/[^/]+\/id\d+$/.test(u.pathname))return u.href;
    }catch(_){}
    return null;
   })()
  };
 }
 async function lookup(book){
  const key=norm(book.title)+'::'+norm(book.author);
  if(cache.has(key))return cache.get(key);
  if(pending.has(key))return pending.get(key);
  const job=(async()=>{
   const params=new URLSearchParams({title:book.title,author:book.author,limit:'8',fields:'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,ratings_average,ratings_count'});
   let details=await fromVerifiedIndex(book).catch(()=>null);
   if(!details)try{
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
 function language(){return root?.MatchAppReadingDetailsCopy?.language?.()||String(typeof document!=='undefined'?document.documentElement.lang:'en');}
 function number(value,digits){try{return new Intl.NumberFormat(language(),digits===undefined?{}:{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value)}catch(_){return digits===undefined?String(value):value.toFixed(digits)}}
 const copyBindings=new Set();
 function bindCopy(node,key,params,fallback,attribute='text'){
  if(root?.MatchAppBooksLocale?.bind)return root.MatchAppBooksLocale.bind(node,key,params,attribute);
  const binding={node,key,params,fallback,attribute};copyBindings.add(binding);writeCopy(binding);return node;
 }
 function writeCopy(binding){
  const vars=typeof binding.params==='function'?binding.params():binding.params;
  const value=root?.MatchAppReadingDetailsCopy?.text?.(binding.key,vars)||binding.fallback;
  if(binding.attribute==='text')binding.node.textContent=value;
  else if(binding.attribute==='alt')binding.node.alt=value;
  else binding.node.setAttribute(binding.attribute,value);
 }
 root?.document?.addEventListener('matchapp:langchange',()=>{for(const binding of copyBindings){if(!binding.node.isConnected)copyBindings.delete(binding);else writeCopy(binding);}});
 function label(data,kind){
  const pt=language().toLowerCase().startsWith('pt'),a=[];
  if(data.year)a.push(['detail.year',{year:data.year},(pt?'Ano catalogado':'Catalog year')+' '+data.year]);
  if(data.pages)a.push(['detail.pages',()=>({count:number(data.pages)}),data.pages+(pt?' páginas':' pages')]);
  if(data.rating!==null&&data.count)a.push(['detail.ratings',()=>({rating:number(data.rating,1),count:number(data.count),source:data.source==='Apple Books'?'Apple Books':'Open Library'}),'★ '+data.rating.toFixed(1)+'/5 · '+data.count.toLocaleString(pt?'pt-BR':'en-US')+(pt?' avaliações':' ratings')+' · '+(data.source==='Apple Books'?'Apple Books':'Open Library')]);
  else a.push(['detail.noRating',{},pt?'Avaliação não disponível':'Rating not available']);
  if(kind==='audiobook')a.push(['detail.audioWork',{},pt?'A capa e a avaliação pertencem à obra, não necessariamente à narração':'Cover and ratings describe the book, not a specific recording']);
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
  for(const [key,params,fallback] of lines){const span=document.createElement('span');bindCopy(span,key,params,fallback);box.append(span)}
  const source=document.createElement('small');source.className='ebook-meta-source';
  const sourceName=['Google Books','Apple Books'].includes(data.source)?data.source:'Open Library';
  const sourceKey=data.url?(sourceName==='Apple Books'?'detail.sourceEdition':'detail.sourceWork'):'detail.sourceSearch';
  const sourceFallback='Source: '+sourceName+(data.url?(sourceName==='Apple Books'?' · verified store edition':' · work-level metadata'):' · bibliographic search');
  if(data.url){const a=document.createElement('a');a.href=data.url;a.rel='noopener noreferrer';a.target='_blank';bindCopy(a,sourceKey,{source:sourceName},sourceFallback);box.append(a)}
  else {bindCopy(source,sourceKey,{source:sourceName},sourceFallback);box.append(source)}
 }
 // Both cover owners share provenance on the existing image. Pixel dimensions
 // alone cannot distinguish source art from the global branded SVG fallback.
 function artworkIdentity(book){return norm(book.title)+'\n'+norm(book.author)}
 function coverURL(img){return String(img?.currentSrc||img?.src||'')}
 function prepareArtwork(img,book){
  const identity=artworkIdentity(book);
  if(img.__matchappBookCover?.identity!==identity)img.__matchappBookCover={identity,pending:null,verified:null};
  return img.__matchappBookCover;
 }
 function usableArtwork(img){
  const state=img?.__matchappBookCover,url=coverURL(img);
  return !!(state?.verified&&state.verified===url&&img.isConnected&&!img.hidden&&img.complete&&img.naturalWidth>30&&img.style.opacity!=='0'&&img.dataset?.maFallback!=='1'&&!/^data:/i.test(url));
 }
 function setCover(host,data,book){
  const url=cleanCover(data?.cover);if(!url)return;
  const frame=host.querySelector('.ebook-top-cover,.ebook-cover');if(!frame)return;
  const existing=frame.querySelector('img'),img=existing||document.createElement('img');
  const fallback=frame.querySelector('[data-top-fallback],[data-ebook-cover-fallback],.ebook-cover-fallback');
  if(!existing){img.hidden=true;frame.prepend(img)}
  const state=prepareArtwork(img,book);
  if(usableArtwork(img))return;
  const onLoad=()=>{
   if(!img.isConnected||img.__matchappBookCover!==state||coverURL(img)!==url||img.dataset?.maFallback==='1'||img.naturalWidth<=30)return;
   state.verified=url;state.pending=null;
   if(img.dataset){img.dataset.bookCoverVerified=url;delete img.dataset.bookCoverPending;delete img.dataset.maFallback}
   img.style.opacity='1';img.hidden=false;if(fallback)fallback.hidden=true;
  };
  if(coverURL(img)===url&&img.complete&&img.naturalWidth>30&&img.dataset?.maFallback!=='1'){onLoad();return}
  // An independent owner already requested this exact verified asset.
  if(state.pending===url&&coverURL(img)===url)return;
  const onError=()=>{
   if(usableArtwork(img)||img.__matchappBookCover!==state||state.pending!==url||coverURL(img)!==url)return;
   state.pending=null;if(img.dataset)delete img.dataset.bookCoverPending;
   img.style.opacity='0';img.hidden=true;if(fallback)fallback.hidden=false;
  };
  state.pending=url;
  if(img.dataset){img.dataset.bookCoverPending=url;delete img.dataset.maFallback;delete img.dataset.bookCoverVerified}
  img.loading='eager';img.decoding='async';bindCopy(img,'detail.cover',{title:book.title,author:book.author},book.title+' — '+book.author+' (source cover)','alt');
  img.style.opacity='0';img.hidden=false;
  img.addEventListener('load',onLoad,{once:true});img.addEventListener('error',onError,{once:true});
  img.src=url;
  if(img.complete&&img.naturalWidth>30)onLoad();
 }
 async function hydrate(host,book,options){
  if(!host||!book?.title||!book?.author)return null;
  const data=await lookup(book);
  if(!host.isConnected||!data)return null;
  injectMeta(host,data,options?.format);
  if(!options?.verifiedAudio)setCover(host,data,book);
  return data;
 }
 return Object.freeze({hydrate,lookup,verifiedCover:fromVerifiedIndex,openLibraryMatch,authorMatch,cleanCover});
});
