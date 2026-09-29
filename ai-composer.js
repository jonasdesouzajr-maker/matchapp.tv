/* Presentation labels only; calls the existing Ask entry without modifying its engine. */
(function(){
'use strict';
const rows={
en:['Ask MatchApp Ai','Type your question here','New chat','Recent conversations','Conversation history','AI allowance','Type a question or use the microphone, then press Send.','Understanding your request…','Understand','Match','Answer','Find what to watch here'],
'pt-BR':['Pergunte à MatchApp iA','Digite sua pergunta aqui','Nova conversa','Conversas recentes','Histórico de conversas','Limite de IA','Digite ou use o microfone e depois toque em Enviar.','Entendendo seu pedido…','Entender','Encontrar','Responder','Encontre o que assistir aqui'],
es:['Pregunta a MatchApp Ai','Escribe tu pregunta aquí','Nueva conversación','Conversaciones recientes','Historial de conversaciones','Cupo de IA','Escribe o usa el micrófono y después pulsa Enviar.','Entendiendo tu solicitud…','Entender','Encontrar','Responder','Encuentra qué ver aquí'],
fr:['Demandez à MatchApp Ai','Écrivez votre question ici','Nouvelle discussion','Discussions récentes','Historique des discussions','Quota IA','Écrivez ou utilisez le micro, puis appuyez sur Envoyer.','Analyse de votre demande…','Comprendre','Trouver','Répondre','Trouvez quoi regarder ici'],
de:['MatchApp Ai fragen','Stelle hier deine Frage','Neuer Chat','Letzte Gespräche','Chatverlauf','KI-Kontingent','Tippe oder nutze das Mikrofon und drücke dann Senden.','Deine Anfrage wird verstanden…','Verstehen','Finden','Antworten','Hier findest du etwas zum Anschauen'],
it:['Chiedi a MatchApp Ai','Scrivi qui la tua domanda','Nuova chat','Conversazioni recenti','Cronologia delle chat','Quota IA','Scrivi o usa il microfono, poi premi Invia.','Comprensione della richiesta…','Comprendere','Trovare','Rispondere','Trova cosa guardare qui'],
tr:['MatchApp Ai’ye sor','Sorunu buraya yaz','Yeni sohbet','Son sohbetler','Sohbet geçmişi','Yapay zekâ kotası','Yaz veya mikrofonu kullan, ardından Gönder’e bas.','İsteğin anlaşılıyor…','Anla','Bul','Yanıtla','İzleyecek bir şey bul'],
ru:['Спросите MatchApp Ai','Введите свой вопрос','Новый чат','Недавние беседы','История бесед','Лимит ИИ','Введите вопрос или используйте микрофон, затем нажмите «Отправить».','Изучаем ваш запрос…','Понять','Найти','Ответить','Найдите, что посмотреть'],
ar:['اسأل MatchApp Ai','اكتب سؤالك هنا','محادثة جديدة','المحادثات الأخيرة','سجل المحادثات','رصيد الذكاء الاصطناعي','اكتب أو استخدم الميكروفون، ثم اضغط إرسال.','جارٍ فهم طلبك…','فهم','بحث','إجابة','اعثر على ما تشاهده هنا'],
hi:['MatchApp Ai से पूछें','अपना सवाल यहाँ लिखें','नई बातचीत','हाल की बातचीत','बातचीत का इतिहास','AI सीमा','लिखें या माइक्रोफ़ोन इस्तेमाल करें, फिर भेजें दबाएँ।','आपका अनुरोध समझ रहे हैं…','समझें','खोजें','जवाब दें','यहाँ देखने के लिए कुछ खोजें'],
id:['Tanya MatchApp Ai','Tulis pertanyaan di sini','Obrolan baru','Percakapan terbaru','Riwayat percakapan','Kuota AI','Ketik atau gunakan mikrofon, lalu tekan Kirim.','Memahami permintaanmu…','Pahami','Cari','Jawab','Temukan tontonan di sini'],
ja:['MatchApp Aiに質問','ここに質問を入力','新しいチャット','最近の会話','会話履歴','AI利用枠','入力するかマイクを使い、送信を押してください。','リクエストを確認中…','理解','検索','回答','ここで見たい作品を探す'],
ko:['MatchApp Ai에 질문','여기에 질문을 입력하세요','새 대화','최근 대화','대화 기록','AI 이용 한도','입력하거나 마이크를 사용한 후 보내기를 누르세요.','요청을 이해하고 있어요…','이해','찾기','답변','여기서 볼 작품을 찾으세요'],
zh:['询问 MatchApp Ai','在这里输入问题','新对话','最近的对话','对话记录','AI 使用额度','输入或使用麦克风，然后点击发送。','正在理解你的请求…','理解','查找','回答','在这里寻找想看的作品']
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
const language=()=>window.MATCH_LANG||document.documentElement.lang||'en';
const copy=()=>rows[language()]||rows.en;
function put(selector,value){document.querySelectorAll(selector).forEach(n=>{if(n.textContent!==value)n.textContent=value;});}
window.submitHomeAI=function(){
 const input=document.getElementById('specific-search-input'),q=input?.value.trim();
 if(!q){input?.setAttribute('aria-invalid','true');window.showToast?.(copy()[1],true);return false;}
 input.removeAttribute('aria-invalid');window.askAI?.(q);return true;
};
function paint(){
 const c=copy();
 put('#search-box h2',c[0]);put('.composer-input-label',c[1]);put('#ai-new-chat span:last-child',c[2]);
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
 put('#ma-hero-match',window.t?.('q.submit')||c[11]);put('#ma-hero-ask',c[0]);
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
function labels(root=document.body){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement;
  if(!parent||parent.closest('script,style,textarea,option,[contenteditable],.chat-user,.chat-answer-text,.discover-card h3,.marquee-title,#res-title,#res-synopsis'))continue;
  const key=reverse.get(node.nodeValue.trim());
  const value=key?.startsWith('composer.extra.')?(extra[language()]||extra.en)[Number(key.split('.').pop())]:key&&window.t?.(key);
  if(value&&value!==node.nodeValue.trim()&&!/[<>]/.test(value))node.nodeValue=node.nodeValue.replace(node.nodeValue.trim(),value);
 }
}
// Preserve the original displayed response so switching languages is reversible.
// Uses the existing bounded localization helper; never sends a new chat or charges a chat action.
const originals=new WeakMap();let previousLanguage=language(),generation=0;
function rememberResponses(){
 document.querySelectorAll('.chat-answer-text,.discover-synopsis').forEach(n=>{
  const old=originals.get(n);
  if(!old||n.textContent!==old.painted)originals.set(n,{text:n.textContent,lang:previousLanguage,painted:n.textContent});
 });
}
async function localizeResponses(){
 rememberResponses();const target=language(),version=++generation;
 previousLanguage=target;
 const nodes=Array.from(document.querySelectorAll('.chat-answer-text,.discover-synopsis'));
 for(const node of nodes){
  if(version!==generation)return;
  const source=originals.get(node);if(!source?.text)continue;
  const translated=target===source.lang?source.text:await window.localizeMatchSynopsis?.(source.text,source.lang);
  if(version!==generation||!node.isConnected)return;
  if(translated&&node.textContent===source.painted){node.textContent=translated;source.painted=translated;}
 }
}
function boot(){
 paint();buildLabels();labels();rememberResponses();
 const observer=new MutationObserver(records=>{
  if(queued||!records.some(r=>r.type==='characterData'||r.addedNodes.length))return;
  queued=true;requestAnimationFrame(()=>{queued=false;observer.disconnect();labels();rememberResponses();observer.observe(document.body,{childList:true,subtree:true,characterData:true});});
 });
 observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 document.addEventListener('matchapp:langchange',()=>{buildLabels();paint();labels();localizeResponses();requestAnimationFrame(paint);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
