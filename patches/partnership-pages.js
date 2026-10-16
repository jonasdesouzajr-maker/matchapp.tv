/* Authored copy only. Briefs never enter analytics, storage or a backend. */
(function(){'use strict';
  const root=document.querySelector('[data-mp-page]');if(!root)return;
  const copy=window.MATCHAPP_PARTNERSHIP_COPY;
  const supported=Object.keys(copy), select=document.getElementById('mp-language');
  let current='en';
  function lang(){let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}return [window.MATCH_LANG,saved,new URLSearchParams(location.search).get('lang'),document.documentElement.lang,'en'].map(x=>String(x||'').toLowerCase().split('-')[0]).find(x=>supported.includes(x));}
  function translate(){current=lang();const t=copy[current];document.documentElement.lang=current==='pt'?'pt-BR':current;document.documentElement.dir=current==='ar'?'rtl':'ltr';select.value=current;
    document.querySelectorAll('[data-mp]').forEach(n=>{const value=t[n.dataset.mp];if(value!==undefined)n.textContent=value;});
    const type=root.dataset.mpPage,title=type==='sponsor'?t.sponsor:t.directory;document.title=t[type+'SeoTitle']||title+' | MatchApp Ai';
    const description=t[type+'SeoDescription'];if(description){document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(n=>n.content=description);}
    document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(n=>n.content=document.title);
    const schema=document.getElementById('partnership-schema');if(schema){const data=JSON.parse(schema.textContent);data['@graph'][0].name=title;if(description)data['@graph'][0].description=description;data['@graph'][0].inLanguage=document.documentElement.lang;data['@graph'][1].itemListElement[1].name=title;schema.textContent=JSON.stringify(data);}
    const label=document.querySelector('.mh-tagline');if(label)label.textContent=title;const home=document.querySelector('.mh-home-label');if(home){home.textContent=t.home;home.closest('a').setAttribute('aria-label',t.home);home.closest('a').title=t.home;}const manual=document.getElementById('mp-manual');if(manual)manual.setAttribute('aria-label',t.brief);
    document.querySelectorAll('[data-market-code]').forEach(n=>{try{n.textContent=new Intl.DisplayNames([current],{type:'region'}).of(n.dataset.marketCode);}catch(_){}});
    const status=document.getElementById('mp-status');if(status)status.textContent='';
  }
  select.addEventListener('change',()=>{window.MATCH_LANG=select.value;try{localStorage.setItem('match_lang',select.value);}catch(_){}document.dispatchEvent(new CustomEvent('matchapp:langchange',{detail:{lang:select.value}}));translate();});
  document.addEventListener('matchapp:langchange',translate);window.addEventListener('matchapp:langchange',translate);window.addEventListener('storage',e=>{if(e.key==='match_lang'){window.MATCH_LANG=e.newValue;translate();}});translate();
  const filter=document.getElementById('mp-market');if(filter){filter.addEventListener('change',()=>{document.querySelectorAll('.mp-service').forEach(n=>n.hidden=!!filter.value&&!n.dataset.markets.split(' ').includes(filter.value));});}
  // Official image hosts can deny requests outside their licensed market. Keep the
  // verified title and official destination usable without a broken-image panel.
  document.querySelectorAll('.mp-title img').forEach(img=>{const unavailable=()=>{img.hidden=true;};img.addEventListener('error',unavailable,{once:true});if(img.complete&&!img.naturalWidth)unavailable();});
  const form=document.getElementById('mp-brief');if(!form)return;
  const fields=['company','market','goal','budget'];
  function brief(){return fields.map(k=>copy[current][k]+': '+String(form.elements[k].value).replace(/[\r\n]+/g,' ').trim()).join('\n\n');}
  const status=document.getElementById('mp-status');
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const href='mailto:support@matchapp.tv?subject='+encodeURIComponent(copy[current].subject)+'&body='+encodeURIComponent(brief());status.textContent=copy[current].draft;location.href=href;});
  document.getElementById('mp-copy').addEventListener('click',async()=>{if(!form.reportValidity())return;const text=brief();try{await navigator.clipboard.writeText(text);status.textContent=copy[current].copied;}catch(_){const manual=document.getElementById('mp-manual');manual.value=text;manual.hidden=false;manual.focus();manual.select();status.textContent=copy[current].copyFailed;}});
})();
