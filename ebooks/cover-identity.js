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
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
 function exactAuthor(wanted,sourceAuthors){
  const expected=normalize(String(wanted||'')).split(' ').filter(Boolean);
  if(!expected.length||!Array.isArray(sourceAuthors))return false;
  // Require every significant known name, including initials. "Baum" alone
  // cannot validate artwork for "L. Frank Baum" when another Baum exists.
  return sourceAuthors.some(author=>{
   const actual=normalize(author).split(' ').filter(Boolean);
   const names=new Set(actual);
   return expected.every(token=>names.has(token));
  });
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
 return Object.freeze({normalize,exactAuthor,exactWork,verifiedCoverId});
});