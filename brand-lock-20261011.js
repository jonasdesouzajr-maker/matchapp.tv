/* Canonical adult wordmark; scoped to header branding, never conversation text. */
(function(){
 'use strict';
 const observers=new Map();
 function restore(brand){
  const word=brand.querySelector('.ma-wordmark');
  if(!word)return;
  let match=word.querySelector('.ma-word-match'),app=word.querySelector('.ma-word-app');
  if(!match||!app){
   match=document.createElement('span');match.className='ma-word-match';
   app=document.createElement('span');app.className='ma-word-app';
   word.replaceChildren(match,app);
  }
  if(match.textContent!=='Match')match.textContent='Match';
  if(app.textContent!=='App')app.textContent='App';
  const ai=brand.querySelector('[data-ma-brand-ai],.ma-word-ai');
  if(ai&&ai.textContent!=='Ai')ai.textContent='Ai';
  for(const el of [word,ai].filter(Boolean)){
   el.setAttribute('translate','no');el.classList.add('notranslate');
  }
  // Normalize legacy sibling markup as well as the generated shared shell.
  const copy=word.closest('.ma-brand-copy');
  if(copy&&ai&&ai.closest('.ma-brand-copy')===copy){
   let line=copy.querySelector('.ma-brand-title-line');
   if(!line){line=document.createElement('span');line.className='ma-brand-title-line';copy.insertBefore(line,copy.firstChild);}
   if(word.parentNode!==line)line.appendChild(word);
   if(ai.parentNode!==line)line.appendChild(ai);
   line.setAttribute('translate','no');line.classList.add('notranslate');
   line.setAttribute('aria-label','MatchApp Ai');
  }
  brand.setAttribute('aria-label','MatchApp Ai');
 }
 function attach(){
  for(const [brand,observer] of observers)if(!brand.isConnected){observer.disconnect();observers.delete(brand);}
  document.querySelectorAll('body:not(.page-kids):not(.kids-body) .ma-brand-lockup').forEach(function(brand){
   restore(brand);
   if(observers.has(brand))return;
   const observer=new MutationObserver(function(){restore(brand)});
   observer.observe(brand,{characterData:true,childList:true,subtree:true});
   observers.set(brand,observer);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
 else attach();
 document.addEventListener('matchapp:langchange',attach);
 window.addEventListener('pageshow',attach);
 window.setTimeout(attach,1400);
 window.addEventListener('pagehide',function(){
  for(const observer of observers.values())observer.disconnect();
  observers.clear();
 });
})();
