/* MatchApp settings — stable production loader */
(function(){try{var h=location.hostname;if(h==='matchapp.cc'||h==='www.matchapp.cc')location.replace('https://matchapp.tv'+location.pathname+location.search+location.hash);}catch(e){}})();
(function(){'use strict';
/* Stable handset marker: standalone/PWA/WebView modes can expose a desktop-like
   layout viewport, so responsive content must not rely on width alone. */
try{
  const ua=navigator.userAgent||'';
  const handset=/Android.*Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(ua);
  if(handset)document.documentElement.classList.add('matchapp-handset');
}catch(_){}
const KEY='match_settings',LEGACY_AUTOREAD_KEY='match_voice_autoread',KIDS_MODE_KEY='match_kids_mode';
const DEFAULTS={fontScale:1,voiceURI:'',voiceRate:.96,voicePitch:1,autoRead:true,reduceMotion:false,lazyDefault:false,compactCards:false,theme:'aurora',blockedOriginCountries:[],blockedGenres:[]};let settings={...DEFAULTS},syncTimer=null;
function syncLegacyAutoRead(){try{localStorage.setItem(LEGACY_AUTOREAD_KEY,settings.autoRead===false?'false':'true')}catch(_){}}
function load(){try{const raw=localStorage.getItem(KEY);if(raw)settings={...DEFAULTS,...JSON.parse(raw)};if(!raw){const legacy=localStorage.getItem(LEGACY_AUTOREAD_KEY);if(legacy==='false')settings.autoRead=false;else if(legacy==='true')settings.autoRead=true}}catch(_){settings={...DEFAULTS}}syncLegacyAutoRead()}
function persistLocal(){try{localStorage.setItem(KEY,JSON.stringify(settings))}catch(_){}syncLegacyAutoRead()}
function persistRemote(){clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{const sb=window.supabaseClient;if(!sb)return;try{const {data:{user}}=await sb.auth.getUser();if(user)await sb.auth.updateUser({data:{match_settings:settings}})}catch(_){ }},900)}
function applyAll(){document.documentElement.style.setProperty('--font-scale',settings.fontScale);document.documentElement.classList.toggle('reduce-motion',!!settings.reduceMotion);document.documentElement.classList.toggle('compact-cards',!!settings.compactCards)}
function loadRedesign(){if(location.pathname.startsWith('/kids/')||location.pathname==='/'||location.pathname==='/index.html'||document.querySelector('link[data-matchapp-redesign]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/redesign.css?v=193';l.dataset.matchappRedesign='true';document.head.appendChild(l)}
function kidsLabel(){const c=String(window.MATCH_LANG||localStorage.getItem('match_lang')||document.documentElement.lang||'en').toLowerCase();if(c.startsWith('pt'))return'Modo Kids';if(c.startsWith('es'))return'Modo Niños';if(c.startsWith('fr'))return'Mode Kids';if(c.startsWith('de'))return'Kids-Modus';if(c.startsWith('it'))return'Modalità Kids';if(c.startsWith('tr'))return'Çocuk Modu';if(c.startsWith('ru'))return'Детский режим';if(c.startsWith('ar'))return'وضع الأطفال';if(c.startsWith('ja'))return'キッズモード';if(c.startsWith('ko'))return'키즈 모드';if(c.startsWith('zh'))return'儿童模式';return'Kids Mode'}
function installKidsModeToggle(){if(location.pathname.startsWith('/kids/')||document.querySelector('.matchapp-kids-toggle'))return;const b=document.createElement('button');b.type='button';b.className='matchapp-kids-toggle';b.setAttribute('aria-label',kidsLabel());b.innerHTML='<i class="kids-toggle-emblem" aria-hidden="true"><img src="/kids/kids-logo.jpeg" alt=""></i><span></span><b class="kids-toggle-star" aria-hidden="true">✦</b>';b.querySelector('span').textContent=kidsLabel();b.addEventListener('click',()=>{try{localStorage.setItem(KIDS_MODE_KEY,'true')}catch(_){}location.href='/kids/'});document.body.appendChild(b)}
function resolveNaturalMaleVoice(voices,lang){if(!voices?.length)return null;if(settings.voiceURI){const v=voices.find(x=>x.voiceURI===settings.voiceURI);if(v)return v}const requested=String(lang||'en').toLowerCase(),base=requested.split('-')[0];const male=['male','mascul','männ','masch','erkek','муж','ذكر','पुरुष','pria','男性','남성','男','david','mark','guy','george','ryan','james','daniel','alex','arthur','brian','liam','antonio','antônio','felipe','jorge','pablo','diego','miguel','thomas','nicolas','stefan','marco','luca','ahmet','mehmet','maxim','максим','omar','ahmed','hemant','ardi','otoya','ichiro','injoon','yunxi','yunyang'];const female=['female','femin','mulher','mujer','femme','weiblich','donna','жен','مرأة','महिला','wanita','女性','여성','女'];const natural=['natural','neural','enhanced','premium','online','google','microsoft','siri'];const scored=voices.map(v=>{const vl=String(v.lang||'').toLowerCase(),name=`${v.name||''} ${v.voiceURI||''}`.toLowerCase();let s=vl===requested?70:vl.startsWith(base)?55:-1000;if(male.some(x=>name.includes(x)))s+=45;if(female.some(x=>name.includes(x)))s-=60;if(natural.some(x=>name.includes(x)))s+=15;if(v.default)s+=4;return{v,s}}).filter(x=>x.s>-900).sort((a,b)=>b.s-a.s);return scored[0]?.v||voices.find(v=>String(v.lang||'').toLowerCase().startsWith(base))||voices.find(v=>v.default)||voices[0]}
window.MatchSettings={get:k=>k?settings[k]:{...settings},set(k,v,opts){if(!(k in DEFAULTS))return;if(k==='theme'&&!['aurora','cinema','ocean','sunrise','arcade'].includes(v))return;if(k==='blockedOriginCountries'||k==='blockedGenres')v=[...new Set((Array.isArray(v)?v:[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,100);settings[k]=v;persistLocal();applyAll();if(!opts||opts.sync!==false)persistRemote();document.dispatchEvent(new CustomEvent('matchapp:settingschanged',{detail:{key:k,value:v}}))},reset(){settings={...DEFAULTS};persistLocal();applyAll();persistRemote();document.dispatchEvent(new CustomEvent('matchapp:settingschanged',{detail:{key:'*',value:null}}))},async hydrateFromAccount(){const sb=window.supabaseClient;if(!sb)return;try{const {data:{user}}=await sb.auth.getUser();const remote=user?.user_metadata?.match_settings;if(!remote)return;let local={};try{local=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){}settings={...DEFAULTS,...remote,...local};persistLocal();applyAll();document.dispatchEvent(new CustomEvent('matchapp:settingschanged',{detail:{key:'*',value:null}}))}catch(_){}},listVoices(){return new Promise(resolve=>{if(!('speechSynthesis'in window))return resolve([]);const got=speechSynthesis.getVoices();if(got.length)return resolve(got);let done=false;const finish=()=>{if(done)return;done=true;resolve(speechSynthesis.getVoices())};speechSynthesis.addEventListener('voiceschanged',finish,{once:true});setTimeout(finish,1200)})},resolveVoice:resolveNaturalMaleVoice,DEFAULTS};
const MATCHAPP_SETTINGS_PLAY_URL='https://play.google.com/store/apps/details?id=com.jonas.papercup';
const MATCHAPP_INSTALL_SETTINGS_COPY={
 en:{title:'Get the MatchApp Ai app',android:'For Android, use the official Google Play app instead of installing from the browser.',play:'Download now on Google Play',ios:'Add MatchApp Ai to your Home Screen for one-tap access.',home:'Add to Home Screen',mac:'Open MatchApp Ai like an app on your Mac.',dock:'Add to Dock / Apps'},
 'pt-BR':{title:'Tenha o app MatchApp Ai',android:'No Android, use o app oficial do Google Play em vez de instalar pelo navegador.',play:'Baixar agora no Google Play',ios:'Adicione o MatchApp Ai à Tela de Início para acessar com um toque.',home:'Adicionar à Tela de Início',mac:'Abra o MatchApp Ai como um app no seu Mac.',dock:'Adicionar ao Dock / Apps'},
 es:{title:'Obtén la app MatchApp Ai',android:'En Android, usa la app oficial de Google Play en lugar de instalar desde el navegador.',play:'Descargar ahora en Google Play',ios:'Añade MatchApp Ai a la pantalla de inicio para abrirlo con un toque.',home:'Añadir a la pantalla de inicio',mac:'Abre MatchApp Ai como una app en tu Mac.',dock:'Añadir al Dock / Apps'},
 fr:{title:'Obtenir l’app MatchApp Ai',android:'Sur Android, utilisez l’app officielle Google Play plutôt que l’installation du navigateur.',play:'Télécharger sur Google Play',ios:'Ajoutez MatchApp Ai à l’écran d’accueil pour un accès direct.',home:'Ajouter à l’écran d’accueil',mac:'Ouvrez MatchApp Ai comme une app sur votre Mac.',dock:'Ajouter au Dock / Apps'},
 de:{title:'MatchApp Ai App holen',android:'Nutze auf Android die offizielle Google-Play-App statt der Browser-Installation.',play:'Jetzt bei Google Play laden',ios:'Füge MatchApp Ai für direkten Zugriff zum Home-Bildschirm hinzu.',home:'Zum Home-Bildschirm',mac:'Öffne MatchApp Ai wie eine App auf deinem Mac.',dock:'Zum Dock / Apps hinzufügen'},
 it:{title:'Ottieni l’app MatchApp Ai',android:'Su Android usa l’app ufficiale di Google Play invece dell’installazione dal browser.',play:'Scarica ora da Google Play',ios:'Aggiungi MatchApp Ai alla schermata Home per l’accesso rapido.',home:'Aggiungi alla schermata Home',mac:'Apri MatchApp Ai come app sul Mac.',dock:'Aggiungi al Dock / App'},
 tr:{title:'MatchApp Ai uygulamasını al',android:'Android’de tarayıcı kurulumu yerine resmi Google Play uygulamasını kullanın.',play:'Google Play’den şimdi indir',ios:'Tek dokunuşla erişim için MatchApp Ai’yi Ana Ekrana ekleyin.',home:'Ana Ekrana ekle',mac:'MatchApp Ai’yi Mac’inizde uygulama gibi açın.',dock:'Dock / Uygulamalara ekle'},
 ru:{title:'Установить MatchApp Ai',android:'На Android используйте официальное приложение из Google Play вместо установки из браузера.',play:'Скачать в Google Play',ios:'Добавьте MatchApp Ai на экран «Домой» для быстрого доступа.',home:'Добавить на экран «Домой»',mac:'Открывайте MatchApp Ai как приложение на Mac.',dock:'Добавить в Dock / Приложения'},
 ar:{title:'احصل على تطبيق MatchApp Ai',android:'على Android استخدم التطبيق الرسمي من Google Play بدل التثبيت من المتصفح.',play:'نزّل الآن من Google Play',ios:'أضف MatchApp Ai إلى الشاشة الرئيسية للوصول بنقرة واحدة.',home:'إضافة إلى الشاشة الرئيسية',mac:'افتح MatchApp Ai كتطبيق على جهاز Mac.',dock:'إضافة إلى Dock / التطبيقات'},
 hi:{title:'MatchApp Ai ऐप पाएं',android:'Android पर ब्राउज़र इंस्टॉल की जगह आधिकारिक Google Play ऐप इस्तेमाल करें।',play:'Google Play से अभी डाउनलोड करें',ios:'एक टैप एक्सेस के लिए MatchApp Ai को होम स्क्रीन पर जोड़ें।',home:'होम स्क्रीन पर जोड़ें',mac:'Mac पर MatchApp Ai को ऐप की तरह खोलें।',dock:'Dock / Apps में जोड़ें'},
 id:{title:'Dapatkan aplikasi MatchApp Ai',android:'Di Android, gunakan aplikasi resmi Google Play alih-alih memasang dari browser.',play:'Unduh sekarang di Google Play',ios:'Tambahkan MatchApp Ai ke Layar Utama untuk akses sekali ketuk.',home:'Tambahkan ke Layar Utama',mac:'Buka MatchApp Ai seperti aplikasi di Mac.',dock:'Tambahkan ke Dock / App'},
 ja:{title:'MatchApp Ai アプリを入手',android:'Android ではブラウザ版のインストールではなく、公式 Google Play アプリをご利用ください。',play:'Google Play からダウンロード',ios:'MatchApp Ai をホーム画面に追加してワンタップで開けます。',home:'ホーム画面に追加',mac:'Mac で MatchApp Ai をアプリのように開けます。',dock:'Dock / アプリに追加'},
 ko:{title:'MatchApp Ai 앱 받기',android:'Android에서는 브라우저 설치 대신 공식 Google Play 앱을 사용하세요.',play:'Google Play에서 지금 다운로드',ios:'MatchApp Ai를 홈 화면에 추가해 한 번에 여세요.',home:'홈 화면에 추가',mac:'Mac에서 MatchApp Ai를 앱처럼 여세요.',dock:'Dock / 앱에 추가'},
 zh:{title:'获取 MatchApp Ai 应用',android:'Android 用户请使用 Google Play 官方应用，不要从浏览器安装。',play:'立即从 Google Play 下载',ios:'将 MatchApp Ai 添加到主屏幕，即可一键打开。',home:'添加到主屏幕',mac:'在 Mac 上像应用一样打开 MatchApp Ai。',dock:'添加到 Dock / 应用'}
};
function matchAppSettingsInstallLocale(){
 const raw=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').replace(/_/g,'-');
 if(/^pt/i.test(raw))return 'pt-BR';
 const base=raw.toLowerCase().split('-')[0];
 return MATCHAPP_INSTALL_SETTINGS_COPY[base]?base:'en';
}
function matchAppSettingsInstallPlatform(){
 const ua=navigator.userAgent||'',ipad=/Macintosh/i.test(ua)&&Number(navigator.maxTouchPoints||0)>1;
 const ios=/iPhone|iPad|iPod/i.test(ua)||ipad;
 return {android:/Android/i.test(ua),ios,mac:/Macintosh|Mac OS X/i.test(ua)&&!ios,native:/MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(ua)};
}
function mountInstallDestinationSetting(){
 if(location.pathname!=='/profile/profile.html')return;
 const host=document.querySelector('#settings-panel .settings-body');if(!host)return;
 const platform=matchAppSettingsInstallPlatform();
 const standalone=navigator.standalone===true||!!window.matchMedia?.('(display-mode: standalone)').matches;
 const installed=standalone||platform.native||!!window.matchAppInstallState?.isInstalled?.();
 let section=document.getElementById('matchapp-app-install-setting');
 if(installed||(!platform.android&&!platform.ios&&!platform.mac)){section?.remove();return;}
 if(!document.getElementById('matchapp-install-setting-style')){
   const style=document.createElement('style');style.id='matchapp-install-setting-style';
   style.textContent='#matchapp-app-install-setting{margin:0 0 18px;padding:14px;border:1px solid rgba(229,193,88,.36);border-radius:16px;background:linear-gradient(145deg,rgba(229,193,88,.09),rgba(89,51,139,.18));box-shadow:inset 0 1px rgba(255,255,255,.05)}#matchapp-app-install-setting h4{margin:0 0 6px;color:#f4d77d}#matchapp-app-install-setting p{margin:0 0 12px;color:#cfc5dc;font-size:12.5px;line-height:1.5}.matchapp-settings-install-cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;box-sizing:border-box;border:1px solid rgba(255,225,139,.72);border-radius:999px;background:linear-gradient(135deg,#ffe195,#d5ab49);color:#251528!important;text-decoration:none;font-weight:900;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.24)}.matchapp-settings-install-cta:focus-visible{outline:3px solid #fff0a0;outline-offset:3px}';
   document.head.appendChild(style);
 }
 const copy=MATCHAPP_INSTALL_SETTINGS_COPY[matchAppSettingsInstallLocale()]||MATCHAPP_INSTALL_SETTINGS_COPY.en;
 if(!section){
   section=document.createElement('section');section.id='matchapp-app-install-setting';
   section.innerHTML='<h4></h4><p></p><a class="matchapp-settings-install-cta" target="_blank" rel="noopener noreferrer"></a><button type="button" class="matchapp-settings-install-cta" hidden></button>';
   host.prepend(section);
   section.querySelector('button').addEventListener('click',()=>window.installMatchApp?.());
 }
 section.querySelector('h4').textContent='📲 '+copy.title;
 const link=section.querySelector('a'),button=section.querySelector('button');
 if(platform.android){
   section.querySelector('p').textContent=copy.android;link.textContent='▶ '+copy.play;link.href=MATCHAPP_SETTINGS_PLAY_URL;link.hidden=false;button.hidden=true;
 }else{
   const mac=platform.mac;section.querySelector('p').textContent=mac?copy.mac:copy.ios;button.textContent='＋ '+(mac?copy.dock:copy.home);button.hidden=false;link.hidden=true;
 }
}
const OFFICIAL_BRAND_ICON='/assets/brand/matchapp-official-icon-512.webp?v=20260920-official1';
const OFFICIAL_FAVICON='/assets/brand/matchapp-official-icon-192.png?v=20260920-official1';
function applyOfficialBrand(){
 if(location.pathname.startsWith('/kids/'))return;
 document.querySelectorAll('.matchapp-brand-link').forEach(link=>{
  let img=Array.from(link.children).find(el=>el.tagName==='IMG'&&!el.classList.contains('matchapp-wordmark'));
  if(!img){img=document.createElement('img');link.prepend(img)}
  img.src=OFFICIAL_BRAND_ICON;img.alt='MatchApp Ai official icon';img.width=512;img.height=512;img.decoding='async';
  img.classList.add('brand-logo','ma-official-brand-icon');
 });
 document.querySelectorAll('link[rel~="icon"]').forEach(l=>{l.href=OFFICIAL_FAVICON;l.type='image/png'});
 document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(l=>{l.href=OFFICIAL_FAVICON});
}
load();loadRedesign();applyAll();const ready=()=>{applyAll();applyOfficialBrand();mountInstallDestinationSetting()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();document.addEventListener('matchapp:authchange',e=>{if(e.detail?.signedIn)window.MatchSettings?.hydrateFromAccount?.()});document.addEventListener('matchapp:langchange',()=>{const b=document.querySelector('.matchapp-kids-toggle'),s=b?.querySelector('span'),l=kidsLabel();if(s)s.textContent=l;if(b)b.setAttribute('aria-label',l);mountInstallDestinationSetting()});
})();
(function(){'use strict';const V='20260923-cinemadim1';function js(src){if(document.querySelector(`script[src^="${src}"]`))return;const s=document.createElement('script');s.src=src+'?v='+(src==='/notifications.js'?'20261006-installbell1':src==='/taste-profile.js'?'20260929-taste1':src==='/match-guarantee.js'?'20260926-guarantee-outage1':src==='/ai-composer.js'?'20260929-language-buttons3':V);if(src==='/match-guarantee.js')s.src+='&matching=20260928-session1';s.defer=true;document.head.appendChild(s)}function css(src){if(document.querySelector(`link[href^="${src}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=src+'?v='+(src==='/notifications.css'?'20261006-installbell1':src==='/taste-profile.css'?'20260929-taste1':V);document.head.appendChild(l)}const isKids=location.pathname.startsWith('/kids/');const isHome=location.pathname==='/'||location.pathname==='/index.html';if(!isKids){css('/tokens.css');css('/components.css');if(!isHome)js('/premium-ui.js')}if(!isKids)js('/content-safety.js');if(!isHome)css('/emergency-layout.css');css('/notifications.css');if(isHome){css('/onboarding-tour.css');js('/onboarding-tour.js')}if(!isHome){css('/experience-v2.css');css('/premium-cinema.css');css('/criteria-fold.css')}css('/taste-profile.css');css('/profile-card.css');if(!isHome){css('/urgent-fixes.css');css('/page-fluidity.css')}css('/preference-exclusions.css');/* Home visual ownership belongs exclusively to matchapp-ia.css. */js('/notifications.js');js('/activity.js');if(!isHome)js('/experience-v2.js');js('/chrome-launcher.js');js('/activity-cloud-bridge.js');if(!isHome)js('/premium-cinema.js');js('/legal-kit.js');js('/locale-results.js');js('/social-kit.js');js('/catalog-plus.js');js('/taste-profile.js');js('/match-guarantee.js');js('/site-hits.js');if(!isHome)js('/page-fluidity.js');if(location.pathname==='/profile/profile.html'){css('/profile-history.css');js('/profile-history.js');js('/registration-upgrade.js')}if(location.pathname==='/'||location.pathname==='/index.html'||location.pathname==='/discover.html')js('/roadmap-runtime.js');if(location.pathname==='/pricing/pricing.html'||location.pathname==='/pricing/')js('/brl-pricing.js');if(!isKids)js('/ai-composer.js');})();

/* MatchApp Ai shared loader 20260919 */
(function(){
  'use strict';
  var p=location.pathname||'/';
  while(p.length>1&&p.endsWith('/'))p=p.slice(0,-1);
  var target=p==='/'||p==='/index.html'||p==='/discover.html'||p==='/together.html'||p==='/pricing'||p==='/pricing/pricing.html';
  if(!target)return;
  if(!document.querySelector('link[data-matchapp-ia]')){var l=document.createElement('link');l.rel='stylesheet';l.href='/matchapp-ia.css?v=20260919-ia24';l.dataset.matchappIa='1';document.head.appendChild(l)}
  if(!document.querySelector('script[data-matchapp-ia]')){var s=document.createElement('script');s.src='/matchapp-ia.js?v=20260919-ia24';s.defer=true;s.dataset.matchappIa='1';document.head.appendChild(s)}
})();

(function(){if(String(location.pathname||'').startsWith('/kids/'))return;if(document.querySelector('link[data-cinema-dim]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href='/cinema-dim.css?v=20260923-cinemadim1';l.dataset.cinemaDim='1';document.head.appendChild(l);})();
