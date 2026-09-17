/* Kids experience enhancer.
   Keeps the approved Kids catalog/matching rules untouched; this file only improves
   presentation, navigation to the matcher and lightweight motion. */
(function(){
  'use strict';

  if(!location.pathname.startsWith('/kids'))return;

  function addStyle(){
    if(document.getElementById('kids-experience-upgrade-style'))return;
    const s=document.createElement('style');
    s.id='kids-experience-upgrade-style';
    s.textContent=`
      .kids-match-stage{position:relative;margin-top:clamp(12px,2.2vw,28px);margin-bottom:clamp(30px,5vw,64px);padding:clamp(18px,3.2vw,34px);border-radius:clamp(22px,3vw,34px);overflow:hidden;border:1px solid rgba(255,255,255,.16);background:radial-gradient(circle at 14% 0%,rgba(255,213,89,.16),transparent 34%),radial-gradient(circle at 92% 8%,rgba(117,235,255,.15),transparent 33%),linear-gradient(145deg,rgba(64,31,105,.96),rgba(30,16,67,.96));box-shadow:0 22px 60px rgba(11,4,28,.34),0 0 0 1px rgba(255,255,255,.035) inset;scroll-margin-top:108px}
      .kids-match-stage::before{content:'';position:absolute;inset:-45% 48% auto -18%;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,101,168,.2),transparent 68%);pointer-events:none}
      .kids-match-stage .kids-age-wrap{position:relative;z-index:2;width:min(100%,310px);margin:0 0 14px auto;padding:9px 12px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(13,8,34,.34);backdrop-filter:blur(8px)}
      .kids-match-stage .kids-match{position:relative;z-index:2;margin:0!important}
      .kids-match-stage.is-arrived{animation:kidsStageHello .78s cubic-bezier(.2,.85,.28,1)}

      .kids-logo-showtime{isolation:isolate;overflow:visible!important}
      .kids-logo-showtime::before{content:'';position:absolute;z-index:-1;width:74%;aspect-ratio:1;left:13%;top:12%;border-radius:50%;background:conic-gradient(from 20deg,#ffd85f,#ff74b8,#7edcff,#9df47d,#ffd85f);opacity:.6;filter:blur(.2px);animation:kidsRainbowPortal 7.2s linear infinite}
      .kids-logo-showtime::after{content:'';position:absolute;z-index:-1;width:61%;aspect-ratio:1;left:19.5%;top:18.5%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.24) 0 34%,rgba(38,17,79,.84) 35% 58%,transparent 60%);box-shadow:0 0 45px rgba(255,218,112,.18);animation:kidsPortalPulse 3.1s ease-in-out infinite}
      .kids-logo-showtime .kids-mascot{position:relative;z-index:3;transform-origin:50% 58%;animation:kidsMascotShowtime 4.8s cubic-bezier(.34,.02,.2,1) infinite;filter:drop-shadow(0 18px 26px rgba(8,2,22,.34))}
      .kids-magic-confetti{position:absolute;z-index:4;inset:5% 5% 8%;pointer-events:none}
      .kids-magic-confetti i{position:absolute;display:block;width:10px;height:18px;border-radius:999px;background:currentColor;opacity:0;will-change:transform,opacity;animation:kidsConfettiPop 3.8s ease-out infinite}
      .kids-magic-confetti i:nth-child(1){left:7%;top:22%;color:#ffca55;--x:-24px;--y:-44px;--r:120deg;animation-delay:.2s}
      .kids-magic-confetti i:nth-child(2){left:20%;top:5%;color:#ff79bb;--x:-8px;--y:-46px;--r:-110deg;animation-delay:1.3s}
      .kids-magic-confetti i:nth-child(3){right:17%;top:7%;color:#83e8ff;--x:14px;--y:-48px;--r:140deg;animation-delay:.72s}
      .kids-magic-confetti i:nth-child(4){right:5%;top:28%;color:#a6f477;--x:28px;--y:-30px;--r:-130deg;animation-delay:1.86s}
      .kids-magic-confetti i:nth-child(5){right:12%;bottom:14%;color:#ffd268;--x:22px;--y:30px;--r:105deg;animation-delay:2.45s}
      .kids-magic-confetti i:nth-child(6){left:12%;bottom:16%;color:#8fdfff;--x:-24px;--y:28px;--r:-120deg;animation-delay:2.9s}
      .kids-magic-symbol{position:absolute;z-index:5;display:grid;place-items:center;width:40px;height:40px;border-radius:14px;background:rgba(35,17,73,.86);border:1px solid rgba(255,255,255,.2);box-shadow:0 8px 20px rgba(10,4,25,.22);font-size:21px;pointer-events:none;will-change:transform;animation:kidsSymbolDance 4.6s ease-in-out infinite}
      .kids-magic-symbol.is-heart{left:4%;top:49%;color:#ff83b7;animation-delay:-.7s}
      .kids-magic-symbol.is-note{right:4%;top:46%;color:#8ce9ff;animation-delay:-2s}
      .kids-magic-symbol.is-bolt{right:18%;bottom:2%;color:#ffe275;animation-delay:-3.2s}
      .kids-magic-ribbon{position:absolute;z-index:2;left:9%;right:9%;bottom:6%;height:22%;border-radius:50%;border-top:7px solid rgba(255,216,95,.72);border-left:7px solid rgba(255,126,185,.52);border-right:7px solid rgba(113,226,255,.52);transform:rotate(-5deg);opacity:.78;pointer-events:none;animation:kidsRibbonWiggle 3.9s ease-in-out infinite}

      @keyframes kidsStageHello{0%{transform:scale(.975);box-shadow:0 0 0 rgba(255,214,91,0)}55%{transform:scale(1.008);box-shadow:0 0 0 7px rgba(255,214,91,.12)}100%{transform:scale(1)}}
      @keyframes kidsRainbowPortal{to{transform:rotate(360deg)}}
      @keyframes kidsPortalPulse{0%,100%{transform:scale(.97);opacity:.72}50%{transform:scale(1.04);opacity:1}}
      @keyframes kidsMascotShowtime{0%,100%{transform:translateY(0) rotate(-2deg) scale(1)}18%{transform:translateY(-11px) rotate(2.5deg) scale(1.025)}34%{transform:translateY(-2px) rotate(-1deg) scale(.99)}52%{transform:translateY(-15px) rotate(2deg) scale(1.035)}66%{transform:translateY(1px) rotate(-2.5deg) scale(.985)}82%{transform:translateY(-7px) rotate(1deg) scale(1.015)}}
      @keyframes kidsConfettiPop{0%,62%,100%{opacity:0;transform:translate(0,0) rotate(0) scale(.55)}70%{opacity:1}88%{opacity:.86;transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1)}96%{opacity:0;transform:translate(calc(var(--x) * 1.18),calc(var(--y) * 1.18)) rotate(var(--r)) scale(.75)}}
      @keyframes kidsSymbolDance{0%,100%{transform:translateY(0) rotate(-6deg) scale(1)}45%{transform:translateY(-13px) rotate(8deg) scale(1.08)}68%{transform:translateY(-4px) rotate(-2deg) scale(.96)}}
      @keyframes kidsRibbonWiggle{0%,100%{transform:rotate(-5deg) scaleX(.98)}50%{transform:rotate(4deg) translateY(-5px) scaleX(1.03)}}

      body.kids-paused .kids-logo-showtime::before,body.kids-paused .kids-logo-showtime::after,body.kids-paused .kids-logo-showtime .kids-mascot,body.kids-paused .kids-magic-confetti i,body.kids-paused .kids-magic-symbol,body.kids-paused .kids-magic-ribbon{animation-play-state:paused!important}
      @media(max-width:720px){.kids-match-stage{padding:17px 13px 20px;scroll-margin-top:86px}.kids-match-stage .kids-age-wrap{width:100%;margin:0 0 12px}.kids-magic-symbol{width:34px;height:34px;font-size:18px}.kids-logo-showtime::before{width:82%;left:9%;top:9%}.kids-logo-showtime::after{width:68%;left:16%;top:15%}}
      @media(prefers-reduced-motion:reduce){.kids-match-stage.is-arrived,.kids-logo-showtime::before,.kids-logo-showtime::after,.kids-logo-showtime .kids-mascot,.kids-magic-confetti i,.kids-magic-symbol,.kids-magic-ribbon{animation:none!important}.kids-logo-showtime .kids-mascot{transform:none!important}}
    `;
    document.head.appendChild(s);
  }

  function makeMagic(art){
    if(!art||art.classList.contains('kids-logo-showtime'))return;
    art.classList.add('kids-logo-showtime');

    const ribbon=document.createElement('span');
    ribbon.className='kids-magic-ribbon';
    ribbon.setAttribute('aria-hidden','true');

    const confetti=document.createElement('span');
    confetti.className='kids-magic-confetti';
    confetti.setAttribute('aria-hidden','true');
    for(let i=0;i<6;i++)confetti.appendChild(document.createElement('i'));

    const symbols=[['♥','is-heart'],['♫','is-note'],['⚡','is-bolt']];
    for(const [text,klass] of symbols){
      const el=document.createElement('span');
      el.className=`kids-magic-symbol ${klass}`;
      el.textContent=text;
      el.setAttribute('aria-hidden','true');
      art.appendChild(el);
    }

    art.append(ribbon,confetti);
  }

  function positionMatcher(){
    const hero=document.querySelector('.kids-hero');
    const match=document.querySelector('.kids-match');
    const age=document.querySelector('.kids-age-wrap');
    if(!hero||!match)return null;

    let stage=document.getElementById('kids-match-stage');
    if(!stage){
      stage=document.createElement('section');
      stage.id='kids-match-stage';
      stage.className='kids-shell kids-match-stage';
      const heading=match.querySelector('h3');
      if(heading){heading.id=heading.id||'kids-match-heading';stage.setAttribute('aria-labelledby',heading.id);}
      hero.insertAdjacentElement('afterend',stage);
    }

    if(age&&age.parentElement!==stage)stage.appendChild(age);
    if(match.parentElement!==stage)stage.appendChild(match);
    return stage;
  }

  function wireExplore(stage){
    if(!stage)return;
    const explore=document.querySelector('.kids-hero-actions .kids-primary');
    if(!explore||explore.dataset.kidsMatchScroll==='1')return;
    explore.dataset.kidsMatchScroll='1';
    explore.setAttribute('href','#kids-match-stage');
    explore.addEventListener('click',event=>{
      event.preventDefault();
      stage.classList.remove('is-arrived');
      stage.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      requestAnimationFrame(()=>stage.classList.add('is-arrived'));
      window.setTimeout(()=>stage.classList.remove('is-arrived'),900);
      const first=stage.querySelector('select,button,input');
      window.setTimeout(()=>first?.focus({preventScroll:true}),520);
    });
  }

  function enrichHead(){
    const keywords=document.querySelector('meta[name="keywords"]');
    if(keywords)keywords.content='kids movie matcher, kids show matcher, safe cartoons for kids, age appropriate kids shows, family movies for kids, preschool shows ages 3-5, kids shows ages 6-8, family entertainment ages 9-12, educational kids shows, kids music, classic cartoons, 1950s cartoons, 1960s cartoons, 1970s cartoons, 1980s cartoons, 1990s cartoons, 2000s cartoons, where to watch kids movies, MatchApp Kids Mode';
  }

  function boot(){
    addStyle();
    enrichHead();
    const stage=positionMatcher();
    wireExplore(stage);
    if(location.hash==='#kids-match-stage')requestAnimationFrame(()=>stage?.scrollIntoView({behavior:'auto',block:'start'}));
    makeMagic(document.querySelector('.kids-hero-art'));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
