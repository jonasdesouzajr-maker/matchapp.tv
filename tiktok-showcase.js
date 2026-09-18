/* MatchApp TikTok launch ad.
   One first-visit playback, then a permanent lazy-loaded social poster at page bottom. */
(function(){
'use strict';

const SHORT_URL='https://vt.tiktok.com/ZSqtbq1j5/';
const META_URL='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/tiktok-matchapp-ad';
const SEEN_KEY='matchapp:tiktok-ad-seen:v1';
const TIKTOK_ORIGIN='https://www.tiktok.com';

let metaPromise=null;
let introFrame=null;
let introFallbackTimer=0;
let introHardStopTimer=0;
let introMutedFallback=false;
let inerted=[];

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
    const res=await fetch(META_URL,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});
    if(!res.ok)throw new Error('TikTok metadata unavailable');
    const data=await res.json();
    if(!data?.video_id)throw new Error('TikTok video ID unavailable');
    return data;
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
function lockPage(intro){
  if(!intro)return;
  document.body.classList.add('matchapp-tiktok-intro-open');
  inerted=[];
  Array.from(document.body.children).forEach(el=>{
    if(el===intro||el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='NOSCRIPT')return;
    if('inert' in el&&!el.inert){el.inert=true;inerted.push(el);}
  });
  setTimeout(()=>intro.querySelector('.matchapp-tiktok-intro-close')?.focus({preventScroll:true}),80);
}
function unlockPage(){
  inerted.forEach(el=>{try{el.inert=false;}catch(_){}});
  inerted=[];
  document.body.classList.remove('matchapp-tiktok-intro-open');
}
function closeIntro(mark=true){
  const intro=document.getElementById('matchapp-tiktok-intro');
  clearTimeout(introFallbackTimer);
  clearTimeout(introHardStopTimer);
  if(mark)markSeen();
  if(introFrame){
    postPlayer(introFrame,'pause');
    introFrame.src='about:blank';
  }
  if(intro)intro.hidden=true;
  delete document.documentElement.dataset.tiktokIntro;
  unlockPage();
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
  }catch(_){
    introFallback('The video could not start here. You can watch it on TikTok; MatchApp will open in a moment.');
  }
}
function wirePlayerMessages(){
  window.addEventListener('message',event=>{
    if(event.origin!==TIKTOK_ORIGIN||!introFrame||event.source!==introFrame.contentWindow)return;
    const msg=event.data;
    if(!msg||msg['x-tiktok-player']!==true)return;
    if(msg.type==='onPlayerReady'){
      postPlayer(introFrame,'play');
      return;
    }
    if(msg.type==='onStateChange'&&Number(msg.value)===0){
      closeIntro(true);
      return;
    }
    if(msg.type==='onCurrentTime'){
      const current=Number(msg.value?.currentTime);
      const duration=Number(msg.value?.duration);
      if(duration>0&&current>=duration-.2)closeIntro(true);
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
  document.querySelectorAll('[data-tiktok-short-link]').forEach(a=>a.setAttribute('href',SHORT_URL));
  if(document.documentElement.dataset.tiktokIntro==='1'&&!seen())startIntro();
  else{
    const intro=document.getElementById('matchapp-tiktok-intro');
    if(intro)intro.hidden=true;
    delete document.documentElement.dataset.tiktokIntro;
  }
  lazyPoster();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();