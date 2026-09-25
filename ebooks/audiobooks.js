/* MatchApp audiobook verification, independent of film/TV and Kids Mode.
 * Paid audiobook availability is displayed only for exact Apple Books
 * audiobook records in the user's selected storefront. Free audio requires
 * an exact LibriVox project; LibriVox rights are verified for the US only.
 * Google, Audible and Kobo searches are untagged discovery links, NOT proof
 * of a specific title's availability or an affiliate commission. */
(function(root,build){
 'use strict';
 const service=build();
 if(typeof module==='object'&&module.exports)module.exports=service;
 if(root)root.MatchAppAudiobooks=service;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const CACHE=new Map(),CACHE_LIMIT=80,TTL=6*3600000,QUERY_TIMEOUT=6500;
 const REGION={BR:'br',GB:'gb',CA:'ca',AU:'au',JP:'jp',PT:'pt',US:'us'};
 function normalized(s){
  return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/(?:\s*[:(]\s*(?:unabridged|abridged|audiobook|livro\s+audio|audio\s+edition).*?)\s*$/i,'')
   .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 }
 function authorMatches(wanted,actual){
  const observed=normalized(actual).split(' ').filter(Boolean);
  if(!observed.length)return false;
  // Exact audiobook editions must credit all known coauthors.
  return String(wanted||'').split(/\s+(?:&|and|e)\s+/i).every(name=>{
   const expected=normalized(name).split(' ').filter(Boolean);
   const distinctive=expected.filter(token=>token.length>2);
   if(distinctive.length>=2)return distinctive.every(token=>observed.includes(token));
   if(distinctive.length===1)return observed.includes(distinctive[0])&&
    expected.filter(token=>token.length===1).every(token=>observed.includes(token));
   return false;
  });
 }
 function titleMatches(bookTitle,candidate){
  const expected=normalized(bookTitle),got=normalized(candidate);
  if(!expected||!got)return false;
  return got===expected||got.startsWith(expected+' ')&&
   /(?:unabridged|abridged|audiobook|audio edition|livro audio)/i.test(String(candidate).slice(bookTitle.length));
 }
 function safeAppleUrl(href){
  try{
   const u=new URL(href);
   return u.protocol==='https:'&&
    ['books.apple.com','itunes.apple.com'].includes(u.hostname)&&
    /\/audiobook\//i.test(u.pathname);
  }catch(_){return false}
 }
 function safeAppleArtwork(href){
  if(typeof href!=='string')return null;
  try{
   const url=new URL(href);
   return url.protocol==='https:'&&/^is[0-9]+-ssl\.mzstatic\.com$/i.test(url.hostname)&&
    url.pathname.startsWith('/image/thumb/')?url.href:null;
  }catch(_){return null}
 }
 function verifyApple(book,results,market){
  const iso=String(market||'US').toUpperCase();
  for(const row of Array.isArray(results)?results:[]){
   const name=String(row.collectionName||row.trackName||'');
   const url=String(row.collectionViewUrl||row.trackViewUrl||'');
   if(!titleMatches(book.title,name)||!authorMatches(book.author,row.artistName)||
      !safeAppleUrl(url))continue;
   try{
    const u=new URL(url);
    if(!u.pathname.toLowerCase().startsWith('/'+(REGION[iso]||'us')+'/'))continue;
   }catch(_){continue}
   return Object.freeze({provider:'Apple Books',url,title:name,
    author:String(row.artistName||''),verified:true,kind:'paid',region:iso,
    coverUrl:safeAppleArtwork(row.artworkUrl600)||safeAppleArtwork(row.artworkUrl100)});
  }
  return null;
 }
 function safeLibriVoxUrl(href){
  try{const u=new URL(href);return u.protocol==='https:'&&
    (u.hostname==='librivox.org'||u.hostname==='www.librivox.org')&&
    /^\/[a-z0-9][a-z0-9-]*\/?$/i.test(u.pathname)}catch(_){return false}
 }
 function verifyLibriVox(book,projects,market){
  // Recordings on LibriVox are public domain in the United States. Outside
  // the US, copyright status depends on country and cannot be inferred.
  if(String(market||'').toUpperCase()!=='US')return null;
  for(const record of Array.isArray(projects)?projects:[]){
   const title=String(record.title||''),people=Array.isArray(record.authors)?
    record.authors.map(a=>(a.first_name||'')+' '+(a.last_name||'')).join(' '):'';
   const url=String(record.url_librivox||record.url_project||'');
   if(titleMatches(book.title,title)&&authorMatches(book.author,people)&&safeLibriVoxUrl(url)){
    return Object.freeze({provider:'LibriVox',url,title,author:people,
      verified:true,kind:'free-us',region:'US'});
   }
  }
  return null;
 }
 function sourceSearches(book,market){
  const title=String(book.title||'').trim(),author=String(book.author||'').trim(),
   term=encodeURIComponent(title+' '+author);
  const region=String(market||'US').toUpperCase(),locale=REGION[region]||'us';
  const suggestions=[
   {provider:'Google Play Books',url:'https://play.google.com/store/search?q='+term+'&c=books',label:'Search Google Play audio editions'},
   {provider:'Audible',url:'https://www.'+(region==='BR'?'audible.com.br':'audible.com')+'/search?keywords='+term,label:'Search Audible audio editions'},
   {provider:'Kobo',url:'https://www.kobo.com/'+
     ({BR:'br/pt',GB:'gb/en',CA:'ca/en',AU:'au/en',JP:'jp/ja',PT:'pt/pt',US:'us/en'}[region]||'us/en')+
     '/search?query='+term,label:'Search Kobo audio editions'}
  ];
  return suggestions.map(x=>Object.freeze({...x,verified:false,kind:'search-only',region:locale}));
 }
 // Aborting is not always reliable in an embedded WebView: the deadline
 // must also reject the in-flight Promise when the network never resolves.
 const pausePromise=(timeout,run)=>{
  const ctrl=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{
   timer=setTimeout(()=>{ctrl.abort();reject(Error('Audiobook source timed out'));},timeout);
  });
  return Promise.race([Promise.resolve().then(()=>run(ctrl.signal)),deadline])
   .finally(()=>clearTimeout(timer));
 };
 async function appleSearch(book,market,fetchFn){
  const u=new URL('https://itunes.apple.com/search');
  u.searchParams.set('term',String(book.title||'')+' '+String(book.author||''));
  u.searchParams.set('country',REGION[String(market||'US').toUpperCase()]||'us');
  u.searchParams.set('media','audiobook');u.searchParams.set('entity','audiobook');
  u.searchParams.set('limit','8');u.searchParams.set('explicit','No');
  const result=await pausePromise(QUERY_TIMEOUT,signal=>fetchFn(u.href,{signal,headers:{Accept:'application/json'}}));
  if(!result.ok)throw Error('Apple audio search unavailable');
  const data=await result.json();
  return verifyApple(book,data.results,market);
 }
 async function librivoxSearch(book,market,fetchFn){
  if(String(market||'').toUpperCase()!=='US')return null;
  const u=new URL('https://librivox.org/api/feed/audiobooks/');
  u.searchParams.set('title',String(book.title||'').slice(0,90));
  u.searchParams.set('format','json');u.searchParams.set('limit','5');
  const result=await pausePromise(QUERY_TIMEOUT,signal=>fetchFn(u.href,{signal,headers:{Accept:'application/json'}}));
  if(!result.ok)throw Error('LibriVox unavailable');
  const data=await result.json();
  return verifyLibriVox(book,data.books,market);
 }
 async function verify(book,market,access,fetchImpl){
  const fetchFn=fetchImpl||(typeof fetch==='function'?fetch.bind(globalThis):null);
  const wanted=String(access||'any'),region=String(market||'US').toUpperCase();
  if(!fetchFn||!book?.title||!book?.author)return {apple:null,free:null,searches:sourceSearches(book||{},region)};
  const key=region+'|'+wanted+'|'+normalized(book.title)+'|'+normalized(book.author);
  const old=CACHE.get(key);
  if(old&&Date.now()-old.when<TTL)return old.value;
  const result={apple:null,free:null,searches:sourceSearches(book,region)};
  // An unresponsive audio store must not starve an independent legal source.
  await Promise.all([
   wanted==='free'?Promise.resolve():appleSearch(book,region,fetchFn)
    .then(hit=>{result.apple=hit}).catch(()=>{}),
   wanted==='paid'||region!=='US'||!book.access?.includes('free')
    ?Promise.resolve():librivoxSearch(book,region,fetchFn)
     .then(hit=>{result.free=hit}).catch(()=>{})
  ]);
  const value=Object.freeze(result);
  // Cache positive results, not request failures. Store searches can still be
  // displayed when no live verification succeeded; never label them verified.
  if(value.apple||value.free){
   if(CACHE.size>=CACHE_LIMIT)CACHE.delete(CACHE.keys().next().value);
   CACHE.set(key,{when:Date.now(),value});
  }
  return value;
 }
 return Object.freeze({verify,verifyApple,verifyLibriVox,sourceSearches,
  titleMatches,authorMatches,safeAppleUrl,safeAppleArtwork,safeLibriVoxUrl});
});
