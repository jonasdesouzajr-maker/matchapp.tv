/* MatchApp TikTok launch ad.
   One first-visit playback, then a permanent lazy-loaded social poster at page bottom. */
(function(){
'use strict';

const HOME_ROUTE=location.pathname==='/'||location.pathname==='/index.html';

const SHORT_URL='https://vt.tiktok.com/ZSqtbq1j5/';
const META_URL='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/tiktok-matchapp-ad';
const FALLBACK_META={
  video_id:'7686252800828804360',
  final_url:'https://www.tiktok.com/@matchapp_ai/video/7686252800828804360',
  title:"Find what to watch in seconds! and... what to listen to! MatchApp TV Ai is out now! Also with a safe KIDS mode to find specific children's titles to watch or listen to! #TechTok #AITools #artificialintelligence #MatchAppTV #newapp @Jonas Junior",
  author_name:'MatchApp TV Ai',
  author_url:'https://www.tiktok.com/@matchapp_ai'
};
const SEEN_KEY='matchapp:tiktok-ad-seen:v1';
const TIKTOK_ORIGIN='https://www.tiktok.com';
const META_TIMEOUT_MS=4000;
const PLAYBACK_START_TIMEOUT_MS=12000;

let metaPromise=null;
let introFrame=null;
let introFallbackTimer=0;
let introHardStopTimer=0;
let introEndTimer=0;
let introStallTimer=0;
let introPlaying=false;
let introEnded=false;
let introMutedFallback=false;
let introMeta=FALLBACK_META;
let pageLocked=false;
let previousBodyOverflow='';

function seen(){
  try{return localStorage.getItem(SEEN_KEY)==='1';}catch(_){return false;}
}
function markSeen(){
  try{localStorage.setItem(SEEN_KEY,'1');}catch(_){}
}
function playerUrl(id, intro){
  const q=new URLSearchParams({
    autoplay:intro?'1':'0',
    loop:'0',
    controls:'1',
    progress_bar:'1',
    play_button:'1',
    volume_control:'1',
    fullscreen_button:'1',
    timestamp:'1',
    music_info:intro?'0':'1',
    description:intro?'0':'1',
    rel:'0',
    native_context_menu:'1',
    closed_caption:'1',
    muted:'0'
  });
  return 'https://www.tiktok.com/player/v1/'+encodeURIComponent(id)+'?'+q.toString();
}
async function getMeta(){
  if(metaPromise)return metaPromise;
  metaPromise=(async()=>{
    // A slow or unreachable metadata endpoint must never hold the intro (and the page) open.
    const ctrl=typeof AbortController==='function'?new AbortController():null;
    const stop=ctrl?setTimeout(()=>ctrl.abort(),META_TIMEOUT_MS):0;
    try{
      const res=await fetch(META_URL,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'},signal:ctrl?ctrl.signal:undefined});
      if(!res.ok)throw new Error('TikTok metadata unavailable');
      const data=await res.json();
      if(!data?.video_id)throw new Error('TikTok video ID unavailable');
      return {...FALLBACK_META,...data};
    }catch(_){
      return FALLBACK_META;
    }finally{
      clearTimeout(stop);
    }
  })();
  return metaPromise;
}
function captionFrom(meta){
  let text=String(meta?.title||'').trim();
  if(!text)text='Meet MatchApp TV Ai — your AI entertainment concierge for finding what to watch and where to watch it.';
  if(!/#matchapptv\b/i.test(text))text+=(text.endsWith('.')?'':' ')+' #matchapptv';
  return text;
}
function postPlayer(frame,type,value){
  try{frame?.contentWindow?.postMessage({'x-tiktok-player':true,type,value},TIKTOK_ORIGIN);}catch(_){}
}
function trackEngagement(action){
  try{
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({event:'tiktok_intro_engagement',action});
  }catch(_){}
}
function setActionStatus(message){
  document.querySelectorAll('[data-tiktok-action-status],[data-tiktok-showcase-status]').forEach(el=>{
    el.textContent=message||'';
    if(message)setTimeout(()=>{if(el.textContent===message)el.textContent='';},4200);
  });
}
async function grantTikTokShareReward(){
  if(typeof window.grantShareReward!=='function'){
    if(typeof window.refreshQuotaStatus==='function')window.refreshQuotaStatus();
    setActionStatus('Share completed. Your match counter will refresh shortly.');
    return;
  }
  try{
    const result=await window.grantShareReward();
    if(result?.ok){
      if(typeof window.refreshQuotaStatus==='function')window.refreshQuotaStatus();
      setActionStatus('🎁 +1 free match unlocked and added to your balance.');
      if(typeof window.showToast==='function')window.showToast('🎁 TikTok share completed — +1 free match unlocked.');
      return;
    }
    setActionStatus('Share completed. Your bonus limit for this reward window is already reached.');
  }catch(_){
    setActionStatus('Share completed. MatchApp could not refresh the bonus right now.');
  }
}
function syncIntroEngagement(meta){
  introMeta=meta||FALLBACK_META;
  const like=document.querySelector('[data-tiktok-like-link]');
  const follow=document.querySelector('[data-tiktok-follow-link]');
  if(like)like.href=introMeta.final_url||FALLBACK_META.final_url;
  if(follow)follow.href=introMeta.author_url||FALLBACK_META.author_url;
}
function hideEndEngagement(){
  clearTimeout(introEndTimer);
  introEnded=false;
  const endcap=document.querySelector('[data-tiktok-endcap]');
  if(endcap){
    endcap.hidden=true;
    endcap.classList.remove('is-visible');
  }
  document.querySelector('.matchapp-tiktok-intro-actions')?.classList.remove('is-ended');
}
function showEndEngagement(){
  if(introEnded)return;
  introEnded=true;
  markSeen();
  clearTimeout(introHardStopTimer);
  const endcap=document.querySelector('[data-tiktok-endcap]');
  if(endcap){
    endcap.hidden=false;
    requestAnimationFrame(()=>endcap.classList.add('is-visible'));
  }
  document.querySelector('.matchapp-tiktok-intro-actions')?.classList.add('is-ended');
  // Return control to MatchApp immediately when playback ends.
  introEndTimer=setTimeout(()=>closeIntro(false),250);
}
function replayIntro(){
  if(!introFrame)return;
  trackEngagement('replay');
  hideEndEngagement();
  postPlayer(introFrame,'seekTo',0);
  setTimeout(()=>postPlayer(introFrame,'play'),80);
}
async function shareIntroVideo(){
  const url=introMeta?.final_url||FALLBACK_META.final_url;
  const title='MatchApp TV Ai on TikTok';
  try{
    if(navigator.share){
      await navigator.share({title,text:'Watch MatchApp TV Ai on TikTok',url});
      trackEngagement('share');
      await grantTikTokShareReward();
      return;
    }
  }catch(err){
    if(err?.name==='AbortError')return;
  }
  try{
    await navigator.clipboard.writeText(url);
    trackEngagement('share_copy');
    setActionStatus('TikTok link copied. Open TikTok and share it there.');
  }catch(_){
    trackEngagement('share_open');
    window.open(url,'_blank','noopener,noreferrer');
    setActionStatus('TikTok opened. Use TikTok’s Share button to share the video.');
  }
}
function lockPage(intro){
  if(!intro||pageLocked)return;
  pageLocked=true;
  previousBodyOverflow=document.body.style.overflow||'';
  document.body.classList.add('matchapp-tiktok-intro-open');
  // Do not inert the application DOM. Some Android WebViews can retain inert
  // state after the cross-origin TikTok iframe ends, making MatchApp look frozen.
  document.body.style.overflow='hidden';
  setTimeout(()=>intro.querySelector('.matchapp-tiktok-intro-close')?.focus({preventScroll:true}),80);
}
function unlockPage(){
  document.body.classList.remove('matchapp-tiktok-intro-open');
  document.documentElement.style.removeProperty('overflow');
  if(pageLocked){
    if(previousBodyOverflow) document.body.style.overflow=previousBodyOverflow;
    else document.body.style.removeProperty('overflow');
  }else{
    document.body.style.removeProperty('overflow');
  }
  pageLocked=false;
  previousBodyOverflow='';
}
function closeIntro(mark=true){
  const intro=document.getElementById('matchapp-tiktok-intro');
  // Release the host page first. Cleanup below must never be able to strand the UI.
  unlockPage();
  clearTimeout(introFallbackTimer);
  clearTimeout(introHardStopTimer);
  clearTimeout(introEndTimer);
  clearTimeout(introStallTimer);
  if(mark)markSeen();
  if(introFrame){
    postPlayer(introFrame,'pause');
    try{introFrame.removeAttribute('src');}catch(_){}
    try{introFrame.remove();}catch(_){}
    introFrame=null;
  }
  delete document.documentElement.dataset.tiktokIntro;
  if(intro){
    intro.hidden=true;
    intro.style.setProperty('display','none','important');
    intro.style.setProperty('pointer-events','none','important');
    try{intro.remove();}catch(_){}
  }
  try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(_){}
  // A final next-frame release protects Android WebView/Chrome compositor state.
  requestAnimationFrame(()=>{
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');
  });
}
function introFallback(message){
  const intro=document.getElementById('matchapp-tiktok-intro');
  if(!intro)return;
  intro.querySelector('.matchapp-tiktok-intro-loader')?.setAttribute('hidden','');
  const fb=intro.querySelector('.matchapp-tiktok-intro-fallback');
  if(fb){
    fb.hidden=false;
    const copy=fb.querySelector('[data-tiktok-fallback-copy]');
    if(copy&&message)copy.textContent=message;
  }
  introFallbackTimer=setTimeout(()=>closeIntro(true),7000);
}
async function startIntro(){
  const intro=document.getElementById('matchapp-tiktok-intro');
  if(!intro)return;
  if(seen()){closeIntro(false);return;}
  document.documentElement.dataset.tiktokIntro='1';
  intro.hidden=false;
  lockPage(intro);

  try{
    const meta=await getMeta();
    syncIntroEngagement(meta);
    introFrame=intro.querySelector('#matchapp-tiktok-intro-player');
    const loader=intro.querySelector('.matchapp-tiktok-intro-loader');
    const fb=intro.querySelector('.matchapp-tiktok-intro-fallback');
    if(loader)loader.hidden=true;
    if(fb)fb.hidden=true;
    introFrame.hidden=false;
    introFrame.src=playerUrl(meta.video_id,true);
    introFrame.title='MatchApp TV Ai TikTok video ad';
    // Safety net only; the normal close path is TikTok's ended state.
    introHardStopTimer=setTimeout(()=>closeIntro(true),180000);
    // If playback never starts (autoplay blocked, slow network, in-app browser), release the page.
    introPlaying=false;
    clearTimeout(introStallTimer);
    introStallTimer=setTimeout(()=>{if(!introPlaying)closeIntro(true);},PLAYBACK_START_TIMEOUT_MS);
  }catch(_){
    introFallback('The video could not start here. You can watch it on TikTok; MatchApp will open in a moment.');
  }
}
function wirePlayerMessages(){
  window.addEventListener('message',event=>{
    if(event.origin!==TIKTOK_ORIGIN||!introFrame||event.source!==introFrame.contentWindow)return;
    const msg=event.data;
    if(!msg||msg['x-tiktok-player']!==true)return;
    if((msg.type==='onStateChange'&&Number(msg.value)===1)||(msg.type==='onCurrentTime'&&Number(msg.value?.currentTime)>0)){
      introPlaying=true;
      clearTimeout(introStallTimer);
    }
    if(msg.type==='onPlayerReady'){
      document.querySelector('.matchapp-tiktok-intro-actions')?.classList.add('is-ready');
      postPlayer(introFrame,'play');
      return;
    }
    if(msg.type==='onStateChange'&&Number(msg.value)===0){
      showEndEngagement();
      return;
    }
    if(msg.type==='onCurrentTime'){
      const current=Number(msg.value?.currentTime);
      const duration=Number(msg.value?.duration);
      if(duration>0&&current>=duration-.2)showEndEngagement();
      return;
    }
    if(msg.type==='onPlayerError'){
      const code=Number(msg.value?.errorCode);
      if(code===3002&&!introMutedFallback){
        introMutedFallback=true;
        postPlayer(introFrame,'mute');
        setTimeout(()=>postPlayer(introFrame,'play'),100);
      }else if(code!==3002){
        introFallback('TikTok playback is unavailable in this browser. MatchApp will open in a moment.');
      }
    }
  });
}
async function hydratePoster(){
  const section=document.getElementById('matchapp-tiktok-showcase');
  if(!section)return;
  const frame=section.querySelector('#matchapp-tiktok-poster-player');
  const placeholder=section.querySelector('.matchapp-tiktok-poster-placeholder');
  const caption=section.querySelector('#matchapp-tiktok-caption');
  const author=section.querySelector('[data-tiktok-author]');
  try{
    const meta=await getMeta();
    if(caption)caption.textContent=captionFrom(meta);
    if(author&&meta.author_name)author.textContent='TikTok · '+meta.author_name;
    if(frame){
      frame.src=playerUrl(meta.video_id,false);
      frame.hidden=false;
    }
    if(placeholder)placeholder.hidden=true;
  }catch(_){
    if(caption&&!caption.textContent.trim())caption.textContent=captionFrom(null);
  }
}
function lazyPoster(){
  const section=document.getElementById('matchapp-tiktok-showcase');
  if(!section)return;
  if(!('IntersectionObserver' in window)){hydratePoster();return;}
  const io=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){io.disconnect();hydratePoster();}
  },{rootMargin:'500px 0px'});
  io.observe(section);
}
function init(){
  wirePlayerMessages();
  document.querySelector('.matchapp-tiktok-intro-close')?.addEventListener('click',()=>closeIntro(true));
  window.__maTikTokIntroReady=true;
  document.querySelector('[data-tiktok-like-link]')?.addEventListener('click',()=>{
    trackEngagement('like_click');
    markSeen();
    setTimeout(()=>closeIntro(false),0);
  });
  document.querySelector('[data-tiktok-follow-link]')?.addEventListener('click',()=>{
    trackEngagement('follow_click');
    markSeen();
    setTimeout(()=>closeIntro(false),0);
  });
  document.querySelector('[data-tiktok-share-button]')?.addEventListener('click',shareIntroVideo);
  document.querySelector('[data-tiktok-replay]')?.addEventListener('click',replayIntro);
  document.querySelector('[data-tiktok-continue]')?.addEventListener('click',()=>{
    trackEngagement('continue');
    closeIntro(true);
  });
  document.querySelectorAll('[data-tiktok-short-link]').forEach(a=>a.setAttribute('href',SHORT_URL));
  document.querySelectorAll('[data-tiktok-video-link]').forEach(a=>{
    a.setAttribute('href',introMeta?.final_url||FALLBACK_META.final_url);
    a.addEventListener('click',()=>{
      const action=a.classList.contains('tt-like')?'like':a.classList.contains('tt-comment')?'comment':'video_open';
      trackEngagement('showcase_'+action);
      setActionStatus(action==='like'?'TikTok opened — tap Like on the video.':action==='comment'?'TikTok opened — add your comment on the video.':'TikTok opened.');
    });
  });
  document.querySelector('[data-tiktok-showcase-share]')?.addEventListener('click',async()=>{
    const url=introMeta?.final_url||FALLBACK_META.final_url;
    const text='Check out MatchApp TV Ai on TikTok #matchapptv #matchapp #whattowatch #tiktokviral #tv';
    try{
      if(navigator.share){
        await navigator.share({title:'MatchApp TV Ai on TikTok',text,url});
        trackEngagement('showcase_share');
        await grantTikTokShareReward();
        return;
      }
    }catch(err){if(err?.name==='AbortError')return;}
    try{
      await navigator.clipboard.writeText(text+' '+url);
      trackEngagement('showcase_share_copy');
      setActionStatus('Share caption copied. Open TikTok and share it there.');
    }catch(_){
      window.open(url,'_blank','noopener,noreferrer');
      setActionStatus('TikTok opened. Use TikTok’s Share button to share the video.');
    }
  });
  /* Canonical Home must never let the hidden legacy intro lock the viewport. */
  if(HOME_ROUTE){
    unlockPage();
    clearTimeout(introFallbackTimer);clearTimeout(introHardStopTimer);clearTimeout(introEndTimer);clearTimeout(introStallTimer);
    delete document.documentElement.dataset.tiktokIntro;
    const intro=document.getElementById('matchapp-tiktok-intro');
    if(intro){intro.hidden=true;intro.style.setProperty('display','none','important');intro.style.setProperty('pointer-events','none','important');}
    window.__maTikTokIntroReady=true;
  }else if(document.documentElement.dataset.tiktokIntro==='1'&&!seen())startIntro();
  else{
    unlockPage();
    const intro=document.getElementById('matchapp-tiktok-intro');
    if(intro)intro.hidden=true;
    delete document.documentElement.dataset.tiktokIntro;
  }
  lazyPoster();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();