/* One policy for solo, discovery and remote matches. Never relax user choices. */
(function () {
  'use strict';
  const key = title => String(title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const values = v => (Array.isArray(v) ? v : [v]).filter(x => x && x !== 'any');
  const conflicts = [ ['funny', 'intense and thrilling'], ['funny', 'dark and gritty'], ['funny', 'heartbreaking'], ['funny', 'scary'], ['cozy comfort watch', 'intense and thrilling'], ['cozy comfort watch', 'scary'] ];
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
  function matches(entry, criteria, extra = []) {
    if (!entry || !entry.title || known().has(key(entry.title)) || extra.includes(key(entry.title))) return false;
    const mapping = {cat:'cats',plat:'platform',mood:'moods',vibe:'vibes',rating:'ratings'};
    for (const [field,property] of Object.entries(mapping)) {
      const wanted = values(criteria[field]);
      if (wanted.length && !values(entry[property]).some(v => wanted.includes(v))) return false;
    }
    const decades = values(criteria.decade);
    if (decades.length && !decades.some(d => { const start = Number(String(d).match(/\d{4}/)?.[0]); return start && Number(entry.year) >= start && Number(entry.year) < start + 10; })) return false;
    return true;
  }
  window.matchPolicy = Object.freeze({key,values,matches,remember,forget,known,history:()=>history.slice(),ready:()=>ready,incompatible:(value,state) => conflicts.some(([a,b]) => (value===a && values(state.mood).includes(b)) || (value===b && values(state.mood).includes(a))),attach:user => (ready = attach(user).catch(() => {})), flush});
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
