/* ============================================================
   MatchApp match insights (2026-09-22). Additive and event-driven:
   A1  "Why this pick" line on the result card
   A2  informational pool hint under Find My Match — it never blocks the
       button, because the matcher also searches verified sources
   B3  "Ask AI about this title" shortcut on the result card
   No MutationObservers, no loops; one 300 ms debounce for the hint.
   ============================================================ */
(function () {
  'use strict';
  if (window.__matchInsights) return;
  window.__matchInsights = true;

  const T = {
    'en': { why: 'Why this pick:', choices: 'meets every choice you made ({n})', taste: 'picked to suit your taste', mood: 'same mood as {title}, which you loved', format: 'same kind of title as {title}, which you loved', verified: 'found through verified sources beyond our curated shelf', poolMany: '{n} curated titles fit your choices.', poolFew: 'Only {n} curated titles fit — MatchApp also searches verified sources.', poolNone: 'No curated title fits all of these — MatchApp will search verified sources.', loosen: 'Loosening “{filter}” would open {n}.', askAi: '🤖 Ask AI about this title' },
    'pt-BR': { why: 'Por que esta escolha:', choices: 'atende a todas as suas escolhas ({n})', taste: 'escolhido para o seu gosto', mood: 'mesmo clima de {title}, que você amou', format: 'mesmo tipo de título que {title}, que você amou', verified: 'encontrado em fontes verificadas além da nossa seleção', poolMany: '{n} títulos da nossa seleção combinam com suas escolhas.', poolFew: 'Só {n} títulos da nossa seleção combinam — o MatchApp também busca em fontes verificadas.', poolNone: 'Nenhum título da nossa seleção atende a tudo isso — o MatchApp vai buscar em fontes verificadas.', loosen: 'Liberar “{filter}” abriria {n}.', askAi: '🤖 Pergunte à IA sobre este título' },
    'es': { why: 'Por qué esta elección:', choices: 'cumple todas tus elecciones ({n})', taste: 'elegido según tus gustos', mood: 'mismo ambiente que {title}, que te encantó', format: 'mismo tipo de título que {title}, que te encantó', verified: 'encontrado en fuentes verificadas más allá de nuestra selección', poolMany: '{n} títulos de nuestra selección encajan con tus elecciones.', poolFew: 'Solo {n} títulos de nuestra selección encajan; MatchApp también busca en fuentes verificadas.', poolNone: 'Ningún título de nuestra selección cumple todo esto; MatchApp buscará en fuentes verificadas.', loosen: 'Quitar «{filter}» abriría {n}.', askAi: '🤖 Pregunta a la IA sobre este título' },
    'fr': { why: 'Pourquoi ce choix :', choices: 'respecte tous vos critères ({n})', taste: 'choisi selon vos goûts', mood: 'même ambiance que {title}, que vous avez adoré', format: 'même type de titre que {title}, que vous avez adoré', verified: 'trouvé via des sources vérifiées au-delà de notre sélection', poolMany: '{n} titres de notre sélection correspondent à vos critères.', poolFew: 'Seulement {n} titres de notre sélection correspondent — MatchApp cherche aussi dans des sources vérifiées.', poolNone: 'Aucun titre de notre sélection ne remplit tous ces critères — MatchApp cherchera dans des sources vérifiées.', loosen: 'Retirer « {filter} » en ouvrirait {n}.', askAi: '🤖 Demander à l’IA à propos de ce titre' },
    'de': { why: 'Warum dieser Tipp:', choices: 'erfüllt alle deine Vorgaben ({n})', taste: 'passend zu deinem Geschmack gewählt', mood: 'gleiche Stimmung wie {title}, das du geliebt hast', format: 'gleiche Art von Titel wie {title}, das du geliebt hast', verified: 'über verifizierte Quellen außerhalb unserer Auswahl gefunden', poolMany: '{n} Titel aus unserer Auswahl passen zu deinen Vorgaben.', poolFew: 'Nur {n} Titel aus unserer Auswahl passen – MatchApp sucht zusätzlich in verifizierten Quellen.', poolNone: 'Kein Titel aus unserer Auswahl erfüllt alle Vorgaben – MatchApp sucht in verifizierten Quellen.', loosen: 'Ohne „{filter}“ kämen {n} infrage.', askAi: '🤖 Die KI zu diesem Titel fragen' },
    'it': { why: 'Perché questa scelta:', choices: 'rispetta tutte le tue scelte ({n})', taste: 'scelto in base ai tuoi gusti', mood: 'stessa atmosfera di {title}, che hai adorato', format: 'stesso tipo di titolo di {title}, che hai adorato', verified: 'trovato tramite fonti verificate oltre la nostra selezione', poolMany: '{n} titoli della nostra selezione corrispondono alle tue scelte.', poolFew: 'Solo {n} titoli della nostra selezione corrispondono: MatchApp cerca anche in fonti verificate.', poolNone: 'Nessun titolo della nostra selezione soddisfa tutto: MatchApp cercherà in fonti verificate.', loosen: 'Togliendo «{filter}» se ne aprirebbero {n}.', askAi: '🤖 Chiedi all’IA di questo titolo' },
    'tr': { why: 'Neden bu seçim:', choices: 'tüm seçimlerinize uyuyor ({n})', taste: 'zevkinize göre seçildi', mood: 'çok sevdiğiniz {title} ile aynı hava', format: 'çok sevdiğiniz {title} ile aynı türde bir yapım', verified: 'seçkimizin ötesinde doğrulanmış kaynaklardan bulundu', poolMany: 'Seçkimizden {n} yapım seçimlerinize uyuyor.', poolFew: 'Seçkimizden yalnızca {n} yapım uyuyor — MatchApp doğrulanmış kaynaklarda da arıyor.', poolNone: 'Seçkimizde bunların hepsine uyan yapım yok — MatchApp doğrulanmış kaynaklarda arayacak.', loosen: '“{filter}” kaldırılırsa {n} seçenek açılır.', askAi: '🤖 Bu yapımı yapay zekâya sorun' },
    'ru': { why: 'Почему этот выбор:', choices: 'соответствует всем вашим условиям ({n})', taste: 'подобрано по вашему вкусу', mood: 'то же настроение, что у «{title}», который вам понравился', format: 'тот же формат, что у «{title}», который вам понравился', verified: 'найдено в проверенных источниках за пределами нашей подборки', poolMany: 'Условиям подходят {n} наименований из нашей подборки.', poolFew: 'Подходят лишь {n} наименований из подборки — MatchApp также ищет в проверенных источниках.', poolNone: 'В нашей подборке нет наименований, отвечающих всем условиям — MatchApp поищет в проверенных источниках.', loosen: 'Без «{filter}» станет доступно: {n}.', askAi: '🤖 Спросить ИИ об этом' },
    'ar': { why: 'لماذا هذا الاختيار:', choices: 'يطابق كل اختياراتك ({n})', taste: 'اختير ليناسب ذوقك', mood: 'بنفس أجواء {title} الذي أحببته', format: 'من نفس نوع {title} الذي أحببته', verified: 'عُثر عليه عبر مصادر موثّقة خارج مجموعتنا المختارة', poolMany: '{n} عناوين من مجموعتنا تطابق اختياراتك.', poolFew: 'فقط {n} عناوين من مجموعتنا تطابق — يبحث MatchApp أيضاً في مصادر موثّقة.', poolNone: 'لا يطابق أي عنوان من مجموعتنا كل هذه الاختيارات — سيبحث MatchApp في مصادر موثّقة.', loosen: 'إزالة «{filter}» ستتيح {n}.', askAi: '🤖 اسأل الذكاء الاصطناعي عن هذا العنوان' },
    'hi': { why: 'यह चुनाव क्यों:', choices: 'आपकी सभी पसंदों से मेल खाता है ({n})', taste: 'आपकी रुचि के अनुसार चुना गया', mood: '{title} जैसा ही मूड, जो आपको बहुत पसंद आया', format: '{title} जैसा ही टाइटल, जो आपको बहुत पसंद आया', verified: 'हमारे चुने हुए संग्रह के बाहर सत्यापित स्रोतों से मिला', poolMany: 'हमारे संग्रह के {n} टाइटल आपकी पसंद से मेल खाते हैं।', poolFew: 'हमारे संग्रह के केवल {n} टाइटल मेल खाते हैं — MatchApp सत्यापित स्रोतों में भी खोजता है।', poolNone: 'हमारे संग्रह का कोई टाइटल इन सब से मेल नहीं खाता — MatchApp सत्यापित स्रोतों में खोजेगा।', loosen: '“{filter}” हटाने से {n} विकल्प खुलेंगे।', askAi: '🤖 इस टाइटल के बारे में AI से पूछें' },
    'id': { why: 'Kenapa pilihan ini:', choices: 'memenuhi semua pilihanmu ({n})', taste: 'dipilih sesuai seleramu', mood: 'suasana yang sama dengan {title}, yang kamu sukai', format: 'jenis tontonan yang sama dengan {title}, yang kamu sukai', verified: 'ditemukan lewat sumber terverifikasi di luar koleksi pilihan kami', poolMany: '{n} judul dari koleksi kami cocok dengan pilihanmu.', poolFew: 'Hanya {n} judul dari koleksi kami yang cocok — MatchApp juga mencari di sumber terverifikasi.', poolNone: 'Tidak ada judul dari koleksi kami yang memenuhi semuanya — MatchApp akan mencari di sumber terverifikasi.', loosen: 'Melepas “{filter}” akan membuka {n}.', askAi: '🤖 Tanya AI tentang judul ini' },
    'ja': { why: 'この作品を選んだ理由：', choices: '選んだ条件（{n}件）をすべて満たしています', taste: 'あなたの好みに合わせて選びました', mood: 'お気に入りの「{title}」と同じ雰囲気', format: 'お気に入りの「{title}」と同じタイプの作品', verified: '厳選リスト以外の確認済みソースから見つけました', poolMany: '厳選リストの{n}作品が条件に合っています。', poolFew: '条件に合う厳選作品は{n}件だけです。MatchAppは確認済みソースも検索します。', poolNone: 'すべての条件に合う厳選作品はありません。MatchAppが確認済みソースを検索します。', loosen: '「{filter}」を外すと{n}件になります。', askAi: '🤖 この作品についてAIに聞く' },
    'ko': { why: '이 추천의 이유:', choices: '선택한 조건 {n}개를 모두 충족해요', taste: '취향에 맞춰 골랐어요', mood: '좋아요를 누른 {title}와 같은 분위기', format: '좋아요를 누른 {title}와 같은 종류의 작품', verified: '엄선 목록 밖의 검증된 출처에서 찾았어요', poolMany: '엄선 목록에서 {n}개 작품이 조건에 맞아요.', poolFew: '엄선 목록에서 {n}개만 맞아요. MatchApp이 검증된 출처도 검색해요.', poolNone: '모든 조건에 맞는 엄선 작품이 없어요. MatchApp이 검증된 출처에서 찾아볼게요.', loosen: '“{filter}”을(를) 빼면 {n}개가 열려요.', askAi: '🤖 이 작품에 대해 AI에게 묻기' },
    'zh': { why: '推荐理由：', choices: '符合你的全部 {n} 项选择', taste: '根据你的口味挑选', mood: '与你喜欢的《{title}》氛围相同', format: '与你喜欢的《{title}》属于同类作品', verified: '来自精选片单以外的已验证来源', poolMany: '精选片单中有 {n} 部作品符合你的选择。', poolFew: '精选片单中只有 {n} 部符合——MatchApp 也会在已验证来源中搜索。', poolNone: '精选片单中没有完全符合的作品——MatchApp 将在已验证来源中搜索。', loosen: '去掉“{filter}”可增加 {n} 部。', askAi: '🤖 向 AI 询问这部作品' }
  };
  const LANGS = Object.keys(T);
  function lang() {
    const low = String(window.MATCH_LANG || document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    if (low.startsWith('pt')) return 'pt-BR';
    if (low.startsWith('zh')) return 'zh';
    return LANGS.find(l => l.toLowerCase() === low) || LANGS.find(l => l.split('-')[0] === low.split('-')[0]) || 'en';
  }
  function t(key, vars) {
    let s = (T[lang()] && T[lang()][key]) || T.en[key] || '';
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }
  const FIELDS = { cat: 'q-category', plat: 'q-platform', genre: 'q-genre', mood: 'q-mood', vibe: 'q-vibe', rating: 'q-rating', decade: 'q-decade' };
  const vals = v => (Array.isArray(v) ? v : [v]).filter(x => x && x !== 'any');
  function optionLabel(field, value) {
    const sel = document.getElementById(FIELDS[field]);
    const opt = sel ? [...sel.options].find(o => o.value === value) : null;
    return (opt && opt.textContent.trim()) || String(value);
  }
  function catalog() {
    try { return (typeof CONTENT_CATALOG !== 'undefined' && Array.isArray(CONTENT_CATALOG)) ? CONTENT_CATALOG : []; } catch (_) { return []; }
  }
  function normaliseTitle(v) {
    const media = window.MatchAppCatalogMedia;
    if (media && typeof media.normalise === 'function') return media.normalise(v);
    return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }
  function installStyles() {
    if (document.getElementById('match-insights-style')) return;
    const s = document.createElement('style');
    s.id = 'match-insights-style';
    s.textContent = [
      '.match-pool-hint{margin:12px auto 0;max-width:36rem;text-align:center;font:500 13.5px/1.45 Inter,"Segoe UI",system-ui,sans-serif;color:#d8cdb0}',
      '.match-pool-hint[data-level="few"]{color:#f1d58a}',
      '.match-pool-hint[data-level="none"]{color:#ffc78a}',
      '.res-why{margin:12px 0 0;font:500 14.5px/1.55 Inter,"Segoe UI",system-ui,sans-serif;color:#efe7cf}',
      '.res-why strong{color:var(--gold,#e5c158);font-weight:800}',
      '.res-ask-ai{display:block;margin:0 0 22px;padding:14px 12px;border-radius:12px;border:1px solid rgba(124,231,255,.55);background:rgba(124,231,255,.08);color:#c9f5ff;font-weight:800;font-size:15px;text-align:center;text-decoration:none}',
      '.res-ask-ai:hover,.res-ask-ai:focus-visible{background:rgba(124,231,255,.16)}',
      '.match-pool-hint[hidden],.res-why[hidden],.res-ask-ai[hidden]{display:none!important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- A2: pool hint ---------- */
  let hintSeq = 0, hintTimer = null;
  function hintEl() {
    let el = document.getElementById('match-pool-hint');
    if (el) return el;
    const btn = document.querySelector('#questionnaire-box button[onclick^="triggerMatch"]');
    if (!btn) return null;
    el = document.createElement('p');
    el.id = 'match-pool-hint';
    el.className = 'match-pool-hint';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    btn.insertAdjacentElement('afterend', el);
    return el;
  }
  function countPool(c, genreKeys, omit) {
    const P = window.matchPolicy;
    const list = catalog();
    if (!P || typeof P.matchesCriteria !== 'function' || typeof P.known !== 'function' || !list.length) return null;
    const crit = { cat: vals(c.cat), plat: vals(c.plat), mood: vals(c.mood), vibe: vals(c.vibe), rating: vals(c.rating), decade: vals(c.decade) };
    if (omit && Object.prototype.hasOwnProperty.call(crit, omit)) crit[omit] = [];
    const known = P.known();
    let shown = null;
    try { if (typeof SESSION_SHOWN !== 'undefined' && SESSION_SHOWN instanceof Set) shown = SESSION_SHOWN; } catch (_) {}
    const wantsFaith = crit.cat.includes('Gospel & Faith') || crit.plat.some(p => p === 'Pure Flix' || p === 'Angel Studios');
    const noCat = !crit.cat.length;
    const useGenre = genreKeys instanceof Set && omit !== 'genre';
    let n = 0;
    for (const e of list) {
      if (!e || !e.title) continue;
      if (known.has(P.key(e.title)) || (shown && shown.has(e.title))) continue;
      if (!P.matchesCriteria(e, crit)) continue;
      if (useGenre && !genreKeys.has(normaliseTitle(e.title))) continue;
      try { if (typeof entryPassesPreferenceExclusions === 'function' && !entryPassesPreferenceExclusions(e)) continue; } catch (_) {}
      try { if (typeof isBlockedEntry === 'function' && isBlockedEntry(e)) continue; } catch (_) {}
      if (!wantsFaith && Array.isArray(e.cats) && e.cats.includes('Gospel & Faith')) continue;
      try { if (noCat && typeof isSurpriseEligible === 'function' && !isSurpriseEligible(e)) continue; } catch (_) {}
      n++;
    }
    return n;
  }
  async function updateHint() {
    const seq = ++hintSeq;
    const el = hintEl();
    if (!el) return;
    try {
      if (typeof window.getMatchCriteria !== 'function' || !window.matchPolicy) { el.hidden = true; return; }
      if (typeof window.matchPolicy.ready === 'function') await window.matchPolicy.ready();
      const c = window.getMatchCriteria() || {};
      const explicit = Object.keys(FIELDS).filter(f => vals(c[f]).length);
      if (!explicit.length) { el.hidden = true; return; }
      let genreKeys = null;
      const genres = vals(c.genre);
      if (genres.length) {
        let keys = null;
        try { keys = await window.MatchAppCatalogMedia?.titleKeysForGenres?.(genres); } catch (_) { keys = null; }
        if (seq !== hintSeq) return;
        // Genre data unavailable: say nothing rather than guess a number.
        if (!(keys instanceof Set) || !keys.size) { el.hidden = true; return; }
        genreKeys = keys;
      }
      if (seq !== hintSeq) return;
      const n = countPool(c, genreKeys, null);
      if (n == null) { el.hidden = true; return; }
      let text, level;
      if (n >= 5) { text = t('poolMany', { n }); level = 'many'; }
      else if (n > 0) { text = t('poolFew', { n }); level = 'few'; }
      else {
        text = t('poolNone'); level = 'none';
        let best = null;
        for (const f of explicit) {
          const m = countPool(c, genreKeys, f);
          if (m && (!best || m > best.n)) best = { f, n: m };
        }
        if (best) {
          const chosen = vals(c[best.f]);
          text += ' ' + t('loosen', { filter: optionLabel(best.f, chosen[0]) + (chosen.length > 1 ? '…' : ''), n: best.n });
        }
      }
      el.textContent = text;
      el.dataset.level = level;
      el.hidden = false;
    } catch (_) {
      if (seq === hintSeq) el.hidden = true;
    }
  }
  function scheduleHint() { clearTimeout(hintTimer); hintTimer = setTimeout(updateHint, 300); }

  /* ---------- A1: why this pick ---------- */
  function catalogIndex() {
    const map = new Map();
    catalog().forEach(e => { if (e && e.title) map.set(String(e.title).toLowerCase(), e); });
    return map;
  }
  function lovedLink(index, entry, title) {
    if (!entry) return null;
    let ratings = {};
    try { ratings = JSON.parse(localStorage.getItem('match_userRatings') || '{}') || {}; } catch (_) { ratings = {}; }
    const moods = new Set(entry.moods || []), cats = new Set(entry.cats || []);
    const self = String(title).toLowerCase();
    let best = null;
    Object.keys(ratings).forEach(name => {
      if (Number(ratings[name]) < 4 || String(name).toLowerCase() === self) return;
      const loved = index.get(String(name).toLowerCase());
      if (!loved) return;
      const sm = (loved.moods || []).filter(m => moods.has(m)).length;
      const sc = (loved.cats || []).filter(x => cats.has(x)).length;
      const score = sm * 2 + sc;
      if (score > 0 && (!best || score > best.score)) best = { title: loved.title, mood: sm > 0, score };
    });
    return best;
  }
  function renderWhy() {
    const wrap = document.getElementById('res-criteria');
    if (!wrap) return;
    let el = document.getElementById('res-why');
    const title = String(window.globalMatchTitle || '');
    if (window.lastMatchWasSpecificSearch || !title) { if (el) el.hidden = true; return; }
    const index = catalogIndex();
    const entry = index.get(title.toLowerCase()) || null;
    const c = window.lastMatchCriteria || {};
    const n = Object.keys(FIELDS).reduce((sum, f) => sum + vals(c[f]).length, 0);
    const relaxed = window.lastMatchRelaxation && window.lastMatchRelaxation !== 'exact';
    const parts = [];
    if (n > 0 && !relaxed) parts.push(t('choices', { n }));
    else if (!n && window.lastMatchTasteBiased === true) parts.push(t('taste'));
    const loved = lovedLink(index, entry, title);
    if (loved) parts.push(t(loved.mood ? 'mood' : 'format', { title: loved.title }));
    if (!entry) parts.push(t('verified'));
    if (!parts.length) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('p');
      el.id = 'res-why';
      el.className = 'res-why';
      wrap.appendChild(el);
    }
    const label = document.createElement('strong');
    label.textContent = t('why');
    el.replaceChildren(label, document.createTextNode(' ' + parts.join(' · ')));
    el.hidden = false;
  }

  /* ---------- B3: Ask AI about this title ---------- */
  function renderAskAi() {
    const box = document.getElementById('result-box');
    if (!box) return;
    const title = String(window.globalMatchTitle || '').trim();
    let a = document.getElementById('res-ask-ai');
    if (!title) { if (a) a.hidden = true; return; }
    if (!a) {
      const anchor = box.querySelector('.res-action-grid--last') || box.querySelector('.rematch-wrap');
      if (!anchor) return;
      a = document.createElement('a');
      a.id = 'res-ask-ai';
      a.className = 'res-ask-ai';
      if (anchor.classList.contains('rematch-wrap')) anchor.insertAdjacentElement('beforebegin', a);
      else anchor.insertAdjacentElement('afterend', a);
    }
    a.href = '/discover.html?title=' + encodeURIComponent(title) + '&focus=start';
    a.textContent = t('askAi');
    a.hidden = false;
  }

  function onNewMatch() {
    // renderResult() fills the criteria chips synchronously right after this
    // event; paint on the next task so our line lands after them.
    setTimeout(() => {
      try { renderWhy(); } catch (_) {}
      try { renderAskAi(); } catch (_) {}
    }, 0);
    scheduleHint();
  }
  function onLang() {
    try { if (document.getElementById('res-why') && !document.getElementById('res-why').hidden) renderWhy(); } catch (_) {}
    try { const a = document.getElementById('res-ask-ai'); if (a && !a.hidden) a.textContent = t('askAi'); } catch (_) {}
    scheduleHint();
  }
  function boot() {
    installStyles();
    document.addEventListener('matchapp:newmatch', onNewMatch);
    document.addEventListener('matchapp:criteriachange', scheduleHint);
    document.addEventListener('matchapp:optionspruned', scheduleHint);
    document.addEventListener('matchapp:historychange', scheduleHint);
    document.addEventListener('matchapp:langchange', () => setTimeout(onLang, 0));
    const form = document.getElementById('questionnaire-box');
    if (form) form.addEventListener('change', scheduleHint);
    scheduleHint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
