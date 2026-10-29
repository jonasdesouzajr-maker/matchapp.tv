/* Isolated 4-card tutorial; never changes campaign, scores, ads or account state. */
(function () {
  'use strict';
  var translations = {"en":["Beginner's guide","Learn by playing","Flip two cards. Find both matching pairs to win this practice round.","Choose a second card.","That's a pair! Find the other one.","Not a match. Try another pair.","Great job! You're ready for Lumina Match.","Play a level","Practice again","Close guide","Practice card {n}"],"pt-BR":["Guia para iniciantes","Aprenda jogando","Vire duas cartas. Encontre os dois pares iguais para concluir a fase de treino.","Escolha a segunda carta.","Par encontrado! Descubra o outro.","Não combinou. Tente outro par.","Muito bem! Você já pode jogar Lumina Match.","Jogar uma fase","Treinar de novo","Fechar guia","Carta de treino {n}"],"es":["Guía para principiantes","Aprende jugando","Voltea dos cartas. Encuentra las dos parejas para terminar la práctica.","Elige una segunda carta.","¡Pareja encontrada! Busca la otra.","No coinciden. Inténtalo otra vez.","¡Bien hecho! Ya puedes jugar Lumina Match.","Jugar un nivel","Practicar de nuevo","Cerrar guía","Carta de práctica {n}"],"fr":["Guide débutant","Apprendre en jouant","Retournez deux cartes. Trouvez les deux paires pour terminer l'entraînement.","Choisissez une deuxième carte.","Une paire trouvée ! Cherchez l'autre.","Pas la même image. Réessayez.","Bravo ! Vous pouvez jouer à Lumina Match.","Jouer un niveau","Recommencer","Fermer le guide","Carte d'entraînement {n}"],"de":["Anleitung für Anfänger","Spielend lernen","Drehe zwei Karten um. Finde beide Paare, um die Übung zu beenden.","Wähle eine zweite Karte.","Ein Paar gefunden! Suche das andere.","Kein Paar. Versuche es erneut.","Gut gemacht! Du kannst Lumina Match spielen.","Level spielen","Erneut üben","Anleitung schließen","Übungskarte {n}"],"it":["Guida per principianti","Impara giocando","Gira due carte. Trova entrambe le coppie per finire la prova.","Scegli una seconda carta.","Coppia trovata! Cerca l'altra.","Non coincidono. Riprova.","Ottimo! Ora puoi giocare a Lumina Match.","Gioca un livello","Riprova la guida","Chiudi guida","Carta prova {n}"],"tr":["Yeni başlayan rehberi","Oynayarak öğren","İki kart çevir. Alıştırmayı bitirmek için iki eşleşen çifti bul.","İkinci kartı seç.","Bir çift buldun! Diğerini ara.","Eşleşmedi. Tekrar dene.","Harika! Artık Lumina Match oynayabilirsin.","Seviye oyna","Yeniden dene","Rehberi kapat","Deneme kartı {n}"],"ru":["Руководство новичка","Учитесь в игре","Откройте две карты. Найдите обе пары, чтобы завершить обучение.","Выберите вторую карту.","Пара найдена! Найдите вторую.","Карты разные. Попробуйте ещё.","Отлично! Теперь можно играть в Lumina Match.","Играть уровень","Начать заново","Закрыть руководство","Учебная карта {n}"],"ar":["دليل المبتدئين","تعلّم باللعب","اقلب بطاقتين. اعثر على الزوجين المتطابقين لإنهاء التدريب.","اختر البطاقة الثانية.","وجدت زوجًا! ابحث عن الآخر.","البطاقتان مختلفتان. حاول مرة أخرى.","أحسنت! أنت مستعد للعب Lumina Match.","العب مرحلة","إعادة التدريب","إغلاق الدليل","بطاقة التدريب {n}"],"hi":["शुरुआती गाइड","खेलते हुए सीखें","दो कार्ड पलटें। अभ्यास पूरा करने के लिए दोनों जोड़े खोजें।","दूसरा कार्ड चुनें।","एक जोड़ी मिल गई! दूसरी खोजें।","कार्ड अलग हैं। फिर कोशिश करें।","बहुत बढ़िया! अब आप Lumina Match खेल सकते हैं।","स्तर खेलें","फिर अभ्यास करें","गाइड बंद करें","अभ्यास कार्ड {n}"],"id":["Panduan pemula","Belajar sambil bermain","Balik dua kartu. Temukan kedua pasangan untuk menyelesaikan latihan.","Pilih kartu kedua.","Satu pasangan cocok! Cari yang lain.","Belum cocok. Coba lagi.","Bagus! Kamu siap bermain Lumina Match.","Mainkan level","Latihan lagi","Tutup panduan","Kartu latihan {n}"],"ja":["初心者ガイド","遊びながら覚えよう","カードを2枚めくり、2組のペアを見つけると練習クリアです。","2枚目のカードを選びましょう。","ペアがそろいました！もう1組探しましょう。","違うカードです。もう一度！","お見事！Lumina Matchを始めましょう。","レベルをプレイ","もう一度練習","ガイドを閉じる","練習カード{n}"],"ko":["초보자 가이드","플레이하며 배우기","카드 두 장을 뒤집고 두 쌍을 모두 맞추면 연습이 끝납니다.","두 번째 카드를 선택하세요.","한 쌍 성공! 나머지 한 쌍도 찾아보세요.","일치하지 않아요. 다시 시도하세요.","잘했어요! 이제 Lumina Match를 즐겨보세요.","레벨 플레이","다시 연습","가이드 닫기","연습 카드 {n}"],"zh":["新手教程","边玩边学","翻开两张卡片，找到两对相同的图片即可完成练习。","请选择第二张卡片。","找到一对！继续找另一对。","图片不同，再试一次。","做得好！现在可以开始玩 Lumina Match 了。","开始关卡","重新练习","关闭教程","练习卡片{n}"]};
  var keys = ['button','title','intro','second','matched','miss','finished','play','retry','close','card'];
  var app = document.getElementById('app'), dialog = null, button = null;
  var deck = [], chosen = [], matched = 0, locked = false, revertTimer = null, statusKey = 'intro';
  function lang() {
    var value = document.documentElement.lang || 'en';
    return Object.prototype.hasOwnProperty.call(translations,value) ? value : 'en';
  }
  function t(key,values) {
    var raw = translations[lang()][keys.indexOf(key)];
    return raw.replace(/\{(\w+)\}/g,function(match,name) {return values?.[name] ?? match;});
  }
  function esc(value) {return String(value).replace(/[&<>"']/g,function(ch) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });}
  function insert() {
    var home = app.dataset.screen === 'home' ? app.querySelector('.home-secondary') : null;
    if (!home) { button = null; return; }
    button = home.querySelector('[data-guide-open]');
    if (button) {if (button.textContent !== t('button')) button.textContent = t('button'); return;}
    button = document.createElement('button');
    button.className = 'pill teal lm-tutorial-entry';
    button.type = 'button';
    button.dataset.guideOpen = '';
    button.textContent = t('button');
    home.insertBefore(button, home.firstChild);
  }
  function reset() {
    clearTimeout(revertTimer); revertTimer = null;
    deck = ['moon','star','moon','star'].sort(function() {return Math.random()-.5;}).map(function(face) {
      return {face:face,flipped:false,matched:false};
    });
    chosen = []; matched = 0;locked = false;statusKey = 'intro';
  }
  function renderText() {
    if (!dialog) return;
    dialog.lang = lang(); dialog.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    dialog.querySelector('h2').textContent = t('title');
    dialog.querySelector('[data-guide-status]').textContent = t(statusKey);
    dialog.querySelector('[data-guide-reset]').textContent = t('retry');
    dialog.querySelector('[data-guide-play]').textContent = t('play');
    dialog.querySelector('[data-guide-dismiss]').setAttribute('aria-label',t('close'));
  }
  function showCards() {
    if (!dialog) return;
    var board = dialog.querySelector('.lm-practice-board');
    board.innerHTML = deck.map(function(card,i) {
      return '<button type="button" class="card lm-practice-card' +
        (card.flipped || card.matched ? ' flipped' : '') + (card.matched ? ' matched' : '') +
        '" data-practice="' + i + '" aria-label="' + esc(t('card',{n:i+1})) +
        '" aria-pressed="' + String(card.flipped || card.matched) + '"' + (card.matched || locked ? ' disabled' : '') +
        '><span class="face back" aria-hidden="true"></span><span class="face front" aria-hidden="true" style="background-image:url(' +
        (card.face === 'moon' ? 'card_moon.jpg' : 'card_star.jpg') + ')"></span></button>';
    }).join('');
    renderText();
  }
  function close() {
    clearTimeout(revertTimer);revertTimer = null;
    if (!dialog) return;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    dialog.remove(); dialog = null;
    if (button?.isConnected) button.focus({preventScroll:true});
  }
  function flip(i) {
    if (!dialog || locked || deck[i].flipped || deck[i].matched || chosen.length >= 2) return;
    deck[i].flipped = true; chosen.push(i); statusKey = 'second';
    if (chosen.length < 2) {showCards(); return;}
    locked = true;
    var a = chosen[0], b = chosen[1];
    if (deck[a].face === deck[b].face) {
      deck[a].matched = deck[b].matched = true; matched += 2;
      statusKey = matched === deck.length ? 'finished' : 'matched';
      chosen = []; locked = false; showCards();
    } else {
      statusKey = 'miss';showCards();
      revertTimer = setTimeout(function () {
        deck[a].flipped = deck[b].flipped = false;
        chosen = [];locked = false;revertTimer = null;statusKey = 'intro';showCards();
      },650);
    }
  }
  function open() {
    close();reset();
    dialog = document.createElement('dialog');
    dialog.className = 'lm-practice-dialog';
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','lm-practice-title');
    dialog.innerHTML = '<section class="lm-practice-shell"><div class="lm-practice-head"><h2 id="lm-practice-title"></h2>' +
      '<button type="button" class="lm-practice-close" data-guide-dismiss>×</button></div>' +
      '<p class="lm-practice-status" role="status" aria-live="polite" data-guide-status></p>' +
      '<div class="lm-practice-board" role="group"></div>' +
      '<div class="lm-practice-actions"><button type="button" class="pill secondary" data-guide-reset></button>' +
      '<button type="button" class="pill teal" data-guide-play></button></div></section>';
    document.body.appendChild(dialog);
    dialog.addEventListener('cancel',function(e){e.preventDefault();close();});
    dialog.addEventListener('click',function(e) {
      var card=e.target.closest('[data-practice]');
      if(card){flip(Number(card.dataset.practice));return;}
      if(e.target.closest('[data-guide-dismiss]'))close();
      if(e.target.closest('[data-guide-reset]')){reset();showCards();}
      if(e.target.closest('[data-guide-play]')) {
        close();
        var play=app.querySelector('[data-action="campaign"],[data-action="campaign-resume"]');
        if(play && !play.disabled)play.click();
      }
    });
    if(typeof dialog.showModal === 'function')dialog.showModal();
    else dialog.setAttribute('open','');
    showCards();
    dialog.querySelector('[data-guide-dismiss]')?.focus({preventScroll:true});
  }
  app.addEventListener('click',function(e) {
    if(e.target.closest('[data-guide-open]')) {e.stopPropagation();open();}
  },true);
  new MutationObserver(insert).observe(app,{subtree:true,childList:true});
  new MutationObserver(function(){insert();renderText();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  window.addEventListener('pagehide',close);
  insert();
})();