/* Final production hardening: registration identity, account-persistent profile collections,
   polished profile state, consistent icon affordances, and VIP quota presentation. */
(function(){
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const readArray=name=>{try{const v=JSON.parse(localStorage.getItem(name)||'[]');return Array.isArray(v)?v:[];}catch(_){return[];}};
  const writeArray=(name,v)=>{try{localStorage.setItem(name,JSON.stringify(v));}catch(_){}};
  const safeName=v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,120);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=(name)=>({
    history:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    saved:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    seen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    dislike:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4H8a3 3 0 0 0-3 3v7h6l-1 5 2 1 4-7h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/></svg>',
    audio:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1zm16 0h-3v6h2a1 1 0 0 0 1-1z"/></svg>',
    lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    mail:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    globe:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    cake:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v9H4zM7 11V8h10v3M8 5v3m4-5v5m4-3v3"/></svg>',
    star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>'
  })[name]||'';

  function message(text,error=false){
    const el=$('#auth-message');if(!el)return;
    el.textContent=text;el.style.display='block';el.style.color=error?'#ffb4b4':'#9beeb8';
    el.style.background=error?'rgba(255,82,82,.10)':'rgba(63,211,122,.10)';
  }

  function installRequiredSignupName(){
    const form=$('#form-signup');if(!form||$('#reg-full-name'))return;
    const email=$('#reg-email');if(!email)return;
    const input=document.createElement('input');
    input.type='text';input.id='reg-full-name';input.name='name';input.autocomplete='name';input.required=true;input.maxLength=120;
    input.placeholder='Full Name';input.setAttribute('aria-label','Full Name');input.className='audit-auth-input';
    input.style.cssText=email.style.cssText;input.style.marginBottom='15px';
    email.before(input);
    email.required=true;email.autocomplete='email';$('#reg-password')?.setAttribute('required','');$('#reg-password')?.setAttribute('autocomplete','new-password');
    const note=document.createElement('p');note.className='audit-auth-note';note.textContent='Your email and full name belong to your account and follow you across devices.';input.after(note);

    window.handleEmailSignup=async function(){
      const name=safeName(input.value),mail=String(email.value||'').trim(),password=$('#reg-password')?.value||'',sb=window.supabaseClient;
      if(name.length<3||name.split(/\s+/).length<2){message('Please enter your full name.',true);input.focus();return;}
      if(!mail||!email.checkValidity()){message('Please enter a valid email address.',true);email.focus();return;}
      if(password.length<6){message('Create a password with at least 6 characters.',true);$('#reg-password')?.focus();return;}
      if(!sb){message('Account service is temporarily unavailable. Please try again.',true);return;}
      if(window.__maEmailSignupPending)return;
      window.__maEmailSignupPending=true;
      const signupButton=$('#form-signup .gold-btn');
      if(signupButton)signupButton.disabled=true;
      message('Creating your private MatchApp account…');
      try{
        const {data,error}=await sb.auth.signUp({email:mail,password,options:{data:{full_name:name,name,matchapp_first_time_onboarding_v1:true},emailRedirectTo:'https://matchapp.tv/'}});
        if(error)throw error;
        if(data?.session?.user){
          await window.hydrateProfileFromAuth?.(data.session.user);window.closeAuthModal?.();
          window.showToast?.('Account created. Complete your profile to personalize every match.');
        }else message('Account created. Check your inbox and use the newest confirmation link. If the link expires, request a new one from Log In.');
      }catch(e){message(e?.message||'Could not create your account. Please try again.',true);}
      finally{window.__maEmailSignupPending=false;if(signupButton)signupButton.disabled=false;}
    };
  }

  async function syncPortfolioColumns(){
    const sb=window.supabaseClient;if(!sb)return false;
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return false;
      const payload={saved_list:readArray('match_savedList'),seen_list:readArray('match_seenList'),disliked_list:readArray('match_dislikedList')};
      const ratings=(()=>{try{const r=JSON.parse(localStorage.getItem('match_userRatings')||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{};}catch(_){return{};}})();
      payload.user_ratings=ratings;
      const {error}=await sb.from('profiles').update(payload).eq('id',user.id);if(error)throw error;
      return true;
    }catch(_){return false;}
  }

  async function forgetEverywhere(title){
    const target=key(title);if(!target)return false;
    const prune=name=>{const v=readArray(name).filter(i=>key(typeof i==='string'?i:i?.title)!==target);writeArray(name,v);return v;};
    const saved=prune('match_savedList'),seen=prune('match_seenList'),disliked=prune('match_dislikedList');
    try{const recent=readArray('match_recentTitles').filter(i=>key(typeof i==='string'?i:i?.title)!==target);writeArray('match_recentTitles',recent);}catch(_){}
    let ratings={};try{ratings=JSON.parse(localStorage.getItem('match_userRatings')||'{}')||{};for(const k of Object.keys(ratings))if(key(k)===target)delete ratings[k];localStorage.setItem('match_userRatings',JSON.stringify(ratings));}catch(_){}
    try{const notes=JSON.parse(localStorage.getItem('match_titleNotes')||'{}')||{};for(const k of Object.keys(notes))if(key(k)===target)delete notes[k];localStorage.setItem('match_titleNotes',JSON.stringify(notes));}catch(_){}
    const sb=window.supabaseClient;
    try{
      if(sb){
        const {data:{user}}=await sb.auth.getUser();
        if(user){
          const {error}=await sb.from('profiles').update({saved_list:saved,seen_list:seen,disliked_list:disliked,user_ratings:ratings}).eq('id',user.id);if(error)throw error;
          const meta={...(user.user_metadata||{})};
          meta.saved_list=saved;meta.seen_list=seen;meta.disliked_list=disliked;
          if(Array.isArray(meta.match_history))meta.match_history=meta.match_history.filter(i=>key(i?.title)!==target);
          if(Array.isArray(meta.match_exclusion_keys))meta.match_exclusion_keys=meta.match_exclusion_keys.filter(k=>k!==target);
          await sb.auth.updateUser({data:meta});
        }
      }
      const ok=await window.matchPolicy?.forget?.(title);if(ok===false)return false;
      window.renderProfileGrids?.();document.dispatchEvent(new CustomEvent('matchapp:historychange'));return true;
    }catch(_){return false;}
  }

  function wrapProfileListRemoval(){
    if(typeof window.removeFromList!=='function'||window.removeFromList.__auditWrapped)return;
    const original=window.removeFromList;
    const wrapped=function(btn){const r=original(btn);setTimeout(()=>syncPortfolioColumns(),950);return r;};
    wrapped.__auditWrapped=true;window.removeFromList=wrapped;
  }

  function installNotForMeTab(){
    const tabs=$('.portfolio-tabs');if(!tabs||$('#tab-notforme'))return;
    const audio=$('#tab-audio');const button=document.createElement('button');button.id='tab-notforme';button.className='portfolio-tab';button.innerHTML=icon('dislike')+'<span>Not For Me</span> <span id="count-notforme" class="tab-count">0</span>';
    button.addEventListener('click',()=>switchAuditTab('notforme'));tabs.insertBefore(button,audio||null);
    const panel=document.createElement('div');panel.id='panel-notforme';panel.className='portfolio-panel audit-notforme-panel';panel.style.display='none';panel.innerHTML='<div class="audit-panel-head"><div><h3>Not For Me</h3><p>Titles you declined. They stay excluded on every signed-in device until you explicitly allow them again.</p></div>'+icon('dislike')+'</div><div id="notforme-grid" class="audit-notforme-grid"></div>';
    const audioPanel=$('#panel-audio');(audioPanel?.parentElement||tabs.parentElement).insertBefore(panel,audioPanel||null);
    renderNotForMe();
  }
  function switchAuditTab(name){
    ['history','watchlater','seenit','audio','notforme'].forEach(n=>{const p=$('#panel-'+n),t=$('#tab-'+n);if(p)p.style.display=n===name?'block':'none';t?.classList.toggle('active',n===name);});
    if(name==='notforme')renderNotForMe();
  }
  function renderNotForMe(){
    const host=$('#notforme-grid');if(!host)return;const items=readArray('match_dislikedList');$('#count-notforme')&&($('#count-notforme').textContent=String(items.length));
    if(!items.length){host.innerHTML='<div class="history-empty"><strong>Nothing here.</strong><span>Titles you mark “Not For Me” will stay out of future matches and appear here.</span></div>';return;}
    host.innerHTML='';items.forEach(item=>{const title=typeof item==='string'?item:item?.title;if(!title)return;const card=document.createElement('article');card.className='audit-notforme-card';const poster=typeof item==='object'?item.posterUrl:'';card.innerHTML=(poster?'<img src="'+esc(poster)+'" alt="'+esc(title)+'" loading="lazy">':'<div class="audit-fallback">'+esc(title)+'</div>')+'<div><strong>'+esc(title)+'</strong><span>Excluded from future matches</span></div>';
      const allow=document.createElement('button');allow.type='button';allow.className='history-forget-btn';allow.innerHTML='<span>Allow again</span>';allow.addEventListener('click',async()=>{allow.disabled=true;const ok=await forgetEverywhere(title);if(ok){window.showToast?.('“'+title+'” can be recommended again.');renderNotForMe();}else{allow.disabled=false;window.showToast?.('Could not update this item. Please try again.',true);}});card.appendChild(allow);host.appendChild(card);});
  }

  function organizeProfileIcons(){
    const config=[
      ['#tab-history','history','History',null],
      ['#tab-watchlater','saved','Watch Later','count-watchlater'],
      ['#tab-seenit','seen','Seen It','count-seenit'],
      ['#tab-audio','audio','Audio Library','count-audio']
    ];
    config.forEach(([sel,name,label,countId])=>{
      const el=$(sel);if(!el||el.dataset.auditIcon)return;
      const count=countId?document.getElementById(countId)?.textContent||'0':null;
      el.dataset.auditIcon='1';
      el.innerHTML=icon(name)+'<span class="audit-tab-text">'+label+'</span>'+(countId?' <span id="'+countId+'" class="tab-count">'+esc(count)+'</span>':'');
      el.setAttribute('aria-label',label+(countId?' — '+count+' items':''));
    });
    const tileIcons=$$('.identity-icon');['user','mail','globe','cake','star','calendar'].forEach((name,i)=>{if(tileIcons[i])tileIcons[i].innerHTML=icon(name);});
    $$('.icon-btn,.install-btn,.sound-toggle-btn').forEach(el=>{const label=el.getAttribute('aria-label')||el.title||el.textContent.trim();if(label&&!el.title)el.title=label;el.classList.add('audit-action-icon');});
  }

  async function refreshProfileHero(){
    if(location.pathname!='/profile/profile.html')return;const root=$('.container > .premium-card');if(!root)return;
    let hero=$('#audit-profile-hero');if(!hero){hero=document.createElement('section');hero.id='audit-profile-hero';hero.className='audit-profile-hero';const extras=$('.identity-extras');root.insertBefore(hero,extras||root.firstChild);}
    let name=localStorage.getItem('match_user_name')||'',email='',avatar=$('#profile-pic-preview')?.src||'',locked=localStorage.getItem('match_profile_locked')==='true';
    try{
      const auth=window.supabaseClient?.auth?.getUser?await window.supabaseClient.auth.getUser():null;
      const user=auth?.data?.user;
      if(user){email=user.email||'';name=name||user.user_metadata?.full_name||user.user_metadata?.name||'';}
    }catch(_){}
    hero.innerHTML='<div class="audit-profile-avatar">'+(avatar?'<img src="'+esc(avatar)+'" alt="">':icon('user'))+'</div><div class="audit-profile-copy"><span class="audit-profile-eyebrow">Private MatchApp profile</span><h1>'+esc(name||'Complete your profile')+'</h1><p>'+esc(email||'Sign in to sync your profile across devices')+'</p><div class="audit-profile-badges"><span>'+icon('lock')+(locked?'Identity protected':'Identity setup required')+'</span><span>'+icon('globe')+'Cross-device sync</span></div></div>';
    const save=$('#save-profile-btn');if(save)save.hidden=locked;
    const core=$('.core-identity-card');if(core)core.classList.toggle('is-locked',locked);
    $$('#editable-fields-section .input-group label').forEach(l=>{if(!l.querySelector('.required-mark'))l.insertAdjacentHTML('beforeend',' <span class="required-mark" aria-hidden="true">*</span>');});
  }

  function loadProfileRegistrationUpgrade(){
    if(location.pathname!='/profile/profile.html'||document.querySelector('script[data-registration-upgrade]'))return;
    const s=document.createElement('script');s.src='/registration-upgrade.js?v=193';s.dataset.registrationUpgrade='1';s.onload=()=>{wrapProfileListRemoval();refreshProfileHero();};document.body.appendChild(s);
  }

  function patchVipQuotaPresentation(){
    // The live backend is the single source of truth. app.js already renders
    // the numeric server-returned remaining/limit values, including VIP=10/day.
    // Do not override that verified state with a synthetic "unlimited" display.
  }

  function init(){
    installRequiredSignupName();patchVipQuotaPresentation();
    if(location.pathname==='/profile/profile.html'){
      document.body.classList.add('profile-audit-ready');loadProfileRegistrationUpgrade();wrapProfileListRemoval();installNotForMeTab();organizeProfileIcons();refreshProfileHero();
      document.addEventListener('matchapp:historychange',()=>{renderNotForMe();refreshProfileHero();});
      document.addEventListener('matchapp:profilehydrated',()=>{renderNotForMe();refreshProfileHero();syncPortfolioColumns();});
    }else organizeProfileIcons();
  }
  window.MatchAudit=Object.freeze({syncPortfolioColumns,forgetEverywhere,renderNotForMe});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('matchapp:authchange',()=>{installRequiredSignupName();setTimeout(()=>{patchVipQuotaPresentation();refreshProfileHero();},0);});
})();
