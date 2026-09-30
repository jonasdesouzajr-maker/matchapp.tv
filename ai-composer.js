/* Presentation labels only; calls the existing Ask entry without modifying its engine. */
(function(){
'use strict';
const rows={
en:['Ask MatchApp Ai','Type your question here','New chat','Recent conversations','Conversation history','AI allowance','Type a question or use the microphone, then press Send.','Understanding your request…','Understand','Match','Answer','Find what to stream here'],
'pt-BR':['Pergunte à MatchApp iA','Digite sua pergunta aqui','Nova conversa','Conversas recentes','Histórico de conversas','Limite de IA','Digite ou use o microfone e depois toque em Enviar.','Entendendo seu pedido…','Entender','Encontrar','Responder','Encontre o que ver por streaming aqui'],
es:['Pregunta a MatchApp Ai','Escribe tu pregunta aquí','Nueva conversación','Conversaciones recientes','Historial de conversaciones','Cupo de IA','Escribe o usa el micrófono y después pulsa Enviar.','Entendiendo tu solicitud…','Entender','Encontrar','Responder','Encuentra qué ver en streaming aquí'],
fr:['Demandez à MatchApp Ai','Écrivez votre question ici','Nouvelle discussion','Discussions récentes','Historique des discussions','Quota IA','Écrivez ou utilisez le micro, puis appuyez sur Envoyer.','Analyse de votre demande…','Comprendre','Trouver','Répondre','Trouvez quoi regarder en streaming ici'],
de:['MatchApp Ai fragen','Stelle hier deine Frage','Neuer Chat','Letzte Gespräche','Chatverlauf','KI-Kontingent','Tippe oder nutze das Mikrofon und drücke dann Senden.','Deine Anfrage wird verstanden…','Verstehen','Finden','Antworten','Hier findest du etwas zum Streamen'],
it:['Chiedi a MatchApp Ai','Scrivi qui la tua domanda','Nuova chat','Conversazioni recenti','Cronologia delle chat','Quota IA','Scrivi o usa il microfono, poi premi Invia.','Comprensione della richiesta…','Comprendere','Trovare','Rispondere','Trova cosa guardare in streaming qui'],
tr:['MatchApp Ai’ye sor','Sorunu buraya yaz','Yeni sohbet','Son sohbetler','Sohbet geçmişi','Yapay zekâ kotası','Yaz veya mikrofonu kullan, ardından Gönder’e bas.','İsteğin anlaşılıyor…','Anla','Bul','Yanıtla','Burada yayın izleyecek bir şey bul'],
ru:['Спросите MatchApp Ai','Введите свой вопрос','Новый чат','Недавние беседы','История бесед','Лимит ИИ','Введите вопрос или используйте микрофон, затем нажмите «Отправить».','Изучаем ваш запрос…','Понять','Найти','Ответить','Найдите, что смотреть онлайн'],
ar:['اسأل MatchApp Ai','اكتب سؤالك هنا','محادثة جديدة','المحادثات الأخيرة','سجل المحادثات','رصيد الذكاء الاصطناعي','اكتب أو استخدم الميكروفون، ثم اضغط إرسال.','جارٍ فهم طلبك…','فهم','بحث','إجابة','اعثر على ما تبثه هنا'],
hi:['MatchApp Ai से पूछें','अपना सवाल यहाँ लिखें','नई बातचीत','हाल की बातचीत','बातचीत का इतिहास','AI सीमा','लिखें या माइक्रोफ़ोन इस्तेमाल करें, फिर भेजें दबाएँ।','आपका अनुरोध समझ रहे हैं…','समझें','खोजें','जवाब दें','यहाँ स्ट्रीम करने के लिए कुछ खोजें'],
id:['Tanya MatchApp Ai','Tulis pertanyaan di sini','Obrolan baru','Percakapan terbaru','Riwayat percakapan','Kuota AI','Ketik atau gunakan mikrofon, lalu tekan Kirim.','Memahami permintaanmu…','Pahami','Cari','Jawab','Temukan tontonan streaming di sini'],
ja:['MatchApp Aiに質問','ここに質問を入力','新しいチャット','最近の会話','会話履歴','AI利用枠','入力するかマイクを使い、送信を押してください。','リクエストを確認中…','理解','検索','回答','ここでストリーミング作品を探す'],
ko:['MatchApp Ai에 질문','여기에 질문을 입력하세요','새 대화','최근 대화','대화 기록','AI 이용 한도','입력하거나 마이크를 사용한 후 보내기를 누르세요.','요청을 이해하고 있어요…','이해','찾기','답변','여기서 스트리밍할 작품을 찾으세요'],
zh:['询问 MatchApp Ai','在这里输入问题','新对话','最近的对话','对话记录','AI 使用额度','输入或使用麦克风，然后点击发送。','正在理解你的请求…','理解','查找','回答','在这里寻找想串流观看的作品']
};
const extra={
en:['Home','Privacy','Cookies','Terms','Copyright','Contact','Accept','Essential only','Details','We use essential cookies to run MatchApp. Analytics and Google AdSense may use cookies to measure visits and fund the free service.'],
'pt-BR':['Início','Privacidade','Cookies','Termos','Direitos autorais','Contato','Aceitar','Só essenciais','Detalhes','Usamos cookies essenciais para o MatchApp funcionar. Analytics e Google AdSense podem usar cookies para medir visitas e financiar o serviço gratuito.'],
es:['Inicio','Privacidad','Cookies','Términos','Derechos de autor','Contacto','Aceptar','Solo esenciales','Detalles','Usamos cookies esenciales para MatchApp. Analytics y Google AdSense pueden usar cookies para medir visitas y financiar el servicio gratuito.'],
fr:['Accueil','Confidentialité','Cookies','Conditions','Droits d’auteur','Contact','Accepter','Essentiels uniquement','Détails','Nous utilisons des cookies essentiels pour MatchApp. Analytics et Google AdSense peuvent utiliser des cookies pour mesurer les visites et financer le service gratuit.'],
de:['Startseite','Datenschutz','Cookies','Bedingungen','Urheberrecht','Kontakt','Akzeptieren','Nur notwendige','Details','MatchApp verwendet notwendige Cookies. Analytics und Google AdSense können Cookies zur Besuchsmessung und Finanzierung des kostenlosen Dienstes verwenden.'],
it:['Home','Privacy','Cookie','Termini','Diritti d’autore','Contatti','Accetta','Solo essenziali','Dettagli','Usiamo cookie essenziali per MatchApp. Analytics e Google AdSense possono usare cookie per misurare le visite e finanziare il servizio gratuito.'],
tr:['Ana sayfa','Gizlilik','Çerezler','Koşullar','Telif hakkı','İletişim','Kabul et','Yalnızca gerekli','Ayrıntılar','MatchApp için gerekli çerezleri kullanıyoruz. Analytics ve Google AdSense, ziyaretleri ölçmek ve ücretsiz hizmeti finanse etmek için çerez kullanabilir.'],
ru:['Главная','Конфиденциальность','Файлы cookie','Условия','Авторские права','Контакты','Принять','Только необходимые','Подробнее','Для работы MatchApp нужны основные cookie. Analytics и Google AdSense могут использовать cookie для измерения посещений и финансирования бесплатного сервиса.'],
ar:['الرئيسية','الخصوصية','ملفات الارتباط','الشروط','حقوق النشر','اتصل بنا','قبول','الضرورية فقط','التفاصيل','نستخدم ملفات ارتباط ضرورية لتشغيل MatchApp. قد تستخدم Analytics وGoogle AdSense ملفات ارتباط لقياس الزيارات وتمويل الخدمة المجانية.'],
hi:['होम','गोपनीयता','कुकीज़','शर्तें','कॉपीराइट','संपर्क','स्वीकार करें','केवल आवश्यक','विवरण','MatchApp चलाने के लिए आवश्यक कुकीज़ का उपयोग करते हैं। Analytics और Google AdSense विज़िट मापने और मुफ़्त सेवा के लिए कुकीज़ इस्तेमाल कर सकते हैं।'],
id:['Beranda','Privasi','Cookie','Ketentuan','Hak cipta','Kontak','Terima','Hanya yang penting','Detail','Kami menggunakan cookie penting untuk MatchApp. Analytics dan Google AdSense dapat menggunakan cookie untuk mengukur kunjungan dan mendanai layanan gratis.'],
ja:['ホーム','プライバシー','Cookie','利用規約','著作権','お問い合わせ','同意する','必須のみ','詳細','MatchAppの運営に必須のCookieを使用します。AnalyticsとGoogle AdSenseは訪問数の測定と無料サービスの運営資金のためにCookieを使用する場合があります。'],
ko:['홈','개인정보','쿠키','약관','저작권','문의','동의','필수 항목만','자세히','MatchApp 운영에 필수 쿠키를 사용합니다. Analytics와 Google AdSense는 방문 측정과 무료 서비스 운영을 위해 쿠키를 사용할 수 있습니다.'],
zh:['首页','隐私','Cookie','条款','版权','联系我们','接受','仅必要项','详情','我们使用必要的 Cookie 来运行 MatchApp。Analytics 和 Google AdSense 可能使用 Cookie 来统计访问并支持免费服务。']
};
const playbackLabels={"en": "Read answer aloud", "pt-BR": "Ler resposta em voz alta", "es": "Leer respuesta en voz alta", "fr": "Lire la réponse à voix haute", "de": "Antwort laut vorlesen", "it": "Leggi la risposta ad alta voce", "tr": "Yanıtı sesli oku", "ru": "Прочитать ответ вслух", "ar": "اقرأ الإجابة بصوت عالٍ", "hi": "जवाब को ज़ोर से पढ़ें", "id": "Bacakan jawaban", "ja": "回答を読み上げる", "ko": "답변을 소리 내어 읽기", "zh": "朗读回答"};
const growthCopy={en:['Always growing.','MatchApp is constantly expanding with new titles, features and experiences.','Stay tuned for what’s next.','MatchApp is constantly expanding'],'pt-BR':['Sempre crescendo.','A MatchApp está sempre se expandindo com novos títulos, recursos e experiências.','Fique por dentro das novidades.','A MatchApp está sempre se expandindo'],'es':['Siempre creciendo.','MatchApp sigue ampliando su catálogo con nuevos títulos, funciones y experiencias.','Muy pronto habrá más novedades.','MatchApp sigue creciendo'],'fr':['Toujours en expansion.','MatchApp s’enrichit constamment de nouveaux titres, fonctionnalités et expériences.','Restez à l’écoute des nouveautés.','MatchApp est en constante expansion'],'de':['Wir wachsen weiter.','MatchApp erweitert sich ständig um neue Titel, Funktionen und Erlebnisse.','Bleib gespannt auf das, was kommt.','MatchApp wächst ständig weiter'],'it':['Sempre in crescita.','MatchApp si arricchisce continuamente di nuovi titoli, funzioni ed esperienze.','Resta sintonizzato per le novità.','MatchApp è in continua espansione'],'tr':['Sürekli büyüyoruz.','MatchApp yeni yapımlar, özellikler ve deneyimlerle sürekli gelişiyor.','Yenilikler için takipte kalın.','MatchApp sürekli gelişiyor'],'ru':['Мы продолжаем расти.','В MatchApp постоянно появляются новые материалы, функции и возможности.','Следите за новостями.','MatchApp постоянно развивается'],'ar':['نواصل النمو.','تتوسع MatchApp باستمرار بعناوين وميزات وتجارب جديدة.','ترقبوا المزيد.','MatchApp في توسع مستمر'],'hi':['हम लगातार बढ़ रहे हैं।','MatchApp में नए शीर्षक, सुविधाएँ और अनुभव लगातार जुड़ रहे हैं।','आगे की खबरों के लिए जुड़े रहें।','MatchApp लगातार विस्तार कर रहा है'],'id':['Terus berkembang.','MatchApp terus menghadirkan judul, fitur, dan pengalaman baru.','Nantikan kabar berikutnya.','MatchApp terus berkembang'],'ja':['さらに成長しています。','MatchAppでは、新しい作品や機能、体験を続々と追加しています。','今後の更新もお楽しみに。','MatchAppは拡大を続けています'],'ko':['계속 성장 중입니다.','MatchApp은 새로운 작품과 기능, 경험을 계속 추가하고 있어요.','앞으로의 소식도 기대해 주세요.','MatchApp은 계속 성장하고 있습니다'],'zh':['持续成长。','MatchApp 不断推出新作品、新功能和新体验。','敬请期待更多更新。','MatchApp 正在持续扩展']};
const exampleCopy={en:'A feel-good Netflix movie','pt-BR':'Um filme leve na Netflix',es:'Busca una película alegre en Netflix',fr:'Trouve un film joyeux sur Netflix',de:'Finde einen Wohlfühlfilm auf Netflix',it:'Trova un film allegro su Netflix',tr:'Netflix’te keyifli bir film bul',ru:'Найди добрый фильм на Netflix',ar:'ابحث عن فيلم مبهج على Netflix',hi:'Netflix पर एक खुशमिज़ाज फ़िल्म खोजें',id:'Cari film menyenangkan di Netflix',ja:'Netflixで心温まる映画を探して',ko:'Netflix에서 따뜻한 영화를 찾아줘',zh:'找一部Netflix上的温馨电影'};
function paintExample(){const L=language(),question=exampleCopy[L]||exampleCopy.en;document.querySelectorAll('[data-ai-example]').forEach(button=>{button.dataset.question=question;const text=(window.t?.('search.trythese')||'Try:')+' '+question;if(button.textContent!==text)button.textContent=text;});}
const language=()=>window.MATCH_LANG||document.documentElement.lang||'en';
const copy=()=>rows[language()]||rows.en;
window.matchAppReadAloudLabel=()=>playbackLabels[language()]||playbackLabels.en;
function put(selector,value){document.querySelectorAll(selector).forEach(n=>{if(n.textContent!==value)n.textContent=value;});}
const foldCopy={"en": ["Latest News", "Top cooking channels & recipes"], "pt-BR": ["Últimas notícias", "Melhores canais de culinária e receitas"], "es": ["Últimas noticias", "Mejores canales de cocina y recetas"], "fr": ["Dernières actualités", "Meilleures chaînes de cuisine et recettes"], "de": ["Neueste Nachrichten", "Beste Kochkanäle und Rezepte"], "it": ["Ultime notizie", "Migliori canali di cucina e ricette"], "tr": ["Son haberler", "En iyi yemek kanalları ve tarifler"], "ru": ["Последние новости", "Лучшие кулинарные каналы и рецепты"], "ar": ["آخر الأخبار", "أفضل قنوات الطبخ والوصفات"], "hi": ["ताज़ा खबरें", "बेहतरीन कुकिंग चैनल और रेसिपी"], "id": ["Berita terbaru", "Kanal memasak dan resep terbaik"], "ja": ["最新ニュース", "おすすめ料理チャンネルとレシピ"], "ko": ["최신 뉴스", "추천 요리 채널과 레시피"], "zh": ["最新消息", "优质烹饪频道与食谱"]};
function paintFoldLabels(){paintExample();const c=foldCopy[language()]||foldCopy.en;put("#latest-news .ma-news-title",c[0]);put("#cooking-home>summary>span",c[1]);}
const footerRights={"en": ["All rights reserved.", "Legal rights", "Terms", "Privacy"], "pt-BR": ["Todos os direitos reservados.", "Direitos legais", "Termos", "Privacidade"], "es": ["Todos los derechos reservados.", "Derechos legales", "Términos", "Privacidad"], "fr": ["Tous droits réservés.", "Droits légaux", "Conditions", "Confidentialité"], "de": ["Alle Rechte vorbehalten.", "Rechtliche Hinweise", "Bedingungen", "Datenschutz"], "it": ["Tutti i diritti riservati.", "Diritti legali", "Termini", "Privacy"], "tr": ["Tüm hakları saklıdır.", "Yasal haklar", "Koşullar", "Gizlilik"], "ru": ["Все права защищены.", "Правовая информация", "Условия", "Конфиденциальность"], "ar": ["جميع الحقوق محفوظة.", "الحقوق القانونية", "الشروط", "الخصوصية"], "hi": ["सर्वाधिकार सुरक्षित।", "कानूनी अधिकार", "शर्तें", "गोपनीयता"], "id": ["Hak cipta dilindungi.", "Hak hukum", "Ketentuan", "Privasi"], "ja": ["無断転載を禁じます。", "法的権利", "利用規約", "プライバシー"], "ko": ["모든 권리 보유.", "법적 권리", "이용약관", "개인정보"], "zh": ["保留所有权利。", "法律权利", "条款", "隐私"]};
function paintRights(){const r=footerRights[language()]||footerRights.en;put(".ma-rights-copy","© "+new Date().getFullYear()+" Matchapp Ai · "+r[0]);put(".ma-legal-rights-link",r[1]);put(".ma-final-legal .ma-terms",r[2]);put(".ma-final-legal .ma-privacy",r[3]);}
function paintGlobal(){
 const node=document.querySelector('.matchapp-growth-copy');if(!node)return;
 const c=growthCopy[language()]||growthCopy.en,lead=node.querySelector('strong'),tail=node.querySelector('span');
 if(lead)lead.textContent=c[0];if(tail)tail.textContent=c[2];
 const middle=Array.from(node.childNodes).find(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim());if(middle)middle.nodeValue=' '+c[1]+' ';
 const banner=document.getElementById('matchapp-growth-disclosure');if(banner)banner.setAttribute('aria-label',c[3]);
}
window.submitHomeAI=function(){
 const input=document.getElementById('specific-search-input'),q=input?.value.trim();
 if(!q){input?.setAttribute('aria-invalid','true');window.showToast?.(copy()[1],true);return false;}
 input.removeAttribute('aria-invalid');window.askAI?.(q);return true;
};
function paint(){
 paintGlobal();paintFoldLabels();paintRights();paintHeader();
 if(!document.body.classList.contains('page-home')&&!document.body.classList.contains('ai-chat-page'))return;
 const c=copy();
 put('#search-box h2,.lazy-head[data-fold-key="askai"] .lazy-head-label',c[0]);put('.composer-input-label',c[1]);put('#ai-new-chat span:last-child',c[2]);
 put('.ai-sidebar-section-title',c[3]);put('.ai-sidebar-brand span',c[4]);put('.ai-usage-row > span',c[5]);
 put('#search-box [data-i18n="search.voiceHint"],#discover-compose-help',c[6]);
 put('#ai-step-understand',c[8]);put('#ai-step-match',c[9]);put('#ai-step-answer',c[10]);
 put('#questionnaire-box h2,.lazy-head[data-fold-key="concierge"] .lazy-head-label',c[11]);
 document.querySelectorAll('#ai-sidebar,#ai-sidebar-toggle,.ai-sidebar-fold').forEach(n=>{n.setAttribute('aria-label',c[4]);n.setAttribute('title',c[4]);});
 const input=document.getElementById('specific-search-input');if(input)input.setAttribute('aria-label',c[1]);
 // These were unlocalized decorative claims, not service health indicators.
 document.querySelectorAll('.ai-session-strip').forEach(n=>n.hidden=true);
 put('.ai-thinking-copy p',c[7]);
 put('#search-box [data-i18n="search.hint"]',window.t?.('discover.conciergeTagline')||c[6]);
 document.querySelectorAll('.discover-speak').forEach(button=>{const label=window.matchAppReadAloudLabel();button.setAttribute('aria-label',label);button.setAttribute('title',label);});
}
// Stable header targets translate on every language change without replacing listeners.
const headerCopy={
 en:['How it works','Kids Mode','Settings','Country','Language','Sound','Theme','Lazy Mode','Daily check-in','Pricing','Install app','Settings',"What's new"],
 'pt-BR':['Como funciona','Modo Kids','Configurações','País','Idioma','Som','Tema','Modo relaxado','Check-in diário','Planos','Instalar app','Configurações','Novidades'],
 es:['Cómo funciona','Modo infantil','Ajustes','País','Idioma','Sonido','Tema','Modo relajado','Registro diario','Planes','Instalar app','Ajustes','Novedades'],
 fr:['Mode d’emploi','Mode enfants','Réglages','Pays','Langue','Son','Thème','Mode détente','Pointage quotidien','Tarifs','Installer l’app','Réglages','Nouveautés'],
 de:['So funktioniert’s','Kindermodus','Einstellungen','Land','Sprache','Ton','Design','Entspannungsmodus','Täglicher Check-in','Preise','App installieren','Einstellungen','Neuigkeiten'],
 it:['Come funziona','Modalità bambini','Impostazioni','Paese','Lingua','Audio','Tema','Modalità relax','Accesso giornaliero','Piani','Installa app','Impostazioni','Novità'],
 tr:['Nasıl çalışır','Çocuk modu','Ayarlar','Ülke','Dil','Ses','Tema','Rahat mod','Günlük giriş','Planlar','Uygulamayı yükle','Ayarlar','Yenilikler'],
 ru:['Как это работает','Детский режим','Настройки','Страна','Язык','Звук','Тема','Режим отдыха','Ежедневная отметка','Тарифы','Установить','Настройки','Новое'],
 ar:['كيف يعمل','وضع الأطفال','الإعدادات','البلد','اللغة','الصوت','السمة','وضع الراحة','تسجيل يومي','الخطط','تثبيت التطبيق','الإعدادات','الجديد'],
 hi:['कैसे काम करता है','बच्चों का मोड','सेटिंग्स','देश','भाषा','ध्वनि','थीम','आराम मोड','दैनिक चेक-इन','प्लान','ऐप इंस्टॉल करें','सेटिंग्स','नया क्या है'],
 id:['Cara kerja','Mode anak','Pengaturan','Negara','Bahasa','Suara','Tema','Mode santai','Check-in harian','Paket','Pasang aplikasi','Pengaturan','Yang baru'],
 ja:['使い方','キッズモード','設定','国','言語','音声','テーマ','リラックスモード','毎日のチェックイン','料金','アプリを入手','設定','新着情報'],
 ko:['사용 방법','키즈 모드','설정','국가','언어','소리','테마','휴식 모드','매일 체크인','요금제','앱 설치','설정','새 소식'],
 zh:['使用指南','儿童模式','设置','国家','语言','声音','主题','休闲模式','每日签到','套餐','安装应用','设置','最新消息']
};
function paintHeader(){
 const h=document.querySelector('#mh-topbox.ma-home-header');if(!h)return;
 const c=headerCopy[language()]||headerCopy.en;
 const label=(selector,text,child)=>{const n=h.querySelector(selector);if(!n)return;
  n.setAttribute('aria-label',text);n.setAttribute('title',text);
  const target=child?n.querySelector(child):n;
  if(target&&target.textContent!==text)target.textContent=text;
 };
 label('.ma-how-button',c[0]);label('.ma-kids-mode-entry',c[1],'span');label('.ma-menu-button',c[2],'span');
 const signIn={en:'Sign in','pt-BR':'Entrar',es:'Entrar',fr:'Connexion',de:'Anmelden',it:'Accedi',tr:'Giriş',ru:'Войти',ar:'دخول',hi:'साइन इन',id:'Masuk',ja:'ログイン',ko:'로그인',zh:'登录'};
 label('#nav-reg-btn','👤 '+(signIn[language()]||signIn.en));
 h.querySelectorAll('.ma-menu>[role="menuitem"]').forEach((n,i)=>{
  const text=c[i+3];if(!text)return;
  if(!n.dataset.maMenuIcon)n.dataset.maMenuIcon=n.textContent.trim().split(' ')[0];
  const value=n.dataset.maMenuIcon+' '+text;if(n.textContent!==value)n.textContent=value;n.setAttribute('aria-label',text);
 });
 const logout=h.querySelector('#nav-logout-btn');if(logout){const text=window.t?.('nav.logout')||'Logout';logout.setAttribute('aria-label',text);logout.setAttribute('title',text);}
}
// Resolve exact authored UI labels, including dynamically inserted error/toast text.
// Never rewrite user prompts, titles, names, links or form values.
let reverse=new Map(),queued=false;
function buildLabels(){
 reverse=new Map();
 Object.values(extra).forEach(row=>row.forEach((value,i)=>reverse.set(value,'composer.extra.'+i)));
 if(typeof I18N!=='undefined')Object.values(I18N).forEach(dict=>Object.entries(dict).forEach(([key,value])=>{
  if(typeof value==='string'&&!/[<>]/.test(value)&&value.length>3&&!reverse.has(value.trim()))reverse.set(value.trim(),key);
 }));
}
function localizeControl(node){
 const key=reverse.get((node.getAttribute('aria-label')||node.getAttribute('title')||'').trim());
 const aria=key?.startsWith('composer.extra.')?(extra[language()]||extra.en)[Number(key.split('.').pop())]:key&&window.t?.(key);
 if(aria){node.setAttribute('aria-label',aria);node.setAttribute('title',aria);}
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;
 while((text=walker.nextNode())){
  if(text.parentElement?.closest('[translate="no"],svg,script,style,textarea,.discover-card,.marquee-item,.chat-user,.chat-answer-text'))continue;
  const source=text.nodeValue.trim(),labelKey=reverse.get(source);
  const translated=labelKey?.startsWith('composer.extra.')?(extra[language()]||extra.en)[Number(labelKey.split('.').pop())]:labelKey&&window.t?.(labelKey);
  if(translated&&translated!==source&&!/[<>]/.test(translated))text.nodeValue=text.nodeValue.replace(source,translated);
 }
}
function labels(root=document){
 if(!root)return;
 root.querySelectorAll?.('button:not([data-i18n]),[role="button"]:not([data-i18n]),a:not([data-i18n]),[role="link"]:not([data-i18n]),summary').forEach(localizeControl);
 const cookies=[];if(root.matches?.('.ma-cookie'))cookies.push(root);root.querySelectorAll?.('.ma-cookie').forEach(node=>cookies.push(node));
 cookies.forEach(box=>{const text=box.querySelector('p')?.firstChild;if(text?.nodeType!==Node.TEXT_NODE)return;const source=text.nodeValue.trim(),key=reverse.get(source);const translated=key?.startsWith('composer.extra.')?(extra[language()]||extra.en)[Number(key.split('.').pop())]:key&&window.t?.(key);if(translated&&translated!==source)text.nodeValue=text.nodeValue.replace(source,translated);});
}
// Preserve the original displayed response so switching languages is reversible.
// Uses the existing bounded display-localization helper for already-rendered answer text.
const originals=new WeakMap();let previousLanguage=language(),generation=0;
function rememberResponses(){
 document.querySelectorAll('.chat-answer-text').forEach(n=>{
  const old=originals.get(n);
  if(!old||n.textContent!==old.painted)originals.set(n,{text:n.textContent,lang:previousLanguage,painted:n.textContent});
 });
}
async function localizeResponses(){
 rememberResponses();const target=language(),version=++generation;
 previousLanguage=target;
 const nodes=Array.from(document.querySelectorAll('.chat-answer-text'));
 for(const node of nodes){
  if(version!==generation)return;
  const source=originals.get(node);if(!source?.text)continue;
  const translated=target===source.lang?source.text:await window.localizeMatchSynopsis?.(source.text,source.lang);
  if(version!==generation||!node.isConnected)return;
  if(translated&&node.textContent===source.painted){node.textContent=translated===source.text&&target!==source.lang?window.matchTranslationUnavailable?.()||translated:translated;source.painted=node.textContent;}
 }
}
function boot(){
 paint();buildLabels();labels();rememberResponses();
 const observer=new MutationObserver(records=>{
  if(queued||!records.some(r=>r.addedNodes.length))return;
  queued=true;requestAnimationFrame(()=>{queued=false;paintFoldLabels();paintHeader();records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('button,[role="button"],a,[role="link"]'))localizeControl(n);labels(n);}}));rememberResponses();});
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('matchapp:langchange',()=>{buildLabels();paint();labels();localizeResponses();requestAnimationFrame(paint);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
