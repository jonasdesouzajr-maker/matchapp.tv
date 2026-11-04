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
 if(/MatchAppAiAndroid\/|MatchAppTVAndroid|SmartTV|\bTizen\b|\bWebOS\b|\bAndroid TV\b|\bHbbTV\b|\bRoku\b|\bGoogleTV\b|\bAppleTV\b|\bAFT[A-Z0-9]+\b/i.test(ua))return true;
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
// Magazine SEARCH (not an assured listing or a verified in-stock issue).
// The Brazil tracking ID is web-only until native app approval; subscriptions
// and digital magazine products may be excluded from commission eligibility.
function amazonMagazineSearchUrl(magazine,market){
 // Do not link to Amazon at all from unapproved native/installed apps.
 if(unapprovedAppContext())return '';
 const m=String(market||'US').toUpperCase();
 const url=new URL('https://www.'+(DOMAINS[m]||DOMAINS.US)+'/s');
 url.searchParams.set('k',String(magazine.title||'')+' magazine');
 if(m==='BR'&&!unapprovedAppContext())url.searchParams.set('tag',BR_TAG);
 return url.toString();
}
// Only a visitor on the published adult website may generate a new paid referral.
const retailStores=Object.freeze({...DOMAINS,DE:'amazon.de',ES:'amazon.es',FR:'amazon.fr',IT:'amazon.it',IN:'amazon.in'});
function amazonRetailSearchUrl(term,market,preset,translatePreset=false){
 const domain=Object.hasOwn(retailStores,market)&&retailStores[market];
 const query=String(term||'').trim().slice(0,120);
 if(!query||!domain)return '';
 const url=new URL('https://www.'+domain+'/s');
 const editorial=['print','headphones','mic'].includes(preset);
 const brTerms={print:'Pro Git Scott Chacon livro impresso',headphones:'fone de ouvido com fio',mic:'microfone USB'};
 url.searchParams.set('k',translatePreset&&editorial&&market==='BR'?brTerms[preset]:query);
 if(preset==='print')url.searchParams.set('i','stripbooks');
 if(market==='BR'&&editorial&&root.location?.origin==='https://matchapp.tv'&&!unapprovedAppContext()&&
    !/; wv\)|WebView/i.test(root.navigator?.userAgent||'')&&!root.MatchAppNativeAI){
   url.searchParams.set('tag',BR_TAG);
 }
 return url.href;
}
function isAffiliateLink(href){
 try{
  const url=new URL(href);
  return url.protocol==='https:'&&url.hostname==='www.amazon.com.br'&&url.searchParams.get('tag')===BR_TAG;
 }catch(_){return false}
}
function disclosure(locale){
 if(root.MatchAppReadingDetailsCopy?.text)return root.MatchAppReadingDetailsCopy.text('affiliate.disclosure');
 return /^pt/i.test(String(locale||''))?
  'Como associado da Amazon, eu ganho com compras qualificadas.':
  'As an Amazon Associate I earn from qualifying purchases. Como associado da Amazon, eu ganho com compras qualificadas.';
}
function paidLabel(locale){return root.MatchAppReadingDetailsCopy?.text?.('affiliate.paid')||(/^pt/i.test(String(locale||''))?'publicidade':'paid link')}
root.MatchAppEbookAffiliate=Object.freeze({amazonSearchUrl,amazonMagazineSearchUrl,amazonRetailSearchUrl,isAffiliateLink,disclosure,paidLabel});
})(window);
