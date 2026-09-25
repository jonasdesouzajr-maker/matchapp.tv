/* Permanent MatchApp editorial restriction (adult site too): no XXX/pornographic
   recommendation, magazine listing, AI result or unsafe third-party reading link.
   Mature mainstream journalism is not automatically pornography. Kids has a
   separate stronger reviewed allowlist and must not be modified here. */
(function(root){
'use strict';
// Deliberately narrow: do not mistake Sex Education, sexual health reporting,
// or the title of a non-pornographic documentary for a pornography platform.
const EXPLICIT=/\b(?:xxx|porn(?:ographic|ography|star|hub)?|hentai|hardcore(?:\s+sex)?|erotica|erotic(?:\s+fiction|\s+magazines?|\s+videos?)|onlyfans|adult\s+(?:xxx|movies?|videos?|magazines?|websites?)|sex\s+(?:tapes?|videos?|sites?))\b/i;
const urlBlock=/(?:^|\.)onlyfans\.com$|(?:^|\.)pornhub\.com$|(?:^|\.)xvideos\.com$|(?:^|\.)xnxx\.com$/i;
function isExplicit(value){
 if(value===null||value===undefined)return false;
 if(typeof value==='string')return EXPLICIT.test(value);
 const row=typeof value==='object'?value:{};
 // Do not treat arbitrary body text or a historical news story containing
 // the word 'pornography' as an explicit entertainment title.
 return [row.title,row.name,row.publisher,row.genre,row.category,row.type,
   ...(Array.isArray(row.genres)?row.genres:[]),
   ...(Array.isArray(row.categories)?row.categories:[])]
   .some(v=>EXPLICIT.test(String(v||'')));
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
