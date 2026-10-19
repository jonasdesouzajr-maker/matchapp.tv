/* One policy for solo, discovery and remote matches. Never relax user choices. */
(function () {
  'use strict';
  const key = title => String(title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const values = v => (Array.isArray(v) ? v : [v]).filter(x => x && x !== 'any');
  // A contradiction is symmetric: selecting Comfort disables Thriller,
  // and selecting Thriller disables Comfort. This is also the final
  // recommendation gate, not merely a cosmetic disabled chip.
  const conflicts = [
    ['funny','intense and thrilling'],['funny','dark and gritty'],
    ['funny','heartbreaking'],['funny','scary'],
    ['cozy comfort watch','intense and thrilling'],['cozy comfort watch','scary'],
    ['cozy comfort watch','dark and gritty'],['cozy comfort watch','heartbreaking'],
    ['light and feel-good','scary'],['light and feel-good','dark and gritty']
  ];
  const moodGenreBlocks = {
    'cozy comfort watch':['Thriller','Horror','War','War & Politics','Crime'],
    'light and feel-good':['Thriller','Horror','War','War & Politics'],
    'funny':['Horror','War','War & Politics'],
    'scary':['Family','Kids']
  };
  const comfortHeavyText = /\b(?:murder(?:ed|er)?|serial killer|kidnap(?:ped|ping)?|hostage|tortur(?:e|ed)|terminal(?:ly)?|cancer|dying|death|funeral|grief|organ donor|organ transplant|sick child|critically ill|life[- ]threatening|war zone|revenge killing|sexual assault|assaulted|rape|raped|violent attack|violence against|brutal crime)\b/i;
  function incompatible(value,state) {
    const selectedMoods=values(state?.mood),selectedGenres=values(state?.genre);
    if(conflicts.some(([a,b])=>(value===a&&selectedMoods.includes(b))||(value===b&&selectedMoods.includes(a))))return true;
    return Object.entries(moodGenreBlocks).some(([mood,blocked])=>
      (value===mood&&blocked.some(genre=>selectedGenres.includes(genre)))||
      (blocked.includes(value)&&selectedMoods.includes(mood)));
  }
  const DRAMA_CATS = new Set(['K-drama','C-drama','J-drama','telenovela','novela brasileira','vertical micro-drama','Turkish dizi','Thai drama']);
  const COMEDY_CATS = new Set(['stand-up comedy special']);
  const LIGHT_MOODS = new Set(['funny','light and feel-good','cozy comfort watch','romantic','inspiring']);
  const HEAVY_MOODS = new Set(['scary','dark and gritty','intense and thrilling','heartbreaking']);
  const COMEDY_STRONG = /\b(sitcoms?|stand-?up(?:\s+comed\w*)?|sketch\s+comed\w*|comed(?:y|ies)|comédia|komöd\w*|komedi|комеди|كوميد|喜剧|コメディ|코미디)\b/i;
  const COMEDY_WEAK = /\b(funny|hilarious|humou?rous|laugh(?:s|ter)|engraçad\w*|lustig|dr[oô]le)\b/i;
  const DRAMA_STRONG = /\b(k-?drama|c-?drama|j-?drama|telenovela|novelas?|melodrama|dizi|tear-?jerk\w*|vertical\s+micro-?drama)\b/i;
  const DRAMA_WEAK = /\b(dram[aá]tic[oa]?|dramas?)\b/i;
  const HORROR_RE = /\b(horror|scary|spooky|terror|slasher|pesadelo|ホラー|공포|恐怖)\b/i;
  const ROMANCE_RE = /\b(romance|romantic|rom-?com|love story|rom[aâ]ntic[oa]?)\b/i;

  const GUEST_ID = 'guest';
  let owner = null, permanent = new Set(), history = [], pending = [], ready = Promise.resolve(), flushing = null;
  const titleItem = item => typeof item === 'string' ? !!item.trim() : item && typeof item.title === 'string' && !!item.title.trim();
  const stored = (name, fallback, validItem = titleItem) => { try { const value = JSON.parse(localStorage.getItem(name)); if (Array.isArray(fallback)) return Array.isArray(value) ? value.filter(validItem) : fallback; return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback; } catch (_) { return fallback; } };
  const bucket = () => owner || GUEST_ID;
  const exclusionStore = id => 'match_exclusions_' + (id || GUEST_ID);
  const historyStore = id => 'match_history_' + (id || GUEST_ID);
  const pendingStore = id => 'match_history_pending_' + (id || GUEST_ID);
  const cloudStore = id => 'match_history_cloud_' + (id || GUEST_ID);
  let historySnapshot='',historyRevision=0;
  let refreshing=null,lastRefresh=0;
  const exclusionCache=new Map();
  const activeClaims=new Map();
  const HARD_ACTIONS = new Set(['save','saved','watchlater','dislike','declined','notforme']);
  const passive = action => !HARD_ACTIONS.has(String(action || '').toLowerCase().replace(/[^a-z]/g,''));
  // Retain source identity as well as every verified title spelling. TMDB IDs
  // are namespaced: movie 123 and television 123 are different works.
  function identityKeys(item) {
    const row = typeof item === 'string' ? {title:item} : item || {};
    const keys = new Set();
    const addTitle = title => { if (typeof title === 'string' && title.trim()) keys.add(key(title)); };
    [row.title,row.originalTitle,row.original_title,row.original_name].forEach(addTitle);
    [row._tmdb,row._catalogMedia,row._meta].filter(Boolean).forEach(source => {
      [source.title,source.originalTitle,source.original_title,source.original_name].forEach(addTitle);
    });
    (Array.isArray(row.titleAliases) ? row.titleAliases : []).slice(0,30).forEach(addTitle);
    (Array.isArray(row.identityKeys) ? row.identityKeys : []).slice(0,1000).forEach(value => {
      if (typeof value === 'string' && (/^[\p{L}\p{N}]{1,300}$/u.test(value) || /^(?:tmdb:(?:movie|tv):[1-9]\d*|imdb:tt\d{5,})$/.test(value))) keys.add(value);
    });
    for (const source of [row,row._tmdb,row._catalogMedia,row._meta].filter(Boolean)) {
      const id = Number(source.tmdbId || source.tmdb_id || source._tmdbId);
      const format = source.kind || source.media_kind || source.media_type || source._tmdbKind || source.type || row._tmdbKind || row.kind || row.media_kind || row.media_type || row.type;
      const kind = ({movie:'movie',film:'movie',tv:'tv',series:'tv'})[String(format || '').toLowerCase()];
      if (Number.isSafeInteger(id) && id > 0 && ['movie','tv'].includes(kind)) keys.add('tmdb:'+kind+':'+id);
      const imdb = source.imdbId || source.imdb_id;
      if (/^tt\d{5,}$/.test(String(imdb || ''))) keys.add('imdb:'+imdb);
    }
    return keys;
  }
  const intersects = (a,b) => [...a].some(value => b.has(value));
  const boundedIdentityKeys=keys=>[...keys].sort((a,b)=>Number(b.includes(':'))-Number(a.includes(':'))).slice(0,40);
  function cleanItem(item, action) {
    const source=typeof item==='string'?{title:item}:item;
    if(!source || !key(source.title))return null;
    const aliases=[...new Set([source.originalTitle,source.original_title,source.original_name,
      ...[source._tmdb,source._catalogMedia,source._meta].filter(Boolean).flatMap(meta=>[meta.title,meta.originalTitle,meta.original_title,meta.original_name]),
      ...(Array.isArray(source.titleAliases)?source.titleAliases:[])].filter(value=>typeof value==='string'&&value.trim()).map(value=>value.slice(0,300)))].slice(0,30);
    return {title:String(source.title).slice(0,300),action:String(action||source.action||'shown').slice(0,20),addedAt:Number(source.addedAt)||Date.now(),posterUrl:String(source.posterUrl||'').slice(0,1500),streamUrl:String(source.streamUrl||'').slice(0,1500),reason:String(source.reason||'').slice(0,300),identityKeys:boundedIdentityKeys(identityKeys(source)),originalTitle:String(source.originalTitle||source.original_title||source._tmdb?.originalTitle||source._catalogMedia?.originalTitle||source._meta?.originalTitle||'').slice(0,300),titleAliases:aliases,...(source.claimToken?{claimToken:String(source.claimToken).slice(0,100)}:{})};
  }
  function mergeItem(previous, incoming) {
    if(!previous)return incoming;
    // Poster enrichment and history scanning are passive. They must never
    // turn an explicit Not For Me / Watch Later choice back into "shown".
    const preserveAction=!passive(previous.action)&&(passive(incoming.action)||Number(previous.addedAt)>Number(incoming.addedAt));
    const next={...previous,...incoming,identityKeys:[...new Set([...identityKeys(previous),...identityKeys(incoming)])],titleAliases:[...new Set([previous.title,incoming.title,...(previous.titleAliases||[]),...(incoming.titleAliases||[])].filter(Boolean))].slice(0,30)};
    if(!incoming.posterUrl)next.posterUrl=previous.posterUrl||'';
    if(!incoming.streamUrl)next.streamUrl=previous.streamUrl||'';
    if(!incoming.originalTitle)next.originalTitle=previous.originalTitle||'';
    if(!incoming.reason)next.reason=previous.reason||'';
    if(preserveAction){next.action=previous.action;next.addedAt=previous.addedAt;}
    return next;
  }
  function exclusions(hardOnly) {
    const names=[exclusionStore(bucket()),historyStore(bucket()),'match_savedList','match_dislikedList','match_seenList','match_recentTitles','match_userRatings'];
    const snapshots=names.map(name=>{try{return localStorage.getItem(name);}catch(_){return null;}});
    const cached=exclusionCache.get(!!hardOnly);
    if(cached&&cached.owner===bucket()&&cached.revision===historyRevision&&snapshots.every((value,index)=>value===cached.snapshots[index]))return cached.titles;
    const titles = new Set(hardOnly ? [] : permanent);
    if(!hardOnly)stored(exclusionStore(bucket()), [], item=>typeof item==='string').forEach(k=>titles.add(k));
    const add=item=>identityKeys(item).forEach(k=>titles.add(k));
    ['match_savedList','match_dislikedList',...(hardOnly?[]:['match_seenList'])].forEach(name=>stored(name,[]).forEach(add));
    // Read the account-scoped history too: another tab may have saved a title
    // since this document attached its session.
    [...history,...stored(historyStore(bucket()),[])].forEach(item=>{if(!hardOnly||!passive(item.action))add(item);});
    if(!hardOnly){
      stored('match_recentTitles', [], item=>typeof item==='string').forEach(add);
      Object.keys(stored('match_userRatings', {})).forEach(add);
    }
    exclusionCache.set(!!hardOnly,{owner:bucket(),revision:historyRevision,snapshots,titles});
    return titles;
  }
  function excludes(item, options = {}) { return intersects(identityKeys(item),exclusions(!!options.hardOnly)); }
  function known() {
    return new Set(exclusions(false));
  }
  async function historyRpc(action,payload) {
    let timer;
    try{
      return await Promise.race([
        window.supabaseClient.rpc('portfolio_action',{p_action:action,p_payload:{...payload,...(owner&&!payload.ownerId?{ownerId:owner}:{})}}),
        new Promise(resolve=>{timer=setTimeout(()=>resolve({error:{message:'History connection timed out'}}),7000);})
      ]);
    }finally{clearTimeout(timer);}
  }
  // Reserve before a debit or reveal. The database serializes all identities
  // for one account, so two devices cannot both accept the same fresh title.
  // Reservations have no automatic expiry: a lost response must not permit a
  // title that was actually displayed elsewhere to be selected again.
  async function claim(item) {
    await ready;
    const clean=cleanItem(item,'reserved');
    if(!clean||excludes(clean))return false;
    const account=owner;
    const token=window.crypto?.randomUUID?.()||('claim_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
    clean.claimToken=token;
    const accept=record=>{
      remember(record,record.action||'reserved',false,false);
      activeClaims.set(token,{account,item:record});
      return true;
    };
    if(!account){
      const reserve=()=>{
        if(owner!==account||excludes(clean))return false;
        return accept(clean);
      };
      try{return window.navigator?.locks?.request
        ? await window.navigator.locks.request('matchapp-guest-title-claim',reserve)
        : reserve();}catch(_){return false;}
    }
    if(!window.supabaseClient)return false;
    try{
      const {data,error}=await historyRpc('claim',{items:[clean],token});
      if(error||owner!==account||!data)return false;
      if(data.claimed===true){
        if(excludes(clean,{hardOnly:true})){
          activeClaims.set(token,{account,item:data.item||clean});await releaseClaim(clean);return false;
        }
        return accept(data.item||clean);
      }
      if(data.item?.title)remember(data.item,data.item.action||'shown',false,false);
      return false;
    }catch(_){return false;}
  }
  async function releaseClaim(item) {
    const keys=identityKeys(item);
    const found=[...activeClaims].find(([,record])=>record.account===owner&&intersects(identityKeys(record.item),keys));
    if(!found)return false;
    const [token,record]=found;
    if(owner){
      try{const {data,error}=await historyRpc('release_claim',{token});if(error||data?.released!==true)return false;}catch(_){return false;}
    }
    activeClaims.delete(token);
    const removable=history.filter(row=>row.action==='reserved'&&row.claimToken===token);
    const removed=new Set(removable.flatMap(row=>[...identityKeys(row)]));
    history=history.filter(row=>!removable.includes(row));
    for(const value of removed)if(!history.some(row=>identityKeys(row).has(value)))permanent.delete(value);
    persist();
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
    return true;
  }
  function mergeCloud(data) {
    const remote=(Array.isArray(data.history)?data.history:[]).filter(titleItem);
    const remoteKeys=new Set((Array.isArray(data.keys)?data.keys:[]).filter(k=>typeof k==='string'));
    remote.forEach(item=>identityKeys(item).forEach(k=>remoteKeys.add(k)));
    const localPending=new Set([...pending,...stored(pendingStore(bucket()),[])].flatMap(item=>[...identityKeys(item)]));
    const removed=new Set(stored(cloudStore(bucket()),[],item=>typeof item==='string').filter(k=>!remoteKeys.has(k)&&!localPending.has(k)));
    const retained=item=>{const keys=identityKeys(item);return !intersects(keys,removed)||intersects(keys,remoteKeys)||intersects(keys,localPending);};
    removed.forEach(k=>permanent.delete(k));
    history=history.filter(retained);
    if(removed.size){
      try{
        for(const name of ['match_savedList','match_seenList','match_dislikedList','match_recentTitles'])localStorage.setItem(name,JSON.stringify(stored(name,[]).filter(retained)));
        const ratings=stored('match_userRatings',{});Object.keys(ratings).forEach(t=>{if(removed.has(key(t)))delete ratings[t];});localStorage.setItem('match_userRatings',JSON.stringify(ratings));
        const session=JSON.parse(sessionStorage.getItem('match_sessionShown')||'[]');sessionStorage.setItem('match_sessionShown',JSON.stringify((Array.isArray(session)?session:[]).filter(t=>!removed.has(key(t)))));
        if(typeof SESSION_SHOWN!=='undefined')for(const t of SESSION_SHOWN){if(removed.has(key(t)))SESSION_SHOWN.delete(t);}
      }catch(_){}
    }
    // Source aliases coalesce into one record without repeatedly scanning
    // the whole portfolio on large returning accounts.
    const rows=[],byIdentity=new Map();
    for(const item of [...history,...remote]){
      const keys=identityKeys(item),matches=[...new Set([...keys].map(k=>byIdentity.get(k)).filter(index=>index!==undefined))];
      const at=matches.length?matches[0]:rows.length;
      let combined=item;
      const mergedKeys=new Set(keys);
      for(const index of matches){if(rows[index]){identityKeys(rows[index]).forEach(k=>mergedKeys.add(k));combined=mergeItem(rows[index],combined);}if(index!==at)rows[index]=null;}
      rows[at]=combined;mergedKeys.forEach(k=>byIdentity.set(k,at));
    }
    history=rows.filter(Boolean).sort((a,b)=>Number(b.addedAt)-Number(a.addedAt));
    remoteKeys.forEach(k=>permanent.add(k));
    try{localStorage.setItem(cloudStore(bucket()),JSON.stringify([...remoteKeys]));}catch(_){}
  }
  async function refresh(force=false) {
    if(!owner||!window.supabaseClient||(!force&&Date.now()-lastRefresh<2000))return;
    if(refreshing)return refreshing;
    const account=owner;lastRefresh=Date.now();
    refreshing=(async()=>{
      const {data,error}=await historyRpc('list',{});
      if(error||!data||owner!==account)return;
      mergeCloud(data);persist();
      document.dispatchEvent(new CustomEvent('matchapp:historychange'));
      document.dispatchEvent(new CustomEvent('matchapp:portfoliochange',{detail:{action:'refresh',owner}}));
    })();
    try{await refreshing;}catch(_){}finally{refreshing=null;}
  }
  function persist() {
    historyRevision++;
    try {
      localStorage.setItem(exclusionStore(bucket()), JSON.stringify([...permanent]));
      historySnapshot=JSON.stringify(history);
      localStorage.setItem(historyStore(bucket()), historySnapshot);
      localStorage.setItem(pendingStore(bucket()), JSON.stringify(pending));
    } catch (_) {}
  }
  async function flush() {
    if (!owner || !window.supabaseClient || !pending.length) return;
    if (flushing) return flushing;
    const account=owner;
    flushing=(async()=>{
      while(pending.length && owner===account){
        const batch=pending.slice(0,500);
        const {error}=await historyRpc('remember',{items:batch.map(item=>cleanItem(item,item.action))});
        if(error)break;
        if(owner===account){const sent=new Set(batch);pending=pending.filter(item=>!sent.has(item));persist();}
      }
    })();
    try{await flushing;}finally{flushing=null;}
  }
  async function attach(user) {
    const previousOwner=owner;
    if(owner)persist();
    owner = user ? user.id : null;
    const guestKeys = new Set(stored(exclusionStore(GUEST_ID), [], item => typeof item === 'string' && !!item));
    const guestHistory = stored(historyStore(GUEST_ID), [], item => item && typeof item.title === 'string' && !!item.title.trim());
    permanent = new Set(stored(exclusionStore(owner || GUEST_ID), [], item => typeof item === 'string' && !!item));
    history = stored(historyStore(owner || GUEST_ID), [], item => item && typeof item.title === 'string' && !!item.title.trim());
    pending = stored(pendingStore(owner || GUEST_ID), [], item=>item&&typeof item.title==='string');

    if (owner && (!previousOwner || previousOwner===owner)) {
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
    const {data,error} = await historyRpc('list',{});
    if(owner!==account)return;
    if (!error && data) {
      mergeCloud(data);lastRefresh=Date.now();
      history.forEach(item=>identityKeys(item).forEach(k=>permanent.add(k)));
    }
    // Account restoration can contain hundreds of titles. Calling remember()
    // for each one used to rewrite the complete history to localStorage and
    // dispatch matchapp:historychange on every item, locking the main thread
    // immediately after auth on real returning accounts. Stage the same data
    // in memory, then persist/flush/paint once.
    const restoredBaseKeys=history.map(i=>key(i.title));
    const restoredByKey=new Map(history.map(i=>[key(i.title),i]));
    const restoredNewKeys=[],restoredNewSet=new Set();
    const stageRestored=(item,action)=>{
      const source=typeof item==='string'?{title:item}:item;
      const itemKey=key(source&&source.title);if(!itemKey)return;
      const clean=cleanItem(source,action);
      identityKeys(clean).forEach(k=>permanent.add(k));
      if(!restoredByKey.has(itemKey)){
        restoredByKey.set(itemKey,clean);restoredNewKeys.unshift(itemKey);restoredNewSet.add(itemKey);
      }else if(clean.action!=='rated'){
        restoredByKey.set(itemKey,mergeItem(restoredByKey.get(itemKey),clean));
      }
      pending.push(restoredByKey.get(itemKey));
    };
    ['match_savedList','match_seenList','match_dislikedList'].forEach((name,n)=>stored(name,[]).forEach(i=>stageRestored(i,['save','seen','dislike'][n])));
    Object.keys(stored('match_userRatings',{})).forEach(title=>stageRestored({title},'rated'));
    if(!previousOwner||previousOwner===owner)guestHistory.forEach(i=>{if(i&&i.title)stageRestored(i,i.action||'shown');});
    history=[
      ...restoredNewKeys.map(k=>restoredByKey.get(k)).filter(Boolean),
      ...restoredBaseKeys.filter(k=>!restoredNewSet.has(k)).map(k=>restoredByKey.get(k)).filter(Boolean)
    ];
    persist();
    // Once migrated, guest choices belong to this account, not every account
    // subsequently opened on the same browser.
    if(owner){try{localStorage.removeItem(exclusionStore(GUEST_ID));localStorage.removeItem(historyStore(GUEST_ID));localStorage.removeItem(pendingStore(GUEST_ID));}catch(_){}}
    await flush();
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
  }
  function remember(item, action, sync = true, enqueue = true) {
    if (!item || !key(item.title)) return;
    // Merge another tab's latest writes before persisting this tab's choice.
    let externalSnapshot='';try{externalSnapshot=localStorage.getItem(historyStore(bucket()))||'';}catch(_){}
    for(const row of externalSnapshot!==historySnapshot?stored(historyStore(bucket()),[]):[]){
      const rowKeys=identityKeys(row),index=history.findIndex(i=>intersects(identityKeys(i),rowKeys));
      if(index<0)history.push(row);else history[index]=mergeItem(history[index],row);
      rowKeys.forEach(k=>permanent.add(k));
    }
    let clean=cleanItem(item,action);
    const keys=identityKeys(clean);
    const old = history.findIndex(i => intersects(identityKeys(i),keys));
    if(old>=0)clean=mergeItem(history[old],clean);
    identityKeys(clean).forEach(k=>permanent.add(k));
    if (old < 0) history.unshift(clean); else history[old] = clean;
    if(clean.action!=='reserved')for(const [token,record] of activeClaims)if(record.account===owner&&intersects(identityKeys(record.item),keys))activeClaims.delete(token);
    if(owner&&enqueue){pending=pending.filter(i=>!intersects(identityKeys(i),identityKeys(clean)));pending.push(clean);}
    persist();
    if (sync && owner) flush().catch(() => {});
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
  }
  function savePreference(item, action) {
    if(!item?.title||!['save','dislike','seen'].includes(action))return false;
    const clean={...item,...cleanItem(item,action)},keys=identityKeys(clean);
    const name=action==='save'?'match_savedList':action==='dislike'?'match_dislikedList':'match_seenList';
    const list=stored(name,[]).filter(row=>!intersects(identityKeys(row),keys));list.unshift(clean);
    try{
      localStorage.setItem(name,JSON.stringify(list));
      if(action==='dislike')localStorage.setItem('match_savedList',JSON.stringify(stored('match_savedList',[]).filter(row=>!intersects(identityKeys(row),keys))));
    }catch(_){}
    remember(clean,action);
    document.dispatchEvent(new CustomEvent('matchapp:portfoliochange',{detail:{action,item:clean,owner}}));
    return true;
  }
  async function forget(title) {
    const account=owner;
    const titleKey=key(title); if(!titleKey)return false;
    const removed=new Set([titleKey]);
    history.filter(i=>identityKeys(i).has(titleKey)).forEach(i=>identityKeys(i).forEach(k=>removed.add(k)));
    removed.forEach(k=>permanent.delete(k));
    history=history.filter(i=>!intersects(identityKeys(i),removed));
    pending=pending.filter(i=>!intersects(identityKeys(i),removed));
    try{
      for(const name of ['match_savedList','match_seenList','match_dislikedList','match_recentTitles']){
        localStorage.setItem(name,JSON.stringify(stored(name,[]).filter(i=>!intersects(identityKeys(i),removed))));
      }
      const ratings=stored('match_userRatings',{});
      Object.keys(ratings).forEach(t=>{if(removed.has(key(t)))delete ratings[t];});
      localStorage.setItem('match_userRatings',JSON.stringify(ratings));
      const shown=JSON.parse(sessionStorage.getItem('match_sessionShown')||'[]');
      sessionStorage.setItem('match_sessionShown',JSON.stringify((Array.isArray(shown)?shown:[]).filter(t=>!removed.has(key(t)))));
      if(typeof SESSION_SHOWN!=='undefined')for(const t of SESSION_SHOWN){if(removed.has(key(t)))SESSION_SHOWN.delete(t);}
    }catch(_){}
    persist();
    if(owner&&window.supabaseClient){
      try{if(flushing)await flushing;if(owner!==account)return false;const {error}=await historyRpc('forget',{title:String(title).slice(0,300),ownerId:account});if(error)throw error;}catch(_){return false;}
    }
    document.dispatchEvent(new CustomEvent('matchapp:historychange'));
    document.dispatchEvent(new CustomEvent('matchapp:portfoliochange',{detail:{action:'forget',owner}}));
    return true;
  }
  function catalogList() {
    try { if (typeof CONTENT_CATALOG !== 'undefined' && Array.isArray(CONTENT_CATALOG)) return CONTENT_CATALOG; } catch (_) {}
    return [];
  }
  function hits(re, text) {
    if (!text) return 0;
    const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
    const found = String(text).match(new RegExp(re.source, flags));
    return found ? found.length : 0;
  }
  function familyScores(entry) {
    entry = entry || {};
    const cats = values(entry.cats);
    const moods = values(entry.moods);
    const blob = [entry.synopsis, entry.title].filter(Boolean).join(' ');
    const type = String(entry.type || '');
    const s = { comedy: 0, drama: 0, horror: 0, romance: 0, kids: 0, documentary: 0 };
    if (cats.some(c => COMEDY_CATS.has(c))) s.comedy += 8;
    if (cats.some(c => DRAMA_CATS.has(c))) s.drama += 8;
    if (cats.includes('documentary')) s.documentary += 6;
    if (cats.includes('kids')) s.kids += 6;
    const primary = moods[0] || '';
    if (primary === 'funny') s.comedy += 6;
    else if (moods.includes('funny')) s.comedy += 2;
    if (primary === 'scary') s.horror += 6;
    else if (moods.includes('scary')) s.horror += 2;
    if (primary === 'romantic') s.romance += 5;
    else if (moods.includes('romantic')) s.romance += 2;
    if (HEAVY_MOODS.has(primary) && primary !== 'scary') s.drama += 3;
    if (moods.includes('heartbreaking')) s.drama += 2;
    s.comedy += hits(COMEDY_STRONG, blob) * 3 + hits(COMEDY_WEAK, blob);
    s.drama += hits(DRAMA_STRONG, blob) * 3 + hits(DRAMA_WEAK, blob);
    s.horror += hits(HORROR_RE, blob) * 3;
    s.romance += hits(ROMANCE_RE, blob) * 2;
    if (/\bcomedy\b/i.test(type)) s.comedy += 4;
    if (/\bdrama\b/i.test(type) && !/\bcomedy\b/i.test(type)) s.drama += 4;
    return s;
  }
  function comedyLocked(entry, scores) {
    if (!entry) return false;
    scores = scores || familyScores(entry);
    const cats = values(entry.cats);
    const moods = values(entry.moods);
    const primary = moods[0] || '';
    if (cats.some(c => DRAMA_CATS.has(c))) return false;
    if (cats.some(c => COMEDY_CATS.has(c))) return true;
    if (primary === 'funny') return true;
    if (moods.includes('funny') && !HEAVY_MOODS.has(primary)) return true;
    return scores.comedy > scores.drama && scores.comedy >= 3;
  }
  function asEntry(item) {
    if (!item) return item;
    const titled = typeof item === 'string' ? { title: item } : item;
    const hit = catalogList().find(e => e && key(e.title) === key(titled.title));
    if (hit) return {
      ...titled,
      ...hit,
      cats: hit.cats,
      moods: hit.moods,
      synopsis: titled.synopsis || hit.synopsis || '',
      platform: (titled.platform && titled.platform !== 'any') ? titled.platform : (hit.platform || '')
    };
    const blob = [titled.type, titled.synopsis, titled.title, (titled.cats || []).join(' '), (titled.moods || []).join(' ')].filter(Boolean).join(' ');
    const cats = values(titled.cats);
    const moods = values(titled.moods);
    if (/k-?drama/i.test(blob) && !cats.includes('K-drama')) cats.push('K-drama');
    if (/c-?drama/i.test(blob) && !cats.includes('C-drama')) cats.push('C-drama');
    if (/j-?drama/i.test(blob) && !cats.includes('J-drama')) cats.push('J-drama');
    if (/telenovela|novela brasileira/i.test(blob) && !cats.some(c => c === 'telenovela' || c === 'novela brasileira')) cats.push('telenovela');
    if (/stand-?up/i.test(blob) && !cats.includes('stand-up comedy special')) cats.push('stand-up comedy special');
    const inferred = { ...titled, cats, moods, type: titled.type || '', synopsis: titled.synopsis || '' };
    const scores = familyScores(inferred);
    if (comedyLocked(inferred, scores) && !moods.includes('funny')) moods.push('funny');
    if (scores.horror >= 4 && !moods.includes('scary')) moods.push('scary');
    if (scores.drama > scores.comedy && scores.drama >= 4 && !moods.includes('heartbreaking') && !cats.some(c => DRAMA_CATS.has(c))) {
      if (DRAMA_STRONG.test(blob) || /heartbreak|tragic|tear/.test(blob)) moods.push('heartbreaking');
    }
    return { ...titled, cats, moods, synopsis: titled.synopsis || '', platform: titled.platform || '' };
  }
  // Genre-specific offline answers must be source-grounded, never arbitrary
  // first rows from the catalogue. No inferred genre = no offline claim.
  const OFFLINE_GENRES = Object.freeze({
    thriller:/\bthrillers?|suspense|suspenseful|suspenso\b/i,
    action:/\baction|a[cç][aã]o|acci[oó]n\b/i,
    scifi:/\bsci[ -]?fi|science fiction|fic[cç][aã]o cient[ií]fica|ciencia ficci[oó]n\b/i,
    fantasy:/\bfantasy|fantasia|fant[aá]stic[oa]\b/i,
    crime:/\bcrime|criminal|policial\b/i,
    mystery:/\bmystery|mist[eé]rio|misterio\b/i,
    animation:/\banimat(?:ion|ed)|anima[cç][aã]o|animaci[oó]n\b/i,
    anime:/\banime\b/i
  });
  function matchingOfflineGenre(entry, genre) {
    if(!genre)return true;
    const genres=values(entry.genres).concat(values(entry.genre),values(entry.cats),values(entry.type));
    const metadata=genres.join(' ');
    const description=String(entry.synopsis||entry.overview||'');
    const re=OFFLINE_GENRES[genre];
    // A synopsis can explicitly describe a genre, but vague mood or a title
    // alone cannot turn an unrelated drama into an action or thriller film.
    if(genre==='anime')return /\banime\b/i.test(metadata);
    if(genre==='animation')return /\banimation|animated|anime\b/i.test(metadata);
    return !!re&&(re.test(metadata)||re.test(description));
  }
  function intentFromText(text, parseNegations = true) {
    const excluded = [];
    const q = parseNegations !== false ? String(text || '').replace(/\b(?:(?:do\s+not|don['’]?t)\s+(?:recommend|suggest|include|show|offer)|avoid(?:\s+(?:recommend(?:ing)?|suggest(?:ing)?|include|including|show(?:ing)?|offer(?:ing)?))?)\s+([^.!?;,\n]+)/gi, (full, clause) => {
      const negative = intentFromText(clause, false);
      const normalized = clause.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const genres = Object.entries(OFFLINE_GENRES).filter(([,re])=>re.test(normalized)).map(([genre])=>genre);
      if (!negative.families.size && !genres.length) return full;
      excluded.push({...negative,genres});
      return ' ';
    }) : String(text || '');
    const families = new Set();
    const moods = [];
    const cats = [];
    let requestedGenre = null;
    const normalized = q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    for (const [genre,re] of Object.entries(OFFLINE_GENRES)) {
      if(re.test(normalized)){ requestedGenre = genre; break; }
    }
    if (COMEDY_STRONG.test(q) || /\b(funny|hilarious|comédia|sitcom|stand-?up|laugh(?:s|ter)?|engraçad)/i.test(q)) {
      families.add('comedy'); moods.push('funny');
    }
    if (/\bk-?drama\b/i.test(q)) { families.add('drama'); cats.push('K-drama'); }
    else if (/\bc-?drama\b/i.test(q)) { families.add('drama'); cats.push('C-drama'); }
    else if (/\bj-?drama\b/i.test(q)) { families.add('drama'); cats.push('J-drama'); }
    else if (/\b(telenovela|novelas?)\b/i.test(q)) { families.add('drama'); cats.push('telenovela'); }
    else if (DRAMA_STRONG.test(q) || DRAMA_WEAK.test(q)) { families.add('drama'); }
    if (HORROR_RE.test(q)) { families.add('horror'); moods.push('scary'); }
    if (ROMANCE_RE.test(q)) { families.add('romance'); moods.push('romantic'); }
    if (/\b(documentar(?:y|ies)|documentário)\b/i.test(q)) { families.add('documentary'); cats.push('documentary'); }
    if (/\b(kids?|children|infantil|family[- ]friendly)\b/i.test(q)) { families.add('kids'); cats.push('kids'); }
    return {
      families, moods, cats, requestedGenre, excluded,
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
    const families = (flags && flags.families) || new Set();
    const scores = familyScores(entry);
    const wantsComedy = wantedMoods.includes('funny') || wantedCats.includes('stand-up comedy special') || families.has('comedy');
    const wantsDramaFormat = wantedCats.some(c => DRAMA_CATS.has(c));
    const wantsDramaFamily = wantsDramaFormat || families.has('drama');
    const wantsHorror = wantedMoods.includes('scary') || families.has('horror');
    if (wantedMoods.includes('cozy comfort watch')) {
      const taggedGenres = [...cats,...values(entry.genres)];
      if (moodGenreBlocks['cozy comfort watch'].some(g=>taggedGenres.some(t=>String(t).toLowerCase()===g.toLowerCase()))) return false;
      if (['scary','dark and gritty','intense and thrilling','heartbreaking'].includes(primaryMood)) return false;
      const summary=[entry.synopsis,entry.overview].filter(Boolean).join(' ');
      // A calm, curated guided-meditation podcast may explicitly address grief
      // without itself being a thriller or intense story. Keep every other
      // disturbing-content signal active, including against podcast summaries.
      const safeSummary=(primaryMood==='cozy comfort watch'&&cats.includes('podcast'))
        ?summary.replace(/\bgrief\b/gi,' '):summary;
      if (comfortHeavyText.test(safeSummary)) return false;
    }
    if (values(criteria?.genre).some(genre=>incompatible(genre,criteria)))return false;

    if (wantsComedy && !wantsDramaFormat && !allowMix) {
      if (cats.some(c => DRAMA_CATS.has(c))) return false;
      if (cats.includes('reality show') && !wantedCats.includes('reality show')) return false;
      if (cats.includes('documentary') && !wantedCats.includes('documentary')) return false;
      if (!comedyLocked(entry, scores)) return false;
      if (HEAVY_MOODS.has(primaryMood) && primaryMood !== 'funny') return false;
      if (scores.drama > scores.comedy) return false;
    }
    if (wantsDramaFamily && !wantsComedy && !allowMix) {
      if (cats.includes('stand-up comedy special')) return false;
      if (primaryMood === 'funny' && !cats.some(c => DRAMA_CATS.has(c))) return false;
      if (comedyLocked(entry, scores) && scores.comedy > scores.drama) return false;
    }
    if (wantsHorror && cats.includes('kids') && !wantedCats.includes('kids')) return false;
    if (wantedCats.includes('kids') && (moods.includes('scary') || HEAVY_MOODS.has(primaryMood))) return false;
    if (wantedMoods.length && wantedMoods.every(m => LIGHT_MOODS.has(m))) {
      if (HEAVY_MOODS.has(primaryMood)) return false;
    }
    if (wantedMoods.length && wantedMoods.every(m => HEAVY_MOODS.has(m))) {
      if (cats.includes('stand-up comedy special') && !wantsComedy) return false;
      if (primaryMood === 'funny' && !wantedMoods.includes('funny')) return false;
    }
    return true;
  }
  function fitsQuestion(item, question) {
    const intent = question && question.families ? question : intentFromText(question);
    const entry = asEntry(item);
    if (!entry || !entry.title) return false;
    // Negative clauses are hard exclusions, never positive genre selectors.
    // Use classification metadata rather than a film's title or plot wording.
    if (Array.isArray(intent.excluded) && intent.excluded.length) {
      const metadata = {...entry,synopsis:'',overview:''};
      const tags = [...values(entry.genres),...values(entry.genre),...values(entry.cats),...values(entry.type)].join(' ');
      const familyPatterns = {comedy:COMEDY_STRONG,drama:new RegExp(DRAMA_STRONG.source+'|'+DRAMA_WEAK.source,'i'),horror:HORROR_RE,romance:ROMANCE_RE,documentary:/\bdocumentar(?:y|ies)\b/i,kids:/\b(?:kids?|children|family)\b/i};
      if (intent.excluded.some(negative =>
        values(negative.genres).some(genre=>matchingOfflineGenre(metadata,genre)) ||
        [...negative.families].some(family=>familyPatterns[family]?.test(tags)))) return false;
    }
    if (intent.requestedGenre && !matchingOfflineGenre(entry,intent.requestedGenre)) return false;
    // Unrecognized explicit genre selectors cannot silently broaden into an
    // arbitrary drama when the offline catalogue has no known match.
    const explicitGenre = String(question||'').match(/\bgenre\s*[:=]\s*([\p{L}-]+)/iu);
    if(explicitGenre && !Object.values(OFFLINE_GENRES).some(re=>re.test(explicitGenre[1])) &&
       !COMEDY_STRONG.test(explicitGenre[1]) && !HORROR_RE.test(explicitGenre[1]) &&
       !ROMANCE_RE.test(explicitGenre[1]) && !DRAMA_STRONG.test(explicitGenre[1])) return false;
    if (!intent.families || !intent.families.size) return true;
    const allowMix = intent.families.has('comedy') && intent.families.has('drama');
    return genreFits(entry, intent.asCriteria ? intent.asCriteria() : { mood: intent.moods, cat: intent.cats }, { allowMix, families: intent.families });
  }
  function sameFamily(a, b) {
    a = asEntry(a); b = asEntry(b);
    if (!a || !b) return false;
    const aCom = comedyLocked(a), bCom = comedyLocked(b);
    const aDrama = values(a.cats).some(c => DRAMA_CATS.has(c));
    const bDrama = values(b.cats).some(c => DRAMA_CATS.has(c));
    if (aCom && !aDrama && !bCom) return false;
    if (bCom && !bDrama && !aCom) return false;
    if (aDrama && !aCom && bCom && !bDrama) return false;
    if (bDrama && !bCom && aCom && !aDrama) return false;
    const aMoods = values(a.moods), bMoods = values(b.moods);
    if (aMoods.includes('scary') && bMoods.includes('funny') && !bMoods.includes('scary')) return false;
    if (bMoods.includes('scary') && aMoods.includes('funny') && !aMoods.includes('scary')) return false;
    return true;
  }
  function matchesCriteria(entry, criteria) {
    if (!entry || !entry.title) return false;
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
  function matches(entry, criteria, extra = []) {
    if (!entry || !entry.title || excludes(entry) || [...identityKeys(entry)].some(k=>extra.includes(k))) return false;
    return matchesCriteria(entry, criteria);
  }
  window.matchPolicy = Object.freeze({key,values,identityKeys,excludes,savePreference,claim,releaseClaim,matches,matchesCriteria,remember,forget,known,history:()=>history.slice(),ready:async()=>{await ready;await refresh();},refresh,incompatible,genreFits,intentFromText,fitsQuestion,sameFamily,asEntry,familyScores,comedyLocked,attach:user => (ready = attach(user).catch(() => {})), flush});
  window.addEventListener('online', () => {flush().catch(() => {});refresh(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
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
