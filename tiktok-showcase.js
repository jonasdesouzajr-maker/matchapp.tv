/* MatchApp TikTok showcase — static first paint, player loads only after a tap. */
(function(){
'use strict';
const VIDEO_ID='7686252800828804360';
const VIDEO_URL='https://www.tiktok.com/@matchapp_ai/video/'+VIDEO_ID;
function playerUrl(){
 const q=new URLSearchParams({autoplay:'0',loop:'0',controls:'1',progress_bar:'1',play_button:'1',volume_control:'1',fullscreen_button:'1',timestamp:'1',music_info:'1',description:'1',rel:'0',native_context_menu:'1',closed_caption:'1',muted:'0'});
 return 'https://www.tiktok.com/player/v1/'+VIDEO_ID+'?'+q.toString();
}
function track(action){
 try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'tiktok_showcase_engagement',action})}catch(_){}
}
function status(message){
 const el=document.querySelector('[data-tiktok-showcase-status]');if(!el)return;
 el.textContent=message||'';if(message)setTimeout(()=>{if(el.textContent===message)el.textContent=''},4200);
}
async function reward(){
 try{
  if(typeof window.grantShareReward!=='function')return;
  const result=await window.grantShareReward();
  if(result?.ok){window.refreshQuotaStatus?.();window.showToast?.('🎁 TikTok share completed — +1 free match unlocked.')}
 }catch(err){console.warn('[MatchApp TikTok reward]',err)}
}
function loadPlayer(){
 const frame=document.getElementById('matchapp-tiktok-poster-player');
 const placeholder=document.querySelector('.matchapp-tiktok-poster-placeholder');
 if(!frame)return;
 if(!frame.src)frame.src=playerUrl();
 frame.hidden=false;if(placeholder)placeholder.hidden=true;
 track('player_open');
}
async function share(){
 const text='Check out MatchApp TV Ai on TikTok #matchapptv #matchapp #whattowatch';
 try{
  if(navigator.share){await navigator.share({title:'MatchApp TV Ai on TikTok',text,url:VIDEO_URL});track('share');await reward();return}
 }catch(err){if(err?.name==='AbortError')return}
 try{await navigator.clipboard.writeText(text+' '+VIDEO_URL);status('TikTok share caption copied.');track('share_copy')}
 catch(_){window.open(VIDEO_URL,'_blank','noopener,noreferrer');status('TikTok opened. Use TikTok’s Share button.');track('share_open')}
}
function init(){
 const section=document.getElementById('matchapp-tiktok-showcase');if(!section)return;
 section.querySelector('[data-tiktok-load]')?.addEventListener('click',loadPlayer);
 section.querySelector('[data-tiktok-showcase-share]')?.addEventListener('click',share);
 section.querySelectorAll('[data-tiktok-video-link]').forEach(a=>a.addEventListener('click',()=>track(a.classList.contains('tt-like')?'like_open':'comment_open')));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
