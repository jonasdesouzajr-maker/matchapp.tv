/* MatchApp Ai voluntary support. PayPal owns checkout; no payment credentials collected. */
(function () {
  'use strict';
  if (!/^\/(?:index\.html)?$/.test(location.pathname)) return;
  const root = document.getElementById('ma-donate-support');
  if (!root || document.body.classList.contains('kids-body')) return;
  const cfg = window.MATCHAPP_SUPPORT_CONFIG || {};
  const byId = id => root.querySelector('#' + id);
  const pill = byId('ma-donate-pill');
  const panel = byId('ma-donate-panel');
  const input = byId('ma-donate-amount');
  const checkout = byId('ma-donate-checkout');
  const status = byId('ma-donate-status');
  const choices = [...root.querySelectorAll('[data-donate-value]')];
  const L = {
    en:['Be part of our growth','Help MatchApp Ai grow','Be part of MatchApp Ai’s growth. Your voluntary support keeps our servers running reliably and helps us improve speed, build better features, and create new entertainment experiences. Together, we can shape what comes next.','Help me grow the business','Choose an amount','Custom amount (USD, minimum $5)','Continue securely with PayPal','PayPal checkout is being connected. No payment has been initiated.','Please choose at least US$5.','You are leaving MatchApp Ai for PayPal to review and confirm your contribution.','Optional support for operating and developing this independent app, not a charitable or tax-deductible gift. Donations do not unlock features. PayPal processes payments; MatchApp Ai never collects card details.'],
    pt:['Faça parte do nosso crescimento','Ajude o MatchApp Ai a crescer','Faça parte do crescimento do MatchApp Ai. Seu apoio voluntário mantém nossos servidores funcionando com estabilidade e ajuda a melhorar a velocidade, desenvolver recursos e criar novas experiências de entretenimento. Juntos, construímos os próximos passos.','Ajude meu negócio a crescer','Escolha um valor','Outro valor (USD, mínimo US$5)','Continuar com segurança no PayPal','A integração com o PayPal está sendo preparada. Nenhum pagamento foi iniciado.','Escolha pelo menos US$5.','Você será direcionado ao PayPal para revisar e confirmar sua contribuição.','Apoio voluntário para manter e desenvolver este aplicativo independente, não uma doação beneficente nem dedutível de impostos. A contribuição não libera recursos. O PayPal processa o pagamento; o MatchApp Ai não coleta dados do cartão.'],
    es:['Sé parte de nuestro crecimiento','Ayuda a crecer a MatchApp Ai','Sé parte del crecimiento de MatchApp Ai. Tu aporte voluntario mantiene nuestros servidores funcionando de forma fiable y nos ayuda a mejorar la velocidad, desarrollar funciones y crear nuevas experiencias. Juntos construimos lo que viene.','Ayúdame a hacer crecer mi negocio','Elige un importe','Otro importe (USD, mínimo $5)','Continuar de forma segura en PayPal','La conexión con PayPal está pendiente. No se inició ningún pago.','El mínimo es US$5.','Accederás a PayPal para revisar y confirmar el importe.','Aporte voluntario para mantener y desarrollar esta aplicación independiente. No es una donación benéfica ni deducible de impuestos. No desbloquea funciones; PayPal procesa el pago.'],
    fr:['Participez à notre croissance','Aidez MatchApp Ai à grandir','Participez à la croissance de MatchApp Ai. Votre soutien volontaire assure le bon fonctionnement de nos serveurs et nous aide à améliorer la rapidité, développer des fonctionnalités et créer de nouvelles expériences. Ensemble, construisons la suite.','Aidez-moi à développer mon activité','Choisissez un montant','Autre montant (USD, minimum 5 $)','Continuer sur PayPal','Le paiement PayPal est en cours de connexion. Aucun paiement lancé.','Minimum : 5 $US.','PayPal vous permettra de vérifier et confirmer votre contribution.','Contribution facultative au développement de cette application indépendante, sans déduction fiscale ni avantage de compte. Paiement géré par PayPal.'],
    de:['Gestalten Sie unser Wachstum mit','Unterstützen Sie MatchApp Ai','Gestalten Sie das Wachstum von MatchApp Ai mit. Ihre freiwillige Unterstützung hält unsere Server zuverlässig am Laufen und hilft uns, die Geschwindigkeit zu verbessern, Funktionen zu entwickeln und neue Erlebnisse zu schaffen. Gemeinsam gestalten wir die nächsten Schritte.','Hilf mir, mein Unternehmen auszubauen','Betrag wählen','Eigener Betrag (USD, mindestens 5)','Sicher zu PayPal','PayPal ist noch nicht verbunden. Es wurde nichts bezahlt.','Mindestens 5 USD eingeben.','Sie prüfen und bestätigen den Betrag auf PayPal.','Freiwillige Unterstützung für diese unabhängige App, keine steuerbegünstigte Spende. Kein Freischalten von Funktionen; Zahlung über PayPal.'],
    it:['Partecipa alla nostra crescita','Aiuta MatchApp Ai a crescere','Partecipa alla crescita di MatchApp Ai. Il tuo sostegno volontario mantiene i server affidabili e ci aiuta a migliorare la velocità, sviluppare funzioni e creare nuove esperienze. Insieme costruiamo il prossimo capitolo.','Aiutami a far crescere la mia attività','Scegli un importo','Altro importo (USD, minimo 5)','Continua in sicurezza su PayPal','PayPal non è ancora collegato. Nessun pagamento avviato.','Minimo 5 USD.','Su PayPal potrai verificare e confermare il contributo.','Sostegno facoltativo a questa app indipendente, non donazione di beneficenza detraibile. Non sblocca funzioni; pagamento gestito da PayPal.']
  };
  Object.assign(L,{"tr": ["Büyümemizin bir parçası olun", "MatchApp Ai’ı destekleyin", "MatchApp Ai’ın büyümesine katılın. Gönüllü desteğiniz sunucularımızın güvenilir çalışmasını sağlar; hız iyileştirmelerine, yeni özelliklere ve eğlence deneyimlerine katkı sunar. Geleceği birlikte şekillendirelim.", "İşimi büyütmeme destek ol", "Tutar seçin", "Özel tutar (USD, en az 5)", "PayPal ile güvenle devam edin", "PayPal bağlantısı henüz hazır değil. Ödeme başlatılmadı.", "En az 5 USD seçin.", "Katkınızı inceleyip onaylamak için PayPal’a yönlendirileceksiniz.", "Bağımsız uygulamanın geliştirilmesi için isteğe bağlı destek; vergiden düşülebilen hayır bağışı değildir. Özellik açmaz. Ödemeyi PayPal işler."], "ru": ["Станьте частью нашего роста", "Поддержите развитие MatchApp Ai", "Станьте частью развития MatchApp Ai. Ваша добровольная поддержка помогает нашим серверам работать надёжно, повышать скорость и создавать новые функции и возможности для развлечений. Вместе мы определяем следующие шаги.", "Помогите мне развивать своё дело", "Выберите сумму", "Своя сумма (USD, минимум 5)", "Безопасно продолжить в PayPal", "PayPal ещё не подключён. Платёж не начат.", "Выберите не менее 5 USD.", "Вы перейдёте в PayPal для проверки и подтверждения взноса.", "Добровольная поддержка независимого приложения, не благотворительное пожертвование с налоговым вычетом. Функции не разблокируются. Платёж обрабатывает PayPal."], "ar": ["كن جزءًا من نمونا", "ساهم في تطوير MatchApp Ai", "كن جزءًا من نمو MatchApp Ai. يساعد دعمك الاختياري في الحفاظ على موثوقية خوادمنا وتحسين السرعة وتطوير الميزات وابتكار تجارب ترفيهية جديدة. معًا نصنع الخطوة القادمة.", "ساعدني على تنمية مشروعي", "اختر المبلغ", "مبلغ مخصص (دولار أمريكي، الحد الأدنى 5)", "المتابعة بأمان عبر PayPal", "لم يتم ربط PayPal بعد. لم تبدأ أي عملية دفع.", "اختر 5 دولارات أمريكية على الأقل.", "ستنتقل إلى PayPal لمراجعة مساهمتك وتأكيدها.", "دعم اختياري لتطوير هذا التطبيق المستقل، وليس تبرعًا خيريًا معفى من الضرائب. لا يفتح ميزات. يعالج PayPal الدفع."], "hi": ["हमारे विकास का हिस्सा बनें", "MatchApp Ai को आगे बढ़ाएँ", "MatchApp Ai के विकास का हिस्सा बनें। आपका स्वैच्छिक सहयोग सर्वर को भरोसेमंद ढंग से चालू रखने, गति सुधारने और नई सुविधाएँ तथा मनोरंजन अनुभव बनाने में मदद करता है। मिलकर हम अगला कदम तय करते हैं।", "मेरा व्यवसाय बढ़ाने में मदद करें", "राशि चुनें", "अपनी राशि (USD, न्यूनतम 5)", "PayPal पर सुरक्षित रूप से जारी रखें", "PayPal अभी जुड़ा नहीं है। कोई भुगतान शुरू नहीं हुआ है।", "कम से कम US$5 चुनें।", "योगदान की समीक्षा और पुष्टि के लिए आप PayPal पर जाएँगे।", "इस स्वतंत्र ऐप के विकास के लिए वैकल्पिक सहयोग; यह कर कटौती वाला धर्मार्थ दान नहीं है। इससे सुविधाएँ अनलॉक नहीं होतीं। भुगतान PayPal संभालता है।"], "id": ["Jadilah bagian dari pertumbuhan kami", "Bantu MatchApp Ai berkembang", "Jadilah bagian dari pertumbuhan MatchApp Ai. Dukungan sukarela Anda menjaga server kami tetap andal serta membantu meningkatkan kecepatan, mengembangkan fitur, dan menciptakan pengalaman hiburan baru. Bersama, kita membangun langkah berikutnya.", "Bantu saya mengembangkan usaha ini", "Pilih jumlah", "Jumlah lain (USD, minimal 5)", "Lanjutkan dengan aman ke PayPal", "PayPal belum terhubung. Belum ada pembayaran dimulai.", "Pilih minimal US$5.", "Anda akan beralih ke PayPal untuk meninjau dan mengonfirmasi kontribusi.", "Dukungan opsional untuk pengembangan aplikasi independen ini, bukan sumbangan amal yang mengurangi pajak. Tidak membuka fitur. PayPal memproses pembayaran."], "ja": ["私たちの成長をともに", "MatchApp Aiの成長を応援", "MatchApp Aiの成長にご参加ください。任意のご支援は、サーバーの安定稼働、速度の改善、新機能や新しいエンターテインメント体験の開発に役立ちます。次の一歩を一緒につくりましょう。", "事業の成長を応援する", "金額を選択", "金額を指定（USD、最低5ドル）", "PayPalで安全に続行", "PayPalはまだ接続されていません。支払いは開始されていません。", "5米ドル以上を選択してください。", "PayPalに移動し、支援内容を確認して確定します。", "独立したアプリの開発への任意の支援です。税控除の対象となる慈善寄付ではなく、機能の追加解除もありません。決済はPayPalが処理します。"], "ko": ["함께 성장해요", "MatchApp Ai의 성장을 응원해 주세요", "MatchApp Ai의 성장에 함께해 주세요. 자발적인 후원은 서버의 안정적인 운영, 속도 개선, 새로운 기능과 엔터테인먼트 경험 개발에 도움이 됩니다. 다음 단계를 함께 만들어 갑니다.", "사업 성장을 응원해 주세요", "금액 선택", "직접 입력 (USD, 최소 5달러)", "PayPal에서 안전하게 계속", "아직 PayPal이 연결되지 않았습니다. 결제가 시작되지 않았습니다.", "US$5 이상을 선택해 주세요.", "PayPal로 이동하여 후원 내용을 검토하고 확인합니다.", "독립 앱 개발을 위한 선택적 후원이며 세금 공제 대상 자선 기부가 아닙니다. 기능이 추가로 잠금 해제되지 않습니다. 결제는 PayPal이 처리합니다."], "zh": ["成为我们成长的一部分", "支持 MatchApp Ai 成长", "加入 MatchApp Ai 的成长之路。您的自愿支持将帮助服务器稳定运行、提升速度，并开发更好的功能和全新的娱乐体验。让我们一起创造下一步。", "助我发展这项事业", "选择金额", "自定金额（USD，最低5美元）", "通过 PayPal 安全继续", "PayPal 尚未连接。尚未发起付款。", "请选择至少5美元。", "您将前往 PayPal 核对并确认支持金额。", "这是对独立应用开发的自愿支持，不属于可抵税的慈善捐赠，也不会解锁功能。付款由 PayPal 处理。"]});
  function lang() {
    const raw=String(document.documentElement.lang||'en').toLowerCase().split('-')[0];
    return L[raw]||L.en;
  }
  function meBase() {
    try {
      if (!cfg.verified) return '';
      const u = new URL(String(cfg.paypalMeUrl||'').trim());
      if(u.protocol!=='https:' || !['paypal.me','www.paypal.me'].includes(u.hostname) ||
         !/^\/[A-Za-z0-9._-]{2,20}\/?$/.test(u.pathname) ||
         u.username || u.password || u.search || u.hash) return '';
      return 'https://www.paypal.me' + u.pathname.replace(/\/$/,'');
    } catch (_) { return ''; }
  }
  function amount() { const n=Number(input.value); return Number.isFinite(n)&&n>=5 ? Math.round(n*100)/100 : null; }
  function paymentUrl() {
    const n=amount();if(n===null)return '';
    const email=String(cfg.paypalBusinessEmail||'').trim();
    if(cfg.recipientConfirmed===true&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)){
      const url=new URL('https://www.paypal.com/donate/');
      url.search=new URLSearchParams({business:email,item_name:'Support MatchApp Ai',currency_code:'USD',amount:n.toFixed(2)}).toString();
      return url.href;
    }
    const base=meBase();return base?base+'/'+n.toFixed(2)+'USD':'';
  }
  function refresh() {
    const n=amount(), url=paymentUrl(), copy=lang();
    choices.forEach(b=>b.setAttribute('aria-pressed',n!==null && Number(b.dataset.donateValue)===n?'true':'false'));
    checkout.disabled=!url;
    if(n===null) status.textContent=copy[8];
    else if(!url) status.textContent=copy[7];
    else status.textContent=copy[9];
  }
  function translate() {
    const copy=lang();
    const fields=['ma-donate-kicker','ma-donate-title','ma-donate-desc','ma-donate-pill','ma-donate-choose','ma-donate-amount-label','ma-donate-checkout',null,null,null,'ma-donate-footnote'];
    fields.forEach((id,i)=>{if(id && byId(id))byId(id).textContent=copy[i]});
    refresh();
  }
  pill.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    pill.setAttribute('aria-expanded',panel.hidden?'false':'true');
    if(!panel.hidden) refresh();
  });
  choices.forEach(b=>b.addEventListener('click',()=>{
    input.value=b.dataset.donateValue;
    refresh();
  }));
  input.addEventListener('input',refresh);
  checkout.addEventListener('click',()=>{
    const url=paymentUrl();
    if(!url){refresh();return;}
    // A direct user gesture, no pop-up until an owner-confirmed recipient is configured.
    window.open(url,'_blank','noopener,noreferrer');
  });
  document.addEventListener('matchapp:langchange',translate);
  window.MatchAppSupportDonations={paymentUrl,refresh};
  translate();
})();