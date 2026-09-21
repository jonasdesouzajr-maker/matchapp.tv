/* Kids static experience enhancer.
   Motion is intentionally disabled for stability. Matching rules are untouched. */
(function(){
  'use strict';
  if(!location.pathname.startsWith('/kids'))return;

  function addStyle(){
    if(document.getElementById('kids-experience-upgrade-style'))return;
    const style=document.createElement('style');
    style.id='kids-experience-upgrade-style';
    style.textContent=`
      .kids-match-stage{position:relative;margin-top:clamp(12px,2.2vw,28px);margin-bottom:clamp(30px,5vw,64px);padding:clamp(18px,3.2vw,34px);border-radius:clamp(22px,3vw,34px);overflow:hidden;border:1px solid rgba(255,255,255,.16);background:radial-gradient(circle at 14% 0%,rgba(255,213,89,.16),transparent 34%),radial-gradient(circle at 92% 8%,rgba(117,235,255,.15),transparent 33%),linear-gradient(145deg,rgba(64,31,105,.96),rgba(30,16,67,.96));box-shadow:0 22px 60px rgba(11,4,28,.34),0 0 0 1px rgba(255,255,255,.035) inset;scroll-margin-top:108px}
      .kids-match-stage::before{content:'';position:absolute;inset:-45% 48% auto -18%;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,101,168,.2),transparent 68%);pointer-events:none}
      .kids-match-stage .kids-age-wrap{position:relative;z-index:2;width:min(100%,310px);margin:0 0 14px auto;padding:9px 12px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(13,8,34,.34)}
      .kids-match-stage .kids-match{position:relative;z-index:2;margin:0!important}
      @media(max-width:720px){.kids-match-stage{padding:17px 13px 20px;scroll-margin-top:86px}.kids-match-stage .kids-age-wrap{width:100%;margin:0 0 12px}}
    `;
    document.head.appendChild(style);
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
      stage.scrollIntoView({behavior:'auto',block:'start'});
      stage.querySelector('select,button,input')?.focus({preventScroll:true});
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
    if(location.hash==='#kids-match-stage')stage?.scrollIntoView({behavior:'auto',block:'start'});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
