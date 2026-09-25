/* Permanent MatchApp editorial restriction (adult site too): no XXX/pornographic
   recommendation, magazine listing, AI result or unsafe third-party reading link.
   Mature mainstream journalism is not automatically pornography. Kids has a
   separate stronger reviewed allowlist and must not be modified here. */
(function(root){
'use strict';
// Deliberately narrow: do not mistake Sex Education, sexual health reporting,
// or the title of a non-pornographic documentary for a pornography platform.
const EXPLICIT=/\b(?:xxx|xvideos|xnxx|xhamster|redtube|youporn|brazzers|porn(?:ographic|ography|star|hub)?|hentai|hardcore(?:\s+sex)?|erotica|erotic(?:\s+fiction|\s+magazines?|\s+videos?)|onlyfans|adult\s+(?:xxx|movies?|videos?|magazines?|websites?)|sex\s+(?:tapes?|videos?|sites?))\b/i;
const urlBlock=/(?:^|\.)(?:onlyfans|pornhub|xvideos|xnxx|xhamster|redtube|youporn|brazzers)\.com$/i;
function isExplicit(value){
 if(value===null||value===undefined)return false;
 if(typeof value==='string')return EXPLICIT.test(value);
 const row=typeof value==='object'?value:{};
 // Do not treat arbitrary body text or a historical news story containing
 // the word 'pornography' as an explicit entertainment title.
 const labels=[row.title,row.name,row.publisher,row.genre,row.category,row.type,
   ...(Array.isArray(row.genres)?row.genres:[]),
   ...(Array.isArray(row.categories)?row.categories:[])];
 if(labels.some(v=>EXPLICIT.test(String(v||''))))return true;
 // A harmless-sounding result cannot smuggle a blocked XXX site through a
 // direct provider, buying, reading or artwork URL. Inspect only real URLs,
 // leaving ordinary relative links and mainstream educational titles alone.
 const urlFields=['url','href','link','watchUrl','streamUrl','sourceUrl','providerUrl',
  'buyUrl','readUrl','site','issues','subscription','posterUrl','coverUrl',
  'imageUrl','artwork','thumbnail'];
 const nested=[...(Array.isArray(row.links)?row.links:[]),
  ...(Array.isArray(row.sources)?row.sources:[]),
  ...(Array.isArray(row.providers)?row.providers:[])];
 const candidates=urlFields.map(k=>row[k]).concat(
  nested.flatMap(x=>x&&typeof x==='object'?urlFields.map(k=>x[k]):[x]));
 return candidates.some(v=>typeof v==='string'&&/^https?:\/\//i.test(v.trim())&&unsafeLink(v));
}
function unsafeLink(href){
 try{return urlBlock.test(new URL(href).hostname);}catch(_){return true;}
}
function safeEntries(items){
 return Array.isArray(items)?items.filter(x=>!isExplicit(x)): [];
}
root.MatchAppContentSafety=Object.freeze({
 isExplicit,isPornographicRequest:isExplicit,unsafeLink,safeEntries
});
})(window);
