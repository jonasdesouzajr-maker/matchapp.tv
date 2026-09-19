(function(){
  'use strict';

  const LANGS = new Set(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
  const INSTALL_HINTS = {
    en:{download:'download app',update:'install update',installed:'app installed'},
    'pt-BR':{download:'baixar app',update:'instalar atualização',installed:'app instalado'},
    es:{download:'descargar app',update:'instalar actualización',installed:'app instalada'},
    fr:{download:'télécharger app',update:'installer la mise à jour',installed:'app installée'},
    de:{download:'app laden',update:'update installieren',installed:'app installiert'},
    it:{download:'scarica app',update:'installa aggiornamento',installed:'app installata'},
    tr:{download:'uygulamayı indir',update:'güncellemeyi yükle',installed:'uygulama yüklü'},
    ru:{download:'скачать приложение',update:'установить обновление',installed:'приложение установлено'},
    ar:{download:'تنزيل التطبيق',update:'تثبيت التحديث',installed:'التطبيق مثبت'},
    hi:{download:'ऐप डाउनलोड करें',update:'अपडेट इंस्टॉल करें',installed:'ऐप इंस्टॉल है'},
    id:{download:'unduh aplikasi',update:'pasang pembaruan',installed:'aplikasi terpasang'},
    ja:{download:'アプリを入手',update:'更新をインストール',installed:'インストール済み'},
    ko:{download:'앱 다운로드',update:'업데이트 설치',installed:'앱 설치됨'},
    zh:{download:'下载应用',update:'安装更新',installed:'应用已安装'}
  };

  const MALE_NAME_HINTS = {
    en:['male','david','mark','guy','george','ryan','james','daniel','alex','arthur','brian','liam','oliver','thomas','christopher','andrew','roger','aaron','eric','fred','ralph','reed'],
    'pt-BR':['male','mascul','antonio','antônio','felipe','thiago','ricardo','daniel','paulo','joao','joão','fabio','fábio','carlos'],
    es:['male','mascul','alvaro','álvaro','jorge','pablo','diego','carlos','miguel','antonio','sergio','raul','raúl'],
    fr:['male','mascul','thomas','nicolas','henri','mathieu','paul','antoine','jacques'],
    de:['male','männ','stefan','conrad','markus','hans','klaus','daniel'],
    it:['male','masch','diego','marco','luca','giorgio','riccardo','cosimo'],
    tr:['male','erkek','ahmet','mehmet','murat','emre'],
    ru:['male','муж','maxim','maksim','максим','alexander','александр','mikhail','михаил'],
    ar:['male','ذكر','majed','tariq','omar','ahmed','maged'],
    hi:['male','पुरुष','hemant','madhur','raj','ravi','amit'],
    id:['male','pria','ardi','dimas','bayu','agus'],
    ja:['male','男性','otoya','ichiro','takumi','daichi'],
    ko:['male','남성','injoon','minsu','hyunwoo'],
    zh:['male','男','yunxi','yunyang','kangkang','xiaoming']
  };
  const FEMALE_HINTS = ['female','femin','mulher','mujer','femme','weiblich','donna','жен','امرأة','महिला','wanita','女性','여성','女'];
  const NATURAL_HINTS = ['natural','neural','enhanced','premium','online','google','microsoft','siri'];

  function localeBase(lang){ return String(lang||'en').toLowerCase().split('-')[0]; }
  function maleTokens(lang){ return MALE_NAME_HINTS[lang] || MALE_NAME_HINTS[localeBase(lang)] || MALE_NAME_HINTS.en; }
  function voiceScore(v, lang){
    const name = `${v.name||''} ${v.voiceURI||''}`.toLowerCase();
    const vlang = String(v.lang||'').toLowerCase();
    const requested = String(lang||'en').toLowerCase();
    const base = localeBase(requested);
    let score = 0;
    if(vlang === requested) score += 70;
    else if(vlang.startsWith(base)) score += 55;
    else return -1000;
    if(maleTokens(lang).some(x=>name.includes(String(x).toLowerCase()))) score += 45;
    if(FEMALE_HINTS.some(x=>name.includes(x))) score -= 60;
    if(NATURAL_HINTS.some(x=>name.includes(x))) score += 15;
    if(v.default) score += 4;
    if(v.localService) score += 2;
    return score;
  }

  function patchVoiceResolver(){
    const S = window.MatchSettings;
    if(!S || S.__humanMaleVoicePatch) return;
    const previous = typeof S.resolveVoice === 'function' ? S.resolveVoice.bind(S) : null;
    S.resolveVoice = function(voices, lang){
      if(!Array.isArray(voices) || !voices.length) return null;
      const savedURI = S.get?.('voiceURI');
      if(savedURI){
        const saved = voices.find(v=>v.voiceURI===savedURI);
        if(saved) return saved;
      }
      const ranked = voices.map(v=>({v,score:voiceScore(v,lang)})).filter(x=>x.score>-900).sort((a,b)=>b.score-a.score);
      if(ranked.length) return ranked[0].v;
      return previous ? previous(voices,lang) : (voices.find(v=>v.default)||voices[0]);
    };
    S.__humanMaleVoicePatch = true;
  }

  function languageControl(el){
    if(!el || el.tagName!=='SELECT') return false;
    const id = `${el.id||''} ${el.name||''} ${el.className||''}`.toLowerCase();
    if(/lang|language|locale/.test(id)) return true;
    return Array.from(el.options||[]).filter(o=>LANGS.has(o.value)).length >= 5;
  }

  function applyLanguage(lang){
    if(!LANGS.has(lang)) return;
    try{ speechSynthesis.cancel(); }catch(_){}
    if(typeof window.setLanguage === 'function'){
      window.setLanguage(lang);
    }else{
      window.MATCH_LANG = lang;
      document.documentElement.lang = lang;
      document.documentElement.dir = lang==='ar'?'rtl':'ltr';
      try{ localStorage.setItem('match_lang',lang); }catch(_){}
      document.dispatchEvent(new CustomEvent('matchapp:langchange',{detail:{lang}}));
    }
    setTimeout(()=>{
      document.querySelectorAll('select').forEach(sel=>{
        if(languageControl(sel) && Array.from(sel.options||[]).some(o=>o.value===lang)) sel.value=lang;
      });
      syncInstallHints();
    },0);
  }

  document.addEventListener('change',e=>{
    const el = e.target;
    if(languageControl(el) && LANGS.has(el.value)) applyLanguage(el.value);
  },true);
  document.addEventListener('click',e=>{
    const b = e.target.closest?.('[data-lang],[data-language]');
    if(!b) return;
    const lang = b.dataset.lang || b.dataset.language;
    if(LANGS.has(lang)) applyLanguage(lang);
  },true);

  function matchPurchaseUrl(){ return '/pricing/pricing.html?from=quota#match-packs-section'; }
  function isQuotaBadge(target){ return !!target?.closest?.('#quota-badge'); }
  document.addEventListener('click',e=>{
    if(!isQuotaBadge(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.href = matchPurchaseUrl();
  },true);
  document.addEventListener('keydown',e=>{
    if((e.key!=='Enter'&&e.key!==' ') || !isQuotaBadge(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.href = matchPurchaseUrl();
  },true);

  function scrollToMatchPacks(){
    if(location.hash!=='#match-packs-section' && new URLSearchParams(location.search).get('from')!=='quota') return;
    let attempts=0;
    const find=()=>{
      const target = document.getElementById('match-packs-section');
      if(target){
        target.setAttribute('tabindex','-1');
        target.scrollIntoView({behavior:'smooth',block:'start'});
        setTimeout(()=>target.focus({preventScroll:true}),500);
        return;
      }
      if(++attempts<30) setTimeout(find,100);
    };
    find();
  }

  function hintStrings(){
    const lang = window.MATCH_LANG || document.documentElement.lang || 'en';
    return INSTALL_HINTS[lang] || INSTALL_HINTS[localeBase(lang)] || INSTALL_HINTS.en;
  }
  function syncInstallHints(){
    document.querySelectorAll('.install-btn').forEach(btn=>{
      btn.removeAttribute('data-app-hint');
      if(!btn.classList.contains('install-prominent-v2')) btn.classList.add('install-prominent-v2');
    });
    const bubble = document.getElementById('install-bubble');
    if(bubble){
      if(!bubble.classList.contains('install-bubble-v2')) bubble.classList.add('install-bubble-v2');
      const words = hintStrings();
      const text = bubble.querySelector('.install-bubble-text');
      if(text && text.textContent!==words.download) text.textContent = words.download;
    }
  }

  function upgradeWordmarks(root=document){
    root.querySelectorAll?.('.app-title-main').forEach(host=>{
      const image = host.querySelector('.matchapp-wordmark');
      if(!image || host.querySelector('.matchapp-live-wordmark')) return;
      image.setAttribute('aria-hidden','true');
      image.classList.add('matchapp-wordmark-source');
      const live = document.createElement('span');
      live.className = 'matchapp-live-wordmark';
      live.setAttribute('aria-label','MatchApp TV Ai');
      live.innerHTML = '<span class="ma-core">MatchApp</span><span class="ma-tv">TV</span><span class="ma-ai">Ai</span><span class="ma-ai-spark" aria-hidden="true">✦</span>';
      host.appendChild(live);
    });
  }

  function normalizeLogoImages(root=document){
    root.querySelectorAll?.('img.brand-logo,img[src$="/logo.jpeg"],img[src*="/logo.jpeg?"],.matchapp-brand-link>img').forEach(img=>{
      if(img.classList.contains('matchapp-wordmark')) return;
      if(/matchapp-tv-ai-v2\.svg/i.test(img.getAttribute('src')||'')) return;
      img.classList.add('matchapp-circle-logo');
    });
  }

  const canonicalHomeShell=location.pathname==='/'||location.pathname==='/index.html';

  function organizeHeaders(root=document){
    root.querySelectorAll?.('.app-header').forEach(header=>{
      if(canonicalHomeShell && header.id==='mh-topbox'){
        header.classList.remove('app-header-v2');
        header.querySelectorAll('.header-controls-v2').forEach(el=>el.classList.remove('header-controls-v2'));
        return;
      }
      header.classList.add('app-header-v2');
      const nav = header.querySelector('nav,#header-auth-area');
      if(nav) nav.classList.add('header-controls-v2');
    });
  }

  function init(){
    patchVoiceResolver();
    upgradeWordmarks();
    normalizeLogoImages();
    organizeHeaders();
    syncInstallHints();
    scrollToMatchPacks();

    let pendingStructure=false, pendingInstall=false, observerQueued=false;
    const flushObservedChanges=()=>{
      observerQueued=false;
      const structure=pendingStructure, install=pendingInstall;
      pendingStructure=false;pendingInstall=false;
      if(structure){ upgradeWordmarks(); normalizeLogoImages(); organizeHeaders(); }
      if(structure||install) syncInstallHints();
    };
    const header = document.querySelector('.app-header');
    if(header && window.MutationObserver){
      const observer = new MutationObserver(mutations=>{
        for(const m of mutations){
          if(m.type==='childList' && Array.from(m.addedNodes||[]).some(n=>n.nodeType===1)) pendingStructure=true;
          if(m.type==='attributes' && m.target.classList?.contains('install-btn')) pendingInstall=true;
        }
        if((pendingStructure||pendingInstall)&&!observerQueued){
          observerQueued=true;
          setTimeout(flushObservedChanges,0);
        }
      });
      observer.observe(header,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    }
  }

  document.addEventListener('matchapp:langchange',()=>{ patchVoiceResolver(); syncInstallHints(); });
  window.addEventListener('matchapp:installstate',syncInstallHints);
  window.addEventListener('beforeinstallprompt',()=>setTimeout(syncInstallHints,0));
  window.addEventListener('appinstalled',()=>setTimeout(syncInstallHints,0));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
