/* MatchApp e-book storefront referrals — public Amazon Brazil tracking ID.
   Do not tag other Amazon markets or the native Android app without the
   relevant marketplace enrollment / separate Amazon mobile-app approval. */
(function(root){
'use strict';
const BR_TAG='matchapp06-20';
const DOMAINS={BR:'amazon.com.br',GB:'amazon.co.uk',CA:'amazon.ca',AU:'amazon.com.au',JP:'amazon.co.jp',PT:'amazon.es',US:'amazon.com'};
function unapprovedAppContext(){
 const ua=String(root.navigator&&root.navigator.userAgent||'');
 // Amazon requires a separately approved mobile app. Conservatively leave
 // installed PWAs and television browsers untagged until individually cleared.
 if(/MatchAppAiAndroid\/|MatchAppTVAndroid|Smart.?TV|Tizen|Web0?S|Android TV|HbbTV|Roku|AFT[A-Z0-9]+|GoogleTV|AppleTV/i.test(ua))return true;
 if(root.navigator&&root.navigator.standalone===true)return true;
 try{if(root.matchMedia&&root.matchMedia('(display-mode: standalone)').matches)return true;}catch(_){}
 return false;
}
function amazonSearchUrl(book,market){
 const m=String(market||'US').toUpperCase();
 const url=new URL('https://www.'+(DOMAINS[m]||DOMAINS.US)+'/s');
 url.searchParams.set('k',String(book.title||'')+' '+String(book.author||''));
 url.searchParams.set('i','digital-text');
 if(m==='BR'&&!unapprovedAppContext())url.searchParams.set('tag',BR_TAG);
 return url.toString();
}
function isAffiliateLink(href){
 try{
  const url=new URL(href);
  return url.protocol==='https:'&&url.hostname==='www.amazon.com.br'&&url.searchParams.get('tag')===BR_TAG;
 }catch(_){return false}
}
function disclosure(locale){
 return /^pt/i.test(String(locale||''))?
  'Como associado da Amazon, eu ganho com compras qualificadas.':
  'As an Amazon Associate I earn from qualifying purchases.';
}
function paidLabel(locale){return /^pt/i.test(String(locale||''))?'publicidade':'paid link'}
root.MatchAppEbookAffiliate=Object.freeze({amazonSearchUrl,isAffiliateLink,disclosure,paidLabel});
})(window);
