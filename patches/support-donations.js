/* MatchApp Ai voluntary support. No payment credentials or recipient email in client code. */
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
    const n=amount(), base=meBase();
    return (base&&n!==null)?base+'/'+n.toFixed(2)+'USD':'';
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
    // A direct user gesture, no pop-up until the verified recipient is configured.
    window.open(url,'_blank','noopener,noreferrer');
  });
  document.addEventListener('matchapp:langchange',translate);
  window.MatchAppSupportDonations={paymentUrl,refresh};
  translate();
})();
