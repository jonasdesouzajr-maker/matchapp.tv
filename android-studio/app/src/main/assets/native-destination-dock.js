/* Mirror the current document's five existing navigation actions in native Material controls. */
(function () {
  'use strict';
  const bridge = window.MatchAppDestinationDock;
  if (window.top !== window || !bridge || window.__maNativeDock ||
      location.protocol !== 'https:' || !['matchapp.tv','www.matchapp.tv'].includes(location.hostname) ||
      /^\/(kids|oauth|private-voice|lumina-match|reelforge)(\/|$)/.test(location.pathname)) return;
  const root = document.documentElement;
  const slots = ['home','explore','matches','list','profile'];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let nav, timer, sent, restore, suspended=false;
  function schedule() {
    if(!suspended && window.document?.body?.isConnected && !timer) timer=requestAnimationFrame(publish);
  }
  const labelsObserver = new MutationObserver(schedule);
  const dialogSelector = 'dialog,[role="dialog"]';
  function blocked() {
    return document.hidden || document.fullscreenElement || !nav || nav.hidden ||
      document.body?.classList.contains('ma-jonas-modal-open') ||
      document.body?.classList.contains('ma-jonas-chat-open') ||
      [...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]:not([hidden])')]
        .some(el=>el.getClientRects().length);
  }
  function publish() {
    timer = 0;
    if(suspended || !window.document?.body?.isConnected)return;
    const current = document.querySelector('nav.ma-cinema-dock');
    if (current !== nav) {
      labelsObserver.disconnect();
      nav = current;
      if (nav) labelsObserver.observe(nav,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-current','hidden']});
    }
    const links = slots.map(key=>nav?.querySelector('a[data-cinema-route="'+key+'"]'));
    const labels = links.map(a=>a?.querySelector('[data-cinema-copy]')?.textContent.trim() || '');
    const payload = JSON.stringify({href:location.href, visible:!blocked() && labels.every(Boolean), labels,
      selected:links.findIndex(a=>a?.getAttribute('aria-current')==='page'), rtl:root.dir==='rtl', lang:root.lang||'en',
      motion:!motion.matches && !root.classList.contains('reduce-motion')});
    if (payload !== sent) { sent=payload; bridge.postMessage(payload); }
  }
  function targetFor(message) {
    if (!root.hasAttribute('data-native-dock') || !/^activate:[0-4]$/.test(message) || blocked()) return null;
    const anchor=nav?.querySelector('a[data-cinema-route="'+slots[message.slice(-1)]+'"]');
    return anchor?.isConnected && anchor.getAttribute('aria-disabled')!=='true' ? anchor : null;
  }
  window.__maNativeDock = {targetFor};
  // Only Android's menu listeners send activation replies. The feedback owner hears the
  // same reply synchronously before the existing anchor handles navigation.
  bridge.addEventListener('message', event => {
    const anchor=targetFor(event.data);
    if (anchor) setTimeout(()=>{ if (targetFor(event.data)===anchor) anchor.click(); },0);
  });
  bridge.onmessage = event => {
    if (event.data!=='shown' && event.data!=='hidden') return;
    const shown=event.data==='shown';
    root.toggleAttribute('data-native-dock',shown);
    if(shown && nav && !restore){
      const values=[[nav,'display','none'],[document.body,'padding-bottom','8px']].map(([el,key,value])=>{
        const saved=[el.style.getPropertyValue(key),el.style.getPropertyPriority(key)];
        el.style.setProperty(key,value,'important');
        return ()=>el.style.setProperty(key,...saved);
      });
      restore=()=>values.forEach(reset=>reset());
    } else if(!shown && restore){restore();restore=null;}
  };
  const style=document.createElement('style');
  style.textContent='html[data-native-dock] body > nav.ma-cinema-dock{display:none!important}'+
    'html[data-native-dock] body.ma-has-cinema-dock{--ma-reference-dock-clearance:8px!important}'+
    'html[data-native-dock] body.ma-has-cinema-dock:has(>nav.ma-cinema-dock){padding-bottom:8px!important}'+
    '@media(prefers-reduced-motion:no-preference){html.matchapp-ai-android:not(.reduce-motion) :is(.marquee-item,.channel-button,.gold-btn):active{transform:perspective(560px) rotateX(3deg) scale(.98);transform-origin:center bottom}}';
  document.head.append(style);
  const bind = () => {
    const body=document.body;
    new MutationObserver(schedule).observe(body,{childList:true,attributes:true,attributeFilter:['class']});
    new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['lang','dir','class']});
    // Existing dialogs open through style or class changes. Watch those writes
    // on dialogs alone so unrelated animation and scroll styles stay cheap.
    const dialogVisibility = new MutationObserver(schedule);
    function watchDialogs() {
      dialogVisibility.disconnect();
      for(const el of body.querySelectorAll(dialogSelector))
        dialogVisibility.observe(el,{attributes:true,attributeFilter:['style','class','open','aria-modal','aria-hidden','hidden']});
    }
    watchDialogs();
    new MutationObserver(records=>{
      const changed=records.some(r=>r.type==='attributes'
        ? r.oldValue==='dialog' || r.target.matches(dialogSelector)
        : [...r.addedNodes,...r.removedNodes].some(n=>n.matches?.(dialogSelector) || n.querySelector?.(dialogSelector)));
      if(changed){watchDialogs();schedule();}
    }).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['role'],attributeOldValue:true});
    publish();
  };
  if(document.body) bind(); else document.addEventListener('DOMContentLoaded',bind,{once:true});
  window.addEventListener('pagehide',()=>{suspended=true;cancelAnimationFrame(timer);timer=0;});
  window.addEventListener('pageshow',()=>{suspended=false;sent=null;schedule();});
  for(const event of ['hashchange','popstate'])window.addEventListener(event,schedule);
  for(const event of ['visibilitychange','fullscreenchange','matchapp:langchange','matchapp:settingschanged'])document.addEventListener(event,schedule);
  motion.addEventListener?.('change',schedule);
})();
