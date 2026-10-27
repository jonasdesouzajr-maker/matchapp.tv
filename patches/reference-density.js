/* Balanced control rows; presentation only. Existing nodes, source order,
   navigation, input state and action listeners remain owned by the app. */
(function () {
 'use strict';
 if (window.MatchReferenceDensity) return;
 var KNOWN='.ebook-chips,.ebook-result-actions,.matchapp-exclusion-chips,.taste-chips,.filter-chips,.genre-chips,.mood-chips,.platform-chips,.chip-group,.chips,.button-group,.btn-group,.quick-options,.quick-choices,.ma-quick,.settings-actions,.result-actions,.res-actions,.share-actions,.cooking-actions,.theme-actions';
 var CONTROL='button,a[href],label,[role="button"]';
 var AD='.adsbygoogle,.premium-ad-frame,.premium-ad-slot,.sidebar-ad,.sidebar-ad-left,.sidebar-ad-right,.ad-slot,.ad-container,.ads-container,[data-ad-slot],[data-ad-client],[data-admob],.sponsored-match,.sponsored-unit,.sponsored-card,[data-sponsored],[rel~="sponsored"]';
 var EXCLUDED=AD+',header,.ebook-page-top,.adult-page-nav,.ma-cinema-dock,#ma-jonas-home,#ma-ambient-jonas,#ma-ambient-panel,.ja-panel,.jh-popover,.ja-bubble,.jh-bubble,.marquee-wrapper,.marquee-track,.events-viewport,.journey-chapter-links,.carousel,[aria-roledescription="carousel"],.swiper,.swiper-wrapper,.theme-grid,.theme-choice,.profile-hub-grid,.profile-hub,.profile-tabs,.portfolio-tabs,.taste-tabs,[role="tablist"],[role="tab"],.ref-primary-topics,.ref-secondary-topics,.ref-editorial-banners,.ref-explore-tools,.ma-cinema-tools,.ma-luxe-shortcuts,.mh-deck,.tg-pref-grid';
 var RICH='img,picture,video,iframe,canvas,article,figure,h1,h2,h3,h4,dl,table,select,textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])';
 var states=new Map(),pending=0,resize=null,observer=null,measure=null,bookOpen=Object.create(null),dirty=false;
 function enabled(){return document.documentElement.classList.contains('ma-reference')&&!/^\/kids(?:\/|$)/.test(location.pathname)&&document.body&&!document.body.matches('.page-kids,.kids-body,[data-kids-mode="true"]');}
 function visible(node){return node instanceof Element&&!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length>0;}
 function set(node,key,value){if(node.getAttribute(key)!==value)node.setAttribute(key,value);}
 function simple(node){
  if(!node.matches(CONTROL)||node.matches('[role="tab"],.theme-choice,.profile-hub-row')||node.closest(EXCLUDED)||node.querySelector(RICH))return false;
  if(node.tagName==='LABEL'&&!node.querySelector('input[type="checkbox"],input[type="radio"]'))return false;
  return true;
 }
 function eligible(group){
  if(!group||group.matches('body,main,form,fieldset,header,footer,section,article,ul,ol')||group.closest(EXCLUDED)||group.querySelector(AD)||group.querySelector(RICH)||!visible(group))return null;
  var known=group.matches(KNOWN),children=Array.from(group.children).filter(visible),items=children.filter(simple);
  if(items.length<(known?2:3)||items.length>240)return null;
  var notes=children.filter(function(node){return items.indexOf(node)===-1;});
  if(notes.some(function(node){return !known||!node.matches('small,p');}))return null;
  if(!known){var display=getComputedStyle(group).display;if(display!=='flex'&&display!=='inline-flex'&&display!=='grid'&&!group.hasAttribute('data-ma-density'))return null;}
  return {items:items,notes:notes};
 }
 function clear(group){
  var previous=states.get(group);if(!previous)return;
  group.removeAttribute('data-ma-density');group.removeAttribute('data-ma-density-rows');
  previous.items.forEach(function(item){item.removeAttribute('data-ma-density-item');item.removeAttribute('data-ma-density-span');});
  previous.notes.forEach(function(note){note.removeAttribute('data-ma-density-note');});
  if(resize)resize.unobserve(group);states.delete(group);
 }
 function balanced(n,maxColumns){
  maxColumns=Math.max(1,Math.min(6,n,Math.floor(maxColumns)||1));
  var rows=Math.ceil(n/maxColumns);
  var base=Math.floor(n/rows),extra=n%rows,out=[];
  for(var row=0;row<rows;row++)out.push(base+(row<extra?1:0));
  return out;
 }
 function textWidth(text,font){
  if(!measure){try{measure=document.createElement('canvas').getContext('2d');}catch(_){}}
  if(!measure)return text.length*6;
  measure.font=font;return measure.measureText(text).width;
 }
 function maximumColumns(group,items,width){
  var need=64,threeLineNeed=0,books=group.classList.contains('ebook-chips')&&window.innerWidth<=600;
  var rem=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
  items.forEach(function(item){
   var css=getComputedStyle(item),text=String(item.innerText||item.textContent||'').replace(/\s+/g,' ').trim();
   var size=.8*rem,font=(css.fontWeight||'500')+' '+size+'px '+css.fontFamily;
   var icon=!books&&item.querySelector('svg,.icon,[data-lucide]')?24:0;
   var natural=textWidth(text,font);
   if(books){var copy=item.cloneNode(true);copy.querySelectorAll('[aria-hidden="true"],svg').forEach(function(n){n.remove();});text=copy.textContent.replace(/\s+/g,' ').trim();natural=textWidth(text,font);}
   need=Math.max(need,natural/2+icon+22);
   threeLineNeed=Math.max(threeLineNeed,natural/3+icon+22);
   if(books&&!/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text)){var word=Math.max.apply(null,text.split(/\s+/).map(function(w){return textWidth(w,font);}));need=Math.max(need,Math.min(word+14,width));threeLineNeed=Math.max(threeLineNeed,Math.min(word+14,width));}
  });
  var columns=Math.max(1,Math.min(6,Math.floor((width+8)/(need+8))));
  // Three readable lines can be denser than three separate full-width rows.
  if(width>=240&&items.length>=3&&threeLineNeed<=(width-16)/3)columns=Math.max(3,columns);
  return books?Math.min(3,columns):columns;
 }
 function apply(group,state,columns){
  var counts=balanced(state.items.length,columns),at=0;
  set(group,'data-ma-density','balanced');set(group,'data-ma-density-rows',counts.join(','));
  counts.forEach(function(count){for(var i=0;i<count;i++){var item=state.items[at++];set(item,'data-ma-density-item','');set(item,'data-ma-density-span',String(60/count));}});
  state.notes.forEach(function(note){set(note,'data-ma-density-note','');});
  state.columns=columns;state.counts=counts;
 }
 function lineCount(item){
  if(item.scrollWidth>item.clientWidth+1)return 3;
  var tops=[],walker=document.createTreeWalker(item,NodeFilter.SHOW_TEXT),node;
  while((node=walker.nextNode())){
   if(!node.textContent.trim()||node.parentElement.closest('svg,[aria-hidden="true"],[hidden]'))continue;
   var range=document.createRange();range.selectNodeContents(node);
   Array.from(range.getClientRects()).forEach(function(rect){if(rect.width>0&&rect.height>0&&!tops.some(function(top){return Math.abs(top-rect.top)<2;}))tops.push(rect.top);});
   if(tops.length>3)return tops.length;
  }
  return tops.length;
 }
 function foldBooks(){
  if(!/^\/ebooks(?:\/|$)/.test(location.pathname))return;
  document.querySelectorAll('#ebook-matcher-root .ebook-fields').forEach(function(fields){
   var all=Array.from(fields.querySelectorAll('fieldset.ebook-field'));
   if(all.length<3)return;
   set(fields,'data-ma-density-fields','');
   all.forEach(function(field,index){
    if(index<1)return;
    var first=field.querySelector('[data-ebook-field]'),key=first&&first.dataset.ebookField,legend=field.querySelector('legend');
    if(!key||!legend)return;
    var fold=field.parentElement;
    if(!fold.classList.contains('ma-density-field-fold')){
     fold=document.createElement('details');fold.className='ma-density-field-fold';fold.dataset.maDensityField=key;
     var summary=document.createElement('summary'),title=document.createElement('span'),value=document.createElement('span');
     title.className='ma-density-field-title';value.className='ma-density-field-value';summary.append(title,value);fold.appendChild(summary);
     field.before(fold);fold.appendChild(field);legend.classList.add('ma-density-field-legend');
     fold.open=bookOpen[key]===true;
     fold.addEventListener('toggle',function(){bookOpen[key]=fold.open;schedule();});
    }
    set(fold,'data-ma-density-field-index',String(index-1));
    var title=fold.querySelector('.ma-density-field-title'),value=fold.querySelector('.ma-density-field-value');
    if(title.textContent!==legend.textContent)title.textContent=legend.textContent;
    var selected=field.querySelector('[data-ebook-field].is-on,[data-ebook-field][aria-pressed="true"]'),label='';
    if(selected){var copy=selected.cloneNode(true);copy.querySelectorAll('[aria-hidden="true"],svg').forEach(function(node){node.remove();});label=copy.textContent.replace(/\s+/g,' ').trim();}
    if(value.textContent!==label)value.textContent=label;
   });
   var sequence=[];
   function sizeClosed(){var counts=balanced(sequence.length,3),at=0;counts.forEach(function(count){for(var i=0;i<count;i++)set(sequence[at++],'data-ma-density-field-span',String(6/count));});sequence=[];}
   Array.from(fields.children).forEach(function(node){if(!node.classList.contains('ma-density-field-fold'))return;if(node.open){sizeClosed();set(node,'data-ma-density-field-span','6');}else sequence.push(node);});
   sizeClosed();
  });
 }
 function flush(){
  pending=0;if(document.hidden){dirty=true;return;}dirty=false;if(!enabled()){Array.from(states.keys()).forEach(clear);return;}
  foldBooks();
  var candidates=new Set(Array.from(document.querySelectorAll(KNOWN)));
  var controls=document.querySelectorAll(CONTROL);
  for(var i=0;i<controls.length&&i<1800;i++){var parent=controls[i].parentElement;if(parent&&!parent.closest(EXCLUDED))candidates.add(parent);}
  // Read every candidate before writing grid attributes. Interleaving these
  // phases forced a fresh layout for each following group on every refresh.
  var accepted=new Set(),plans=[],count=0;
  candidates.forEach(function(group){
   if(count>=160)return;
   var found=eligible(group);if(!found)return;
   var css=getComputedStyle(group),width=group.getBoundingClientRect().width-parseFloat(css.paddingLeft||0)-parseFloat(css.paddingRight||0)-parseFloat(css.borderLeftWidth||0)-parseFloat(css.borderRightWidth||0);
   if(width<44)return;
   var previous=states.get(group);
   plans.push({group:group,found:found,previous:previous,width:width,columns:maximumColumns(group,found.items,width)});
   accepted.add(group);count++;
  });
  plans.forEach(function(plan){
   var group=plan.group,found=plan.found,previous=plan.previous,width=plan.width;
   if(previous){previous.items.filter(function(item){return found.items.indexOf(item)===-1;}).forEach(function(item){item.removeAttribute('data-ma-density-item');item.removeAttribute('data-ma-density-span');});previous.notes.filter(function(note){return found.notes.indexOf(note)===-1;}).forEach(function(note){note.removeAttribute('data-ma-density-note');});}
   var state={items:found.items,notes:found.notes,width:width,observedWidth:previous?previous.observedWidth:width};
   states.set(group,state);apply(group,state,plan.columns);
   if(resize&&!previous)resize.observe(group);
  });
  Array.from(states.keys()).forEach(function(group){if(!accepted.has(group))clear(group);});
  // Two bounded refinement passes account for the browser's actual shaping
  // and icon widths. Extra-long text remains visible rather than clipped.
  for(var pass=0;pass<2;pass++){
   var refine=[];
   states.forEach(function(state,group){if(state.columns>1&&state.items.some(function(item){return lineCount(item)>3;}))refine.push([group,state]);});
   refine.forEach(function(entry){apply(entry[0],entry[1],entry[1].columns-1);});
  }
 }
 function schedule(){if(document.hidden){dirty=true;return;}if(!pending)pending=setTimeout(flush,60);}
 function visibilitySignature(value){
  var parts=[],re=/(?:^|;)\s*(display|visibility|content-visibility)\s*:\s*([^;]*)/gi,match;
  while((match=re.exec(value||'')))parts.push(match[1].toLowerCase()+':'+match[2].trim().toLowerCase());
  return parts.sort().join(';');
 }
 function start(){
  if(!enabled())return;
  if(window.ResizeObserver){resize=new ResizeObserver(function(entries){var changed=false;entries.forEach(function(entry){var state=states.get(entry.target);if(state&&Math.abs(entry.contentRect.width-state.observedWidth)>1){state.observedWidth=entry.contentRect.width;changed=true;}});if(changed)schedule();});}
  observer=new MutationObserver(function(records){
   if(records.some(function(record){
    if(record.target.nodeType===1&&record.target.closest(EXCLUDED))return false;
    if(record.type==='attributes'){
     // Repeated owners may write an unchanged class/style; it cannot alter layout.
     if(record.oldValue===record.target.getAttribute(record.attributeName))return false;
     if(record.attributeName==='style'&&record.target!==document.documentElement)return visibilitySignature(record.oldValue)!==visibilitySignature(record.target.getAttribute('style'));
     return true;
    }
    if(record.target.nodeType===1&&record.target.closest('[data-ma-density="balanced"]'))return true;
    return Array.from(record.addedNodes).some(function(node){return node.nodeType===1&&(node.matches(CONTROL+','+KNOWN)||node.querySelector(CONTROL));});
   }))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','hidden','aria-hidden','open']});
  observer.observe(document.documentElement,{attributes:true,attributeOldValue:true,attributeFilter:['class','style','lang','dir']});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&dirty)schedule();});
  document.addEventListener('matchapp:langchange',schedule);window.addEventListener('matchapp:languagechange',schedule);
  flush();
 }
 window.MatchReferenceDensity={refresh:schedule,balance:balanced,inspect:function(){return Array.from(states.entries()).map(function(entry){return {className:entry[0].className,id:entry[0].id,count:entry[1].items.length,rows:entry[1].counts.slice(),width:entry[1].width,overflow:entry[0].scrollWidth>entry[0].clientWidth+1};});}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Local review disclosures reuse each source node and source heading. */
(function(){
 'use strict';
 if(window.MatchReferenceSecondaryFolds)return;
 var AD='.adsbygoogle,.premium-ad-frame,[data-ad-slot],[data-ad-client],[data-admob],[data-sponsored]';
 function refresh(){
  if(!document.documentElement.classList.contains('ma-reference')||!document.body)return;
  if(document.body.classList.contains('news-ui-page')){
   var guide=document.querySelector('main > section[aria-labelledby="news-guide-title"]');
   if(guide&&!guide.querySelector(':scope > details.ma-density-news-guide')&&!guide.querySelector(AD)){
    var heading=guide.querySelector(':scope > h2#news-guide-title');
    if(heading){
     var nodes=Array.from(guide.childNodes),details=document.createElement('details'),summary=document.createElement('summary'),content=document.createElement('div');
     details.className='ma-density-news-guide';content.className='ma-density-news-guide-content';
     summary.appendChild(heading);details.appendChild(summary);
     nodes.forEach(function(node){if(node!==heading)content.appendChild(node);});
     details.appendChild(content);guide.appendChild(details);
    }
   }
  }
  if(document.body.classList.contains('page-music')){
   var section=document.getElementById('swifties-spotify');if(!section)return;
   if(!section.querySelector('#swifties-spotify-title')){
    var title=document.createElement('h2');title.id='swifties-spotify-title';title.textContent='Taylor Swift';section.prepend(title);
   }
   section.querySelectorAll('.swifties-player-block').forEach(function(block){
    if(block.querySelector(':scope > details.ma-density-player-fold')||block.querySelector(AD))return;
    var heading=block.querySelector(':scope > h3'),frame=block.querySelector(':scope > iframe');
    if(!heading||!frame)return;
    var details=document.createElement('details'),summary=document.createElement('summary');
    details.className='ma-density-player-fold';summary.appendChild(heading);details.appendChild(summary);details.appendChild(frame);block.appendChild(details);
   });
  }
 }
 window.MatchReferenceSecondaryFolds={refresh:refresh};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
 document.addEventListener('matchapp:music-rendered',refresh);
 document.addEventListener('matchapp:langchange',refresh);
})();
