/* MatchApp premium anchored walkthrough — manual launch only. */
(function(){
'use strict';

const VERSION='v8';
let stepIndex=0,steps=[],panel=null,spot=null,active=false,repositionRaf=0,touchX=null,lastTarget=null;
let focusGuardInstalled=false;
let bookFoldBeforeTour=null,bookFoldForcedOpen=false;

const copy={
 en:{
  pick:['Find what to stream here','Choose a category and mood in this compact card. Selecting either reveals the full streaming filters.'],
  mood:['Choose your mood','Pick how you want the night to feel. You can change this anytime before matching.'],
  format:['Choose a format','Movie, series, anime, novela or another format — tap the kind of entertainment you want.'],
  platform:['Choose a platform','Choose a service you already use, or leave it open so MatchApp can search more options.'],
  more:['Fine-tune only if you want','Open More Filters for genre, pacing, era and age rating. Everything here is optional.'],
  book:['Meet Bookworms','The separate reading card below the streaming matcher finds e-books, verified audiobooks and magazines with original source covers and official links.'],
  bookFormat:['Pick what to read or listen to','Choose E-book, Audiobook or Magazine here. Then set your mood, genre and any optional filters in the compact dropdowns, and tap Match my e-book for original covers and legitimate free, listening or official store links.'],
  ai:['Ask MatchApp Ai','Prefer your own words? Tap this card, then choose typing or the microphone. The tour itself will never open your keyboard.'],
  latest:['Browse the latest titles','Swipe these posters or use the arrows. Tap any title to open its details and where-to-watch information.'],
  kids:['Open Kids Mode','Tap here for the separate age-reviewed Kids experience with its own safety rules.'],
  profile:['Your profile or sign in','Tap your avatar for your private profile, preferences and account controls — or sign in here if you are not signed in yet.'],
  tap:'Tap here',next:'Next',back:'Back',finish:'Done',skip:'Close',counter:(a,b)=>a+' of '+b
 },
 'pt-BR':{
  pick:['Encontre o que ver por streaming aqui','Escolha uma categoria e um clima neste campo compacto. Ao selecionar, os filtros completos de streaming aparecem.'],
  mood:['Escolha seu clima','Escolha como você quer que a noite se sinta. Você pode mudar isso a qualquer momento antes do match.'],
  format:['Escolha um formato','Filme, série, anime, novela ou outro formato — toque no tipo de entretenimento que você quer.'],
  platform:['Escolha uma plataforma','Escolha um serviço que você já usa ou deixe em aberto para o MatchApp procurar mais opções.'],
  more:['Ajuste só se quiser','Abra Mais Filtros para gênero, ritmo, época e classificação etária. Tudo aqui é opcional.'],
  book:['Conheça o Bookworms','O campo separado de leitura abaixo do matcher de streaming encontra e-books, audiolivros verificados e revistas, com capas originais das fontes e links oficiais.'],
  bookFormat:['Escolha o que ler ou ouvir','Selecione E-book, Audiolivro ou Revista aqui. Depois escolha clima, gênero e outros filtros nos menus compactos e toque em Encontrar meu e-book para ver capas originais e links de fontes gratuitas legais, áudio ou lojas oficiais.'],
  ai:['Pergunte ao MatchApp Ai','Prefere explicar com suas próprias palavras? Toque aqui e depois escolha digitar ou usar o microfone. O tour nunca abre o teclado sozinho.'],
  latest:['Veja os títulos mais recentes','Deslize pelos pôsteres ou use as setas. Toque em um título para abrir detalhes e onde assistir.'],
  kids:['Abra o Modo Kids','Toque aqui para entrar na experiência infantil separada, revisada por idade e com regras próprias de segurança.'],
  profile:['Seu perfil ou login','Toque no avatar para abrir perfil privado, preferências e controles da conta — ou entre por aqui se ainda não estiver conectado.'],
  tap:'Toque aqui',next:'Próximo',back:'Voltar',finish:'Concluir',skip:'Fechar',counter:(a,b)=>a+' de '+b
 }
};

const icons={pick:'✦',mood:'◐',format:'▣',platform:'▶',more:'≡',book:'📚',bookFormat:'▤',ai:'Ai',latest:'↔',kids:'★',profile:'●'};
const walkthroughCopy={
 es:['Toca aquí','Siguiente','Atrás','Listo','Cerrar','Elige categoría y ánimo. La selección abre los filtros completos de formato, plataforma, género y época.','Abre la tarjeta de lectura. Elige libro, audiolibro o revista y tus filtros; obtén portadas originales y enlaces oficiales.','Escribe o usa el micrófono y pulsa Enviar. La guía no abre el teclado automáticamente.','Desliza los pósteres y toca un título para ver sus datos y dónde verlo.','Abre la experiencia infantil independiente, revisada por edades.','Toca tu avatar para abrir tu perfil y preferencias, o inicia sesión.'],
 fr:['Touchez ici','Suivant','Retour','Terminé','Fermer','Choisissez une catégorie et une humeur. La sélection affiche les filtres de format, service, genre et époque.','Ouvrez la carte de lecture. Choisissez livre, livre audio ou magazine et vos filtres pour obtenir les couvertures originales et liens officiels.','Écrivez ou utilisez le micro, puis appuyez sur Envoyer. Le guide n’ouvre pas automatiquement le clavier.','Faites défiler les affiches et touchez un titre pour consulter ses informations et où le regarder.','Ouvrez l’espace enfants indépendant avec des contenus vérifiés par âge.','Touchez votre avatar pour ouvrir votre profil et vos préférences, ou connectez-vous.'],
 de:['Hier tippen','Weiter','Zurück','Fertig','Schließen','Wähle Kategorie und Stimmung. Deine Auswahl öffnet die Filter für Format, Dienst, Genre und Zeitraum.','Öffne die Lesekarte. Wähle E-Book, Hörbuch oder Magazin und deine Filter für Originalcover und offizielle Links.','Tippe oder nutze das Mikrofon und drücke Senden. Die Anleitung öffnet die Tastatur nicht automatisch.','Wische durch die Poster und tippe auf einen Titel für Informationen und Wiedergabeoptionen.','Öffne den separaten Kinderbereich mit altersgeprüften Inhalten.','Tippe auf deinen Avatar für Profil und Einstellungen oder melde dich an.'],
 it:['Tocca qui','Avanti','Indietro','Fine','Chiudi','Scegli categoria e umore. La selezione mostra i filtri di formato, servizio, genere ed epoca.','Apri la scheda di lettura. Scegli e-book, audiolibro o rivista e i filtri per copertine originali e link ufficiali.','Scrivi o usa il microfono, poi premi Invia. La guida non apre automaticamente la tastiera.','Scorri i poster e tocca un titolo per informazioni e dove guardarlo.','Apri l’esperienza separata per bambini con contenuti verificati per età.','Tocca il tuo avatar per profilo e preferenze, oppure accedi.'],
 tr:['Buraya dokun','İleri','Geri','Bitti','Kapat','Kategori ve ruh hâli seç. Seçimin biçim, platform, tür ve dönem filtrelerini açar.','Okuma kartını aç. E-kitap, sesli kitap veya dergi ve filtreleri seç; özgün kapaklara ve resmî bağlantılara ulaş.','Yaz veya mikrofonu kullan, ardından Gönder’e bas. Rehber klavyeyi otomatik açmaz.','Afişleri kaydır ve bilgi ile izleme seçenekleri için bir başlığa dokun.','Yaşa göre incelenmiş içeriklerle ayrı çocuk deneyimini aç.','Profil ve tercihler için avatarına dokun veya giriş yap.'],
 ru:['Нажмите здесь','Далее','Назад','Готово','Закрыть','Выберите категорию и настроение. Выбор открывает фильтры формата, сервиса, жанра и периода.','Откройте раздел чтения. Выберите книгу, аудиокнигу или журнал и фильтры для оригинальных обложек и официальных ссылок.','Введите вопрос или используйте микрофон, затем нажмите Отправить. Гид не открывает клавиатуру автоматически.','Листайте постеры и нажмите на название для информации и вариантов просмотра.','Откройте отдельный детский раздел с проверенными по возрасту материалами.','Нажмите на аватар для профиля и предпочтений или войдите.'],
 ar:['اضغط هنا','التالي','رجوع','تم','إغلاق','اختر الفئة والمزاج. يفتح الاختيار فلاتر النوع والمنصة والتصنيف والفترة.','افتح قسم القراءة واختر كتاباً إلكترونياً أو صوتياً أو مجلة والفلاتر للحصول على أغلفة أصلية وروابط رسمية.','اكتب أو استخدم الميكروفون ثم اضغط إرسال. لا يفتح الدليل لوحة المفاتيح تلقائياً.','مرّر الملصقات واضغط على عنوان لرؤية المعلومات وخيارات المشاهدة.','افتح تجربة الأطفال المنفصلة بمحتوى مراجع حسب العمر.','اضغط على صورتك لفتح الملف والتفضيلات أو سجّل الدخول.'],
 hi:['यहाँ टैप करें','आगे','पीछे','पूरा हुआ','बंद करें','श्रेणी और मूड चुनें। चयन से फ़ॉर्मेट, प्लेटफ़ॉर्म, शैली और समय के फ़िल्टर खुलते हैं।','पढ़ने का कार्ड खोलें। ई-बुक, ऑडियोबुक या पत्रिका और फ़िल्टर चुनकर मूल कवर और आधिकारिक लिंक पाएँ।','टाइप करें या माइक्रोफ़ोन का उपयोग करें, फिर भेजें दबाएँ। गाइड कीबोर्ड अपने आप नहीं खोलता।','पोस्टर स्वाइप करें और जानकारी तथा देखने के विकल्पों के लिए शीर्षक पर टैप करें।','उम्र के अनुसार जाँची गई अलग बच्चों की सुविधा खोलें।','प्रोफ़ाइल और पसंद के लिए अवतार पर टैप करें या साइन इन करें।'],
 id:['Ketuk di sini','Lanjut','Kembali','Selesai','Tutup','Pilih kategori dan suasana. Pilihan membuka filter format, layanan, genre dan periode.','Buka kartu bacaan. Pilih e-book, buku audio atau majalah dan filter untuk sampul asli serta tautan resmi.','Ketik atau gunakan mikrofon, lalu tekan Kirim. Panduan tidak membuka keyboard secara otomatis.','Geser poster dan ketuk judul untuk informasi serta tempat menonton.','Buka pengalaman anak terpisah dengan konten yang ditinjau sesuai usia.','Ketuk avatar untuk profil dan preferensi, atau masuk.'],
 ja:['ここをタップ','次へ','戻る','完了','閉じる','カテゴリと気分を選ぶと、形式、サービス、ジャンル、年代のフィルターが開きます。','読書カードで電子書籍、オーディオブック、雑誌と条件を選び、元の表紙と公式リンクを確認できます。','入力またはマイクを使い、送信を押します。ガイドはキーボードを自動で開きません。','ポスターをスワイプし、作品をタップして情報や視聴先を確認します。','年齢に応じて確認された独立したキッズモードを開きます。','アバターをタップしてプロフィールや設定を開くか、ログインします。'],
 ko:['여기를 누르세요','다음','뒤로','완료','닫기','카테고리와 기분을 선택하면 형식, 서비스, 장르, 시대 필터가 열립니다.','독서 카드에서 전자책, 오디오북 또는 잡지와 조건을 선택해 원본 표지와 공식 링크를 확인하세요.','입력하거나 마이크를 사용한 뒤 보내기를 누르세요. 안내는 키보드를 자동으로 열지 않습니다.','포스터를 넘기고 작품을 눌러 정보와 시청처를 확인하세요.','연령별 검토를 거친 별도의 키즈 모드를 여세요.','프로필과 취향 설정을 보려면 아바타를 누르거나 로그인하세요.'],
 zh:['点击这里','下一步','返回','完成','关闭','选择类别和心情后，会展开类型、平台、题材和年代筛选。','打开阅读卡片，选择电子书、有声书或杂志及条件，查看原始封面和官方链接。','输入或使用麦克风，然后点击发送。指南不会自动打开键盘。','滑动海报并点击作品，查看详细信息和观看平台。','打开独立儿童模式，内容已按年龄审核。','点击头像打开个人资料和偏好，或登录。']
};
const tr=()=>{
 const l=String(window.MATCH_LANG||document.documentElement.lang||'en');if(copy[l])return copy[l];
 const row=walkthroughCopy[l]||walkthroughCopy[l.split('-')[0]];if(!row)return copy.en;
 const text=(selector,key)=>document.querySelector(selector)?.textContent.trim()||window.t?.(key)||'';
 return {
  pick:[text('.lazy-head[data-fold-key="concierge"] .lazy-head-label','how.s1.title'),row[5]],
  mood:[text('.ma-mood-block .ma-filter-label','how.s1.title'),row[5]],
  format:[text('.ma-quick .ma-filter-row:nth-child(2) .ma-filter-label','how.s1.title'),row[5]],
  platform:[text('.ma-quick .ma-filter-row:nth-child(3) .ma-filter-label','how.s1.title'),row[5]],
  more:[window.t?.('crit.more')||'',row[5]],
  book:[text('#ebook-matcher-root .ebook-fold>summary','how.s2.title'),row[6]],
  bookFormat:[text('#ebook-matcher-root label:has([data-ebook-select="format"])','how.s2.title').split('\n')[0],row[6]],
  ai:[text('#search-box h2','discover.title'),row[7]],latest:[text('#trending-rail h2','how.s2.title'),row[8]],
  kids:[text('.ma-kids-mode-entry span','nav.home'),row[9]],profile:[window.t?.('nav.profile')||'',row[10]],
  tap:row[0],next:row[1],back:row[2],finish:row[3],skip:row[4],counter:(a,b)=>a+' / '+b
 };
};
const home=()=>location.pathname==='/'||location.pathname==='/index.html';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);

function visible(el){
 if(!el||!el.isConnected)return false;
 const cs=getComputedStyle(el),r=el.getBoundingClientRect();
 return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>8&&r.height>8;
}

function visualTarget(el){
 if(!el)return null;
 if(visible(el))return el;
 if(el.matches?.('select,input[type="hidden"]')){
  const wrap=el.parentElement;
  const control=wrap?.querySelector?.('.crit-toggle,button,[role="button"]');
  if(visible(control))return control;
 }
 return null;
}

function firstVisible(list){
 for(const selector of String(list||'').split(',')){
  let nodes=[];
  try{nodes=[...document.querySelectorAll(selector.trim())]}catch(_){continue}
  for(const node of nodes){const target=visualTarget(node);if(target)return target}
 }
 return null;
}

function buildSteps(){
 const defs=[
  {key:'pick',selector:'.lazy-head[data-fold-key="concierge"],#ma-tab-match'},
  {key:'mood',selector:'.ma-watch-preview label:last-child,.ma-quick .ma-filter-row.ma-mood-block'},
  {key:'format',selector:'.ma-watch-preview label:first-child,.ma-quick .ma-filter-row:nth-child(2)'},
  {key:'platform',selector:'.ma-quick .ma-filter-row:nth-child(3)'},
  {key:'more',selector:'.match-more-filters>summary,.match-more-filters',mode:'filters'},
  // These two steps belong to the SEPARATE Bookworms card directly beneath
  // #questionnaire-box; never aim the coachmark at Ask AI for book matching.
  {key:'book',selector:'#ebook-matcher-root .ebook-fold>summary'},
  {key:'bookFormat',selector:'#ebook-matcher-root .ebook-select[data-ebook-select="format"]',mode:'book-form'},
  {key:'ai',selector:'#search-box h2,#ma-tab-ask'},
  {key:'latest',selector:'#trending-rail .marquee-item:nth-child(2),#trending-rail .marquee-item,#trending-rail'},
  {key:'kids',selector:'#matchapp-kids-entry,.ma-kids-mode-entry'},
  {key:'profile',selector:'#profile-link-tab,#nav-reg-btn,[data-avatar-slot]'}
 ];
 // Format is deliberately inside a collapsed <details>; only include its
 // step when Bookworms and its real format dropdown are already mounted.
 return defs.filter(step=>step.mode==='book-form'
  ? !!document.querySelector(step.selector) && !!firstVisible('#ebook-matcher-root .ebook-fold>summary')
  : !!firstVisible(step.selector));
}

function ensureUi(){
 if(panel)return;

 spot=document.createElement('div');
 spot.className='matchapp-tour-spotlight';
 spot.hidden=true;
 spot.setAttribute('aria-hidden','true');
 document.body.appendChild(spot);

 panel=document.createElement('aside');
 panel.className='matchapp-tour-card';
 panel.hidden=true;
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','false');
 panel.setAttribute('aria-labelledby','matchapp-tour-title');
 panel.innerHTML=
  '<span class="matchapp-tour-pointer" aria-hidden="true"></span>'+
  '<div class="matchapp-tour-top">'+
    '<span class="matchapp-tour-badge">MATCHAPP ✦</span>'+
    '<button type="button" class="matchapp-tour-skip"></button>'+
  '</div>'+
  '<div class="matchapp-tour-meta">'+
    '<span class="matchapp-tour-icon" aria-hidden="true"></span>'+
    '<small class="matchapp-tour-count"></small>'+
    '<span class="matchapp-tour-tap"><i aria-hidden="true">↗</i><span></span></span>'+
  '</div>'+
  '<h2 id="matchapp-tour-title"></h2>'+
  '<p class="matchapp-tour-copy"></p>'+
  '<div class="matchapp-tour-progress" aria-hidden="true"><span></span></div>'+
  '<div class="matchapp-tour-actions">'+
    '<button type="button" class="matchapp-tour-back"></button>'+
    '<button type="button" class="matchapp-tour-next"></button>'+
  '</div>';
 document.body.appendChild(panel);

 panel.querySelector('.matchapp-tour-skip').onclick=close;
 panel.querySelector('.matchapp-tour-back').onclick=()=>show(stepIndex-1);
 panel.querySelector('.matchapp-tour-next').onclick=()=>stepIndex>=steps.length-1?close():show(stepIndex+1);
 panel.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
 panel.addEventListener('touchend',e=>{
  if(touchX==null)return;
  const x=e.changedTouches?.[0]?.clientX??touchX,dx=x-touchX;touchX=null;
  if(Math.abs(dx)<58)return;
  show(stepIndex+(dx<0?1:-1));
 },{passive:true});
}

function restoreBookFold(){
 if(!bookFoldForcedOpen)return;
 const fold=document.querySelector('#ebook-matcher-root .ebook-fold');
 if(fold&&bookFoldBeforeTour!==null)fold.open=bookFoldBeforeTour;
 bookFoldForcedOpen=false;
}

function prep(step,el){
 if(step.mode==='book-form'){
  const fold=document.querySelector('#ebook-matcher-root .ebook-fold');
  if(fold){
   if(bookFoldBeforeTour===null)bookFoldBeforeTour=fold.open;
   if(!fold.open){fold.open=true;bookFoldForcedOpen=true;}
  }
 }
 // Only the Match tab is activated for context. Ask AI is deliberately never
 // activated by the tour because its normal click behavior focuses the input.
 if(step.key==='pick')document.getElementById('ma-tab-match')?.click();
 if(step.mode==='filters'){
  const d=el.matches?.('details')?el:el.closest?.('details');
  if(d)d.open=true;
 }
}

function viewport(){
 const vv=window.visualViewport;
 const left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
 const width=vv?.width||innerWidth,height=vv?.height||innerHeight;
 return {left,top,width,height,right:left+width,bottom:top+height};
}

function blurActive(){
 const a=document.activeElement;
 if(a&&a!==document.body&&typeof a.blur==='function')try{a.blur()}catch(_){}
}

function isTextInput(node){
 return !!node?.matches?.('input,textarea,[contenteditable="true"],[contenteditable=""]');
}

function guardFocus(e){
 if(!active)return;
 const node=e?.target||document.activeElement;
 if(!isTextInput(node))return;
 setTimeout(()=>{try{node.blur()}catch(_){}},0);
}

function installFocusGuard(){
 if(focusGuardInstalled)return;
 focusGuardInstalled=true;
 document.addEventListener('focusin',guardFocus,true);
}

function removeFocusGuard(){
 if(!focusGuardInstalled)return;
 focusGuardInstalled=false;
 document.removeEventListener('focusin',guardFocus,true);
}

function revealTarget(el){
 const vp=viewport(),r=el.getBoundingClientRect();
 const guardTop=vp.top+18,guardBottom=vp.bottom-18;
 const outside=r.bottom<guardTop||r.top>guardBottom||r.right<vp.left+12||r.left>vp.right-12;
 if(outside){
  try{el.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center',inline:'nearest'})}catch(_){}
  return;
 }
 if(vp.width>700||!panel)return;
 const h=Math.min(panel.getBoundingClientRect().height||210,vp.height*.48);
 const gap=24;
 const roomBelow=vp.bottom-r.bottom;
 const roomAbove=r.top-vp.top;
 if(roomBelow>=h+gap||roomAbove>=h+gap)return;

 // On a phone, put the highlighted control in the upper third so the speech
 // bubble has real room underneath instead of becoming a bottom sheet.
 const targetCenter=r.top+r.height/2;
 const desired=vp.top+Math.min(vp.height*.31,230);
 const delta=targetCenter-desired;
 if(Math.abs(delta)>18){
  try{window.scrollBy({top:delta,behavior:reduced()?'auto':'smooth'})}catch(_){}
 }
}

function overflowScore(x,y,w,h,vp,edge){
 const l=Math.max(0,(vp.left+edge)-x);
 const t=Math.max(0,(vp.top+edge)-y);
 const r=Math.max(0,(x+w)-(vp.right-edge));
 const b=Math.max(0,(y+h)-(vp.bottom-edge));
 return l+t+r+b;
}

function place(){
 if(!active||!steps[stepIndex]||!panel||!spot)return;
 cancelAnimationFrame(repositionRaf);
 repositionRaf=requestAnimationFrame(()=>{
  const step=steps[stepIndex],el=firstVisible(step.selector);
  if(!el)return;
  lastTarget=el;
  const vp=viewport(),r=el.getBoundingClientRect(),pad=7,edge=12,gap=20;

  // Never clamp an off-screen target into a tiny fake spotlight at the edge
  // of the phone. During smooth scrolling, keep the coachmark invisible and
  // let the scroll/settle callbacks position it only once the true control is
  // actually inside the visual viewport.
  const visibleWidth=Math.max(0,Math.min(r.right,vp.right-edge)-Math.max(r.left,vp.left+edge));
  const visibleHeight=Math.max(0,Math.min(r.bottom,vp.bottom-edge)-Math.max(r.top,vp.top+edge));
  const targetReady=visibleWidth>=Math.min(32,r.width*.45)&&visibleHeight>=Math.min(24,r.height*.45);
  if(!targetReady){
   spot.hidden=true;
   panel.hidden=false;
   panel.style.visibility='hidden';
   return;
  }
  spot.hidden=false;

  const sl=clamp(r.left-pad,vp.left+edge,vp.right-edge);
  const st=clamp(r.top-pad,vp.top+edge,vp.bottom-edge);
  const sr=clamp(r.right+pad,vp.left+edge,vp.right-edge);
  const sb=clamp(r.bottom+pad,vp.top+edge,vp.bottom-edge);
  spot.style.left=sl+'px';spot.style.top=st+'px';
  spot.style.width=Math.max(20,sr-sl)+'px';spot.style.height=Math.max(20,sb-st)+'px';
  const radius=parseFloat(getComputedStyle(el).borderRadius)||14;
  spot.style.borderRadius=clamp(radius+6,15,32)+'px';

  panel.hidden=false;
  panel.style.visibility='hidden';
  panel.style.left=(vp.left+edge)+'px';
  panel.style.top=(vp.top+edge)+'px';

  const box=panel.getBoundingClientRect(),w=box.width,h=box.height;
  const cx=clamp(r.left+r.width/2,vp.left+edge,vp.right-edge);
  const cy=clamp(r.top+r.height/2,vp.top+edge,vp.bottom-edge);
  const candidates=[
   {side:'below',x:cx-w/2,y:r.bottom+gap},
   {side:'above',x:cx-w/2,y:r.top-gap-h},
   {side:'right',x:r.right+gap,y:cy-h/2},
   {side:'left',x:r.left-gap-w,y:cy-h/2}
  ];
  const order=vp.width<=700?['below','above','right','left']:['right','left','below','above'];
  candidates.sort((a,b)=>{
   const ao=overflowScore(a.x,a.y,w,h,vp,edge),bo=overflowScore(b.x,b.y,w,h,vp,edge);
   if(ao!==bo)return ao-bo;
   return order.indexOf(a.side)-order.indexOf(b.side);
  });

  const best=candidates[0];
  const x=clamp(best.x,vp.left+edge,vp.right-w-edge);
  const y=clamp(best.y,vp.top+edge,vp.bottom-h-edge);
  const arrowX=clamp(cx-x,30,w-30);
  const arrowY=clamp(cy-y,30,h-30);

  panel.dataset.side=best.side;
  panel.style.setProperty('--tour-arrow-x',arrowX+'px');
  panel.style.setProperty('--tour-arrow-y',arrowY+'px');
  panel.style.left=x+'px';panel.style.top=y+'px';
  panel.style.visibility='visible';
 });
}

function show(i){
 if(!steps.length)return close();
 stepIndex=Math.min(Math.max(i,0),steps.length-1);
 const step=steps[stepIndex];
 if(step.key!=='bookFormat')restoreBookFold();
 // A real format dropdown is hidden by the native collapsed Bookworms card.
 // First find its visible summary, expand the card for this ONE tour step,
 // and only then measure/highlight the actual selector on any screen size.
 const entrySelector=step.mode==='book-form'?'#ebook-matcher-root .ebook-fold>summary':step.selector;
 let el=firstVisible(entrySelector);
 if(!el){steps.splice(stepIndex,1);return steps.length?show(Math.min(stepIndex,steps.length-1)):close()}

 blurActive();
 prep(step,el);
 el=firstVisible(step.selector)||el;

 const t=tr(),pair=t[step.key]||copy.en[step.key];
 panel.querySelector('.matchapp-tour-badge').textContent='MATCHAPP ✦ '+(window.t?.('how.title')||t.pick[0]);
 panel.querySelector('.matchapp-tour-skip').textContent=t.skip;
 panel.querySelector('.matchapp-tour-count').textContent=t.counter(stepIndex+1,steps.length);
 panel.querySelector('.matchapp-tour-icon').textContent=icons[step.key]||'✦';
 panel.querySelector('.matchapp-tour-tap span').textContent=t.tap;
 panel.querySelector('#matchapp-tour-title').textContent=pair[0];
 panel.querySelector('.matchapp-tour-copy').textContent=pair[1];
 panel.querySelector('.matchapp-tour-back').textContent=t.back;
 panel.querySelector('.matchapp-tour-back').hidden=stepIndex===0;
 panel.querySelector('.matchapp-tour-next').textContent=stepIndex===steps.length-1?t.finish:t.next;
 panel.querySelector('.matchapp-tour-progress span').style.width=((stepIndex+1)/steps.length*100)+'%';

 panel.hidden=false;spot.hidden=false;
 document.documentElement.classList.add('matchapp-tour-active');
 revealTarget(el);
 place();

 // Reposition after smooth scrolling settles and re-blur any input that a
 // normal target click tried to focus while the tour is still open.
 [90,220,420].forEach(ms=>setTimeout(()=>{blurActive();place()},reduced()?0:ms));
}

function close(){
 if(!active)return;
 active=false;
 blurActive();
 restoreBookFold();
 bookFoldBeforeTour=null;
 removeFocusGuard();
 if(panel)panel.hidden=true;
 if(spot)spot.hidden=true;
 document.documentElement.classList.remove('matchapp-tour-active');
 lastTarget=null;
}

function start(){
 if(active||!home())return;
 steps=buildSteps();
 if(!steps.length)return;
 // Restore exactly the visitor's initial Bookworms open/collapsed state.
 bookFoldBeforeTour=document.querySelector('#ebook-matcher-root .ebook-fold')?.open??null;
 bookFoldForcedOpen=false;
 ensureUi();
 active=true;
 installFocusGuard();
 show(0);
}

window.MatchAppOnboarding=Object.freeze({start,close,version:VERSION});
addEventListener('resize',place,{passive:true});
addEventListener('scroll',place,{passive:true});
window.visualViewport?.addEventListener('resize',place,{passive:true});
window.visualViewport?.addEventListener('scroll',place,{passive:true});
document.addEventListener('matchapp:langchange',()=>{if(active)show(stepIndex);});
document.addEventListener('keydown',e=>{
 if(!active)return;
 if(e.key==='Escape')close();
 else if(e.key==='ArrowRight'){e.preventDefault();show(stepIndex+1)}
 else if(e.key==='ArrowLeft'){e.preventDefault();show(stepIndex-1)}
});
})();
