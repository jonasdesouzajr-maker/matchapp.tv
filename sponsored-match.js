/* MatchApp Ai — explicit, directly contracted result sponsorships.
 * Both registries intentionally stay empty until a real campaign, exact
 * destination, regional terms and all fourteen translations are reviewed.
 * This is separate from the immutable AdSense inventory and its initializer.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.boot(root);
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  const labels={en:'Sponsored', 'pt-BR':'Patrocinado',es:'Patrocinado',fr:'Sponsorisé',de:'Gesponsert',it:'Sponsorizzato',tr:'Sponsorlu',ru:'Реклама',ar:'محتوى برعاية',hi:'प्रायोजित',id:'Bersponsor',ja:'広告',ko:'광고',zh:'赞助内容'};
  const campaigns=Object.freeze([]);
  const destinations=Object.freeze([]);
  const REVIEW_AGE_MS=7*86400000;
  function locale(w){
    let saved='';try{saved=w.localStorage.getItem('match_lang')||'';}catch(_){}
    for(const value of [w.MATCH_LANG,saved,w.document.documentElement.lang]){
      const normalized=String(value||'').toLowerCase();
      const lang=languages.find(l=>l.toLowerCase()===normalized)||(normalized.startsWith('pt')?'pt-BR':languages.find(l=>l===normalized.split('-')[0]));
      if(lang)return lang;
    }
    return 'en';
  }
  function country(w){
    try{
      for(const key of ['match_user_region','match_user_country']){
        const stored=w.localStorage.getItem(key)||'';
        if(/^[a-z]{2}$/i.test(stored))return stored.toUpperCase();
        const code=w.MatchAppGeography?.resolveCountry?.(stored)?.[1];
        if(/^[A-Z]{2}$/.test(code||''))return code;
      }
    }catch(_){}
    return '';
  }
  function destination(value,approved=destinations){
    if(typeof value!=='string'||value.length>2048||!Array.isArray(approved)||!approved.includes(value))return '';
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&u.href===value?u.href:'';}catch(_){return '';}
  }
  function validCopy(value){
    return value&&['title','body','cta','terms'].every(key=>typeof value[key]==='string'&&value[key].trim().length>0&&value[key].length<=({title:72,body:170,cta:64,terms:160}[key]));
  }
  function eligible(record,market,lang,now=Date.now(),approved=destinations){
    if(!record||!languages.includes(lang)||!/^[A-Z]{2}$/.test(market)||
       record.contracted!==true||record.reviewed!==true||!/^sponsor_[a-z0-9_-]{1,60}$/.test(record.id||'')||
       typeof record.sponsor!=='string'||!record.sponsor.trim()||record.sponsor.length>80||
       typeof record.reviewReference!=='string'||!record.reviewReference.trim()||record.reviewReference.length>200||
       !Array.isArray(record.countries)||!record.countries.length||!record.countries.every(code=>/^[A-Z]{2}$/.test(code))||!record.countries.includes(market)||
       !destination(record.url,approved)||!languages.every(language=>validCopy(record.copy?.[language])))return false;
    const start=Date.parse(record.startsAt),end=Date.parse(record.expiresAt),reviewed=Date.parse(record.reviewedAt);
    return Number.isFinite(start)&&Number.isFinite(end)&&Number.isFinite(reviewed)&&start<=now&&end>now&&end>start&&reviewed<=now&&now-reviewed<=REVIEW_AGE_MS;
  }
  function suppressed(w){
    if(w.MatchAppTokens?.enabled!==true||w.MatchAppTokens?.hasValue!==true||
       w.MatchAppTokens?.isPro?.()===true||w.MatchAppTokens?.isAdFree?.()===true||w.MatchAppPro?.isEntitled?.()===true||
       w.MATCHAPP_IS_AD_FREE===true)return true;
    try{if(w.localStorage.getItem('match_ad_free')==='true'||JSON.parse(w.localStorage.getItem('match_profile')||'null')?.is_ad_free===true)return true;}catch(_){}
    return false;
  }
  function boot(w){
    if(!w?.document||!['/','/index.html'].includes(w.location.pathname)||w.MatchAppSponsoredMatch||
       w.document.documentElement.classList.contains('kids-mode'))return null;
    const d=w.document;let card=null,selected=null;
    function translate(){
      if(!card||!selected)return;
      const lang=locale(w),copy=selected.copy[lang];card.lang=lang;card.dir=lang==='ar'?'rtl':'ltr';
      card.querySelector('.ma-sponsored-label').textContent=labels[lang];
      card.querySelector('h3').textContent=copy.title;card.querySelector('.ma-sponsored-body').textContent=copy.body;
      card.querySelector('a').textContent=copy.cta;card.querySelector('.ma-sponsored-terms').textContent=copy.terms;
    }
    function present(){
      try{
        const host=d.getElementById('result-box');
        // The caller is immediately before the original visibility assignment.
        // A late callback is never permission to fill an already visible card.
        if(!host||(!host.hidden&&host.style.display!=='none'))return false;
        if(card){card.remove();card=null;selected=null;}
        if(!campaigns.length||suppressed(w))return false;
        selected=campaigns.find(record=>eligible(record,country(w),locale(w)))||null;
        if(!selected)return false;
        card=d.createElement('aside');card.className='ma-sponsored-match';card.setAttribute('aria-labelledby','ma-sponsored-heading');
        const label=d.createElement('span');label.className='ma-sponsored-label';
        const sponsor=d.createElement('p');sponsor.className='ma-sponsored-name';sponsor.textContent=selected.sponsor;
        const heading=d.createElement('h3');heading.id='ma-sponsored-heading';
        const body=d.createElement('p');body.className='ma-sponsored-body';
        const link=d.createElement('a');link.className='ma-sponsored-link no-depth';link.href=selected.url;link.target='_blank';link.rel='sponsored noopener noreferrer';
        const terms=d.createElement('p');terms.className='ma-sponsored-terms';
        link.addEventListener('click',event=>{if(suppressed(w)||!eligible(selected,country(w),locale(w)))event.preventDefault();});
        card.append(label,sponsor,heading,body,link,terms);translate();host.append(card);return true;
      }catch(_){return false;}
    }
    for(const event of ['matchapp:langchange','matchapp:languagechange'])d.addEventListener(event,()=>{try{translate();}catch(_){}});
    const api=Object.freeze({present});w.MatchAppSponsoredMatch=api;return api;
  }
  return Object.freeze({languages,labels,campaigns,destinations,REVIEW_AGE_MS,locale,country,destination,eligible,suppressed,boot});
});
