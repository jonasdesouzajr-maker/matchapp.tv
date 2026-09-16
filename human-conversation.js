(function(){
  'use strict';

  function lang(){return window.MATCH_LANG||document.documentElement.lang||'en'}
  function nickname(){try{return String(localStorage.getItem('match_user_nickname')||'').trim().slice(0,40)}catch(_){return''}}

  const STOCK = [
    /^\s*(?:sure|of course|absolutely|certainly|great question|got it|okay|ok|alright)[,!.]?\s+/i,
    /^\s*(?:as an ai(?: language model)?)[,.:]?\s+/i,
    /^\s*(?:based on (?:your|the) (?:request|query|question))[,.:]?\s+/i,
    /^\s*(?:here(?:'s| is| are)|here are)(?: some| a few)? (?:recommendations|options|titles|picks|suggestions)(?: that match what you asked(?: for)?)?[,.:]?\s+/i,
    /^\s*aqui est[aã]o t[ií]tulos que combinam com o que voc[eê] pediu[.!]?\s+/i,
    /^\s*i(?:['’]d| would) start with [^.!—–-]+(?:\s*[—–-]\s*|\s+)it feels like the strongest fit for what you(?:['’]re| are) asking for[.!]?\s*/i,
    /^\s*eu começaria por [^.!—–-]+(?:\s*[—–-]\s*)?parece a melhor combina[cç][aã]o para o que voc[eê] est[aá] procurando[.!]?\s*/i,
    /^\s*yo empezaría con [^.!—–-]+(?:\s*[—–-]\s*)?parece la opci[oó]n que mejor encaja con lo que buscas[.!]?\s*/i,
    /^\s*je commencerais par [^.!—–-]+(?:\s*[—–-]\s*)?c[’']est celui qui correspond le mieux[^.]+[.!]?\s*/i,
    /^\s*ich würde mit [^.!—–-]+ anfangen[^.]*[.!]?\s*/i,
    /^\s*io inizierei da [^.!—–-]+[^.]*[.!]?\s*/i,
    /^\s*if you(?:['’]re| are) looking for[,:]?\s+/i,
    /^\s*(?:i(?:['’]d| would) recommend|let me (?:recommend|suggest)|my (?:top )?recommendation is)[,:]?\s+/i
  ];

  function cleanGeneric(answer){
    let s = String(answer || '').replace(/\s+/g, ' ').trim();
    let prev = '';
    while (s && s !== prev) {
      prev = s;
      for (const re of STOCK) s = s.replace(re, '');
      s = s.replace(/^\s+/, '');
    }
    s = s.replace(/\s*i(?:['’]d| would) start with [^.!—–-]+(?:\s*[—–-]\s*|\s+)it feels like the strongest fit for what you(?:['’]re| are) asking for[.!]?/gi, ' ');
    s = s.replace(/\s*eu começaria por [^.!—–-]+(?:\s*[—–-]\s*)?parece a melhor combina[cç][aã]o para o que voc[eê] est[aá] procurando[.!]?/gi, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    const parts = s.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0].toLocaleLowerCase() === parts[1].toLocaleLowerCase()) parts.shift();
    return parts.join(' ').trim();
  }

  function fromFirstResult(payload){
    const first = payload && Array.isArray(payload.results) ? payload.results[0] : null;
    if (!first || !first.title) return '';
    const syn = String(first.synopsis || '').replace(/\s+/g, ' ').trim();
    return syn ? first.title + ' — ' + syn : String(first.title);
  }

  function humanize(payload, history){
    if (!payload || typeof payload.answer !== 'string') return payload;
    let answer = cleanGeneric(payload.answer);
    if (!answer) answer = fromFirstResult(payload);
    const name = nickname();
    const firstTurn = !Array.isArray(history) || history.length === 0;
    if (firstTurn && name && answer && !answer.toLocaleLowerCase().startsWith(name.toLocaleLowerCase())) {
      answer = name + ', ' + answer.charAt(0).toLocaleLowerCase() + answer.slice(1);
    }
    payload.answer = answer;
    return payload;
  }

  function patchConversation(){
    if (typeof window.askAIConversational !== 'function' || window.askAIConversational.__humanPatched) return false;
    const original = window.askAIConversational;
    const wrapped = async function(question, history){ return humanize(await original.call(this, question, history), history); };
    wrapped.__humanPatched = true;
    wrapped.__original = original;
    window.askAIConversational = wrapped;
    return true;
  }

  async function speakHuman(textValue, btn){
    if (!('speechSynthesis' in window)) {
      window.showToast?.(typeof window.t === 'function' ? window.t('discover.noTts') : 'Voice playback is not supported in this browser.', true);
      return;
    }
    if (btn?.classList.contains('speaking')) {
      speechSynthesis.cancel(); btn.classList.remove('speaking'); return;
    }
    speechSynthesis.cancel();
    const S = window.MatchSettings;
    let voices = [];
    try { voices = S?.listVoices ? await S.listVoices() : speechSynthesis.getVoices(); } catch (_) { voices = speechSynthesis.getVoices(); }
    const utter = new SpeechSynthesisUtterance(String(textValue || ''));
    const v = S?.resolveVoice ? S.resolveVoice(voices, lang()) : null;
    if (v) { utter.voice = v; utter.lang = v.lang; } else utter.lang = lang();
    const configuredRate = Number(S?.get?.('voiceRate'));
    const configuredPitch = Number(S?.get?.('voicePitch'));
    utter.rate = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : .96;
    utter.pitch = Number.isFinite(configuredPitch) && configuredPitch > 0 ? configuredPitch : .98;
    utter.volume = 1;
    document.querySelectorAll('.discover-speak.speaking').forEach(b => b.classList.remove('speaking'));
    if (btn) btn.classList.add('speaking');
    utter.onend = () => btn?.classList.remove('speaking');
    utter.onerror = () => btn?.classList.remove('speaking');
    speechSynthesis.speak(utter);
  }

  function patchReadAloud(){
    if (typeof window.readAloud !== 'function' || window.readAloud.__humanPatched) return false;
    speakHuman.__humanPatched = true;
    speakHuman.__original = window.readAloud;
    window.readAloud = speakHuman;
    return true;
  }

  window.humanizeAskAI = humanize;
  window.cleanAskOpening = cleanGeneric;

  let tries = 0;
  function patch(){
    const a = patchConversation(), b = patchReadAloud();
    if ((a || window.askAIConversational?.__humanPatched) && (b || window.readAloud?.__humanPatched)) return;
    if (++tries < 80) setTimeout(patch, 125);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patch, { once: true }); else patch();
  document.addEventListener('matchapp:langchange', () => { try { speechSynthesis.cancel(); } catch (_) {} });
})();
