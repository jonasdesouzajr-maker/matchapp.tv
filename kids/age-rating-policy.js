/* Exact-TMDB, conservative Kids source-rating verification. No AI can set
 * age bands or approve new entries. Source ratings are guidance, not a
 * replacement for parental review or the independent editorial allowlist. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MatchAppKidsAgePolicy=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const POSTER=/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[A-Za-z0-9_.-]+$/;
 const REJECT=new Set(['Horror','Crime','War & Politics','War','Thriller','Erotic','Adult']);
 const FAMILY=new Set(['Family','Animation','Kids']);
 const RATINGS=Object.freeze({
  'TV-Y':['all','3-5','6-8','9-12'],
  'G':['all','3-5','6-8','9-12'],
  'TV-Y7':['6-8','9-12'],
  'TV-G':['6-8','9-12'],
  'PG':['9-12']
 });
 const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const safeUrl=url=>POSTER.test(String(url||''));
 const sourceUrl=(kind,id)=>'https://www.themoviedb.org/'+kind+'/'+id;
 const validId=(v)=>Number.isSafeInteger(v)&&v>0;
 const ratingBands=(rating)=>RATINGS[String(rating||'').trim().toUpperCase()]||null;
 function verify(candidate,details,age='all'){
  // Never accept result metadata sourced from a language-model response.
  if(!candidate||!details||!validId(candidate.tmdbId)||!['movie','tv'].includes(candidate.kind)||
     details.tmdbId!==candidate.tmdbId||details.kind!==candidate.kind||
     candidate.adult===true||details.adult!==false||!safeUrl(details.posterLarge||details.poster))return null;
  const year=Number(details.year),baseYear=Number(candidate.year);
  if(!Number.isInteger(year)||year<1900||year>new Date().getFullYear()+1||
     !Number.isInteger(baseYear)||Math.abs(year-baseYear)>1)return null;
  if(!norm(details.originalTitle)||norm(details.originalTitle)!==norm(candidate.originalTitle))return null;
  const genres=Array.isArray(details.genres)?details.genres.filter(x=>typeof x==='string'):[];
  if(!genres.some(g=>FAMILY.has(g))||genres.some(g=>REJECT.has(g)))return null;
  const rating=String(details.contentRating||'').trim().toUpperCase(),bands=ratingBands(rating);
  if(!bands||!bands.includes(age))return null;
  if(typeof details.overview!=='string'||details.overview.trim().length<30||
     /(?:\b(?:rape|sexual abuse|pornograph|suicide|serial kill|graphic violence|extreme violence)\b)/i.test(details.overview))return null;
  const title=String(details.title||'').trim();
  if(!title||title.length>150||!safeUrl(details.posterLarge||details.poster))return null;
  const availability=details.availability&&typeof details.availability==='object'?details.availability:{};
  return Object.freeze({
   identity:'tmdb:'+details.kind+':'+details.tmdbId,
   tmdbId:details.tmdbId,kind:details.kind,title,year,rating,
   originalTitle:String(details.originalTitle),ageBands:bands.slice(),
   genres:genres.slice(0,8),overview:details.overview.trim().slice(0,900),
   poster:details.posterLarge||details.poster,
   source:sourceUrl(details.kind,details.tmdbId),
   availability,
   verifiedBy:'TMDB exact identity + source rating + family genre checks',
   editoriallyReviewed:false
  });
 }
 return Object.freeze({verify,ratingBands,safeUrl,sourceUrl});
});