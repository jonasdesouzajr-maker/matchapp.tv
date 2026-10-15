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
    en:['Built with your support','Help MatchApp Ai grow','We are expanding into new entertainment experiences. If MatchApp Ai has helped you discover something great, a voluntary contribution helps us improve speed, cover hosting, and keep building. Every bit of support matters.','Support our next chapter · US$5+','Choose an amount','Custom amount (USD, minimum $5)','Continue securely with PayPal','PayPal checkout is being connected. No payment has been initiated.','Please choose at least US$5.','You are leaving MatchApp Ai for PayPal to review and confirm your contribution.','Optional support for operating and developing this independent app, not a charitable or tax-deductible gift. Donations do not unlock features. PayPal processes payments; MatchApp Ai never collects card details.'],
    pt:['Construído com seu apoio','Ajude o MatchApp Ai a crescer','Estamos expandindo para novas experiências de entretenimento. Se o MatchApp Ai ajudou você a encontrar algo especial, sua contribuição voluntária nos ajuda a melhorar a velocidade, manter a hospedagem e continuar criando. Todo apoio faz diferença.','Apoie nossa próxima fase · US$5+','Escolha um valor','Outro valor (USD, mínimo US$5)','Continuar com segurança no PayPal','A integração com o PayPal está sendo preparada. Nenhum pagamento foi iniciado.','Escolha pelo menos US$5.','Você será direcionado ao PayPal para revisar e confirmar sua contribuição.','Apoio voluntário para manter e desenvolver este aplicativo independente, não uma doação beneficente nem dedutível de impostos. A contribuição não libera recursos. O PayPal processa o pagamento; o MatchApp Ai não coleta dados do cartão.'],
    es:['Crece con tu apoyo','Ayuda a crecer a MatchApp Ai','Estamos ampliando nuestras experiencias de entretenimiento. Tu aporte voluntario ayuda a mejorar la velocidad, mantener el servicio y desarrollar nuevas funciones. Cada contribución cuenta.','Apoya nuestra próxima etapa · US$5+','Elige un importe','Otro importe (USD, mínimo $5)','Continuar de forma segura en PayPal','La conexión con PayPal está pendiente. No se inició ningún pago.','El mínimo es US$5.','Accederás a PayPal para revisar y confirmar el importe.','Aporte voluntario para mantener y desarrollar esta aplicación independiente. No es una donación benéfica ni deducible de impuestos. No desbloquea funciones; PayPal procesa el pago.'],
    fr:['Grâce à votre soutien','Aidez MatchApp Ai à grandir','Nous développons de nouvelles expériences de divertissement. Votre soutien facultatif aide à améliorer la rapidité, financer l’hébergement et poursuivre le développement.','Soutenez la suite · 5 $US+','Choisissez un montant','Autre montant (USD, minimum 5 $)','Continuer sur PayPal','Le paiement PayPal est en cours de connexion. Aucun paiement lancé.','Minimum : 5 $US.','PayPal vous permettra de vérifier et confirmer votre contribution.','Contribution facultative au développement de cette application indépendante, sans déduction fiscale ni avantage de compte. Paiement géré par PayPal.'],
    de:['Mit Ihrer Unterstützung','Unterstützen Sie MatchApp Ai','Wir entwickeln neue Entertainment-Erlebnisse. Freiwillige Beiträge helfen uns, Ladezeiten zu verbessern, Hosting zu finanzieren und neue Funktionen zu entwickeln.','Unsere Zukunft unterstützen · ab 5 USD','Betrag wählen','Eigener Betrag (USD, mindestens 5)','Sicher zu PayPal','PayPal ist noch nicht verbunden. Es wurde nichts bezahlt.','Mindestens 5 USD eingeben.','Sie prüfen und bestätigen den Betrag auf PayPal.','Freiwillige Unterstützung für diese unabhängige App, keine steuerbegünstigte Spende. Kein Freischalten von Funktionen; Zahlung über PayPal.'],
    it:['Cresciamo insieme','Aiuta MatchApp Ai a crescere','Stiamo ampliando le esperienze di intrattenimento. Un contributo facoltativo ci aiuta a migliorare la velocità, sostenere l’hosting e sviluppare nuove funzioni.','Sostieni il futuro · da 5 USD','Scegli un importo','Altro importo (USD, minimo 5)','Continua in sicurezza su PayPal','PayPal non è ancora collegato. Nessun pagamento avviato.','Minimo 5 USD.','Su PayPal potrai verificare e confermare il contributo.','Sostegno facoltativo a questa app indipendente, non donazione di beneficenza detraibile. Non sblocca funzioni; pagamento gestito da PayPal.']
  };
  Object.assign(L,{"tr": ["Desteğinizle büyüyoruz", "MatchApp Ai’ı destekleyin", "Gönüllü katkınız barındırma giderlerine ve yeni eğlence deneyimleri geliştirmemize yardımcı olur.", "Geleceğimizi destekleyin · 5 USD+", "Tutar seçin", "Özel tutar (USD, en az 5)", "PayPal ile güvenle devam edin", "PayPal bağlantısı henüz hazır değil. Ödeme başlatılmadı.", "En az 5 USD seçin.", "Katkınızı inceleyip onaylamak için PayPal’a yönlendirileceksiniz.", "Bağımsız uygulamanın geliştirilmesi için isteğe bağlı destek; vergiden düşülebilen hayır bağışı değildir. Özellik açmaz. Ödemeyi PayPal işler."], "ru": ["Создано с вашей поддержкой", "Поддержите развитие MatchApp Ai", "Добровольный взнос помогает оплачивать хостинг, ускорять приложение и создавать новые возможности для развлечений.", "Поддержать развитие · от 5 USD", "Выберите сумму", "Своя сумма (USD, минимум 5)", "Безопасно продолжить в PayPal", "PayPal ещё не подключён. Платёж не начат.", "Выберите не менее 5 USD.", "Вы перейдёте в PayPal для проверки и подтверждения взноса.", "Добровольная поддержка независимого приложения, не благотворительное пожертвование с налоговым вычетом. Функции не разблокируются. Платёж обрабатывает PayPal."], "ar": ["بدعمكم نواصل التطوير", "ساهم في تطوير MatchApp Ai", "تساعد مساهمتك الاختيارية في تغطية الاستضافة وتحسين السرعة وتطوير تجارب ترفيهية جديدة.", "ادعم خطوتنا القادمة · 5 دولارات أمريكية فأكثر", "اختر المبلغ", "مبلغ مخصص (دولار أمريكي، الحد الأدنى 5)", "المتابعة بأمان عبر PayPal", "لم يتم ربط PayPal بعد. لم تبدأ أي عملية دفع.", "اختر 5 دولارات أمريكية على الأقل.", "ستنتقل إلى PayPal لمراجعة مساهمتك وتأكيدها.", "دعم اختياري لتطوير هذا التطبيق المستقل، وليس تبرعًا خيريًا معفى من الضرائب. لا يفتح ميزات. يعالج PayPal الدفع."], "hi": ["आपके सहयोग से आगे बढ़ते हैं", "MatchApp Ai को आगे बढ़ाएँ", "आपका स्वैच्छिक योगदान होस्टिंग, बेहतर गति और मनोरंजन के नए अनुभव बनाने में मदद करता है।", "हमारे अगले कदम में सहयोग करें · US$5+", "राशि चुनें", "अपनी राशि (USD, न्यूनतम 5)", "PayPal पर सुरक्षित रूप से जारी रखें", "PayPal अभी जुड़ा नहीं है। कोई भुगतान शुरू नहीं हुआ है।", "कम से कम US$5 चुनें।", "योगदान की समीक्षा और पुष्टि के लिए आप PayPal पर जाएँगे।", "इस स्वतंत्र ऐप के विकास के लिए वैकल्पिक सहयोग; यह कर कटौती वाला धर्मार्थ दान नहीं है। इससे सुविधाएँ अनलॉक नहीं होतीं। भुगतान PayPal संभालता है।"], "id": ["Dibangun dengan dukungan Anda", "Bantu MatchApp Ai berkembang", "Kontribusi sukarela Anda membantu membayar hosting, meningkatkan kecepatan, dan membangun pengalaman hiburan baru.", "Dukung langkah berikutnya · US$5+", "Pilih jumlah", "Jumlah lain (USD, minimal 5)", "Lanjutkan dengan aman ke PayPal", "PayPal belum terhubung. Belum ada pembayaran dimulai.", "Pilih minimal US$5.", "Anda akan beralih ke PayPal untuk meninjau dan mengonfirmasi kontribusi.", "Dukungan opsional untuk pengembangan aplikasi independen ini, bukan sumbangan amal yang mengurangi pajak. Tidak membuka fitur. PayPal memproses pembayaran."], "ja": ["皆さまのご支援とともに", "MatchApp Aiの成長を応援", "任意のご支援は、ホスティング費用、速度改善、新しいエンターテインメント体験の開発に役立ちます。", "次の一歩を応援 · 5米ドルから", "金額を選択", "金額を指定（USD、最低5ドル）", "PayPalで安全に続行", "PayPalはまだ接続されていません。支払いは開始されていません。", "5米ドル以上を選択してください。", "PayPalに移動し、支援内容を確認して確定します。", "独立したアプリの開発への任意の支援です。税控除の対象となる慈善寄付ではなく、機能の追加解除もありません。決済はPayPalが処理します。"], "ko": ["여러분의 후원으로 만듭니다", "MatchApp Ai의 성장을 응원해 주세요", "자발적인 후원은 호스팅 비용, 속도 개선, 새로운 엔터테인먼트 경험 개발에 도움이 됩니다.", "다음 단계를 응원하기 · US$5 이상", "금액 선택", "직접 입력 (USD, 최소 5달러)", "PayPal에서 안전하게 계속", "아직 PayPal이 연결되지 않았습니다. 결제가 시작되지 않았습니다.", "US$5 이상을 선택해 주세요.", "PayPal로 이동하여 후원 내용을 검토하고 확인합니다.", "독립 앱 개발을 위한 선택적 후원이며 세금 공제 대상 자선 기부가 아닙니다. 기능이 추가로 잠금 해제되지 않습니다. 결제는 PayPal이 처리합니다."], "zh": ["由您的支持成就", "支持 MatchApp Ai 成长", "您的自愿支持将帮助支付托管费用、提升速度并开发更多娱乐体验。", "支持我们的下一步 · 5美元起", "选择金额", "自定金额（USD，最低5美元）", "通过 PayPal 安全继续", "PayPal 尚未连接。尚未发起付款。", "请选择至少5美元。", "您将前往 PayPal 核对并确认支持金额。", "这是对独立应用开发的自愿支持，不属于可抵税的慈善捐赠，也不会解锁功能。付款由 PayPal 处理。"]});
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
