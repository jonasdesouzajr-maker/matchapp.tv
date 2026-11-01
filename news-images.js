/* Shared news artwork presentation. Source images stay source images; missing
   artwork uses an original, explicitly labelled topic illustration. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(!root.MatchAppNewsImages){root.MatchAppNewsImages=api;api.init(root);}
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const LABELS={en:'Illustration','pt-BR':'Ilustração',es:'Ilustración',fr:'Illustration',de:'Illustration',it:'Illustrazione',tr:'İllüstrasyon',ru:'Иллюстрация',ar:'رسم توضيحي',hi:'चित्रण',id:'Ilustrasi',ja:'イラスト',ko:'삽화',zh:'插图'};
  const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bound=new WeakSet(),started=new WeakSet();
  function language(value){const base=String(value||'en').toLowerCase().split(/[-_]/)[0];return base==='pt'?'pt-BR':Object.hasOwn(LABELS,base)?base:'en';}
  function label(value){return LABELS[language(value)];}
  function topic(item={}){
    if(item.category==='sports')return 'sports';
    if(item.category==='world')return 'world';
    if(String(item.event_type||'').toLowerCase()==='music')return 'music';
    return item.category==='entertainment'?'entertainment':'news';
  }
  function fallback(item){return '/assets/news/topics/'+topic(item)+'.svg';}
  function source(item={}){
    const media=item.media&&typeof item.media==='object'?item.media:{};
    for(const candidate of [item.image,item.image_url,item.imageUrl,item.thumbnail,item.thumbnail_url,item.thumbnailUrl,item.cover,item.cover_url,item.coverUrl,item.poster,item.poster_url,item.posterUrl,media.image,media.image_url,media.thumbnail,media.thumbnail_url]){
      try{const u=new URL(candidate);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch(_){}
    }
    return null;
  }
  function markup(item={},lang='en'){
    const original=source(item),replacement=fallback(item),text=label(lang);
    return '<figure class="ma-news-media" data-news-media data-news-image-kind="'+(original?'source':'illustration')+'"><img src="'+esc(original||replacement)+'" data-news-image-fallback="'+replacement+'" width="640" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="'+esc(original?'':text)+'"><figcaption data-news-illustration-label'+(original?' hidden':'')+'>'+esc(text)+'</figcaption></figure>';
  }
  function selected(win){let saved='';try{saved=win.localStorage.getItem('match_lang')||'';}catch(_){}return language(win.MATCH_LANG||saved||win.document.documentElement.lang);}
  function protect(img,win){
    if(bound.has(img))return;bound.add(img);
    const figure=img.closest('[data-news-media]');
    const value=img.getAttribute('data-news-image-fallback');
    if(!figure||!/^\/assets\/news\/topics\/(?:entertainment|world|sports|music|news)\.svg$/.test(value||''))return;
    const caption=figure.querySelector('[data-news-illustration-label]');
    function illustrate(){
      figure.dataset.newsImageKind='illustration';
      img.removeAttribute('srcset');img.classList.remove('ma-news-source-logo');
      img.alt=label(selected(win));
      if(caption){caption.hidden=false;caption.textContent=label(selected(win));}
      if(img.getAttribute('src')!==value)img.setAttribute('src',value);
    }
    img.addEventListener('error',illustrate);
    if(figure.dataset.newsImageKind==='illustration'||!img.getAttribute('src')||(img.complete&&img.naturalWidth===0))illustrate();
  }
  function scan(win,scope=win.document){scope.querySelectorAll?.('img[data-news-image-fallback]').forEach(img=>protect(img,win));}
  function paint(win){
    win.document.querySelectorAll('[data-news-illustration-label]').forEach(node=>{node.textContent=label(selected(win));});
    win.document.querySelectorAll('[data-news-image-kind="illustration"] img').forEach(img=>{img.alt=label(selected(win));});
  }
  function create(win,item){
    const host=win.document.createElement('div');host.innerHTML=markup(item,selected(win));
    const figure=host.firstElementChild;scan(win,figure);return figure;
  }
  function init(win){
    if(!win?.document||started.has(win.document)||/^\/(?:kids|private-voice|oauth)(?:\/|$)/.test(win.location.pathname))return;
    started.add(win.document);
    if(!win.document.querySelector('link[data-news-image-styles]')){const sheet=win.document.createElement('link');sheet.rel='stylesheet';sheet.href='/news-images.css?v=20261101-1';sheet.dataset.newsImageStyles='1';(win.document.head||win.document.documentElement).appendChild(sheet);}
    const boot=()=>{scan(win);paint(win);};
    if(win.document.readyState==='loading')win.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
    win.document.addEventListener('matchapp:news-rendered',event=>scan(win,event.detail?.section||win.document));
    win.document.addEventListener('matchapp:langchange',()=>paint(win));
    win.addEventListener('storage',event=>{if(event.key==='match_lang')paint(win);});
  }
  return Object.freeze({language,label,topic,fallback,source,markup,create,scan,init});
});
