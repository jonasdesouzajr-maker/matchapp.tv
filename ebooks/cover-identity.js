/* Fail-closed Open Library identity verification for curated Bookworms covers.
 * Wrong-edition or wrong-author covers are worse than an honest named
 * fallback. A search ranking alone must never approve artwork. */
(function(root,build){
 'use strict';
 const api=build();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MatchAppBookCoverIdentity=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const normalize=value=>String(value||'').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
 function exactAuthor(wanted,sourceAuthors){
  const coauthors=String(wanted||'').split(/\s+(?:&|and|e)\s+/i)
   .map(n=>normalize(n).split(' ').filter(Boolean)).filter(n=>n.length);
  if(!coauthors.length||!Array.isArray(sourceAuthors))return false;
  // Require every known coauthor, including initials; never accept one of two.
  return coauthors.every(tokens=>sourceAuthors.some(author=>{
   const names=new Set(normalize(author).split(' ').filter(Boolean));
   return tokens.every(token=>names.has(token));
  }));
 }
 function exactWork(book,record){
  const title=normalize(book?.title),candidate=normalize(record?.title);
  if(!title||title!==candidate||!exactAuthor(book?.author,record?.author_name))return false;
  const originalYear=Number(book?.year),candidateYear=Number(record?.first_publish_year);
  // Open Library works may have a missing first-publication date. When both
  // dates are present, reject a substantially different work sharing a title.
  if(Number.isInteger(originalYear)&&Number.isInteger(candidateYear)&&
     originalYear>=1500&&candidateYear>=1500&&Math.abs(originalYear-candidateYear)>3)return false;
  return true;
 }
 function verifiedCoverId(book,records){
  for(const record of Array.isArray(records)?records:[]){
   const id=Number(record?.cover_i);
   if(Number.isSafeInteger(id)&&id>0&&exactWork(book,record))return id;
  }
  return null;
 }
 // Google Books imageLinks are allowed only after *exact* original title and
 // every author agree. Editions may have later publication dates legitimately.
 function verifiedGoogleCoverUrl(book,items){
  for(const item of Array.isArray(items)?items:[]){
   const v=item?.volumeInfo;
   if(!v||!exactAuthor(book?.author,v.authors))continue;
   if(![v.title,v.subtitle?v.title+': '+v.subtitle:null]
        .some(candidate=>normalize(candidate)===normalize(book?.title)))continue;
   const raw=v.imageLinks?.thumbnail||v.imageLinks?.smallThumbnail;
   if(typeof raw!=='string')continue;
   try{
    const url=new URL(raw);
    if(url.hostname!=='books.google.com'||url.pathname!=='/books/content'||
       !['http:','https:'].includes(url.protocol))continue;
    url.protocol='https:';
    return url.href;
   }catch(_){}
  }
  return null;
 }
 // A third official source for books that have no usable Open Library or
 // Google Books image. Store search ranking alone is not edition proof.
 // Never borrow an Apple cover from a similarly named author or format.
 function verifiedAppleBookCoverUrl(book,results,region='US'){
  const locale=String(region||'US').toLowerCase();
  for(const row of Array.isArray(results)?results:[]){
   const name=String(row.trackName||row.collectionName||'');
   const author=String(row.artistName||'');
   if(row.kind&&row.kind!=='ebook')continue;
   if(row.trackExplicitness==='explicit'||row.collectionExplicitness==='explicit')continue;
   if(!exactWork(book,{title:name,author_name:[author]}))continue;
   const page=String(row.trackViewUrl||row.collectionViewUrl||'');
   try{
    const u=new URL(page);
    if(u.protocol!=='https:'||!['books.apple.com','itunes.apple.com'].includes(u.hostname)||
       !u.pathname.toLowerCase().startsWith('/'+locale+'/')||
       !/\/book\//.test(u.pathname))continue;
   }catch(_){continue}
   for(const value of [row.artworkUrl600,row.artworkUrl100]){
    if(typeof value!=='string')continue;
    try{
     const img=new URL(value);
     if(img.protocol==='https:'&&/^is[0-9]+-ssl\.mzstatic\.com$/i.test(img.hostname)&&
       img.pathname.startsWith('/image/thumb/'))return img.href;
    }catch(_){}
   }
  }
  return null;
 }
 return Object.freeze({normalize,exactAuthor,exactWork,verifiedCoverId,verifiedGoogleCoverUrl,verifiedAppleBookCoverUrl});
});