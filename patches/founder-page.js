/* Scoped biography translation. Existing locale and payment flows keep ownership. */
(function(){'use strict';
 const copy=window.MATCHAPP_FOUNDER_COPY,root=document.querySelector('.ma-founder-page');if(!root||!copy)return;
 function paint(){
  let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}
  const code=String(window.MATCH_LANG||saved||document.documentElement.lang||'en').split('-')[0].toLowerCase(),t=copy[code];if(!t)return;
  document.querySelectorAll('[data-founder]').forEach(n=>{if(t[n.dataset.founder]!==undefined)n.textContent=t[n.dataset.founder];});
  document.title=t.seoTitle||t.title+' | Jonas Junior · MatchApp Ai';
  document.getElementById('founder-portrait').alt=t.alt;
  document.getElementById('founder-email').href='mailto:support@matchapp.tv?subject='+encodeURIComponent(t.emailSubject);
  document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(n=>n.content=t.pageDesc);
  document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(n=>n.content=document.title);
  document.querySelectorAll('meta[property="og:image:alt"],meta[name="twitter:image:alt"]').forEach(n=>n.content=t.alt);
  const label=document.querySelector('.mh-tagline');if(label)label.textContent=t.title;
  const home=document.querySelector('.mh-home-label');if(home){home.textContent=t.home;home.closest('a').setAttribute('aria-label',t.home);home.closest('a').title=t.home;}
  const schema=document.getElementById('founder-schema'),data=JSON.parse(schema.textContent);data['@graph'][0].name=t.heading;data['@graph'][0].description=t.pageDesc;data['@graph'][0].inLanguage=document.documentElement.lang;data['@graph'][1].itemListElement[1].name=t.title;schema.textContent=JSON.stringify(data);
 }
 document.addEventListener('matchapp:langchange',paint);window.addEventListener('pageshow',paint);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
})();
