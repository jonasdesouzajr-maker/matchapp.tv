/* One policy for solo, discovery and remote matches. Never relax user choices. */
(function () {
  'use strict';
  const key = title => String(title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const values = v => (Array.isArray(v) ? v : [v]).filter(x => x && x !== 'any');
  const conflicts = [ ['funny', 'intense and thrilling'], ['funny', 'dark and gritty'], ['funny', 'heartbreaking'], ['funny', 'scary'], ['cozy comfort watch', 'intense and thrilling'], ['cozy comfort watch', 'scary'] ];
  const DRAMA_CATS = new Set(['K-drama','C-drama','J-drama','telenovela','novela brasileira','vertical micro-drama','Turkish dizi','Thai drama']);
  const COMEDY_CATS = new Set(['stand-up comedy special']);
  const LIGHT_MOODS = new Set(['funny','light and feel-good','cozy comfort watch','romantic','inspiring']);
  const HEAVY_MOODS = new Set(['scary','dark and gritty','intense and thrilling','heartbreaking']);
  const COMEDY_RE = /\b(comed(?:y|ies|ia)|comédia|c[oô]mic[oa]?|funny|hilarious|sitcom|stand-?up|laugh(?:s|ing|ter)?|engraçad\w*|humou?r(?:ous)?|lustig|dr[oô]le|komöd\w*|komedi|комеди|كوميد|喜剧|コメディ|코미디|sketch)\b/i;
  const DRAMA_RE = /\b(k-?drama|c-?drama|j-?drama|telenovela|novela|dizi|tear-?jerk\w*|melodrama|dram[aá]tic[oa]?)\b|\bdramas?\b/i;
  const HORROR_RE = /\b(horror|scary|spooky|terror|slasher|pesadelo|ホラー|공포|恐怖)\b/i;
  const ROMANCE_RE = /\b(romance|romantic|rom-?com|love story|rom[aâ]ntic[oa]?)\b/i;
  const GUEST_ID = 'guest';
  let owner = null, permanent = new Set(), history = [], pending = [], ready = Promise.resolve(), flushing = null;
  const titleItem = item => typeof item === 'string' ? !!item.trim() : item && typeof item.title === 'string' && !!item.title.trim();
  const stored = (name, fallback, validItem = titleItem) => { try { const value = JSON.parse(localStorage.getItem(name)); if (Array.isArray(fallback)) return Array.isArray(value) ? value.filter(validItem) : fallback; return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback; } catch (_) { return fallback; } };
  const bucket = () => owner || GUEST_ID;
  const exclusionStore = id => 'match_exclusions_' + (id || GUEST_ID);
  const historyStore = id => 'match_history_' + (id || GUEST_ID);
  function known() {
    const titles = new Set(permanent);
    ['match_seenList','match_savedList','match_dislikedList'].forEach(name => stored(name, []).forEach(i => titles.add(key(i.title || i))));
    stored('match_recentTitles', [], item => typeof item === 'string' && !!item.trim()).forEach(t => titles.add(key(t)));
    Object.keys(stored('match_userRatings', {})).forEach(t => titles.add(key(t)));
    return titles;
  }
  function persist() {
    try {
      localStorage.setItem(exclusionStore(bucket()), JSON.stringify([...permanent]));
      localStorage.setItem(historyStore(bucket()), JSON.stringify(history));
    } catch (_) {}
  }
  async function flush() {
    if (!owner || !window.supabaseClient || !pending.length) return;
    if (flushing) return flushing;
    const account=owner;
    flushing=(async()=>{
      while(pending.length && owner===account){
        const batch=pending.slice(0,500);
        const {error}=await window.supabaseClient.rpc('portfolio_action',{p_action:'remember',p_payload:{items:batch}});
        if(error)break;
        if(owner===account)pending.splice(0,batch.length);
      }
    })();
    try{await flushing;}finally{flushing=null;}
  }
  async function attach(user) {
    owner = user ? user.id : null;
    const guestKeys = new Set(stored(exclusionStore(GUEST_ID), [], item => typeof item === 'string' && !!item));
    const guestHistory = stored(historyStore(GUEST_ID), [], item => item && typeof item.title === 'string' && !!item.title.trim());
    permanent = new Set(stored(exclusionStore(owner || GUEST_ID), [], item => typeof item === 'string' && !!item));
    history = stored(historyStore(owner || GUEST_ID), [], item => item && typeof item.title === 'string' && !!item.title.trim());
    pending = [];

    if (owner) {
      guestKeys.forEach(k => permanent.add(k));
      const merged = new Map(history.map(i => [key(i.title),i]));
      guestHistory.forEach(i => { if(!merged.has(key(i.title))) merged.set(key(i.title),i); });
      history=[...merged.values()];
    }
    stored('match_recentTitles', [], item => typeof item === 'string' && !!item.trim()).forEach(t => permanent.add(key(t)));

    if (!owner) { persist(); document.dispatchEvent(new CustomEvent('matchapp:historychange')); return; }
    const meta=user.user_metadata||{};
    if(Array.isArray(meta.match_exclusion_keys))meta.match_exclusion_keys.filter(k=>typeof k==='string').forEach(k=>permanent.add(k));
    if(Array.isArray(meta.match_history)){
      const old=new Map(history.map(i=>[key(i.title),i]));
      meta.match_history.filter(i=>i&&typeof i.title==='string').forEach(i=>{if(!old.has(key(i.title)))old.set(key(i.title),i);});
      history=[...old.values()];
    }
    const account=owner;
    const {data,error} = await window.supabaseClient.rpc('portfolio_action', {p_action:'list',p_payload:{}});
    if(owner!==account)return;
    if (!error && data) {
      (data.keys || []).forEach(k => permanent.add(k));
      const byKey = new Map(history.map(i => [key(i.title),i]));
      (data.history || []).forEach(i => { const old = byKey.get(key(i.title)); if (!old || i.addedAt > old.addedAt) byKey.set(key(i.title),i); });
      history = [...byKey.values()].sort((a,b) => b.addedAt-a.addedAt);
    }
    ['match_savedList','match_seenList','match_dislikedList'].forEach((name,n) => stored(name,[]).forEach(i => remember(typeof i === 'string' ? {title:i} : i,['save','seen','dislike'][n],false)));
    Object.keys(stored('match_userRatings',{})).forEach(title => remember({title},'rated',false));
    guestHistory.forEach(i => { if(i && i.title) remember(i,'shown',false); });
    persist();
    await flush();
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
  }
  function remember(item, action, sync = true) {
    if (!item || !key(item.title)) return;
    const clean = {title:String(item.title).slice(0,300),action:String(action||'shown').slice(0,20),addedAt:Number(item.addedAt)||Date.now(),posterUrl:String(item.posterUrl||'').slice(0,1500),streamUrl:String(item.streamUrl||'').slice(0,1500),reason:String(item.reason||'').slice(0,300)};
    permanent.add(key(clean.title));
    const old = history.findIndex(i => key(i.title) === key(clean.title));
    if (old < 0) history.unshift(clean); else if (clean.action !== 'rated') history[old] = clean;
    if(owner) pending.push(clean);
    persist();
    if (sync && owner) flush().catch(() => {});
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
  }
  async function forget(title) {
    const titleKey=key(title); if(!titleKey)return false;
    permanent.delete(titleKey);
    history=history.filter(i=>key(i.title)!==titleKey);
    pending=pending.filter(i=>key(i.title)!==titleKey);
    persist();
    if(owner&&window.supabaseClient){
      try{const {error}=await window.supabaseClient.rpc('portfolio_action',{p_action:'forget',p_payload:{title:String(title).slice(0,300)}});if(error)throw error;}catch(_){return false;}
    }
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
    return true;
  }
  function catalogList() {
    try { if (typeof CONTENT_CATALOG !== 'undefined' && Array.isArray(CONTENT_CATALOG)) return CONTENT_CATALOG; } catch (_) {}
    return [];
  }
  function asEntry(item) {
    if (!item) return item;
    const titled = typeof item === 'string' ? { title: item } : item;
    const hit = catalogList().find(e => e && key(e.title) === key(titled.title));
    if (hit) return hit;
    const blob = [titled.type, titled.synopsis, titled.title, (titled.cats || []).join(' '), (titled.moods || []).join(' ')].filter(Boolean).join(' ');
    const cats = values(titled.cats);
    const moods = values(titled.moods);
    if (/k-?drama/i.test(blob) && !cats.includes('K-drama')) cats.push('K-drama');
    if (/c-?drama/i.test(blob) && !cats.includes('C-drama')) cats.push('C-drama');
    if (/j-?drama/i.test(blob) && !cats.includes('J-drama')) cats.push('J-drama');
    if (/telenovela|novela brasileira/i.test(blob) && !cats.some(c => c === 'telenovela' || c === 'novela brasileira')) cats.push('telenovela');
    if (/stand-?up/i.test(blob) && !cats.includes('stand-up comedy special')) cats.push('stand-up comedy special');
    if (COMEDY_RE.test(blob) && !moods.includes('funny')) moods.push('funny');
    if (HORROR_RE.test(blob) && !moods.includes('scary')) moods.push('scary');
    if (DRAMA_RE.test(blob) && !COMEDY_RE.test(blob) && !moods.includes('heartbreaking') && !cats.some(c => DRAMA_CATS.has(c))) moods.push('heartbreaking');
    return { ...titled, cats, moods, synopsis: titled.synopsis || '', platform: titled.platform || '' };
  }
  function intentFromText(text) {
    const q = String(text || '');
    const families = new Set();
    const moods = [];
    const cats = [];
    if (COMEDY_RE.test(q)) { families.add('comedy'); moods.push('funny'); }
    if (/\bk-?drama\b/i.test(q)) { families.add('drama'); cats.push('K-drama'); }
    else if (/\bc-?drama\b/i.test(q)) { families.add('drama'); cats.push('C-drama'); }
    else if (/\bj-?drama\b/i.test(q)) { families.add('drama'); cats.push('J-drama'); }
    else if (/\b(telenovela|novela)\b/i.test(q)) { families.add('drama'); cats.push('telenovela'); }
    else if (DRAMA_RE.test(q)) { families.add('drama'); }
    if (HORROR_RE.test(q)) { families.add('horror'); moods.push('scary'); }
    if (ROMANCE_RE.test(q)) { families.add('romance'); moods.push('romantic'); }
    if (/\b(documentar(?:y|ies)|documentário)\b/i.test(q)) { families.add('documentary'); cats.push('documentary'); }
    if (/\b(kids?|children|family|infantil)\b/i.test(q)) { families.add('kids'); cats.push('kids'); }
    return {
      families, moods, cats,
      asCriteria() { return { mood: moods.slice(), cat: cats.slice(), plat: [], vibe: [], rating: [], decade: [] }; }
    };
  }
  function genreFits(entry, criteria, flags) {
    if (!entry) return false;
    const wantedMoods = values(criteria && criteria.mood);
    const wantedCats = values(criteria && criteria.cat);
    const cats = values(entry.cats);
    const moods = values(entry.moods);
    const primaryMood = moods[0] || '';
    const allowMix = !!(flags && flags.allowMix);
    const wantsComedy = wantedMoods.includes('funny') || wantedCats.includes('stand-up comedy special');
    const wantsDramaFormat = wantedCats.some(c => DRAMA_CATS.has(c));
    const wantsHorror = wantedMoods.includes('scary');

    if (wantsComedy && !wantsDramaFormat && !allowMix) {
      if (cats.some(c => DRAMA_CATS.has(c))) return false;
      if (cats.includes('reality show') && !wantedCats.includes('reality show')) return false;
      if (cats.includes('documentary') && !wantedCats.includes('documentary')) return false;
      if (!moods.includes('funny') && !cats.some(c => COMEDY_CATS.has(c))) return false;
      if (HEAVY_MOODS.has(primaryMood) && primaryMood !== 'funny') return false;
    }
    if (wantsDramaFormat && !wantsComedy) {
      if (cats.includes('stand-up comedy special')) return false;
      if (primaryMood === 'funny' && !cats.some(c => DRAMA_CATS.has(c))) return false;
    }
    if (wantsHorror && cats.includes('kids') && !wantedCats.includes('kids')) return false;
    if (wantedCats.includes('kids') && (moods.includes('scary') || HEAVY_MOODS.has(primaryMood))) return false;
    if (wantedMoods.length && wantedMoods.every(m => LIGHT_MOODS.has(m))) {
      if (HEAVY_MOODS.has(primaryMood)) return false;
      if (cats.some(c => DRAMA_CATS.has(c)) && !wantsDramaFormat && !allowMix) return false;
    }
    if (wantedMoods.length && wantedMoods.every(m => HEAVY_MOODS.has(m))) {
      if (cats.includes('stand-up comedy special') && !wantsComedy) return false;
      if (primaryMood === 'funny' && !wantedMoods.includes('funny')) return false;
    }
    return true;
  }
  function fitsQuestion(item, question) {
    const intent = question && question.families ? question : intentFromText(question);
    if (!intent.families || !intent.families.size) return !!(item && item.title);
    const entry = asEntry(item);
    if (!entry || !entry.title) return false;
    const allowMix = intent.families.has('comedy') && intent.families.has('drama');
    return genreFits(entry, intent.asCriteria ? intent.asCriteria() : { mood: intent.moods, cat: intent.cats }, { allowMix });
  }
  function sameFamily(a, b) {
    a = asEntry(a); b = asEntry(b);
    if (!a || !b) return false;
    const aCats = values(a.cats), bCats = values(b.cats);
    const aMoods = values(a.moods), bMoods = values(b.moods);
    const aDrama = aCats.some(c => DRAMA_CATS.has(c));
    const bDrama = bCats.some(c => DRAMA_CATS.has(c));
    const aComedy = aMoods.includes('funny') || aCats.some(c => COMEDY_CATS.has(c));
    const bComedy = bMoods.includes('funny') || bCats.some(c => COMEDY_CATS.has(c));
    if (aComedy && !aDrama && !bComedy) return false;
    if (bComedy && !bDrama && !aComedy) return false;
    if (aDrama && !aComedy && bComedy && !bDrama) return false;
    if (bDrama && !bComedy && aComedy && !aDrama) return false;
    if (aMoods.includes('scary') && bMoods.includes('funny') && !bMoods.includes('scary')) return false;
    if (bMoods.includes('scary') && aMoods.includes('funny') && !aMoods.includes('scary')) return false;
    return true;
  }
  function matches(entry, criteria, extra = []) {
    if (!entry || !entry.title || known().has(key(entry.title)) || extra.includes(key(entry.title))) return false;
    const mapping = {cat:'cats',plat:'platform',mood:'moods',vibe:'vibes',rating:'ratings'};
    for (const [field,property] of Object.entries(mapping)) {
      const wanted = values(criteria[field]);
      if (wanted.length && !values(entry[property]).some(v => wanted.includes(v))) return false;
    }
    const decades = values(criteria.decade);
    if (decades.length && !decades.some(d => { const start = Number(String(d).match(/\d{4}/)?.[0]); return start && Number(entry.year) >= start && Number(entry.year) < start + 10; })) return false;
    if (!genreFits(entry, criteria || {})) return false;
    return true;
  }
  window.matchPolicy = Object.freeze({key,values,matches,remember,forget,known,history:()=>history.slice(),ready:()=>ready,incompatible:(value,state) => conflicts.some(([a,b]) => (value===a && values(state.mood).includes(b)) || (value===b && values(state.mood).includes(a))),genreFits,intentFromText,fitsQuestion,sameFamily,asEntry,attach:user => (ready = attach(user).catch(() => {})), flush});
  window.addEventListener('online', () => flush().catch(() => {}));
  setTimeout(() => {
    const client = window.supabaseClient;
    if (!client || typeof client.rpc !== 'function' || client.__matchQuotaSeparated) return;
    const rpc = client.rpc.bind(client);
    client.rpc = function (fn, args, options) {
      if (fn === 'consume_ai_action' && args && args.p_reason === 'match') return rpc('consume_match', undefined, options);
      return rpc(fn, args, options);
    };
    Object.defineProperty(client, '__matchQuotaSeparated', {value:true, configurable:false});
  }, 0);
})();
