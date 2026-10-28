/* Authored copy only. Briefs never enter analytics, storage or a backend. */
(function(){'use strict';
  const root=document.querySelector('[data-mp-page]');if(!root)return;
  const copy=window.MATCHAPP_PARTNERSHIP_COPY;
  const supported=Object.keys(copy), select=document.getElementById('mp-language');
  let current='en';
  function lang(){let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}return [saved,window.MATCH_LANG,new URLSearchParams(location.search).get('lang'),document.documentElement.lang,'en'].map(x=>String(x||'').toLowerCase().split('-')[0]).find(x=>supported.includes(x));}
  function translate(){current=lang();const t=copy[current];document.documentElement.lang=current==='pt'?'pt-BR':current;document.documentElement.dir=current==='ar'?'rtl':'ltr';select.value=current;
    // These nodes have authored translations owned by this page. The generic
    // control localizer respects translate=no and must not repaint them using
    // a fallback dictionary after a saved-language navigation.
    document.querySelectorAll('[data-mp]').forEach(n=>{n.setAttribute('translate','no');const value=t[n.dataset.mp];if(value!==undefined)n.textContent=value;});
    const type=root.dataset.mpPage,title=type==='sponsor'?t.sponsor:t.directory;document.title=t[type+'SeoTitle']||title+' | MatchApp Ai';
    const description=t[type+'SeoDescription'];if(description){document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(n=>n.content=description);}
    document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(n=>n.content=document.title);
    const schema=document.getElementById('partnership-schema');if(schema){const data=JSON.parse(schema.textContent);data['@graph'][0].name=title;if(description)data['@graph'][0].description=description;data['@graph'][0].inLanguage=document.documentElement.lang;data['@graph'][1].itemListElement[1].name=title;data['@graph'].filter(n=>n['@type']==='ItemList').forEach(n=>n.name=title);schema.textContent=JSON.stringify(data);}
    const label=document.querySelector('.mh-tagline');if(label)label.textContent=title;const home=document.querySelector('.mh-home-label');if(home){home.textContent=t.home;home.closest('a').setAttribute('aria-label',t.home);home.closest('a').title=t.home;}const manual=document.getElementById('mp-manual');if(manual)manual.setAttribute('aria-label',t.brief);
    document.querySelectorAll('[data-market-code]').forEach(n=>{try{n.textContent=new Intl.DisplayNames([current],{type:'region'}).of(n.dataset.marketCode);}catch(_){}});
    document.querySelectorAll('[data-service-checked]').forEach(n=>{try{n.textContent=new Intl.DateTimeFormat([current==='pt'?'pt-BR':current],{dateStyle:'medium',timeZone:'UTC'}).format(new Date(n.dataset.serviceChecked+'T12:00:00Z'));}catch(_){}});
    filterDirectory();
    const status=document.getElementById('mp-status');if(status)status.textContent='';
  }
  select.addEventListener('change',()=>{window.MATCH_LANG=select.value;try{localStorage.setItem('match_lang',select.value);}catch(_){}document.dispatchEvent(new CustomEvent('matchapp:langchange',{detail:{lang:select.value}}));translate();});
  document.addEventListener('matchapp:langchange',translate);window.addEventListener('matchapp:langchange',translate);window.addEventListener('storage',e=>{if(e.key==='match_lang'){window.MATCH_LANG=e.newValue;translate();}});translate();
  // Search is an in-page directory filter, never an availability lookup or
  // matching integration. No faceted URLs, provider requests or title claims.
  function filterDirectory(){
    const filter=document.getElementById('mp-market');if(!filter)return;
    const query=document.getElementById('mp-service-query'),offer=document.getElementById('mp-offer');
    const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const wanted=normalize(query&&query.value),access=offer&&offer.value;
    let count=0,historical=0;
    document.querySelectorAll('.mp-service').forEach(n=>{
      n.hidden=!!((filter.value&&!n.dataset.markets.split(' ').includes(filter.value)) ||
        (access&&!(n.dataset.offers||'').split(' ').includes(access)) ||
        (wanted&&!normalize(n.dataset.search||n.querySelector('h3')?.textContent).includes(wanted)));
      if(!n.hidden)count++;
    });
    document.querySelectorAll('.mp-legacy-service').forEach(n=>{
      // An explicit former-name search is historical navigation. Unknown old
      // territories or today's access filter must not conceal its successor.
      n.hidden=wanted?!normalize(n.dataset.search).includes(wanted):
        !!(access || (filter.value&&!n.dataset.markets.split(' ').includes(filter.value)));
      if(!n.hidden)historical++;
    });
    const result=document.getElementById('mp-results-count');if(result)result.textContent=String(count);
    const empty=document.getElementById('mp-directory-empty');if(empty)empty.hidden=count>0||historical>0;
    const history=document.getElementById('mp-legacy-services');if(history){history.hidden=historical===0;if(wanted&&historical)history.open=true;}
  }
  const filter=document.getElementById('mp-market');if(filter)filter.addEventListener('change',filterDirectory);
  const offer=document.getElementById('mp-offer');if(offer)offer.addEventListener('change',filterDirectory);
  const query=document.getElementById('mp-service-query');if(query)query.addEventListener('input',filterDirectory);
  document.querySelectorAll('[data-current-service]').forEach(link=>link.addEventListener('click',()=>{
    // Reveal the current service before the native anchor navigation runs.
    if(filter)filter.value='';if(offer)offer.value='';if(query)query.value='';filterDirectory();
  }));
  // Official image hosts can deny requests outside their licensed market. Keep the
  // verified title and official destination usable without a broken-image panel.
  document.querySelectorAll('.mp-title img').forEach(img=>{const unavailable=()=>{img.hidden=true;};img.addEventListener('error',unavailable,{once:true});if(img.complete&&!img.naturalWidth)unavailable();});
  const form=document.getElementById('mp-brief');if(!form)return;
  const fields=['company','market','goal','budget'];
  function brief(){return fields.map(k=>copy[current][k]+': '+String(form.elements[k].value).replace(/[\r\n]+/g,' ').trim()).join('\n\n');}
  const status=document.getElementById('mp-status');
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const href='mailto:support@matchapp.tv?subject='+encodeURIComponent(copy[current].subject)+'&body='+encodeURIComponent(brief());status.textContent=copy[current].draft;status.setAttribute('data-ma-error',String(false));window.MatchAppErrors?.sync(status);location.href=href;});
  document.getElementById('mp-copy').addEventListener('click',async()=>{if(!form.reportValidity())return;const text=brief();try{await navigator.clipboard.writeText(text);status.textContent=copy[current].copied;status.setAttribute('data-ma-error',String(false));window.MatchAppErrors?.sync(status);}catch(_){const manual=document.getElementById('mp-manual');manual.value=text;manual.hidden=false;manual.focus();manual.select();status.textContent=copy[current].copyFailed;status.setAttribute('data-ma-error',String(true));window.MatchAppErrors?.sync(status);}});
})();
