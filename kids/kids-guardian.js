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
  const LANGS = Object.keys(STR);
  const LIMIT_KEY = 'match_kids_time_limit', USED_KEY = 'match_kids_time_used', MODE_KEY = 'match_kids_mode';
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
      '.kids-gate-hold{display:block;width:100%;min-height:56px;margin:6px 0 14px;padding:14px;border-radius:16px;border:2px solid #ffd35a;background:#2a1f5c;color:#fff;font:800 17px/1.2 system-ui,sans-serif;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}',
      '.kids-gate-hold[data-holding="1"]{background:#3b2c7c}',
      '.kids-gate-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}',
      '.kids-gate-form label{flex:1 0 100%;font-weight:700}',
      '.kids-gate-form input{width:7em;min-height:44px;padding:8px;border-radius:12px;border:2px solid #7cd8ff;background:#0f0b26;color:#fff;font-size:18px;text-align:center}',
      '.kids-gate button,.kids-timeup button,.kids-time-settings button{min-height:44px;padding:10px 16px;border-radius:14px;border:2px solid #ffd35a;background:#ffd35a;color:#1b1340;font:800 15px/1.2 system-ui,sans-serif;cursor:pointer}',
      '.kids-gate .kids-gate-hold{background:#2a1f5c;color:#fff}',
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
  let gate = null, gateResolve = null, holdTimer = null, holdStart = 0, answer = 0;
  function freshSum() {
    const a = 11 + Math.floor(Math.random() * 9), b = 11 + Math.floor(Math.random() * 9);
    answer = a + b;
    const q = gate && gate.querySelector('.kids-gate-sum');
    if (q) q.textContent = t('sum', { a, b });
    const input = gate && gate.querySelector('input');
    if (input) input.value = '';
  }
  function stopHold() {
    if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
    const hold = gate && gate.querySelector('.kids-gate-hold');
    if (hold) { hold.dataset.holding = '0'; hold.textContent = t('hold'); }
  }
  function finishGate(ok) {
    stopHold();
    const resolve = gateResolve;
    gateResolve = null;
    closeDialog(gate);
    if (resolve) resolve(!!ok);
  }
  function startHold(e) {
    if (holdTimer) return;
    if (e && e.type === 'keydown' && (e.repeat || (e.key !== ' ' && e.key !== 'Enter'))) return;
    if (e && e.cancelable) e.preventDefault();
    const hold = gate.querySelector('.kids-gate-hold');
    holdStart = Date.now();
    hold.dataset.holding = '1';
    holdTimer = setInterval(() => {
      const left = 3000 - (Date.now() - holdStart);
      if (left <= 0) { finishGate(true); return; }
      hold.textContent = t('holding', { s: (left / 1000).toFixed(1) });
    }, 100);
  }
  function buildGate() {
    if (gate) return gate;
    gate = node('dialog', 'kids-gate');
    gate.setAttribute('aria-labelledby', 'kids-gate-title');
    const h = node('h2', '', t('gateTitle')); h.id = 'kids-gate-title';
    const p = node('p', 'kids-gate-text', t('gateText'));
    const hold = node('button', 'kids-gate-hold', t('hold')); hold.type = 'button';
    const form = node('form', 'kids-gate-form');
    const label = node('label', 'kids-gate-sum'); label.setAttribute('for', 'kids-gate-answer');
    const input = node('input'); input.id = 'kids-gate-answer'; input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off'; input.maxLength = 3;
    const go = node('button', 'kids-gate-go', t('go')); go.type = 'submit';
    form.append(label, input, go);
    const msg = node('p', 'kids-gate-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    const cancel = node('button', 'kids-gate-cancel', t('cancel')); cancel.type = 'button';
    gate.append(h, p, hold, form, msg, cancel);
    hold.addEventListener('pointerdown', startHold);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => hold.addEventListener(ev, stopHold));
    hold.addEventListener('keydown', startHold);
    hold.addEventListener('keyup', stopHold);
    hold.addEventListener('contextmenu', e => e.preventDefault());
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (Number.parseInt(String(input.value).trim(), 10) === answer) { finishGate(true); return; }
      msg.textContent = t('wrong');
      freshSum();
      input.focus();
    });
    cancel.addEventListener('click', () => finishGate(false));
    gate.addEventListener('cancel', e => { e.preventDefault(); finishGate(false); });
    gate.addEventListener('close', () => { stopHold(); if (gateResolve) { const r = gateResolve; gateResolve = null; r(false); } });
    document.body.appendChild(gate);
    return gate;
  }
  function askGrownUp() {
    return new Promise(resolve => {
      if (gateResolve) { const prev = gateResolve; gateResolve = null; prev(false); }
      buildGate();
      gate.querySelector('#kids-gate-title').textContent = t('gateTitle');
      gate.querySelector('.kids-gate-text').textContent = t('gateText');
      gate.querySelector('.kids-gate-go').textContent = t('go');
      gate.querySelector('.kids-gate-cancel').textContent = t('cancel');
      gate.querySelector('.kids-gate-msg').textContent = '';
      stopHold();
      freshSum();
      gateResolve = resolve;
      openDialog(gate);
      try { gate.querySelector('input').focus({ preventScroll: true }); } catch (_) {}
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
      if (link.id === 'kids-exit') write(MODE_KEY, 'false');
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
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
