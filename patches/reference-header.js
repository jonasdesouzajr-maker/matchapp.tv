/* Persistent adult masthead. Original controls, launcher and conversation owners stay intact. */
(function () {
  'use strict';
  if (window.top !== window || window.MatchAppReferenceHeader || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname) || /\/(callback|confirm)\.html$/.test(location.pathname)) return;
  var html=document.documentElement,header=null,space=null,chrome=null,slot=null,active=null,frame=0,resizeObserver=null,returnButton=null,help=null;
  var positionKey='matchapp-jonas-header-drag-v1',floating=false,preference=null,point=null,drag=null,suppressClick=false,moveListenersInstalled=false;
  try{var saved=JSON.parse(localStorage.getItem(positionKey)||'null');if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)){preference={x:Math.max(0,Math.min(1,saved.x)),y:Math.max(0,Math.min(1,saved.y))};floating=true;}}catch(_){}
  var words={en:'App controls',pt:'Controles do app',es:'Controles de la app',fr:'Commandes de l’app',de:'App-Steuerung',it:'Controlli dell’app',tr:'Uygulama kontrolleri',ru:'Управление приложением',ar:'أدوات التطبيق',hi:'ऐप नियंत्रण',id:'Kontrol aplikasi',ja:'アプリの操作',ko:'앱 설정',zh:'应用控制'};
  var moveWords={en:['Return Jonas to header','Drag to move Jonas. Alt + arrow keys move him; Alt + Home returns him to the header.'],pt:['Voltar Jonas ao cabeçalho','Arraste para mover Jonas. Alt + setas movem; Alt + Home volta ao cabeçalho.'],es:['Devolver a Jonas al encabezado','Arrastra para mover a Jonas. Alt + flechas lo mueven; Alt + Inicio lo devuelve al encabezado.'],fr:['Replacer Jonas dans l’en-tête','Faites glisser Jonas. Alt + les flèches le déplacent ; Alt + Début le replace dans l’en-tête.'],de:['Jonas zurück in die Kopfzeile','Ziehe Jonas zum Verschieben. Alt + Pfeiltasten bewegen ihn; Alt + Pos1 bringt ihn zur Kopfzeile zurück.'],it:['Riporta Jonas nell’intestazione','Trascina Jonas per spostarlo. Alt + frecce lo muovono; Alt + Home lo riporta nell’intestazione.'],tr:['Jonas’ı üst başlığa döndür','Jonas’ı taşımak için sürükleyin. Alt + ok tuşları taşır; Alt + Home üst başlığa döndürür.'],ru:['Вернуть Йонаса в шапку','Перетащите Йонаса. Alt + стрелки перемещают его; Alt + Home возвращает в шапку.'],ar:['إعادة جوناس إلى الترويسة','اسحب جوناس لتحريكه. Alt مع الأسهم يحركه؛ Alt مع Home يعيده إلى الترويسة.'],hi:['जोनस को शीर्ष पट्टी में लौटाएँ','जोनस को खींचकर ले जाएँ। Alt + तीर कुंजियाँ उसे चलाती हैं; Alt + Home शीर्ष पट्टी में लौटाता है।'],id:['Kembalikan Jonas ke header','Seret untuk memindahkan Jonas. Alt + panah memindahkannya; Alt + Home mengembalikannya ke header.'],ja:['ジョナスをヘッダーに戻す','ドラッグで移動できます。Alt＋矢印キーで移動し、Alt＋Homeでヘッダーに戻ります。'],ko:['조나스를 머리글로 되돌리기','드래그하여 이동하세요. Alt + 방향키로 이동하고 Alt + Home으로 머리글에 되돌립니다.'],zh:['将乔纳斯移回页眉','拖动可移动乔纳斯。Alt + 方向键移动，Alt + Home 返回页眉。']};
  html.setAttribute('data-ma-jonas-header','pending');
  function owns(root){return !!root && (root===active || /^(header|dragged)$/.test(root.dataset.jonasPlacement||''));}
  function bounds(){var v=window.visualViewport;return window.MatchAppJonasPlacement?.bounds(64,64)||{minX:(v?.offsetLeft||0)+12,minY:(v?.offsetTop||0)+12,maxX:Math.max(12,(v?.offsetLeft||0)+(v?.width||innerWidth)-76),maxY:Math.max(12,(v?.offsetTop||0)+(v?.height||innerHeight)-76)};}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function syncReturn(){if(returnButton)returnButton.hidden=!floating;slot?.toggleAttribute('data-jonas-floated',floating);}
  function floatAt(x,y){
    if(!active)return;var b=bounds();point={x:clamp(x,b.minX,b.maxX),y:clamp(y,b.minY,b.maxY)};floating=true;
    active.dataset.jonasPlacement='dragged';
    if(active.parentElement!==document.body)document.body.appendChild(active);
    active.style.setProperty('position','fixed','important');active.style.setProperty('left',point.x+'px','important');active.style.setProperty('top',point.y+'px','important');
    active.style.setProperty('right','auto','important');active.style.setProperty('bottom','auto','important');active.style.setProperty('transform','none','important');syncReturn();
  }
  function restoreFloating(){var b=bounds();if(preference)floatAt(b.minX+preference.x*(b.maxX-b.minX),b.minY+preference.y*(b.maxY-b.minY));else if(point)floatAt(point.x,point.y);}
  function saveFloating(){if(!point)return;var b=bounds();preference={x:(point.x-b.minX)/Math.max(1,b.maxX-b.minX),y:(point.y-b.minY)/Math.max(1,b.maxY-b.minY)};try{localStorage.setItem(positionKey,JSON.stringify(preference));}catch(_){};}
  function returnToHeader(){floating=false;preference=null;point=null;drag=null;try{localStorage.removeItem(positionKey);}catch(_){}if(active){claim(active);active.querySelector('.ja-bubble,.jh-bubble')?.focus({preventScroll:true});}syncReturn();}
  function nearestClear(x,y){
    // A small nearby clear gap is preferable on release. Dense content never
    // cancels an intentional placement: beyond24px, the chosen point wins.
    var blocks=[],b=bounds();
    function visible(node){if(active.contains(node)||node.closest('#ma-ambient-panel,#ma-jonas-home-panel,script,style,svg,option,[hidden],.ma-reference-header-move-help'))return false;var closed=node.closest('details:not([open])');if(closed&&!closed.querySelector('summary')?.contains(node))return false;var c=getComputedStyle(node);return c.clipPath!=='inset(50%)'&&c.clip!=='rect(0px, 0px, 0px, 0px)'&&node.checkVisibility?.({checkVisibilityCSS:true,checkOpacity:true})!==false;}
    function add(r){if(r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth)blocks.push(r);}
    document.querySelectorAll('a,button,input,select,textarea,summary,[role="button"],#trending-rail,.marquee-viewport,nav.ma-cinema-dock,ins.adsbygoogle,iframe,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right').forEach(function(node){if(visible(node))add(node.getBoundingClientRect());});
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),text;
    while(text=walker.nextNode()){if(!text.textContent.trim()||!visible(text.parentElement))continue;var range=document.createRange();range.selectNodeContents(text);Array.from(range.getClientRects?.()||[]).forEach(add);}
    function clear(px,py){return !blocks.some(function(r){return px-8<r.right&&px+72>r.left&&py-8<r.bottom&&py+72>r.top;});}
    if(clear(x,y))return{x:x,y:y};
    for(var distance=8;distance<=24;distance+=8)for(var axis of [[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){var px=clamp(x+axis[0]*distance,b.minX,b.maxX),py=clamp(y+axis[1]*distance,b.minY,b.maxY);if(clear(px,py))return{x:px,y:py};}
    return{x:x,y:y};
  }
  function installMove(root){
    if(root.dataset.referenceHeaderMove==='1')return;root.dataset.referenceHeaderMove='1';
    var bubble=root.querySelector('.ja-bubble,.jh-bubble');if(!bubble)return;
    bubble.setAttribute('aria-describedby','ma-reference-header-move-help');bubble.setAttribute('aria-keyshortcuts','Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Alt+Home');
    bubble.addEventListener('pointerdown',function(event){if(event.button!==0&&event.pointerType==='mouse')return;var r=root.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top,moved:false};bubble.setPointerCapture?.(event.pointerId);},true);
    if(!moveListenersInstalled){moveListenersInstalled=true;
    window.addEventListener('pointermove',function(event){if(!drag||drag.id!==event.pointerId)return;var dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<6)return;drag.moved=true;floatAt(drag.left+dx,drag.top+dy);if(event.cancelable)event.preventDefault();},{passive:false});
    function end(event){if(!drag||drag.id!==event.pointerId)return;if(drag.moved){var next=nearestClear(point.x,point.y);floatAt(next.x,next.y);saveFloating();suppressClick=true;setTimeout(function(){suppressClick=false;},450);}drag=null;}
    window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
    }
    bubble.addEventListener('click',function(event){if(!suppressClick)return;suppressClick=false;event.preventDefault();event.stopImmediatePropagation();},true);
    bubble.addEventListener('keydown',function(event){if(!event.altKey)return;if(event.key==='Home'){event.preventDefault();returnToHeader();return;}var moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},move=moves[event.key];if(!move)return;event.preventDefault();var r=root.getBoundingClientRect(),step=event.shiftKey?32:16;floatAt(r.left+move[0]*step,r.top+move[1]*step);saveFloating();bubble.focus({preventScroll:true});});
  }
  function clearLegacyReservation(){
    document.querySelectorAll('.ma-jonas-dock-slot').forEach(function(node){var parent=node.parentElement;node.remove();parent.removeAttribute('data-jonas-reserved');if(parent.classList.contains('ma-jonas-reserve-only'))parent.remove();});
  }
  function claim(root){
    if(!root||!slot)return false;
    if(active&&active!==root)delete active.dataset.jonasPlacement;
    var changed=active!==root;active=root;clearLegacyReservation();installMove(root);
    root.dataset.jonasPlacement=floating?'dragged':'header';root.dataset.jonasDefaultDock='1';
    root.classList.remove('ja-corner-default','ja-header-default','ma-jonas-rebound');
    delete root.dataset.jonasGuideAnchor;
    // Keep old saved coordinates untouched. A header launcher never consumes
    // or rewrites the user's earlier free-screen placement preference.
    if(!floating)['left','right','top','bottom','position','transform'].forEach(function(name){root.style.removeProperty(name);});
    root.style.setProperty('--ma-jonas-launcher-size','64px');
    if(floating){if(changed||root.parentElement!==document.body)restoreFloating();}
    else if(root.parentElement!==slot)slot.appendChild(root);
    syncReturn();
    return true;
  }
  function chooseLauncher(){return document.getElementById('ma-ambient-jonas')||document.getElementById('ma-jonas-home');}
  function labelTools(){
    var selected='';try{selected=localStorage.getItem('match_lang')||'';}catch(_){}
    var lang=String(selected||window.MATCH_LANG||html.lang||'en').toLowerCase().split('-')[0],label=words[lang]||words.en;
    document.querySelectorAll('.ma-reference-header-tools>summary').forEach(function(summary){summary.setAttribute('aria-label',label);summary.title=label;});
    var moveCopy=moveWords[lang]||moveWords.en;if(returnButton){returnButton.setAttribute('aria-label',moveCopy[0]);returnButton.title=moveCopy[0];}if(help)help.textContent=moveCopy[1];
  }
  function compactOriginal(original){
    if(original.id==='mh-topbox'||original.id==='ref-explore-header')return;
    var brand=original.querySelector('.mh-head,.ma-brand-lockup,.hub-brand,.ebook-hub-brand,.journey-brand,.header-brand-area,.matchapp-brand-link');
    if(!brand)return;
    while(brand.parentElement!==original&&brand.parentElement)brand=brand.parentElement;
    var controls=Array.from(original.children).filter(function(node){return node!==brand&&!node.matches('script,style,link,.ma-reference-header-tools');});
    if(!controls.length)return;
    var tools=document.createElement('details');tools.className='ma-reference-header-tools';
    var summary=document.createElement('summary');
    summary.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></svg>';
    var panel=document.createElement('div');panel.className='ma-reference-header-tools-panel';
    controls.forEach(function(node){panel.appendChild(node);});tools.append(summary,panel);original.appendChild(tools);
    tools.addEventListener('keydown',function(event){if(event.key==='Escape'){tools.open=false;summary.focus();}});
  }
  function findOriginal(){
    var candidates=document.querySelectorAll('#mh-topbox,#ref-explore-header,header.app-header,header.ebook-page-top,header.journey-header,header.hub-header');
    return Array.from(candidates).find(function(node){return !node.closest('#ma-reference-header,dialog,[role="dialog"],details');})||null;
  }
  function fallback(){
    // Pages without a masthead get the same approved brand, never a moved
    // content fold, native details summary or matcher.
    var node=document.createElement('div');node.className='ma-reference-header-fallback';node.setAttribute('role','banner');
    var a=document.createElement('a');a.href='/';a.className='ma-reference-header-brand';a.setAttribute('aria-label','MatchApp Ai');
    var image=document.createElement('img');image.src='/assets/brand/matchapp-icon-approved.png';image.alt='';image.width=36;image.height=36;image.decoding='async';
    var label=document.createElement('span');label.textContent='MatchApp Ai';label.translate=false;a.append(image,label);node.appendChild(a);return node;
  }
  function consolidateFallbackBrand(){
    var target=chrome?.firstElementChild;
    if(!target?.classList.contains('ma-reference-header-fallback'))return;
    Array.from(document.body.children).filter(function(node){return node.tagName==='HEADER';}).forEach(function(legacy){
      var brand=legacy.querySelector(':scope > a.matchapp-brand-link');
      var text=Array.from(legacy.childNodes).some(function(node){return node.nodeType===3&&node.textContent.trim();});
      var controls=Array.from(legacy.children).filter(function(node){return node!==brand;});
      // Only a duplicate image wordmark and the shell's own Search may move.
      // Auth, navigation, authored copy and every other control retain owners.
      if(!brand||!brand.querySelector('img.matchapp-wordmark')||brand.textContent.trim()||text||controls.some(function(node){return !node.matches('a.ma-cinema-search[data-cinema-icon-only="true"][data-cinema-copy="search"]');})){
        legacy.removeAttribute('data-ma-reference-brand-only');return;
      }
      controls.forEach(function(node){target.appendChild(node);});
      legacy.setAttribute('data-ma-reference-brand-only','true');
    });
  }
  function measure(){
    frame=0;if(!header||!space)return;
    var height=Math.ceil(header.getBoundingClientRect().height);
    if(space.style.height!==height+'px')space.style.height=height+'px';
    if(html.style.getPropertyValue('--ma-reference-header-height')!==height+'px')html.style.setProperty('--ma-reference-header-height',height+'px');
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
  function mount(){
    if(!document.body)return;
    if(!header){
      var original=findOriginal()||fallback();
      space=document.createElement('div');space.id='ma-reference-header-space';space.setAttribute('aria-hidden','true');
      // The original semantic header stays intact inside this visual wrapper;
      // using a div avoids invalid nested <header> landmarks.
      header=document.createElement('div');header.id='ma-reference-header';header.setAttribute('aria-label','MatchApp Ai');
      var bar=document.createElement('div');bar.className='ma-reference-header-bar';
      chrome=document.createElement('div');chrome.className='ma-reference-header-chrome';
      slot=document.createElement('div');slot.id='ma-reference-header-slot';
      returnButton=document.createElement('button');returnButton.type='button';returnButton.className='ma-reference-header-return';returnButton.hidden=true;returnButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M4 4l6 6M12 4h8v16H4v-8"/></svg>';returnButton.addEventListener('click',returnToHeader);
      help=document.createElement('span');help.id='ma-reference-header-move-help';help.className='ma-reference-header-move-help';slot.append(returnButton,help);
      original.classList.add('ma-reference-header-original');compactOriginal(original);chrome.appendChild(original);bar.append(chrome,slot);header.appendChild(bar);
      document.body.prepend(space,header);
      if('ResizeObserver'in window){resizeObserver=new ResizeObserver(schedule);resizeObserver.observe(header);}
      html.setAttribute('data-ma-jonas-header','active');
    }
    consolidateFallbackBrand();
    var launcher=chooseLauncher();if(launcher)claim(launcher);
    labelTools();measure();window.MatchAppTextPills?.scan(header);
  }
  window.MatchAppReferenceHeader=Object.freeze({mount:mount,claim:claim,owns:owns,measure:schedule,reset:returnToHeader});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  var observer=new MutationObserver(function(changes){
    if(!header){mount();return;}
    if(chrome.firstElementChild?.classList.contains('ma-reference-header-fallback')){
      var late=findOriginal();
      if(late){late.classList.add('ma-reference-header-original');compactOriginal(late);chrome.replaceChildren(late);labelTools();schedule();}
    }
    consolidateFallbackBrand();
    var launcher=chooseLauncher();if(launcher&&(!owns(launcher)||launcher.parentElement!==(floating?document.body:slot)))claim(launcher);
    // Header builders may insert account/language controls after DOM ready.
    if(changes.some(function(change){return chrome.contains(change.target);}))schedule();
  });
  observer.observe(html,{childList:true,subtree:true});
  document.addEventListener('matchapp:jonas-mounted',mount);
  document.addEventListener('matchapp:langchange',function(){labelTools();schedule();});
  window.addEventListener('storage',function(event){if(event.key==='match_lang'){labelTools();schedule();}});
  window.addEventListener('resize',function(){if(floating&&!drag)restoreFloating();schedule();},{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',function(){if(floating&&!drag)restoreFloating();schedule();},{passive:true});
  window.addEventListener('pagehide',function(event){if(event.persisted)return;observer.disconnect();resizeObserver?.disconnect();if(frame)cancelAnimationFrame(frame);},{once:true});
})();
