/* Authored support invitations. Presentation only: existing controls, payment
 * configuration, privacy notices and language owners keep their behavior. */
(function(root,factory){
 'use strict';const copy=factory();
 if(typeof module==='object'&&module.exports)module.exports=copy;
 if(!root||!root.document||root.MatchAppSupportPresentation)return;
 const doc=root.document;
 if(/^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(root.location.pathname))return;
 const founder=doc.querySelector('body.ma-founder-page'),sponsor=doc.querySelector('[data-mp-page="sponsor"]'),donate=doc.getElementById('ma-donate-support');
 if(!founder&&!sponsor&&!donate)return;
 function language(){let saved='';try{saved=root.localStorage.getItem('match_lang')||'';}catch(_){}return String(root.MATCH_LANG||saved||doc.documentElement.lang||'en').toLowerCase().split('-')[0];}
 function write(node,value){if(!node||node.textContent===value)return;if(node.childNodes.length===1&&node.firstChild.nodeType===3)node.firstChild.nodeValue=value;else node.textContent=value;}
 // Home retains the original legal/CMP/action nodes. Only repeated chrome is
 // consolidated; service notices remain available in a native disclosure.
 const home=donate&&doc.querySelector('body.page-home .seo-footer');let homeUI=null,legalObserver=null;
 function homeLanguage(){let saved='';try{saved=root.localStorage.getItem('match_lang')||'';}catch(_){}for(const value of[saved,root.MATCH_LANG,doc.documentElement.lang]){const key=String(value||'').toLowerCase().replace(/_/g,'-').split('-')[0];if(Object.prototype.hasOwnProperty.call(copy.homeFooter,key))return key;}return 'en';}
 function consolidateLegal(){
  if(!homeUI)return false;if(homeUI.bar)return true;
  const bar=doc.querySelector('.ma-legal-bar'),privacy=bar&&bar.querySelector('#ma-privacy-choices');if(!privacy)return false;
  const legacy=home.querySelector('.ma-final-legal'),rights=legacy&&legacy.querySelector('.ma-rights-copy'),protection=legacy&&legacy.querySelector('.ma-footer-protection');
  const links=doc.createElement('div');links.className='ma-home-legal-links';
  for(const node of [...bar.children])if(node.matches('a[href]')&&node!==privacy)links.appendChild(node);
  // Short labels share one row; longer legal labels share the wider row.
  const cookies=links.querySelector('a[href="/cookies.html"]'),terms=links.querySelector('a[href="/terms.html"]'),policy=links.querySelector('a[href="/privacy.html"]');if(cookies&&policy)policy.before(cookies);if(terms&&policy)policy.before(terms);
  // Retain any unique legacy destination if its source ever grows a new link.
  if(legacy)for(const link of legacy.querySelectorAll('a[href]'))if(![...links.querySelectorAll('a[href]')].some(node=>node.href===link.href))links.appendChild(link);
  const anchors=[...links.children];if(anchors.length===7)for(const group of[anchors.slice(0,4),anchors.slice(4)]){const row=doc.createElement('div');row.className='ma-home-legal-row';row.append(...group);links.appendChild(row);}
  bar.querySelectorAll(':scope > .ma-legal-copy,:scope > [aria-hidden="true"]').forEach(node=>node.remove());
  const meta=doc.createElement('div');meta.className='ma-home-legal-meta';if(rights)meta.appendChild(rights);meta.appendChild(privacy);if(protection)meta.appendChild(protection);
  bar.prepend(links,meta);home.appendChild(bar);if(legacy)legacy.remove();
  homeUI.bar=bar;homeUI.rights=rights;return true;
 }
 function prepareHomeFooter(){
  if(!home||homeUI)return;
  const legal=home.querySelector('.seo-footer-legal'),actions=home.querySelector('.mp-footer-actions'),updates=home.querySelector('a[href="/updates.html"]');if(!legal||!actions||!updates)return;
  const details=doc.createElement('details'),summary=doc.createElement('summary'),notice=doc.createElement('span'),support=doc.createElement('span'),email=doc.createElement('a');
  details.className='ma-home-service-info';summary.setAttribute('data-ma-text-pill','label');notice.className='ma-home-service-notice';email.href='mailto:support@matchapp.tv';email.textContent='support@matchapp.tv';
  legal.before(details);details.append(summary,legal);legal.replaceChildren(notice,' ',support,' ',email);
  const oldParent=updates.parentElement;updates.classList.add('mp-footer-pill','secondary');actions.appendChild(updates);if(oldParent.tagName==='P'&&!oldParent.textContent.trim()&&!oldParent.children.length)oldParent.remove();
  homeUI={summary,notice,support,updates,details};
  if(!consolidateLegal()){
   legalObserver=new root.MutationObserver(()=>{if(consolidateLegal()){legalObserver.disconnect();legalObserver=null;paintHomeFooter();}});
   legalObserver.observe(doc.body,{childList:true,subtree:true});
  }
 }
 function paintHomeFooter(){
  prepareHomeFooter();if(!homeUI)return;const text=copy.homeFooter[homeLanguage()]||copy.homeFooter.en;
  write(homeUI.summary,text[0]);write(homeUI.updates,text[1]);write(homeUI.notice,text[2]);write(homeUI.support,text[3]);
  write(homeUI.rights,'© '+new Date().getFullYear()+' MatchApp Ai · '+text[4]);
 }
 function paint(){
  paintHomeFooter();const lang=language();if(lang!=='en'&&lang!=='pt')return;
  for(const [host,name,attribute]of[[founder,'founder','data-founder'],[sponsor,'sponsor','data-mp']]){
   if(!host)continue;for(const [key,value]of Object.entries(copy[name][lang]))host.querySelectorAll('['+attribute+'="'+key+'"]').forEach(node=>write(node,value));
  }
  if(donate)for(const [id,value]of Object.entries(copy.donate[lang]))write(doc.getElementById(id),value);
 }
 let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;paint();});}
 root.MatchAppSupportPresentation=Object.freeze({paint,copy});
 for(const event of['matchapp:langchange','matchapp:languagechange','languagechange']){doc.addEventListener(event,schedule);root.addEventListener(event,schedule);}
 root.addEventListener('pageshow',schedule);
 root.addEventListener('storage',event=>{if(event.key==='match_lang'||event.key===null)schedule();});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
})(typeof window==='undefined'?null:window,function(){return{
 founder:{
  en:{kicker:'Independent by design. Human at heart.',lede:'MatchApp Ai began with a familiar question: what should we watch tonight? Jonas Junior turned that moment into an independent app for discovering more of what you love.',helpHeading:'Create the next chapter together',helpIntro:'Bring a fresh perspective. Share what works, suggest what could be better, or support the next improvements. Each is a meaningful way to take part.',testHeading:'Shape a better experience',testText:'Use MatchApp Ai in a real moment of discovery. Your honest observations help make the details clearer, the choices easier and the experience more useful.',supportHeading:'Keep the next chapter moving',supportText:'MatchApp Ai is built independently, with care for the people who use it. Optional contributions help sustain its operation and development. Sharing the app or thoughtful feedback is equally welcome. Every contribution is optional and does not change your account’s features.',supportButton:'Explore voluntary support'},
  pt:{kicker:'Independente na criação. Humano na essência.',lede:'Uma pergunta comum deu início a tudo: o que vamos assistir hoje? Jonas Junior transformou esse momento em um aplicativo independente para descobrir mais do que você gosta.',helpHeading:'Vamos criar o próximo capítulo',helpIntro:'Traga um novo olhar. Conte o que funciona, sugira o que pode melhorar ou apoie os próximos passos. Há diferentes maneiras de participar.',testHeading:'Ajude a criar uma experiência melhor',testText:'Use o MatchApp Ai em um momento real de descoberta. Suas observações ajudam a deixar os detalhes mais claros, as escolhas mais simples e a experiência mais útil.',supportHeading:'Impulsione o próximo capítulo',supportText:'O MatchApp Ai é criado de forma independente, com cuidado por quem o utiliza. Contribuições opcionais ajudam a manter a operação e o desenvolvimento. Compartilhar o aplicativo ou enviar sugestões também é muito bem-vindo. Toda contribuição é opcional e não altera os recursos da sua conta.',supportButton:'Conheça as formas de apoiar'}
 },
 sponsor:{
  en:{kicker:'Meaningful partnerships',title:'Your brand. Part of a great discovery.',intro:'Meet people in a moment of curiosity. Build a clearly disclosed campaign around entertainment discovery, with agreed placements, original creative and an official destination for your brand.',options:'A clear place for your story',placement:'A considered brand presence',placementText:'A distinct, clearly labelled sponsor card that brings your message into the experience. We agree the creative, destination, placements, dates, countries and devices before anything goes live.',editorial:'Useful stories, openly supported',editorialText:'Support a thoughtful entertainment theme with prominent sponsorship disclosure. Paid support never buys a favourable review or changes personal matching.',process:'A thoughtful plan, agreed together',brief:'Let’s make something worth discovering'},
  pt:{kicker:'Parcerias com propósito',title:'Sua marca. Parte de uma boa descoberta.',intro:'Encontre pessoas em um momento de curiosidade. Crie uma campanha de descoberta de entretenimento identificada com clareza, com espaços combinados, criação original e um destino oficial da sua marca.',options:'Um espaço claro para a sua história',placement:'Presença de marca com contexto',placementText:'Um cartão de patrocínio distinto e identificado com clareza para apresentar sua mensagem. Criação, destino, espaços, datas, países e dispositivos são combinados antes da publicação.',editorial:'Histórias úteis, apoio transparente',editorialText:'Apoie um tema de entretenimento com identificação destacada do patrocínio. O apoio pago não compra uma avaliação favorável nem altera recomendações pessoais.',process:'Um plano claro, construído em conjunto',brief:'Vamos criar algo que vale descobrir'}
 },
 homeFooter:{
  en:['Service information','What’s new','MatchApp Ai is an independent discovery service, with no affiliation, endorsement or sponsorship from the streaming platforms listed here. All trademarks belong to their respective owners. Availability varies by region and subscription. Unauthorized reproduction of this software or its AI systems is prohibited.','Support:','All rights reserved.'],
  pt:['Sobre o serviço','Novidades','O MatchApp Ai é um serviço independente de descoberta, sem vínculo, endosso ou patrocínio das plataformas de streaming listadas aqui. Todas as marcas pertencem aos respectivos titulares. A disponibilidade varia conforme a região e a assinatura. É proibida a reprodução não autorizada deste software ou de seus sistemas de IA.','Suporte:','Todos os direitos reservados.'],
  es:['Información del servicio','Novedades','MatchApp Ai es un servicio independiente de descubrimiento, sin afiliación, respaldo ni patrocinio de las plataformas de streaming aquí indicadas. Todas las marcas pertenecen a sus respectivos titulares. La disponibilidad varía según la región y la suscripción. Se prohíbe la reproducción no autorizada de este software o sus sistemas de IA.','Soporte:','Todos los derechos reservados.'],
  fr:['À propos du service','Nouveautés','MatchApp Ai est un service de découverte indépendant, sans affiliation, approbation ni parrainage des plateformes de streaming citées ici. Toutes les marques appartiennent à leurs propriétaires respectifs. La disponibilité varie selon la région et l’abonnement. Toute reproduction non autorisée de ce logiciel ou de ses systèmes d’IA est interdite.','Assistance :','Tous droits réservés.'],
  de:['Über den Dienst','Neuigkeiten','MatchApp Ai ist ein unabhängiger Entdeckungsdienst, ohne Verbindung zu den hier aufgeführten Streamingplattformen und ohne deren Empfehlung oder Sponsoring. Alle Marken gehören ihren jeweiligen Inhabern. Die Verfügbarkeit hängt von Region und Abonnement ab. Die unerlaubte Vervielfältigung dieser Software oder ihrer KI-Systeme ist untersagt.','Support:','Alle Rechte vorbehalten.'],
  it:['Informazioni sul servizio','Novità','MatchApp Ai è un servizio di scoperta indipendente, senza affiliazione, approvazione o sponsorizzazione da parte delle piattaforme di streaming qui elencate. Tutti i marchi appartengono ai rispettivi titolari. La disponibilità varia in base alla regione e all’abbonamento. È vietata la riproduzione non autorizzata di questo software o dei suoi sistemi di IA.','Assistenza:','Tutti i diritti riservati.'],
  tr:['Hizmet bilgileri','Yenilikler','MatchApp Ai bağımsız bir keşif hizmetidir; burada listelenen yayın platformlarıyla bağlantısı yoktur ve bu platformlardan destek ya da sponsorluk almaz. Tüm ticari markalar ilgili sahiplerine aittir. Kullanılabilirlik bölgeye ve aboneliğe göre değişir. Bu yazılımın veya yapay zekâ sistemlerinin izinsiz çoğaltılması yasaktır.','Destek:','Tüm hakları saklıdır.'],
  ru:['О сервисе','Что нового','MatchApp Ai — независимый сервис поиска контента, не связанный с указанными здесь стриминговыми платформами и не имеющий их одобрения или спонсорской поддержки. Все товарные знаки принадлежат их владельцам. Доступность зависит от региона и подписки. Несанкционированное воспроизведение этого ПО или его систем ИИ запрещено.','Поддержка:','Все права защищены.'],
  ar:['معلومات الخدمة','ما الجديد','MatchApp Ai خدمة مستقلة لاكتشاف المحتوى، ولا ترتبط بمنصات البث المذكورة هنا ولا تحظى بتأييدها أو رعايتها. جميع العلامات التجارية ملك لأصحابها. يختلف توفر المحتوى حسب المنطقة والاشتراك. يُحظر نسخ هذا البرنامج أو أنظمة الذكاء الاصطناعي الخاصة به دون إذن.','الدعم:','جميع الحقوق محفوظة.'],
  hi:['सेवा की जानकारी','नया क्या है','MatchApp Ai सामग्री खोजने की एक स्वतंत्र सेवा है। यहाँ सूचीबद्ध स्ट्रीमिंग प्लेटफ़ॉर्म से इसका कोई संबंध नहीं है और वे इसका समर्थन या प्रायोजन नहीं करते। सभी ट्रेडमार्क उनके संबंधित स्वामियों के हैं। उपलब्धता क्षेत्र और सदस्यता के अनुसार बदलती है। इस सॉफ़्टवेयर या इसकी AI प्रणालियों की अनधिकृत प्रतिलिपि बनाना निषिद्ध है।','सहायता:','सर्वाधिकार सुरक्षित।'],
  id:['Informasi layanan','Yang baru','MatchApp Ai adalah layanan penemuan independen, tanpa afiliasi, dukungan resmi, atau sponsor dari platform streaming yang tercantum di sini. Semua merek dagang milik pemiliknya masing-masing. Ketersediaan bergantung pada wilayah dan langganan. Dilarang menggandakan perangkat lunak ini atau sistem AI-nya tanpa izin.','Dukungan:','Hak cipta dilindungi.'],
  ja:['サービスについて','新着情報','MatchApp Aiは独立したコンテンツ発見サービスであり、ここに掲載された配信プラットフォームとの提携関係や、各社による推奨・協賛はありません。商標はそれぞれの権利者に帰属します。利用できるコンテンツは地域や契約によって異なります。本ソフトウェアおよびAIシステムの無断複製は禁止されています。','サポート：','無断転載を禁じます。'],
  ko:['서비스 안내','새로운 소식','MatchApp Ai는 독립적인 콘텐츠 탐색 서비스이며, 여기에 나열된 스트리밍 플랫폼과 제휴하거나 이들의 승인 또는 후원을 받지 않습니다. 모든 상표는 각 소유자에게 귀속됩니다. 이용 가능 여부는 지역과 구독에 따라 다릅니다. 이 소프트웨어 및 AI 시스템의 무단 복제를 금지합니다.','지원:','모든 권리 보유.'],
  zh:['服务信息','最新动态','MatchApp Ai 是独立的内容发现服务，与此处列出的流媒体平台没有关联，也未获得其认可或赞助。所有商标均属于各自的所有者。内容可用性因地区和订阅而异。禁止未经授权复制本软件或其 AI 系统。','支持：','保留所有权利。']
 },
 donate:{
  en:{'ma-donate-kicker':'Independent ideas. Shared possibilities.','ma-donate-title':'Be part of what comes next','ma-donate-desc':'Built independently. Made for your everyday discoveries. Voluntary support helps keep MatchApp Ai reliable and makes room for thoughtful improvements.','ma-donate-pill':'Support'},
  pt:{'ma-donate-kicker':'Ideias independentes. Novas possibilidades.','ma-donate-title':'Faça parte do próximo capítulo','ma-donate-desc':'Um projeto independente, feito para as suas descobertas do dia a dia. O apoio voluntário ajuda a manter o MatchApp Ai confiável e abre espaço para novas melhorias.','ma-donate-pill':'Apoiar'}
 }
};});
