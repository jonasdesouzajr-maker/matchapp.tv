/* Reading presentation copy only. The shared i18n engine owns language selection. */
(function(root){
 'use strict';
 if(root.MatchAppBooksLocale)return;
 const languages=Object.freeze(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
 const dictionaries=Object.fromEntries(languages.map(code=>[code,Object.create(null)]));
 const bindings=new Set(),known=new WeakMap();let revision=0,reverseRevision=-1,reverse=null;
 function normalize(value){const raw=String(value||'').trim().replace(/_/g,'-').toLowerCase();if(raw==='pt'||raw.startsWith('pt-'))return'pt-BR';const base=raw.split('-')[0];return languages.includes(base)?base:'';}
 function lang(){let saved='';try{saved=root.localStorage?.getItem('match_lang')||'';}catch(_){}return normalize(saved)||normalize(root.MATCH_LANG)||normalize(root.document?.documentElement?.lang)||normalize(root.navigator?.language)||'en';}
 function get(key,locale){return dictionaries[normalize(locale)||lang()]?.[key];}
 function t(key,params){const text=get(key);return String(text===undefined?key:text).replace(/\{([\w]+)\}/g,(all,name)=>params&&params[name]!==undefined?String(params[name]):all);}
 function register(bundle){for(const code of languages){if(!bundle?.[code])continue;for(const[key,text]of Object.entries(bundle[code]))if(typeof text==='string')dictionaries[code][key]=text;}revision++;}
 function write(binding){const target=binding.node;if(!target)return;const text=binding.render?String(binding.render()):t(binding.key,typeof binding.params==='function'?binding.params():binding.params);if(binding.attr==='text'){if(target.nodeType===3){if(target.nodeValue!==text)target.nodeValue=text;}else if(target.textContent!==text){if(target.childNodes.length===1&&target.firstChild.nodeType===3)target.firstChild.nodeValue=text;else target.textContent=text;}}else if(target.getAttribute(binding.attr)!==text)target.setAttribute(binding.attr,text);}
 function bind(node,key,params,attr='text'){if(!node)return node;let byAttribute=known.get(node);if(!byAttribute){byAttribute=new Map();known.set(node,byAttribute);}let binding=byAttribute.get(attr);if(!binding){binding={node,key,params,attr};byAttribute.set(attr,binding);bindings.add(binding);}else{binding.key=key;binding.params=params;binding.render=undefined;binding.prefix=undefined;binding.generic=false;}write(binding);return node;}
 function bindValue(node,render,attr='text'){if(!node)return node;let byAttribute=known.get(node);if(!byAttribute){byAttribute=new Map();known.set(node,byAttribute);}let binding=byAttribute.get(attr);if(!binding){binding={node,render,attr};byAttribute.set(attr,binding);bindings.add(binding);}else{binding.render=render;binding.prefix=undefined;binding.generic=false;}write(binding);return node;}
 function reverseCopy(){if(reverseRevision===revision)return reverse;reverse=new Map();for(const code of languages)for(const[key,value]of Object.entries(dictionaries[code]))if(value&&!/\{\w+\}/.test(value)&&!reverse.has(value.trim()))reverse.set(value.trim(),key);reverseRevision=revision;return reverse;}
 function protectedChrome(node){return !!node?.closest?.('#ma-reference-header,.ma-brand-lockup,.matchapp-brand-link,.ma-brand-home-link,.ma-reference-header-brand,.ebook-text-wordmark,[class^="ebook-brand-"],[class*=" ebook-brand-"]');}
 function identity(node){return !!node.closest?.('[data-book-source-content],[data-book-identity],[data-ebook-note],.ebook-cover-fallback,.ebook-top-author,.ebook-author,.reading-ai-description,.ebook-result-copy>h3[data-book-identity],.ebook-top-copy>h3,.ebook-saved-item h4');}
 function discoverText(node){
  if(!node.nodeValue?.trim()||!node.parentElement||node.parentElement.closest('script,style,noscript,svg,option,[data-book-copy]')||identity(node.parentElement)||protectedChrome(node.parentElement))return;
  // An explicit owner may contain variable source names, dates or genre
  // lists. Its renderer is authoritative; never bind that rendered text again.
  for(let owner=node.parentElement;owner;owner=owner.parentElement)if(known.get(owner)?.has('text'))return;
  if(known.get(node)?.has('text'))return;
  const raw=node.nodeValue,trimmed=raw.trim(),index=reverseCopy();let key=index.get(trimmed),prefix='',suffix='';
  if(!key){const clean=trimmed.replace(/^[\s☆★×↻📚🎧📰✦]+/u,'').replace(/[\s↗]+$/u,'');key=index.get(clean);if(key){const start=raw.indexOf(clean);prefix=raw.slice(0,start);suffix=raw.slice(start+clean.length);}}
  if(!key)return;
  // Preserve text-node identity, including icons and spacing outside its label.
  if(prefix||suffix){const binding={node,key,params:null,attr:'text',prefix,suffix,generic:true};const old=known.get(node)||new Map();old.set('text',binding);known.set(node,old);bindings.add(binding);const text=prefix+t(key)+suffix;if(node.nodeValue!==text)node.nodeValue=text;}
  else{bind(node,key);known.get(node).get('text').generic=true;}
 }
 function paint(scope){
  const document=root.document;if(!document)return;scope=scope||document;
  for(const binding of Array.from(bindings)){if(binding.generic&&protectedChrome(binding.node.parentElement)){bindings.delete(binding);known.get(binding.node)?.delete(binding.attr);continue;}if(!binding.node.isConnected){bindings.delete(binding);continue;}if(scope!==document&&binding.node!==scope&&!scope.contains(binding.node))continue;if(binding.prefix!==undefined){const text=binding.prefix+t(binding.key,binding.params)+binding.suffix;if(binding.node.nodeValue!==text)binding.node.nodeValue=text;}else write(binding);}
  const annotated=[];if(scope.matches?.('[data-book-copy],[data-book-aria],[data-book-title],[data-book-placeholder]'))annotated.push(scope);annotated.push(...scope.querySelectorAll('[data-book-copy],[data-book-aria],[data-book-title],[data-book-placeholder]'));
  for(const node of annotated){let params={};try{params=JSON.parse(node.getAttribute('data-book-vars')||'{}');}catch(_){}for(const[data,attr]of[['data-book-copy','text'],['data-book-aria','aria-label'],['data-book-title','title'],['data-book-placeholder','placeholder']]){const key=node.getAttribute(data);if(key)bind(node,key,params,attr);}}
  const hosts=scope===document?document.querySelectorAll('.ebook-page,.ebook-matcher-root,.reading-ai-sources'): [scope];
  for(const host of hosts){if(!host)continue;const walker=document.createTreeWalker(host,root.NodeFilter?.SHOW_TEXT||4);let node;while(node=walker.nextNode())discoverText(node);}
 }
 function choice(field,value){return t('field.'+field+'.'+value);}
 const aliases={'clássico':'classics','classico':'classics','classic':'classics','classics':'classics','sci-fi':'science-fiction','science fiction':'science-fiction','literary fiction':'literary','literary':'literary','ficção histórica':'historical','historical fiction':'historical','psychological':'psychology','psicológico':'psychology','romance':'romance','suspense':'thriller','épico':'epic'};
 function genreToken(value){const raw=String(value||'').trim(),key=aliases[raw.toLowerCase()]||raw.toLowerCase();if(get('field.genre.'+key)!==undefined)return t('field.genre.'+key);if(get('hub.genre.'+key)!==undefined)return t('hub.genre.'+key);if(get('field.mood.'+key)!==undefined)return t('field.mood.'+key);return raw;}
 const api={languages,lang,get,t,register,bind,bindValue,paint,choice,genreToken};root.MatchAppBooksLocale=Object.freeze(api);
 root.document?.addEventListener('matchapp:langchange',()=>paint());
 root.addEventListener?.('storage',event=>{if(event.key==='match_lang'||event.key===null)paint();});
 if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>paint(),{once:true});else paint();
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
