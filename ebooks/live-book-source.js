/* Optional adult-only two-source e-book discovery.
 * An Open Library subject result is never itself a paid-edition claim:
 * Google Books must independently confirm exact title, all authors and a
 * purchase link for the requested country. Unverifiable moods, pace, length,
 * free rights and adult-content status all fail closed. */
(function(root,build){
 'use strict';
 const api=build();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MatchAppLiveBookSource=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PAGES=new Map(),LIMIT=30,MAX_CHECKS=5,MAX_PAGE=8;
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
 const GENRES=Object.freeze({
  fantasy:{query:'fantasy',check:/\bfantasy\b/i},
  'science-fiction':{query:'science fiction',check:/\bscience fiction\b|\bsci fi\b/i},
  romance:{query:'romance',check:/\bromance\b|\blove stories\b/i},
  mystery:{query:'mystery',check:/\bmystery\b|\bdetective stories\b/i},
  historical:{query:'historical fiction',check:/\bhistorical fiction\b/i},
  adventure:{query:'adventure',check:/\badventure\b/i},
  classics:{query:'classic fiction',check:null},
  literary:{query:'literary fiction',check:/\bliterary fiction\b/i}
 });
 const EXPLICIT=/\b(?:porn(?:ographic|ography)?|xxx|hentai|erotica|erotic fiction|hardcore)\b/i;
 const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const titleEqual=(a,b)=>!!norm(a)&&norm(a)===norm(b);
 const authorEqual=(expected,source)=>Array.isArray(expected)&&expected.length>0&&
   Array.isArray(source)&&expected.every(name=>{
    const tokens=norm(name).split(' ').filter(Boolean);if(tokens.length<2)return false;
    return source.some(other=>{const all=new Set(norm(other).split(' ').filter(Boolean));return tokens.every(t=>all.has(t))});
   });
 const safeBuy=url=>{
  try{const u=new URL(url);return u.protocol==='https:'&&
    ['play.google.com','books.google.com'].includes(u.hostname)&&
    (/^\/store\/books\/details/.test(u.pathname)||/^\/books/.test(u.pathname))?u.href:null;
  }catch(_){return null}
 };
 const safeWork=key=>/^\/works\/OL\d+W$/.test(String(key||''))?'https://openlibrary.org'+key:null;
 function approve(work,volumes,prefs,market,excluded=new Set()){
  // Bibliographic subject tags cannot verify subjective mood or pacing.
 if((prefs?.mood&&prefs.mood!=='any')||(prefs?.pace&&prefs.pace!=='any')||
    (prefs?.length&&prefs.length!=='any')||prefs?.access==='free')return null;
 const title=String(work?.title||'').trim(),authors=work?.author_name;
  const year=Number(work?.first_publish_year),cover=Number(work?.cover_i);
  const workUrl=safeWork(work?.key),genre=String(prefs?.genre||'any');
  const sourceTopics=Array.isArray(work?.subject)?work.subject.filter(x=>typeof x==='string').join(' | '):'';
  const blocked=EXPLICIT.test(title+' '+sourceTopics);
  if(!title||blocked||!workUrl||!Array.isArray(authors)||!authors.length||
     !Number.isSafeInteger(year)||year<1450||year>2026||
     !Number.isSafeInteger(cover)||cover<=0||excluded.has(norm(title))||
     (genre!=='any'&&(!GENRES[genre]||GENRES[genre].check&&!GENRES[genre].check.test(sourceTopics)))||
     (genre==='classics'&&year>=1970)||
     (prefs.era==='classic'&&year>=1970)||
     (prefs.era==='modern'&&(year<1970||year>=2015))||
     (prefs.era==='recent'&&year<2015))return null;
  for(const item of Array.isArray(volumes)?volumes:[]){
   const v=item?.volumeInfo,sale=item?.saleInfo,summary=strip(v?.description);
   const buy=safeBuy(sale?.buyLink);
   if(!v||!titleEqual(title,v.title)||!authorEqual(authors,v.authors)||
      !buy||String(sale?.country||'').toUpperCase()!==market||
      sale.saleability!=='FOR_SALE'||v.maturityRating==='MATURE'||
      summary.length<75||EXPLICIT.test(summary+' '+(v.categories||[]).join(' ')))continue;
   if(prefs.explicit?.({title,synopsis:summary,cats:work.subject})===true)continue;
   const length=Number(v.pageCount)||0;
   return {id:'ol:'+work.key.slice('/works/'.length),title,author:authors.join(', '),
    year,genres:[genre==='any'?'literary':genre],moods:[],pace:'unknown',
    length:length>450?'long':length>0&&length<200?'short':length>=200?'medium':'unknown',
    era:year<1970?'classic':year<2015?'modern':'recent',access:['paid'],
    summary,source:'openlibrary-google-exact',sourcePage:workUrl,storeUrl:buy,
    verifiedCover:'https://covers.openlibrary.org/b/id/'+cover+'-L.jpg'};
  }
  return null;
 }
 async function get(url,fetchFn){
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),6000);
  try{const res=await fetchFn(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});
      if(!res?.ok)return null;return await res.json();}catch(_){return null}
  finally{clearTimeout(timeout)}
 }
 async function discover(prefs,context={},fetchFn=(typeof fetch==='function'?fetch:null)){
  if(typeof fetchFn!=='function'||prefs.format==='audiobook'||prefs.format==='magazine'||
     (prefs.mood&&prefs.mood!=='any')||(prefs.pace&&prefs.pace!=='any')||
     (prefs.length&&prefs.length!=='any')||prefs.access==='free')return null;
  const genre=String(prefs.genre||'any'),spec=GENRES[genre];
  if(genre!=='any'&&!spec)return null;
  const market=String(context.market||'US').toUpperCase();
  if(!['BR','US','GB','CA','AU','JP','PT'].includes(market))return null;
  const q=spec?.query||'popular fiction';
  const key=JSON.stringify({genre,era:prefs.era,market});
  const page=PAGES.get(key)||1;
  const ol=new URL('https://openlibrary.org/search.json');
  ol.searchParams.set('q',q);ol.searchParams.set('page',String(page));ol.searchParams.set('limit',String(LIMIT));
  ol.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i,subject');
  const data=await get(ol.href,fetchFn);
  if(!Array.isArray(data?.docs))return null;
  const excluded=context.excluded instanceof Set?context.excluded:new Set();
  for(const work of data.docs.slice(0,LIMIT).filter(x=>x?.cover_i&&Array.isArray(x?.author_name)&&!excluded.has(norm(x.title))).slice(0,MAX_CHECKS)){
   // One official retailer lookup per identity; a fuzzy search result never
   // authorizes a cover, price, availability or book summary.
   if(!work.title||!Array.isArray(work.author_name)||!work.author_name.length||!work.cover_i)continue;
   const google=new URL('https://www.googleapis.com/books/v1/volumes');
   google.searchParams.set('q','intitle:"'+work.title+'" inauthor:"'+work.author_name[0]+'"');
   google.searchParams.set('printType','books');
   google.searchParams.set('maxResults','6');
   google.searchParams.set('country',market);
   const result=await get(google.href,fetchFn);
   const approved=approve(work,result?.items,prefs,market,excluded);
   if(approved){
    PAGES.set(key,Math.min(MAX_PAGE,page+1));
    return approved;
   }
  }
  PAGES.set(key,page>=MAX_PAGE?1:page+1);
  return null;
 }
 return Object.freeze({norm,titleEqual,authorEqual,safeBuy,safeWork,approve,discover});
});