/* Native Android onboarding body for MatchApp Ai.
 * Presentation only: reuses the live Profile + Taste DNA mechanisms.
 */
(function(){
  'use strict';
  if(window.__maNativeOnboardingProfile)return;
  window.__maNativeOnboardingProfile=true;
  const C=window.__MA_ONBOARDING_COPY__||{};
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const host=window.MatchAppNativeOnboardingHost;
  const style=document.createElement('style');
  style.id='ma-native-onboarding-profile-style';
  style.textContent=`
    html,body{background:#0b0b10!important;color:#f8f5fb!important;min-height:100%!important;scroll-behavior:smooth!important}
    body{margin:0!important;padding:0!important;overflow-x:hidden!important}
    .app-header,.profile-hub,footer,.pf-support,.portfolio-tabs,.profile-security-card,
    .container>[data-matchapp-pro-entry],.container>.premium-card:not(#account-details),
    #activity-panel,.ma-cinema-dock,#ma-ambient-jonas,#ma-ambient-panel,.ma-trust,[data-ma-trust]{display:none!important}
    .main-layout,.container{width:100%!important;max-width:none!important;margin:0!important;padding:12px!important;box-sizing:border-box!important}
    #account-details{display:block!important;width:100%!important;max-width:760px!important;margin:0 auto!important;padding:14px!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    #account-details>h3{margin:2px 0 5px!important;font-size:clamp(22px,4vw,28px)!important;line-height:1.1!important;color:#fff!important}
    #account-details>.pf-card-sub{margin:0 0 12px!important;color:#b9afc6!important;line-height:1.45!important}
    #editable-fields-section{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px 12px!important}
    #editable-fields-section .input-group{min-width:0!important;margin:0!important}
    #editable-fields-section label{display:block!important;margin:0 0 5px!important;color:#d7cee2!important;font-size:12px!important}
    #editable-fields-section input,#editable-fields-section select,
    #registration-account-fields input,#registration-account-fields select{width:100%!important;min-height:48px!important;box-sizing:border-box!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:15px!important;background:#181420!important;color:#fff!important;padding:10px 12px!important;outline:none!important}
    #editable-fields-section input:focus,#editable-fields-section select:focus{border-color:rgba(183,60,255,.65)!important;box-shadow:0 0 0 3px rgba(183,60,255,.12)!important}
    #registration-account-fields{grid-column:1/-1!important;margin-top:2px!important;padding-top:8px!important;border-top:1px solid rgba(255,255,255,.06)!important}
    #save-profile-btn{width:100%!important;min-height:50px!important;margin:14px 0 4px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#a936ff,#ed3cae)!important;color:white!important;font-weight:850!important;box-shadow:0 10px 28px rgba(183,60,255,.25)!important}
    #locked-info-card,#profile-age-display,#identity-load-status,#identity-load-retry{display:none!important}
    #taste-quiz{display:none!important;width:100%!important;max-width:760px!important;margin:0 auto!important;padding:2px 0 0!important;border:0!important;background:transparent!important;box-shadow:none!important}
    body.mao-stage-dna #taste-quiz{display:block!important}
    body.mao-stage-dna #account-details>h3,body.mao-stage-dna #account-details>.pf-card-sub,
    body.mao-stage-dna #editable-fields-section,body.mao-stage-dna #save-profile-btn,
    body.mao-stage-dna #registration-account-fields{display:none!important}
    #taste-quiz>h2{margin:2px 0 5px!important;font-size:clamp(22px,4vw,28px)!important;color:#fff!important}
    .taste-lead{margin:0 0 12px!important;color:#b9afc6!important;font-size:12px!important;line-height:1.45!important}
    #taste-form{display:block!important;margin:0!important}
    .taste-q{display:none!important;margin:0!important;padding:14px!important;border:1px solid rgba(183,60,255,.24)!important;border-radius:19px!important;background:linear-gradient(145deg,rgba(183,60,255,.08),rgba(20,17,28,.92))!important;box-shadow:inset 0 1px rgba(255,255,255,.025)!important}
    .taste-q.mao-current{display:block!important}
    .taste-q legend{padding:0 4px!important;margin-bottom:8px!important;color:#f1d5ff!important;font-size:clamp(15px,2.8vw,18px)!important;font-weight:800!important;line-height:1.3!important}
    .taste-multi{display:block!important;margin-top:4px!important;color:#a99db9!important;font-size:11px!important;font-weight:500!important}
    .taste-q-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
    .taste-choice{display:flex!important;align-items:center!important;gap:9px!important;min-height:50px!important;box-sizing:border-box!important;margin:0!important;padding:10px 11px!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:15px!important;background:#17131f!important;color:#f7f2fb!important;line-height:1.3!important}
    .taste-choice.mao-selected{border-color:rgba(201,84,255,.7)!important;background:linear-gradient(135deg,rgba(169,54,255,.2),rgba(237,60,174,.12))!important;box-shadow:0 0 0 2px rgba(183,60,255,.08)!important}
    .taste-choice input{width:20px!important;height:20px!important;min-width:20px!important;accent-color:#bd4aff!important}
    .taste-status{margin:9px 0 0!important;padding:8px 10px!important;border-radius:12px!important;background:rgba(224,60,78,.11)!important;color:#ffb4c0!important;font-size:12px!important}
    #taste-save{display:none!important}
    .mao-quiz-nav{display:grid!important;grid-template-columns:minmax(92px,1fr) auto minmax(92px,1fr)!important;align-items:center!important;gap:10px!important;margin:13px 0 4px!important}
    .mao-quiz-nav button{min-height:46px!important;margin:0!important;border:1px solid rgba(183,60,255,.3)!important;border-radius:999px!important;background:#21182b!important;color:#fff!important;font-weight:800!important;padding:9px 14px!important}
    .mao-quiz-nav button:last-child{border:0!important;background:linear-gradient(135deg,#a936ff,#ed3cae)!important;box-shadow:0 9px 24px rgba(183,60,255,.22)!important}
    .mao-progress{text-align:center!important;color:#bdb2cb!important;font-size:11px!important;white-space:nowrap!important}
    .mao-inline-status{display:grid;place-items:center;min-height:52vh;padding:20px;text-align:center;color:#cfc6d9;font:600 14px/1.5 system-ui}
    @media(max-width:620px){.main-layout,.container{padding:9px!important}#account-details{padding:10px!important}#editable-fields-section,.taste-q-grid{grid-template-columns:1fr!important}.mao-quiz-nav{grid-template-columns:1fr auto 1fr!important;gap:7px!important}.mao-quiz-nav button{padding:8px 9px!important}.mao-progress{font-size:10px!important}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}
  `;
  document.head.appendChild(style);

  function hideChrome(){
    qa('.app-header,.profile-hub,footer,.pf-support,.portfolio-tabs,.profile-security-card,.container>[data-matchapp-pro-entry],.container>.premium-card:not(#account-details),#activity-panel,.ma-cinema-dock,#ma-ambient-jonas,#ma-ambient-panel,.ma-trust,[data-ma-trust]').forEach(el=>{
      if(el.style.getPropertyValue('display')!=='none'||el.style.getPropertyPriority('display')!=='important')el.style.setProperty('display','none','important');
    });
    const account=q('#account-details');
    if(account){
      account.hidden=false;
      account.classList.add('profile-hub-open');
      account.style.setProperty('display','block','important');
    }
  }

  let stage='';
  function setStage(next){
    if(stage===next)return;
    stage=next;
    document.body.classList.toggle('mao-stage-dna',next==='dna');
    try{host?.stage?.(next)}catch(_){}
    if(next==='dna')q('#taste-quiz')?.scrollIntoView({block:'start',behavior:'smooth'});
    else window.scrollTo({top:0,behavior:'smooth'});
  }

  function showSignedOut(){
    let box=q('#ma-onboard-signedout');
    if(!box){box=document.createElement('div');box.id='ma-onboard-signedout';box.className='mao-inline-status';box.textContent=C.signedOut||'Your account session is not ready yet. Return to MatchApp Ai and sign in again.';(q('.container')||document.body).prepend(box);}
    q('#account-details')?.style.setProperty('display','none','important');
  }

  let quizReady=false;
  function setupQuiz(){
    if(quizReady)return true;
    const quiz=q('#taste-quiz'); if(!quiz)return false;
    const fields=qa('.taste-q',quiz); if(!fields.length)return false;
    quizReady=true;
    let index=0;
    const nav=document.createElement('div');nav.className='mao-quiz-nav';
    nav.innerHTML='<button type="button"></button><span class="mao-progress"></span><button type="button"></button>';
    quiz.appendChild(nav);
    const prev=nav.children[0],progress=nav.children[1],next=nav.children[2];
    prev.textContent=C.prev||'Back'; next.textContent=C.next||'Next';
    const syncChoiceState=()=>qa('.taste-choice',quiz).forEach(choice=>{
      choice.classList.toggle('mao-selected',!!choice.querySelector('input:checked'));
    });
    qa('.taste-choice input',quiz).forEach(input=>input.addEventListener('change',syncChoiceState,{passive:true}));
    const render=()=>{
      fields.forEach((f,i)=>f.classList.toggle('mao-current',i===index));
      progress.textContent=(C.question||'Question')+' '+(index+1)+' '+(C.of||'of')+' '+fields.length;
      prev.style.visibility=index===0?'hidden':'visible';
      next.textContent=index===fields.length-1?(C.save||q('#taste-save',quiz)?.textContent?.trim()||'Save DNA'):(C.next||'Next');
      syncChoiceState();
      const st=q('.taste-status',quiz); if(st)st.hidden=true;
    };
    const valid=()=>!!fields[index].querySelector('input:checked');
    prev.addEventListener('click',()=>{if(index>0){index--;render()}});
    next.addEventListener('click',()=>{
      if(!valid()){const st=q('.taste-status',quiz);if(st){st.hidden=false;st.scrollIntoView({block:'nearest'})}return}
      if(index<fields.length-1){index++;render();return}
      q('#taste-save',quiz)?.click();
      let attempts=0;
      const done=setInterval(()=>{
        attempts++;
        let complete=false;
        try{complete=JSON.parse(localStorage.getItem('match_taste')||'{}').done===true}catch(_){}
        if(complete||attempts>24){
          clearInterval(done);
          if(complete)setTimeout(()=>{try{host?.complete?.()}catch(_){}},1200);
        }
      },250);
    });
    render();
    return true;
  }

  function sync(){
    hideChrome();
    const state=window.matchProfileState?.status;
    if(state==='signedout'){showSignedOut();return}
    const locked=localStorage.getItem('match_profile_locked')==='true';
    if(locked){
      setStage('dna');
      if(!setupQuiz())return;
    }else{
      setStage('profile');
      const account=q('#account-details'); if(account)account.style.setProperty('display','block','important');
    }
  }

  hideChrome();
  sync();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    sync();
    if(stage==='dna'&&quizReady&&attempts>10)clearInterval(timer);
    if(attempts>80)clearInterval(timer);
  },250);
  const observer=new MutationObserver(()=>{hideChrome(); if(!quizReady&&localStorage.getItem('match_profile_locked')==='true')setupQuiz()});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('pagehide',()=>{observer.disconnect();clearInterval(timer)},{once:true});
})();