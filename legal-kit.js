/* Sitewide legal chrome, cookie consent, AdSense-safe cleanup, account deletion UI. */
(function () {
  'use strict';
  if (location.pathname.indexOf('/kids/') === 0) return;

  const LINKS = [
    ['/', 'Home'],
    ['/about.html', 'About'],
    ['/privacy.html', 'Privacy'],
    ['/cookies.html', 'Cookies'],
    ['/terms.html', 'Terms'],
    ['/copyright.html', 'Copyright'],
    ['/contact.html', 'Contact']
  ];

  function ensureFooter() {
    if (document.querySelector('.ma-legal-bar')) return;
    const bar = document.createElement('nav');
    bar.className = 'ma-legal-bar';
    bar.setAttribute('aria-label', 'Legal');
    bar.innerHTML = LINKS.map(function (pair) {
      return '<a href="' + pair[0] + '">' + pair[1] + '</a>';
    }).join('<span aria-hidden="true"> · </span>') +
      '<span class="ma-legal-copy"> © 2026 MatchApp Ai</span>';
    const style = document.createElement('style');
    style.textContent = '.ma-legal-bar{position:relative;z-index:3;display:flex;flex-wrap:wrap;justify-content:center;gap:7px 9px;padding:16px 14px 24px;font-size:12px;color:#a99db6;text-align:center}.ma-legal-bar a{color:#d9bf79;text-decoration:none;font-weight:650}.ma-legal-bar a:hover{text-decoration:underline}.ma-cookie{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:5000;width:min(520px,calc(100% - 20px));margin:0;background:rgba(24,12,39,.94);color:#e9e1f1;border:1px solid rgba(243,207,105,.18);border-radius:14px;padding:10px 12px;box-shadow:0 16px 46px rgba(0,0,0,.42),0 0 24px rgba(143,83,214,.08);backdrop-filter:blur(16px);font-size:12px;line-height:1.4}.ma-cookie p{margin:0}.ma-cookie a{color:#e8cb78}.ma-cookie button{margin:8px 6px 0 0;border:0;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;cursor:pointer}.ma-cookie .ok{background:linear-gradient(135deg,#f3d570,#dcae3d);color:#251609}.ma-cookie .no{background:rgba(255,255,255,.04);color:#e9e1f1;border:1px solid rgba(239,232,255,.13)}.ma-delete-box{margin-top:22px;padding:16px;border:1px solid rgba(255,120,120,.25);border-radius:14px}@media(max-width:600px){.ma-cookie{bottom:max(7px,env(safe-area-inset-bottom));width:calc(100% - 14px);padding:9px 10px;font-size:11px}.ma-cookie button{padding:6px 10px}}';
    document.head.appendChild(style);
    document.body.appendChild(bar);
  }

  function privacyChoices() {
    if (document.getElementById('ma-privacy-choices')) return;
    // Only Google's certified CMP may collect advertising consent. The retired
    // local "all" flag is not a TCF consent record and must never grant consent.
    // Preserve a previous refusal until a new choice is made in the real CMP.
    try {
      if (localStorage.getItem('match_cookie_choice') === 'essential') {
        window.dataLayer = window.dataLayer || [];
        const gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        gtag('consent', 'update', {ad_storage:'denied', analytics_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
      }
    } catch (_) {}
    const copy = {
      en: ['Privacy and cookie settings', 'Google’s privacy controls are unavailable on this page. No consent change was saved. You can also manage stored data in your browser.'],
      'pt-BR': ['Privacidade e cookies', 'Os controles de privacidade do Google não estão disponíveis nesta página. Nenhuma alteração de consentimento foi salva. Você também pode gerenciar os dados armazenados no navegador.'],
      es: ['Privacidad y cookies', 'Los controles de privacidad de Google no están disponibles en esta página. No se guardó ningún cambio de consentimiento. También puedes gestionar los datos guardados en tu navegador.'],
      fr: ['Confidentialité et cookies', 'Les paramètres de confidentialité Google ne sont pas disponibles sur cette page. Aucun changement de consentement n’a été enregistré. Vous pouvez aussi gérer les données stockées dans votre navigateur.'],
      de: ['Datenschutz und Cookies', 'Die Google-Datenschutzeinstellungen sind auf dieser Seite nicht verfügbar. Es wurde keine Einwilligungsänderung gespeichert. Gespeicherte Daten können Sie auch im Browser verwalten.'],
      it: ['Privacy e cookie', 'I controlli sulla privacy di Google non sono disponibili in questa pagina. Nessuna modifica al consenso è stata salvata. Puoi gestire i dati memorizzati anche nel browser.'],
      tr: ['Gizlilik ve çerez ayarları', 'Google gizlilik denetimleri bu sayfada kullanılamıyor. İzin değişikliği kaydedilmedi. Saklanan verileri tarayıcınızdan da yönetebilirsiniz.'],
      ru: ['Конфиденциальность и файлы cookie', 'Настройки конфиденциальности Google недоступны на этой странице. Изменение согласия не сохранено. Сохранёнными данными также можно управлять в браузере.'],
      ar: ['إعدادات الخصوصية وملفات الارتباط', 'عناصر التحكم في خصوصية Google غير متاحة في هذه الصفحة. لم يُحفظ أي تغيير للموافقة. يمكنك أيضًا إدارة البيانات المخزنة من متصفحك.'],
      hi: ['गोपनीयता और कुकी सेटिंग', 'इस पेज पर Google के गोपनीयता नियंत्रण उपलब्ध नहीं हैं। सहमति में कोई बदलाव सहेजा नहीं गया। आप ब्राउज़र में भी संग्रहीत डेटा का प्रबंधन कर सकते हैं।'],
      id: ['Privasi dan pengaturan cookie', 'Kontrol privasi Google tidak tersedia di halaman ini. Tidak ada perubahan persetujuan yang disimpan. Anda juga dapat mengelola data tersimpan melalui browser.'],
      ja: ['プライバシーとCookieの設定', 'このページではGoogleのプライバシー設定を利用できません。同意の変更は保存されていません。保存されたデータはブラウザでも管理できます。'],
      ko: ['개인정보 및 쿠키 설정', '이 페이지에서는 Google 개인정보 설정을 사용할 수 없습니다. 동의 변경 사항이 저장되지 않았습니다. 브라우저에서도 저장된 데이터를 관리할 수 있습니다.'],
      zh: ['隐私和 Cookie 设置', '此页面暂时无法使用 Google 隐私控制。未保存任何同意设置更改。您也可以在浏览器中管理已存储的数据。']
    };
    const link = document.createElement('a');
    link.id = 'ma-privacy-choices';
    link.href = '/?privacy=choices#ma-privacy-choices';
    link.style.cssText = 'display:inline-flex;align-items:center;min-height:44px;padding:4px 8px;overflow-wrap:anywhere';
    const status = document.createElement('span');
    status.id = 'ma-privacy-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    status.style.cssText = 'flex-basis:100%;max-width:65ch;margin-inline:auto;overflow-wrap:anywhere';
    let current = copy.en;
    function translate() {
      let lang = window.MATCH_LANG || document.documentElement.lang || 'en';
      try { lang = localStorage.getItem('match_lang') || lang; } catch (_) {}
      lang = String(lang).replace(/_/g, '-');
      current = copy[lang] || copy[lang.split('-')[0] === 'pt' ? 'pt-BR' : lang.split('-')[0]] || copy.en;
      link.textContent = current[0];
      status.textContent = current[1];
    }
    translate();
    document.addEventListener('matchapp:langchange', translate);
    const bar = document.querySelector('.ma-legal-bar');
    bar.appendChild(link);
    bar.appendChild(status);
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    let ready = false;
    let requested = new URLSearchParams(location.search).get('privacy') === 'choices';
    function openChoices() {
      const fc = window.googlefc;
      if (!ready || typeof fc.showRevocationMessage !== 'function') return false;
      requested = false;
      status.hidden = true;
      fc.callbackQueue.push({CONSENT_API_READY: function () {
        try { fc.showRevocationMessage(); } catch (_) { status.hidden = false; }
      }});
      return true;
    }
    link.addEventListener('click', function (event) {
      if (openChoices()) { event.preventDefault(); return; }
      // Ad-free pages need no ad tag. Route to Home to reach its existing CMP.
      if (location.pathname !== '/' && location.pathname !== '/index.html') return;
      event.preventDefault();
      requested = true;
      status.hidden = false;
    });
    window.googlefc.callbackQueue.push({CONSENT_API_READY: function () {
      ready = true;
      if (typeof window.__tcfapi === 'function') {
        window.__tcfapi('addEventListener', 2, function (data, success) {
          if (success && data && data.eventStatus === 'useractioncomplete') {
            try { localStorage.removeItem('match_cookie_choice'); } catch (_) {}
          }
        });
      }
      if (requested) openChoices();
    }});
    if (requested && !openChoices()) status.hidden = false;
  }

  function stripConstruction() {
    const ribbon = document.getElementById('upgrade-ribbon');
    if (ribbon) ribbon.remove();
  }

  function deletionPanel() {
    const copy = (key, fallback) => window.MatchProfileDetailsI18n?.text(key) || fallback;
    const bind = (node, render) => {
      if (window.MatchProfileDetailsI18n) window.MatchProfileDetailsI18n.bind(node, render);
      else render();
    };
    const setCopy = (node, key, fallback = node.textContent) => bind(node, () => { node.textContent = copy(key, fallback); });
    const host = document.getElementById('locked-info-card') || document.getElementById('editable-fields-section');
    if (!host || document.querySelector('.ma-delete-box')) return;
    const box = document.createElement('div');
    box.className = 'ma-delete-box';
    box.innerHTML = '<h3>Delete this account</h3><p>This removes your identity, history and purchases from MatchApp. The same email can register again 72 hours later.</p><button type="button" class="secondary-btn" id="ma-delete-btn">Request deletion</button><p id="ma-delete-msg" style="font-size:13px;color:#cbb;"></p>';
    host.parentNode.appendChild(box);
    setCopy(box.querySelector('h3'), 'deleteTitle');
    setCopy(box.querySelector('p'), 'deleteBody');
    setCopy(box.querySelector('#ma-delete-btn'), 'deleteRequest');
    bind(box, () => { box.style.textAlign = 'start'; });
    let deletionPending = false;
    box.querySelector('#ma-delete-btn').addEventListener('click', async function () {
      if (deletionPending) return;
      deletionPending = true;
      this.disabled = true;
      const msg = box.querySelector('#ma-delete-msg');
      const confirmingClient = window.supabaseClient;
      const confirmingUserId = window.matchProfileState?.userId;
      try {
        const question = copy('deleteConfirm', 'Delete your MatchApp account? You can recreate it with the same email after 72 hours.');
        const accepted = typeof window.MatchAppDialogs?.confirm === 'function'
          ? await window.MatchAppDialogs.confirm(question, {trigger:this})
          : window.confirm(question);
        if (accepted !== true) return;
        const sb = window.supabaseClient;
        if (sb !== confirmingClient || window.matchProfileState?.userId !== confirmingUserId) return;
        if (!sb) { setCopy(msg, 'deleteSignIn', 'Sign in first.'); return; }
        const { data, error } = await sb.rpc('request_account_deletion');
        if (error) throw error;
        const message = data && data.message;
        if (message && message !== 'Deletion scheduled. The same email can return after 72 hours.') {
          bind(msg, () => { msg.textContent = message; msg.dir = 'auto'; });
        } else setCopy(msg, 'deleteScheduled', 'Deletion scheduled. The same email can return after 72 hours.');
        try { await sb.auth.signOut(); } catch (_) {}
      } catch (err) {
        setCopy(msg, 'deleteFailed', 'Could not complete deletion automatically. Email support@matchapp.tv and we will close the account.');
      } finally {
        deletionPending = false;
        this.disabled = false;
      }
    });
  }

  function boot() {
    stripConstruction();
    ensureFooter();
    privacyChoices();
    deletionPanel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
