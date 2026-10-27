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
    el.setAttribute('data-ma-error',String(error));window.MatchAppErrors?.sync(el);
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

  const portfolioText=(key,fallback,values)=>window.MatchProfilePortfolioI18n?.text(key,values)||fallback;
  function bindPortfolioTab(button,key,countId){
    window.MatchProfilePortfolioI18n?.bind(button,()=>{
      const ui=window.MatchProfilePortfolioI18n,label=ui.text(key),span=button.querySelector('.audit-tab-text')||button.querySelector('span');
      if(span&&span.textContent!==label)span.textContent=label;
      const count=countId?document.getElementById(countId)?.textContent||'0':null;
      button.setAttribute('aria-label',label+(countId?' — '+ui.text('itemCount',{count}):''));
    });
  }
  function watchPortfolioCounts(){
    const tabs=$('.portfolio-tabs');if(!tabs||tabs.dataset.portfolioCopyCounts||!window.MutationObserver)return;
    tabs.dataset.portfolioCopyCounts='1';
    new MutationObserver(records=>{
      const buttons=new Set();
      records.forEach(record=>{const target=record.target.nodeType===1?record.target:record.target.parentElement;if(target?.closest('.tab-count')){const button=target.closest('.portfolio-tab');if(button)buttons.add(button);}});
      buttons.forEach(button=>window.MatchProfilePortfolioI18n?.refresh(button));
    }).observe(tabs,{childList:true,characterData:true,subtree:true});
  }

  function installNotForMeTab(){
    const tabs=$('.portfolio-tabs');if(!tabs||$('#tab-notforme'))return;
    const audio=$('#tab-audio');const button=document.createElement('button');button.id='tab-notforme';button.className='portfolio-tab';button.innerHTML=icon('dislike')+'<span>Not For Me</span> <span id="count-notforme" class="tab-count">0</span>';
    button.addEventListener('click',()=>switchAuditTab('notforme'));tabs.insertBefore(button,audio||null);
    bindPortfolioTab(button,'notForMe','count-notforme');
    const panel=document.createElement('div');panel.id='panel-notforme';panel.className='portfolio-panel audit-notforme-panel';panel.style.display='none';panel.innerHTML='<div class="audit-panel-head"><div><h3>Not For Me</h3><p>Titles you declined. They stay excluded on every signed-in device until you explicitly allow them again.</p></div>'+icon('dislike')+'</div><div id="notforme-grid" class="audit-notforme-grid"></div>';
    const audioPanel=$('#panel-audio');(audioPanel?.parentElement||tabs.parentElement).insertBefore(panel,audioPanel||null);
    window.MatchProfilePortfolioI18n?.bind(panel.querySelector('.audit-panel-head'),()=>{const ui=window.MatchProfilePortfolioI18n;const h=panel.querySelector('h3'),p=panel.querySelector('p');h.textContent=ui.text('notForMe');p.textContent=ui.text('notForMeIntro');h.style.textAlign='start';p.style.textAlign='start';});
    renderNotForMe();
  }
  function switchAuditTab(name){
    ['history','watchlater','seenit','audio','notforme'].forEach(n=>{const p=$('#panel-'+n),t=$('#tab-'+n);if(p)p.style.display=n===name?'block':'none';t?.classList.toggle('active',n===name);});
    if(name==='notforme')renderNotForMe();
  }
  function renderNotForMe(){
    const host=$('#notforme-grid');if(!host)return;const items=readArray('match_dislikedList');$('#count-notforme')&&($('#count-notforme').textContent=String(items.length));
    if(!items.length){host.innerHTML='<div class="history-empty"><strong>Nothing here.</strong><span>Titles you mark “Not For Me” will stay out of future matches and appear here.</span></div>';
      const empty=host.firstElementChild;window.MatchProfilePortfolioI18n?.bind(empty,()=>{const ui=window.MatchProfilePortfolioI18n;empty.querySelector('strong').textContent=ui.text('notForMeEmptyTitle');empty.querySelector('span').textContent=ui.text('notForMeEmptyCopy');empty.style.textAlign='start';});return;}
    host.innerHTML='';items.forEach((item,index)=>{const title=typeof item==='string'?item:item?.title;if(!title)return;const card=document.createElement('article');card.className='audit-notforme-card';const img=document.createElement('img');window.MatchAppPortfolioPosters.apply(img,item,{eager:index<4});card.innerHTML='<div><strong>'+esc(title)+'</strong><span>Excluded from future matches</span></div>';card.prepend(img);
      const allow=document.createElement('button');allow.type='button';allow.className='history-forget-btn';allow.innerHTML='<span>Allow again</span>';allow.addEventListener('click',async()=>{allow.disabled=true;const ok=await forgetEverywhere(title);if(ok){window.showToast?.(portfolioText('allowedAgain','“'+title+'” can be recommended again.',{title}));renderNotForMe();}else{allow.disabled=false;window.showToast?.(portfolioText('allowFailed','Could not update this item. Please try again.'),true);}});card.appendChild(allow);
      window.MatchProfilePortfolioI18n?.bind(card,()=>{const ui=window.MatchProfilePortfolioI18n;card.querySelector('div>span').textContent=ui.text('excluded');allow.querySelector('span').textContent=ui.text('allowAgain');const name=card.querySelector('strong');if(name){name.dir='auto';name.style.textAlign='start';}});
      host.appendChild(card);});
    window.MatchAppPortfolioPosters.bind(host);
  }

  function organizeProfileIcons(){
    const config=[
      ['#tab-history','history','History',null,'historyTab'],
      ['#tab-watchlater','saved','Watch Later','count-watchlater','watchLaterTab'],
      ['#tab-seenit','seen','Seen It','count-seenit','seenTab'],
      ['#tab-audio','audio','Audio Library','count-audio','audioTab']
    ];
    config.forEach(([sel,name,label,countId,copyKey])=>{
      const el=$(sel);if(!el||el.dataset.auditIcon)return;
      const count=countId?document.getElementById(countId)?.textContent||'0':null;
      el.dataset.auditIcon='1';
      el.innerHTML=icon(name)+'<span class="audit-tab-text">'+label+'</span>'+(countId?' <span id="'+countId+'" class="tab-count">'+esc(count)+'</span>':'');
      el.setAttribute('aria-label',label+(countId?' — '+count+' items':''));
      bindPortfolioTab(el,copyKey,countId);
    });
    watchPortfolioCounts();
    const tileIcons=$$('.identity-icon');['user','mail','globe','cake','star','calendar'].forEach((name,i)=>{if(tileIcons[i])tileIcons[i].innerHTML=icon(name);});
    $$('.icon-btn,.install-btn,.sound-toggle-btn').forEach(el=>{const label=el.getAttribute('aria-label')||el.title||el.textContent.trim();if(label&&!el.title)el.title=label;el.classList.add('audit-action-icon');});
  }

  const profileLabelRows={
    en:['Your account photo','Private MatchApp Ai profile','Complete your profile','Sign in to sync your profile across devices','Identity protected','Identity setup required','Sync across devices'],
    'pt-BR':['Foto da sua conta','Perfil privado do MatchApp Ai','Complete seu perfil','Entre para sincronizar seu perfil entre dispositivos','Identidade protegida','Complete os dados de identidade','Sincronização entre dispositivos'],
    es:['Foto de tu cuenta','Perfil privado de MatchApp Ai','Completa tu perfil','Inicia sesión para sincronizar tu perfil entre dispositivos','Identidad protegida','Completa tus datos de identidad','Sincronización entre dispositivos'],
    fr:['Photo de votre compte','Profil privé MatchApp Ai','Complétez votre profil','Connectez-vous pour synchroniser votre profil sur vos appareils','Identité protégée','Complétez vos informations d’identité','Synchronisation entre appareils'],
    de:['Dein Kontofoto','Privates MatchApp Ai Profil','Vervollständige dein Profil','Melde dich an, um dein Profil auf deinen Geräten zu synchronisieren','Identität geschützt','Vervollständige deine Identitätsangaben','Geräteübergreifende Synchronisierung'],
    it:['Foto del tuo account','Profilo privato MatchApp Ai','Completa il tuo profilo','Accedi per sincronizzare il tuo profilo tra i dispositivi','Identità protetta','Completa i dati della tua identità','Sincronizzazione tra dispositivi'],
    tr:['Hesap fotoğrafınız','Özel MatchApp Ai profili','Profilinizi tamamlayın','Profilinizi cihazlar arasında eşitlemek için giriş yapın','Kimlik korumalı','Kimlik bilgilerinizi tamamlayın','Cihazlar arasında eşitleme'],
    ru:['Фото вашей учётной записи','Личный профиль MatchApp Ai','Заполните профиль','Войдите, чтобы синхронизировать профиль на разных устройствах','Личные данные защищены','Заполните личные данные','Синхронизация между устройствами'],
    ar:['صورة حسابك','ملفك الشخصي الخاص في MatchApp Ai','أكمل ملفك الشخصي','سجّل الدخول لمزامنة ملفك الشخصي بين أجهزتك','الهوية محمية','أكمل بيانات هويتك','المزامنة بين الأجهزة'],
    hi:['आपके खाते की फ़ोटो','आपकी निजी MatchApp Ai प्रोफ़ाइल','अपनी प्रोफ़ाइल पूरी करें','डिवाइसों के बीच अपनी प्रोफ़ाइल सिंक करने के लिए साइन इन करें','पहचान सुरक्षित है','अपनी पहचान की जानकारी पूरी करें','डिवाइसों के बीच सिंक'],
    id:['Foto akun Anda','Profil pribadi MatchApp Ai','Lengkapi profil Anda','Masuk untuk menyinkronkan profil Anda di berbagai perangkat','Identitas terlindungi','Lengkapi informasi identitas Anda','Sinkronisasi antarperangkat'],
    ja:['アカウントの写真','MatchApp Ai の個人プロフィール','プロフィールを完成させてください','ログインしてデバイス間でプロフィールを同期','本人情報は保護されています','本人情報を入力してください','デバイス間で同期'],
    ko:['계정 사진','MatchApp Ai 개인 프로필','프로필을 완성하세요','로그인하여 기기 간에 프로필을 동기화하세요','신원 정보 보호 중','신원 정보를 입력하세요','기기 간 동기화'],
    zh:['您的账号照片','MatchApp Ai 私人资料','完善您的个人资料','登录以在设备间同步您的资料','身份信息已受保护','请完善身份信息','跨设备同步']
  };
  function profileLabels(){
    let language='en';try{language=localStorage.getItem('match_lang')||window.MATCH_LANG||'en';}catch(_){language=window.MATCH_LANG||'en';}
    language=String(language).replace(/_/g,'-').toLowerCase();
    language=language==='pt'||language.startsWith('pt-')?'pt-BR':language.split('-')[0];
    const row=profileLabelRows[language]||profileLabelRows.en;
    return Object.fromEntries(['avatar','privateProfile','complete','signIn','protected','setup','sync'].map((name,index)=>[name,row[index]]));
  }

  async function refreshProfileHero(){
    if(location.pathname!='/profile/profile.html')return;const root=$('.container > .premium-card');if(!root)return;
    let hero=$('#audit-profile-hero');if(!hero){hero=document.createElement('section');hero.id='audit-profile-hero';hero.className='audit-profile-hero';const extras=$('.identity-extras');root.insertBefore(hero,extras||root.firstChild);}
    let name=localStorage.getItem('match_user_name')||'',email='',avatar='',locked=localStorage.getItem('match_profile_locked')==='true';
    try{
      const auth=window.supabaseClient?.auth?.getUser?await window.supabaseClient.auth.getUser():null;
      const user=auth?.data?.user;
      if(user){email=user.email||'';name=name||user.user_metadata?.full_name||user.user_metadata?.name||'';}
    }catch(_){}
    const copy=profileLabels();avatar=window.resolveUserAvatar?.()||'';
    hero.innerHTML='<div class="audit-profile-avatar" data-avatar-slot hidden style="display:none!important"><img'+(avatar?' src="'+esc(avatar)+'"':'')+' alt="'+esc(copy.avatar)+'" width="96" height="96"></div><div class="audit-profile-copy"><span class="audit-profile-eyebrow">'+esc(copy.privateProfile)+'</span><h1>'+esc(name||copy.complete)+'</h1><p>'+esc(email||copy.signIn)+'</p><div class="audit-profile-badges"><span>'+icon('lock')+(locked?esc(copy.protected):esc(copy.setup))+'</span><span>'+icon('globe')+esc(copy.sync)+'</span></div></div>';
    window.renderUserAvatar?.();
    // Profile hydration owns save visibility and pending/locked state. A hero
    // repaint must never expose a disabled save action to a signed-out user.
    window.checkAndRenderProfileState?.({type:'matchapp:langchange'});
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
  document.addEventListener('matchapp:langchange',refreshProfileHero);
  document.addEventListener('matchapp:languagechange',refreshProfileHero);
  window.addEventListener('storage',event=>{if(event.key==='match_lang')refreshProfileHero();});
  window.MatchAudit=Object.freeze({syncPortfolioColumns,forgetEverywhere,renderNotForMe});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('matchapp:authchange',()=>{installRequiredSignupName();setTimeout(()=>{patchVipQuotaPresentation();refreshProfileHero();},0);});
})();
