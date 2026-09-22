/* ============================================================
   MatchApp Kids guardian (2026-09-22). Additive and bounded.
   C3  grown-up check before leaving Kids Mode for adult areas
   C5  optional daily time nudge (off by default; counts only while
       a Kids page is visible; one 30 s interval only when enabled)
   C4  Kids favorites follow the signed-in family account
   No observers on content; one attribute-filtered observer on <html lang>.
   ============================================================ */
(function () {
  'use strict';
  if (window.__kidsGuardian) return;
  window.__kidsGuardian = true;

  const STR = {
    'en': { gateTitle: 'Grown-ups only', gateText: 'Hold the button for 3 seconds, or answer the sum.', hold: 'Press and hold', holding: 'Keep holding… {s}', sum: 'What is {a} + {b}?', go: 'Continue', wrong: 'Not quite — try again.', cancel: 'Cancel', timeBtn: 'Time limit', timeTitle: 'Daily time in MatchApp Kids', timeText: 'Counts time spent browsing MatchApp Kids on this device. When it runs out, a friendly break screen appears.', off: 'Off', min: '{n} min', save: 'Save', upTitle: 'That’s enough for today!', upText: 'Time for a break — play, read or rest. A grown-up can add more time.', unlock: 'Grown-ups: add 15 minutes' },
    'pt-BR': { gateTitle: 'Só para adultos', gateText: 'Segure o botão por 3 segundos ou responda à conta.', hold: 'Toque e segure', holding: 'Continue segurando… {s}', sum: 'Quanto é {a} + {b}?', go: 'Continuar', wrong: 'Quase — tente de novo.', cancel: 'Cancelar', timeBtn: 'Limite de tempo', timeTitle: 'Tempo diário no MatchApp Kids', timeText: 'Conta o tempo navegando no MatchApp Kids neste aparelho. Quando acabar, aparece uma tela de pausa amigável.', off: 'Desligado', min: '{n} min', save: 'Salvar', upTitle: 'Por hoje é só!', upText: 'Hora de uma pausa — brincar, ler ou descansar. Um adulto pode liberar mais tempo.', unlock: 'Adultos: +15 minutos' },
    'es': { gateTitle: 'Solo para adultos', gateText: 'Mantén pulsado el botón 3 segundos o responde la suma.', hold: 'Mantén pulsado', holding: 'Sigue pulsando… {s}', sum: '¿Cuánto es {a} + {b}?', go: 'Continuar', wrong: 'Casi: inténtalo de nuevo.', cancel: 'Cancelar', timeBtn: 'Límite de tiempo', timeTitle: 'Tiempo diario en MatchApp Kids', timeText: 'Cuenta el tiempo navegando en MatchApp Kids en este dispositivo. Al terminar, aparece una pantalla de descanso amigable.', off: 'Desactivado', min: '{n} min', save: 'Guardar', upTitle: '¡Por hoy es suficiente!', upText: 'Hora de un descanso: jugar, leer o descansar. Un adulto puede añadir más tiempo.', unlock: 'Adultos: +15 minutos' },
    'fr': { gateTitle: 'Réservé aux adultes', gateText: 'Maintenez le bouton 3 secondes ou répondez au calcul.', hold: 'Maintenir appuyé', holding: 'Continuez… {s}', sum: 'Combien font {a} + {b} ?', go: 'Continuer', wrong: 'Presque — réessayez.', cancel: 'Annuler', timeBtn: 'Limite de temps', timeTitle: 'Temps quotidien sur MatchApp Kids', timeText: 'Compte le temps passé sur MatchApp Kids sur cet appareil. À la fin, un écran de pause bienveillant s’affiche.', off: 'Désactivé', min: '{n} min', save: 'Enregistrer', upTitle: 'C’est assez pour aujourd’hui !', upText: 'C’est l’heure d’une pause : jouer, lire ou se reposer. Un adulte peut ajouter du temps.', unlock: 'Adultes : +15 minutes' },
    'de': { gateTitle: 'Nur für Erwachsene', gateText: 'Halte die Taste 3 Sekunden gedrückt oder löse die Rechenaufgabe.', hold: 'Gedrückt halten', holding: 'Weiter halten … {s}', sum: 'Was ist {a} + {b}?', go: 'Weiter', wrong: 'Fast – versuch es noch einmal.', cancel: 'Abbrechen', timeBtn: 'Zeitlimit', timeTitle: 'Tägliche Zeit in MatchApp Kids', timeText: 'Zählt die Zeit in MatchApp Kids auf diesem Gerät. Danach erscheint ein freundlicher Pausenbildschirm.', off: 'Aus', min: '{n} Min.', save: 'Speichern', upTitle: 'Für heute ist genug!', upText: 'Zeit für eine Pause – spielen, lesen oder ausruhen. Ein Erwachsener kann mehr Zeit freigeben.', unlock: 'Erwachsene: +15 Minuten' },
    'it': { gateTitle: 'Solo per adulti', gateText: 'Tieni premuto il pulsante per 3 secondi o rispondi al calcolo.', hold: 'Tieni premuto', holding: 'Continua a tenere… {s}', sum: 'Quanto fa {a} + {b}?', go: 'Continua', wrong: 'Quasi: riprova.', cancel: 'Annulla', timeBtn: 'Limite di tempo', timeTitle: 'Tempo giornaliero su MatchApp Kids', timeText: 'Conta il tempo trascorso su MatchApp Kids su questo dispositivo. Allo scadere compare una schermata di pausa gentile.', off: 'Disattivato', min: '{n} min', save: 'Salva', upTitle: 'Per oggi basta così!', upText: 'È ora di una pausa: gioca, leggi o riposa. Un adulto può aggiungere altro tempo.', unlock: 'Adulti: +15 minuti' },
    'tr': { gateTitle: 'Yalnızca yetişkinler', gateText: 'Düğmeyi 3 saniye basılı tutun ya da işlemi yanıtlayın.', hold: 'Basılı tutun', holding: 'Tutmaya devam… {s}', sum: '{a} + {b} kaç eder?', go: 'Devam', wrong: 'Az kaldı — tekrar deneyin.', cancel: 'Vazgeç', timeBtn: 'Süre sınırı', timeTitle: 'MatchApp Kids’te günlük süre', timeText: 'Bu cihazda MatchApp Kids’te geçen süreyi sayar. Süre dolunca dostça bir mola ekranı açılır.', off: 'Kapalı', min: '{n} dk', save: 'Kaydet', upTitle: 'Bugünlük bu kadar!', upText: 'Mola zamanı — oyna, oku ya da dinlen. Bir yetişkin daha fazla süre ekleyebilir.', unlock: 'Yetişkinler: +15 dakika' },
    'ru': { gateTitle: 'Только для взрослых', gateText: 'Удерживайте кнопку 3 секунды или решите пример.', hold: 'Нажмите и держите', holding: 'Держите… {s}', sum: 'Сколько будет {a} + {b}?', go: 'Продолжить', wrong: 'Почти — попробуйте ещё раз.', cancel: 'Отмена', timeBtn: 'Лимит времени', timeTitle: 'Время в MatchApp Kids в день', timeText: 'Считает время в MatchApp Kids на этом устройстве. Когда оно закончится, появится дружелюбный экран перерыва.', off: 'Выкл.', min: '{n} мин', save: 'Сохранить', upTitle: 'На сегодня хватит!', upText: 'Пора сделать перерыв — поиграть, почитать или отдохнуть. Взрослый может добавить время.', unlock: 'Взрослым: +15 минут' },
    'ar': { gateTitle: 'للكبار فقط', gateText: 'اضغط مطولاً على الزر 3 ثوانٍ أو أجب عن المسألة.', hold: 'اضغط مطولاً', holding: 'واصل الضغط… {s}', sum: 'كم يساوي {a} + {b}؟', go: 'متابعة', wrong: 'اقتربت — حاول مجدداً.', cancel: 'إلغاء', timeBtn: 'حد الوقت', timeTitle: 'الوقت اليومي في MatchApp Kids', timeText: 'يحسب الوقت المستغرق في MatchApp Kids على هذا الجهاز. عند انتهائه تظهر شاشة استراحة لطيفة.', off: 'إيقاف', min: '{n} دقيقة', save: 'حفظ', upTitle: 'يكفي لهذا اليوم!', upText: 'حان وقت الاستراحة — العب أو اقرأ أو استرح. يمكن لشخص بالغ إضافة المزيد من الوقت.', unlock: 'للكبار: +15 دقيقة' },
    'hi': { gateTitle: 'केवल बड़ों के लिए', gateText: 'बटन को 3 सेकंड दबाए रखें या जोड़ का जवाब दें।', hold: 'दबाकर रखें', holding: 'दबाए रखें… {s}', sum: '{a} + {b} कितना होता है?', go: 'आगे बढ़ें', wrong: 'लगभग — फिर से कोशिश करें।', cancel: 'रद्द करें', timeBtn: 'समय सीमा', timeTitle: 'MatchApp Kids में रोज़ का समय', timeText: 'इस डिवाइस पर MatchApp Kids में बिताया समय गिनता है। समय पूरा होने पर एक प्यारी ब्रेक स्क्रीन दिखती है।', off: 'बंद', min: '{n} मिनट', save: 'सेव करें', upTitle: 'आज के लिए इतना काफ़ी है!', upText: 'ब्रेक का समय — खेलें, पढ़ें या आराम करें। कोई बड़ा और समय जोड़ सकता है।', unlock: 'बड़ों के लिए: +15 मिनट' },
    'id': { gateTitle: 'Khusus orang dewasa', gateText: 'Tahan tombol selama 3 detik, atau jawab soal penjumlahan.', hold: 'Tekan dan tahan', holding: 'Terus tahan… {s}', sum: 'Berapa {a} + {b}?', go: 'Lanjutkan', wrong: 'Hampir — coba lagi.', cancel: 'Batal', timeBtn: 'Batas waktu', timeTitle: 'Waktu harian di MatchApp Kids', timeText: 'Menghitung waktu menjelajah MatchApp Kids di perangkat ini. Saat habis, layar istirahat yang ramah akan muncul.', off: 'Mati', min: '{n} mnt', save: 'Simpan', upTitle: 'Cukup untuk hari ini!', upText: 'Waktunya istirahat — bermain, membaca, atau beristirahat. Orang dewasa bisa menambah waktu.', unlock: 'Orang dewasa: +15 menit' },
    'ja': { gateTitle: '保護者の方へ', gateText: 'ボタンを3秒間長押しするか、計算に答えてください。', hold: '長押し', holding: 'そのまま押し続けて… {s}', sum: '{a} + {b} はいくつ？', go: '続ける', wrong: 'おしい！もう一度どうぞ。', cancel: 'キャンセル', timeBtn: '利用時間', timeTitle: 'MatchApp Kids の1日の利用時間', timeText: 'この端末でMatchApp Kidsを見ている時間を数えます。時間になると、やさしい休憩画面が表示されます。', off: 'オフ', min: '{n}分', save: '保存', upTitle: '今日はここまで！', upText: '休憩の時間です。遊んだり、本を読んだり、ひと休みしましょう。保護者の方は時間を追加できます。', unlock: '保護者：15分追加' },
    'ko': { gateTitle: '보호자 전용', gateText: '버튼을 3초 동안 누르고 있거나 덧셈 문제에 답하세요.', hold: '길게 누르기', holding: '계속 누르세요… {s}', sum: '{a} + {b}는 얼마일까요?', go: '계속', wrong: '아쉬워요. 다시 해 보세요.', cancel: '취소', timeBtn: '이용 시간', timeTitle: 'MatchApp Kids 하루 이용 시간', timeText: '이 기기에서 MatchApp Kids를 둘러본 시간을 셉니다. 시간이 다 되면 친근한 휴식 화면이 나타나요.', off: '끄기', min: '{n}분', save: '저장', upTitle: '오늘은 여기까지!', upText: '쉬는 시간이에요. 놀거나 책을 읽거나 쉬어요. 보호자가 시간을 더 줄 수 있어요.', unlock: '보호자: 15분 추가' },
    'zh': { gateTitle: '仅限家长', gateText: '按住按钮 3 秒，或回答算术题。', hold: '按住', holding: '继续按住… {s}', sum: '{a} + {b} 等于多少？', go: '继续', wrong: '差一点——再试一次。', cancel: '取消', timeBtn: '时间限制', timeTitle: '每天在 MatchApp Kids 的时间', timeText: '统计在这台设备上浏览 MatchApp Kids 的时间。时间到了会出现友好的休息画面。', off: '关闭', min: '{n} 分钟', save: '保存', upTitle: '今天就到这里！', upText: '休息一下吧——玩耍、读书或歇一歇。家长可以增加时间。', unlock: '家长：增加 15 分钟' }
  };

  const AUTH_COPY = {
    'en': {
      gateText: 'Hold the hand for 3 seconds, then verify with your parent unlock.',
      holdAria: 'Hold for 3 seconds to start parent verification',
      checking: 'Checking parent verification…',
      pinLabel: 'Parent PIN',
      pinGo: 'Unlock',
      pinWrong: 'That PIN is not correct.',
      setupTitle: 'Set up parent unlock',
      setupText: 'A grown-up must set the unlock method before Kids Mode can continue.',
      setupBio: 'Use Face ID / fingerprint',
      setupPin: 'Use a 4-digit PIN',
      pinCreate: 'Create 4-digit PIN',
      pinConfirm: 'Confirm PIN',
      pinSave: 'Save PIN',
      pinMismatch: 'Enter the same 4-digit PIN twice.',
      bioFailed: 'Biometric verification was not completed.'
    },
    'pt-BR': {
      gateText: 'Segure a mão por 3 segundos e confirme o acesso do responsável.',
      holdAria: 'Segure por 3 segundos para iniciar a verificação do responsável',
      checking: 'Verificando o responsável…',
      pinLabel: 'PIN do responsável',
      pinGo: 'Desbloquear',
      pinWrong: 'Esse PIN não está correto.',
      setupTitle: 'Configure o acesso do responsável',
      setupText: 'Um adulto precisa configurar o desbloqueio antes de continuar no Modo Kids.',
      setupBio: 'Usar Face ID / impressão digital',
      setupPin: 'Usar PIN de 4 dígitos',
      pinCreate: 'Crie o PIN de 4 dígitos',
      pinConfirm: 'Confirme o PIN',
      pinSave: 'Salvar PIN',
      pinMismatch: 'Digite o mesmo PIN de 4 dígitos duas vezes.',
      bioFailed: 'A verificação biométrica não foi concluída.'
    }
  };
  function authText(key) {
    const pack = AUTH_COPY[lang()] || AUTH_COPY.en;
    return pack[key] || AUTH_COPY.en[key] || '';
  }
  const LANGS = Object.keys(STR);
  const LIMIT_KEY = 'match_kids_time_limit', USED_KEY = 'match_kids_time_used', MODE_KEY = 'match_kids_mode';
  const PIN_KEY = 'match_kids_parent_pin_v1', AUTH_PREF_KEY = 'match_kids_parent_auth_v1', CREDENTIAL_KEY = 'match_kids_parent_credential_v1';
  const LIMITS = [15, 30, 45, 60];
  const read = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  function lang() {
    const low = String(document.documentElement.getAttribute('lang') || read('match_lang') || 'en').toLowerCase();
    if (low.startsWith('pt')) return 'pt-BR';
    if (low.startsWith('zh')) return 'zh';
    return LANGS.find(l => l.toLowerCase() === low) || LANGS.find(l => l.split('-')[0] === low.split('-')[0]) || 'en';
  }
  function t(key, vars) {
    let s = (STR[lang()] && STR[lang()][key]) || STR.en[key] || '';
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }
  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  function openDialog(d) {
    if (!d) return;
    try { if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); return; } } catch (_) {}
    d.setAttribute('open', '');
  }
  function closeDialog(d) {
    if (!d) return;
    try { if (typeof d.close === 'function') { if (d.open) d.close(); return; } } catch (_) {}
    d.removeAttribute('open');
  }
  function installStyles() {
    if (document.getElementById('kids-guardian-style')) return;
    const s = document.createElement('style');
    s.id = 'kids-guardian-style';
    s.textContent = [
      '.kids-gate,.kids-timeup,.kids-time-settings{box-sizing:border-box;width:min(92vw,420px);max-width:420px;border:2px solid #ffd35a;border-radius:24px;padding:22px 20px;background:#1b1340;color:#fff8e6;font:600 16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}',
      '.kids-gate::backdrop,.kids-timeup::backdrop,.kids-time-settings::backdrop{background:rgba(10,6,30,.74)}',
      '.kids-gate h2,.kids-timeup h2,.kids-time-settings h2{margin:0 0 8px;font-size:22px;line-height:1.25}',
      '.kids-gate p,.kids-timeup p,.kids-time-settings p{margin:0 0 12px}',
      '.kids-gate-hold{--hold-progress:0;display:grid;place-items:center;width:92px;height:92px;min-height:92px;margin:10px auto 16px;padding:7px;border:0;border-radius:50%;background:conic-gradient(#ffd35a calc(var(--hold-progress) * 1turn),#4a3a74 0);color:#fff;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;box-shadow:0 8px 24px rgba(0,0,0,.28)}',
      '.kids-gate-hold[data-holding="1"]{box-shadow:0 8px 28px rgba(255,211,90,.24)}',
      '.kids-gate-hand{display:grid;place-items:center;width:76px;height:76px;border-radius:50%;background:#2a1f5c;font-size:34px;line-height:1}',
      '.kids-gate-pin-form,.kids-parent-pin-setup{display:grid;grid-template-columns:1fr;gap:8px;align-items:center;justify-items:center;margin:4px 0 8px}',
      '.kids-gate-pin-form[hidden],.kids-parent-pin-setup[hidden]{display:none!important}',
      '.kids-gate-pin-form label,.kids-parent-pin-setup label{font-weight:700}',
      '.kids-gate-pin-form input,.kids-parent-pin-setup input{width:8em;min-height:48px;padding:8px;border-radius:12px;border:2px solid #7cd8ff;background:#0f0b26;color:#fff;font-size:20px;letter-spacing:.18em;text-align:center}',
      '.kids-parent-setup>.kids-parent-bio,.kids-parent-setup>.kids-parent-pin-choice{display:block;width:100%;margin:8px 0}',
      '.kids-parent-setup>[hidden]{display:none!important}',
      '.kids-gate button,.kids-timeup button,.kids-time-settings button{min-height:44px;padding:10px 16px;border-radius:14px;border:2px solid #ffd35a;background:#ffd35a;color:#1b1340;font:800 15px/1.2 system-ui,sans-serif;cursor:pointer}',
      '.kids-gate .kids-gate-hold{color:#fff}',
      '.kids-gate .kids-gate-cancel,.kids-time-settings .kids-gate-cancel{background:transparent;color:#ffe9a8;margin-top:12px}',
      '.kids-gate-msg{min-height:1.4em;margin:8px 0 0!important;color:#ffb3c7}',
      '.kids-time-settings select{min-height:44px;margin:4px 0 14px;padding:8px 12px;border-radius:12px;border:2px solid #7cd8ff;background:#0f0b26;color:#fff;font-size:17px}',
      '.kids-time-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}',
      '.kids-timeup-moon{width:58px;height:58px;margin:0 auto 12px;border-radius:50%;box-shadow:inset -15px -6px 0 0 #ffd35a}',
      'button.kids-time-pill{appearance:none;-webkit-appearance:none;font:inherit;cursor:pointer}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- C3: grown-up check ---------- */
  let gate = null, gateResolve = null, gatePinResolve = null, holdFrame = 0, holdStart = 0, authPending = false;
  let setupDialog = null, setupResolve = null, setupPromise = null;
  let nativeResolve = null, nativeTimer = 0;
  const requestFrame = window.requestAnimationFrame ? cb => window.requestAnimationFrame(cb) : cb => setTimeout(() => cb(Date.now()), 16);
  const cancelFrame = window.cancelAnimationFrame ? id => window.cancelAnimationFrame(id) : id => clearTimeout(id);

  function isMobileLike() {
    const ua = String(navigator.userAgent || '');
    try {
      if (navigator.userAgentData && navigator.userAgentData.mobile === true) return true;
    } catch (_) {}
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
    if (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1) return true;
    try {
      const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
      const shortest = Math.min(Number(screen.width || 0), Number(screen.height || 0));
      if (coarse && shortest > 0 && shortest <= 1024) return true;
    } catch (_) {}
    return false;
  }
  function isDesktopGate() { return !isMobileLike(); }
  function bytesToB64Url(value) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function b64UrlToBytes(value) {
    const base = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = base + '='.repeat((4 - (base.length % 4 || 4)) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  function randomBytes(size) {
    const out = new Uint8Array(size);
    try {
      if (window.crypto && crypto.getRandomValues) return crypto.getRandomValues(out);
    } catch (_) {}
    for (let i = 0; i < out.length; i += 1) out[i] = Math.floor(Math.random() * 256);
    return out;
  }
  async function pinDigest(pin, salt) {
    const payload = String(salt || '') + ':' + String(pin || '');
    try {
      if (window.crypto && crypto.subtle && window.TextEncoder) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
        return bytesToB64Url(digest);
      }
    } catch (_) {}
    let h = 2166136261;
    for (let i = 0; i < payload.length; i += 1) {
      h ^= payload.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function pinRecord() {
    try {
      const parsed = JSON.parse(read(PIN_KEY) || 'null');
      return parsed && parsed.salt && parsed.digest ? parsed : null;
    } catch (_) { return null; }
  }
  async function savePin(pin) {
    if (!/^\d{4}$/.test(String(pin || ''))) return false;
    const salt = bytesToB64Url(randomBytes(16));
    const digest = await pinDigest(pin, salt);
    write(PIN_KEY, JSON.stringify({ v: 1, salt, digest }));
    write(AUTH_PREF_KEY, 'pin');
    return true;
  }
  async function verifyPin(pin) {
    const rec = pinRecord();
    if (!rec || !/^\d{4}$/.test(String(pin || ''))) return false;
    return (await pinDigest(pin, rec.salt)) === rec.digest;
  }
  function nativeBridge() {
    const b = window.MatchAppNativeGuardian;
    return b && typeof b.authenticate === 'function' ? b : null;
  }
  window.matchAppNativeGuardianResult = function (ok, code) {
    if (!nativeResolve) return;
    const resolve = nativeResolve;
    nativeResolve = null;
    if (nativeTimer) { clearTimeout(nativeTimer); nativeTimer = 0; }
    resolve({ ok: ok === true || ok === 'true', code: String(code || '') });
  };
  function nativeAuthenticate() {
    return new Promise(resolve => {
      const bridge = nativeBridge();
      if (!bridge) { resolve(false); return; }
      if (nativeResolve) { const prior = nativeResolve; nativeResolve = null; prior({ ok: false, code: 'superseded' }); }
      nativeResolve = result => resolve(!!(result && result.ok));
      nativeTimer = setTimeout(() => {
        if (!nativeResolve) return;
        const done = nativeResolve;
        nativeResolve = null;
        nativeTimer = 0;
        done({ ok: false, code: 'timeout' });
      }, 45000);
      try { bridge.authenticate(); } catch (_) {
        if (nativeTimer) { clearTimeout(nativeTimer); nativeTimer = 0; }
        nativeResolve = null;
        resolve(false);
      }
    });
  }
  async function platformAuthenticatorAvailable() {
    if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return false;
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return !!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
      }
    } catch (_) {}
    return false;
  }
  function credentialRecord() {
    try {
      const parsed = JSON.parse(read(CREDENTIAL_KEY) || 'null');
      return parsed && parsed.id ? parsed : null;
    } catch (_) { return null; }
  }
  async function createPlatformCredential() {
    if (!(await platformAuthenticatorAvailable())) return false;
    try {
      const userId = randomBytes(16);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { name: 'MatchApp TV' },
          user: {
            id: userId,
            name: 'matchapp-parent-' + Date.now(),
            displayName: 'MatchApp parent'
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'discouraged',
            requireResidentKey: false,
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'none'
        }
      });
      if (!cred || !cred.rawId) return false;
      write(CREDENTIAL_KEY, JSON.stringify({ v: 1, id: bytesToB64Url(cred.rawId) }));
      write(AUTH_PREF_KEY, 'webauthn');
      return true;
    } catch (_) { return false; }
  }
  async function verifyPlatformCredential() {
    const rec = credentialRecord();
    if (!rec || !(await platformAuthenticatorAvailable())) return false;
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          allowCredentials: [{ type: 'public-key', id: b64UrlToBytes(rec.id) }],
          userVerification: 'required',
          timeout: 60000
        }
      });
      return !!assertion;
    } catch (_) { return false; }
  }

  function stopHold(reset) {
    if (holdFrame) { cancelFrame(holdFrame); holdFrame = 0; }
    const hold = gate && gate.querySelector('.kids-gate-hold');
    if (hold) {
      hold.dataset.holding = '0';
      if (reset !== false) hold.style.setProperty('--hold-progress', '0');
    }
  }
  function finishGate(ok) {
    stopHold();
    authPending = false;
    if (gatePinResolve) {
      const pinResolve = gatePinResolve;
      gatePinResolve = null;
      pinResolve(false);
    }
    const resolve = gateResolve;
    gateResolve = null;
    closeDialog(gate);
    if (resolve) resolve(!!ok);
  }
  function requestPinVerification() {
    return new Promise(resolve => {
      if (!gate || !pinRecord()) { resolve(false); return; }
      if (gatePinResolve) gatePinResolve(false);
      gatePinResolve = resolve;
      const form = gate.querySelector('.kids-gate-pin-form');
      const input = gate.querySelector('#kids-gate-pin');
      const msg = gate.querySelector('.kids-gate-msg');
      form.hidden = false;
      input.value = '';
      msg.textContent = '';
      try { input.focus({ preventScroll: true }); } catch (_) {}
    });
  }
  async function authorizeGuardian() {
    const msg = gate && gate.querySelector('.kids-gate-msg');
    if (msg) msg.textContent = authText('checking');
    if (isDesktopGate()) return requestPinVerification();

    const pref = read(AUTH_PREF_KEY) || '';
    if (pref === 'native' && nativeBridge()) {
      const ok = await nativeAuthenticate();
      if (!ok && msg) msg.textContent = authText('bioFailed');
      return ok;
    }
    if (pref === 'webauthn' && credentialRecord()) {
      const ok = await verifyPlatformCredential();
      if (!ok && msg) msg.textContent = authText('bioFailed');
      return ok;
    }
    if (pinRecord()) return requestPinVerification();
    return false;
  }
  function startHold(e) {
    if (holdFrame || authPending) return;
    if (e && e.type === 'keydown' && (e.repeat || (e.key !== ' ' && e.key !== 'Enter'))) return;
    if (e && e.cancelable) e.preventDefault();
    const hold = gate && gate.querySelector('.kids-gate-hold');
    if (!hold) return;
    holdStart = performance.now ? performance.now() : Date.now();
    hold.dataset.holding = '1';
    const tickHold = now => {
      const current = typeof now === 'number' ? now : Date.now();
      const elapsed = Math.max(0, current - holdStart);
      const progress = Math.min(1, elapsed / 3000);
      hold.style.setProperty('--hold-progress', String(progress));
      if (progress >= 1) {
        holdFrame = 0;
        hold.dataset.holding = '0';
        authPending = true;
        authorizeGuardian().then(ok => {
          if (ok === true) finishGate(true);
          else if (ok === false) authPending = false;
        }).catch(() => { authPending = false; });
        return;
      }
      holdFrame = requestFrame(tickHold);
    };
    holdFrame = requestFrame(tickHold);
  }
  function buildGate() {
    if (gate) return gate;
    gate = node('dialog', 'kids-gate');
    gate.setAttribute('aria-labelledby', 'kids-gate-title');
    const h = node('h2', '', t('gateTitle')); h.id = 'kids-gate-title';
    const p = node('p', 'kids-gate-text', authText('gateText'));
    const hold = node('button', 'kids-gate-hold'); hold.type = 'button';
    hold.setAttribute('aria-label', authText('holdAria'));
    const hand = node('span', 'kids-gate-hand', '✋'); hand.setAttribute('aria-hidden', 'true');
    hold.appendChild(hand);
    const form = node('form', 'kids-gate-pin-form'); form.hidden = true;
    const label = node('label', '', authText('pinLabel')); label.setAttribute('for', 'kids-gate-pin');
    const input = node('input'); input.id = 'kids-gate-pin'; input.type = 'password'; input.inputMode = 'numeric'; input.autocomplete = 'off'; input.maxLength = 4; input.pattern = '[0-9]{4}';
    const go = node('button', 'kids-gate-go', authText('pinGo')); go.type = 'submit';
    form.append(label, input, go);
    const msg = node('p', 'kids-gate-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    const cancel = node('button', 'kids-gate-cancel', t('cancel')); cancel.type = 'button';
    gate.append(h, p, hold, form, msg, cancel);
    hold.addEventListener('pointerdown', startHold);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => hold.addEventListener(ev, () => stopHold()));
    hold.addEventListener('keydown', startHold);
    hold.addEventListener('keyup', () => stopHold());
    hold.addEventListener('contextmenu', e => e.preventDefault());
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!gatePinResolve) return;
      verifyPin(input.value).then(ok => {
        if (!gatePinResolve) return;
        if (ok) {
          const done = gatePinResolve;
          gatePinResolve = null;
          done(true);
          return;
        }
        msg.textContent = authText('pinWrong');
        input.value = '';
        try { input.focus({ preventScroll: true }); } catch (_) {}
      }).catch(() => { msg.textContent = authText('pinWrong'); });
    });
    cancel.addEventListener('click', () => finishGate(false));
    gate.addEventListener('cancel', e => { e.preventDefault(); finishGate(false); });
    gate.addEventListener('close', () => {
      stopHold();
      authPending = false;
      if (gatePinResolve) { const p = gatePinResolve; gatePinResolve = null; p(false); }
      if (gateResolve) { const r = gateResolve; gateResolve = null; r(false); }
    });
    document.body.appendChild(gate);
    return gate;
  }

  function buildSetupDialog() {
    if (setupDialog) return setupDialog;
    setupDialog = node('dialog', 'kids-gate kids-parent-setup');
    setupDialog.setAttribute('aria-labelledby', 'kids-parent-setup-title');
    const h = node('h2', '', authText('setupTitle')); h.id = 'kids-parent-setup-title';
    const p = node('p', 'kids-parent-setup-text', authText('setupText'));
    const bio = node('button', 'kids-parent-bio', authText('setupBio')); bio.type = 'button'; bio.hidden = true;
    const pinChoice = node('button', 'kids-parent-pin-choice', authText('setupPin')); pinChoice.type = 'button';
    const form = node('form', 'kids-parent-pin-setup'); form.hidden = true;
    const label1 = node('label', '', authText('pinCreate')); label1.setAttribute('for', 'kids-parent-pin-one');
    const one = node('input'); one.id = 'kids-parent-pin-one'; one.type = 'password'; one.inputMode = 'numeric'; one.autocomplete = 'new-password'; one.maxLength = 4; one.pattern = '[0-9]{4}';
    const label2 = node('label', '', authText('pinConfirm')); label2.setAttribute('for', 'kids-parent-pin-two');
    const two = node('input'); two.id = 'kids-parent-pin-two'; two.type = 'password'; two.inputMode = 'numeric'; two.autocomplete = 'new-password'; two.maxLength = 4; two.pattern = '[0-9]{4}';
    const save = node('button', 'kids-parent-pin-save', authText('pinSave')); save.type = 'submit';
    form.append(label1, one, label2, two, save);
    const msg = node('p', 'kids-gate-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    setupDialog.append(h, p, bio, pinChoice, form, msg);
    setupDialog.addEventListener('cancel', e => e.preventDefault());
    pinChoice.addEventListener('click', () => {
      form.hidden = false;
      pinChoice.hidden = true;
      try { one.focus({ preventScroll: true }); } catch (_) {}
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const first = String(one.value || ''), second = String(two.value || '');
      if (!/^\d{4}$/.test(first) || first !== second) {
        msg.textContent = authText('pinMismatch');
        two.value = '';
        return;
      }
      savePin(first).then(ok => {
        if (!ok) { msg.textContent = authText('pinMismatch'); return; }
        completeSetup(true);
      }).catch(() => { msg.textContent = authText('pinMismatch'); });
    });
    bio.addEventListener('click', async () => {
      bio.disabled = true;
      msg.textContent = authText('checking');
      let ok = false;
      if (nativeBridge()) {
        ok = await nativeAuthenticate();
        if (ok) write(AUTH_PREF_KEY, 'native');
      } else {
        ok = await createPlatformCredential();
      }
      bio.disabled = false;
      if (ok) { completeSetup(true); return; }
      msg.textContent = authText('bioFailed');
    });
    document.body.appendChild(setupDialog);
    return setupDialog;
  }
  function completeSetup(ok) {
    const resolve = setupResolve;
    setupResolve = null;
    setupPromise = null;
    closeDialog(setupDialog);
    if (resolve) resolve(!!ok);
  }
  async function openSetup() {
    if (setupPromise) return setupPromise;
    const d = buildSetupDialog();
    d.querySelector('#kids-parent-setup-title').textContent = authText('setupTitle');
    d.querySelector('.kids-parent-setup-text').textContent = authText('setupText');
    d.querySelector('.kids-parent-bio').textContent = authText('setupBio');
    d.querySelector('.kids-parent-pin-choice').textContent = authText('setupPin');
    d.querySelector('.kids-parent-pin-save').textContent = authText('pinSave');
    d.querySelector('.kids-gate-msg').textContent = '';
    const form = d.querySelector('.kids-parent-pin-setup');
    const pinChoice = d.querySelector('.kids-parent-pin-choice');
    form.hidden = !isDesktopGate();
    pinChoice.hidden = isDesktopGate();
    d.querySelector('#kids-parent-pin-one').value = '';
    d.querySelector('#kids-parent-pin-two').value = '';
    const bio = d.querySelector('.kids-parent-bio');
    bio.hidden = true;
    if (!isDesktopGate()) {
      try { bio.hidden = !(nativeBridge() || await platformAuthenticatorAvailable()); } catch (_) { bio.hidden = true; }
    }
    setupPromise = new Promise(resolve => { setupResolve = resolve; });
    openDialog(d);
    if (isDesktopGate()) {
      try { d.querySelector('#kids-parent-pin-one').focus({ preventScroll: true }); } catch (_) {}
    }
    return setupPromise;
  }
  async function ensureGuardianSetup() {
    if (isDesktopGate()) {
      if (pinRecord()) return true;
      return openSetup();
    }
    const pref = read(AUTH_PREF_KEY) || '';
    if (pref === 'native' && nativeBridge()) return true;
    if (pref === 'webauthn' && credentialRecord()) return true;
    if (pref === 'pin' && pinRecord()) return true;
    if (pinRecord()) return true;
    return openSetup();
  }

  async function askGrownUp() {
    // Go straight to the device's parent authentication. No intermediate
    // press-and-hold gate: mobile uses native biometrics/WebAuthn when
    // configured, with the parent PIN as the fallback.
    const configured = await ensureGuardianSetup().catch(() => false);
    if (!configured) return false;

    if (!isDesktopGate()) {
      const pref = read(AUTH_PREF_KEY) || '';
      if (pref === 'native' && nativeBridge()) {
        const ok = await nativeAuthenticate().catch(() => false);
        if (ok) return true;
        // If the native bridge cannot complete authentication, immediately
        // fall through to the parent PIN instead of leaving the button inert.
      }
      if (pref === 'webauthn' && credentialRecord()) {
        const ok = await verifyPlatformCredential().catch(() => false);
        if (ok) return true;
        // Cancelled/unsupported biometric authentication falls back to PIN.
      }
    }

    // PIN fallback (and desktop): show only the PIN prompt, never the hand.
    return new Promise(resolve => {
      if (gateResolve) { const prev = gateResolve; gateResolve = null; prev(false); }
      buildGate();
      gate.querySelector('#kids-gate-title').textContent = t('gateTitle');
      gate.querySelector('.kids-gate-text').hidden = true;
      gate.querySelector('.kids-gate-hold').hidden = true;
      gate.querySelector('.kids-gate-go').textContent = authText('pinGo');
      gate.querySelector('.kids-gate-cancel').textContent = t('cancel');
      gate.querySelector('.kids-gate-msg').textContent = '';
      stopHold();
      authPending = false;
      gateResolve = resolve;
      openDialog(gate);
      requestPinVerification().then(ok => {
        if (ok) finishGate(true);
      }).catch(() => {});
    });
  }
  window.KidsGrownUpCheck = askGrownUp;
  function guardClick(e) {
    const link = e.target && e.target.closest ? e.target.closest('#kids-exit,#kids-account-help') : null;
    if (!link) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const href = link.getAttribute('href') || '/';
    askGrownUp().then(ok => {
      if (!ok) return;
      if (link.id === 'kids-exit') {
        write(MODE_KEY, 'false');
        const bridge = window.MatchAppNativeGuardian;
        if (window.MATCHAPP_ANDROID_KIDS_ONLY && bridge && typeof bridge.openGrownUp === 'function') {
          try { bridge.openGrownUp(); return; } catch (_) {}
        }
      }
      location.href = href;
    }).catch(() => {});
  }

  /* ---------- C5: daily time nudge ---------- */
  let tick = null, upDialog = null, settings = null;
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function usage() {
    try {
      const u = JSON.parse(read(USED_KEY) || '{}');
      if (u && u.day === today()) return { day: u.day, seconds: Math.max(0, Number(u.seconds) || 0), extra: Math.max(0, Number(u.extra) || 0) };
    } catch (_) {}
    return { day: today(), seconds: 0, extra: 0 };
  }
  function limitMinutes() { const n = Number(read(LIMIT_KEY) || 0); return LIMITS.includes(n) ? n : 0; }
  function paintTimeUp() {
    if (!upDialog) return;
    upDialog.querySelector('h2').textContent = t('upTitle');
    upDialog.querySelector('.kids-timeup-text').textContent = t('upText');
    upDialog.querySelector('button').textContent = t('unlock');
  }
  function showTimeUp() {
    if (!upDialog) {
      upDialog = node('dialog', 'kids-timeup');
      upDialog.setAttribute('aria-labelledby', 'kids-timeup-title');
      const moon = node('div', 'kids-timeup-moon'); moon.setAttribute('aria-hidden', 'true');
      const h = node('h2'); h.id = 'kids-timeup-title';
      const p = node('p', 'kids-timeup-text');
      const unlock = node('button'); unlock.type = 'button';
      upDialog.append(moon, h, p, unlock);
      upDialog.addEventListener('cancel', e => e.preventDefault());
      unlock.addEventListener('click', () => {
        askGrownUp().then(ok => {
          if (!ok) return;
          const u = usage();
          u.extra += 15;
          write(USED_KEY, JSON.stringify(u));
          closeDialog(upDialog);
        }).catch(() => {});
      });
      document.body.appendChild(upDialog);
    }
    paintTimeUp();
    if (!upDialog.open) openDialog(upDialog);
  }
  function check() {
    const m = limitMinutes();
    if (!m) return;
    const u = usage();
    if (u.seconds >= (m + u.extra) * 60) showTimeUp();
  }
  function step() {
    if (document.hidden || (upDialog && upDialog.open)) return;
    const u = usage();
    u.seconds += 30;
    write(USED_KEY, JSON.stringify(u));
    check();
  }
  function schedule() {
    if (tick) { clearInterval(tick); tick = null; }
    if (!limitMinutes()) return;
    tick = setInterval(step, 30000);
    check();
  }
  function openSettings() {
    askGrownUp().then(ok => {
      if (!ok) return;
      if (!settings) {
        settings = node('dialog', 'kids-time-settings');
        settings.setAttribute('aria-labelledby', 'kids-time-title');
        const h = node('h2'); h.id = 'kids-time-title';
        const p = node('p', 'kids-time-text');
        const select = node('select'); select.id = 'kids-time-select';
        const actions = node('div', 'kids-time-actions');
        const save = node('button', 'kids-time-save'); save.type = 'button';
        const cancel = node('button', 'kids-gate-cancel'); cancel.type = 'button';
        actions.append(save, cancel);
        settings.append(h, p, select, actions);
        save.addEventListener('click', () => {
          const v = Number(select.value) || 0;
          write(LIMIT_KEY, String(LIMITS.includes(v) ? v : 0));
          closeDialog(settings);
          schedule();
        });
        cancel.addEventListener('click', () => closeDialog(settings));
        document.body.appendChild(settings);
      }
      settings.querySelector('h2').textContent = t('timeTitle');
      settings.querySelector('.kids-time-text').textContent = t('timeText');
      settings.querySelector('.kids-time-save').textContent = t('save');
      settings.querySelector('.kids-gate-cancel').textContent = t('cancel');
      const select = settings.querySelector('select');
      select.replaceChildren(...[0].concat(LIMITS).map(v => { const o = node('option', '', v ? t('min', { n: v }) : t('off')); o.value = String(v); return o; }));
      select.value = String(limitMinutes());
      openDialog(settings);
    }).catch(() => {});
  }
  function installTimePill() {
    const exit = document.getElementById('kids-exit');
    if (!exit || document.getElementById('kids-time-limit')) return;
    const pill = node('button', 'kids-pill kids-time-pill', t('timeBtn'));
    pill.type = 'button';
    pill.id = 'kids-time-limit';
    pill.addEventListener('click', openSettings);
    exit.insertAdjacentElement('afterend', pill);
  }

  /* ---------- C4: favorites follow the family account ---------- */
  let lastRemote = '', syncTimer = null;
  async function currentUser() {
    const sb = window.supabaseClient;
    if (!sb || !sb.auth || typeof sb.auth.getSession !== 'function') return null;
    try { const r = await sb.auth.getSession(); return (r && r.data && r.data.session && r.data.session.user) || null; } catch (_) { return null; }
  }
  const signature = list => JSON.stringify([...new Set(list)].sort());
  async function pushFavorites(list, user) {
    try {
      user = user || await currentUser();
      if (!user) return;
      const clean = [...new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string' && x.length <= 120))].slice(0, 100);
      const sig = signature(clean);
      if (sig === lastRemote) return;
      const { error } = await window.supabaseClient.from('profiles').update({ kids_favorites: clean }).eq('id', user.id);
      if (!error) lastRemote = sig;
    } catch (_) {}
  }
  async function pullFavorites() {
    try {
      const api = window.KidsFavorites;
      if (!api) return;
      const user = await currentUser();
      if (!user) return;
      const { data, error } = await window.supabaseClient.from('profiles').select('kids_favorites').eq('id', user.id).maybeSingle();
      if (error || !data) return;
      const remote = Array.isArray(data.kids_favorites) ? data.kids_favorites.filter(x => typeof x === 'string') : [];
      lastRemote = signature(remote);
      const merged = api.merge(remote);
      if (signature(merged) !== lastRemote) pushFavorites(merged, user);
    } catch (_) {}
  }

  function repaint() {
    const pill = document.getElementById('kids-time-limit');
    if (pill) pill.textContent = t('timeBtn');
    if (upDialog && upDialog.open) paintTimeUp();
  }
  function boot() {
    installStyles();
    document.addEventListener('click', guardClick, true);
    installTimePill();
    schedule();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    document.addEventListener('matchapp:kids-favorites', e => {
      clearTimeout(syncTimer);
      const list = Array.isArray(e.detail) ? e.detail.slice() : [];
      syncTimer = setTimeout(() => pushFavorites(list), 1200);
    });
    setTimeout(pullFavorites, 1500);
    try {
      const sb = window.supabaseClient;
      if (sb && sb.auth && typeof sb.auth.onAuthStateChange === 'function') {
        sb.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN') setTimeout(pullFavorites, 0); });
      }
    } catch (_) {}
    try { new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (_) {}
    setTimeout(() => { ensureGuardianSetup().catch(() => {}); }, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
