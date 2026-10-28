/* The isolated game receives game data only. MatchApp owns its existing auth session. */
const actions = new Set(['list','create','accept','decline','cancel','get','flip','leave','progress','save_progress']);
const validCode = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
const fail = code => Object.assign(new Error(code), {code});
const artNames = new Set(['moon','star','planet','heart','crystal','butterfly','orb','sun']);
const standardArt = ['moon','star','planet','heart','crystal','butterfly','lotus','orb','sun','nebula','gem','lantern'];
const groveArt = ['mushroom','firefly','crystalflower','fern','fox','moonflower'];
const oceanArt = ['jellyfish','shell','seahorse','coral','starfish','dolphin'];
const integer = (n,max) => Number.isSafeInteger(n) && n >= 0 && n <= max;

function savedCards(input, pairCount, allowed, allowComplete = true) {
  if (!Array.isArray(input) || input.length !== pairCount * 2) throw fail('LUMINA_INVALID');
  const pairs = new Map();
  const cards = input.map(card => {
    if (!card || typeof card !== 'object' || Array.isArray(card) || !allowed.has(card.art) || typeof card.matched !== 'boolean') throw fail('LUMINA_INVALID');
    const values = pairs.get(card.art) || []; values.push(card.matched); pairs.set(card.art,values);
    // Persist matched pairs, never transient reveals or arbitrary frame data.
    return {art:card.art,matched:card.matched};
  });
  if (pairs.size !== pairCount || [...pairs.values()].some(pair => pair.length !== 2 || pair[0] !== pair[1]) ||
      (!allowComplete && cards.every(card => card.matched))) throw fail('LUMINA_INVALID');
  return cards;
}

function campaignPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !integer(value.unlocked,250) || value.unlocked < 1 || !Array.isArray(value.results) || value.results.length !== 250) throw fail('LUMINA_INVALID');
  const results = Array.from(value.results,(result,index) => {
    if (result === null) {
      if (index < value.unlocked - 1) throw fail('LUMINA_INVALID');
      return null;
    }
    if (index >= value.unlocked - 1 && !(value.unlocked === 250 && index === 249) ||
        !Array.isArray(result) || result.length !== 3 || !integer(result[0],3) || result[0] < 1 ||
        !integer(result[1],1000000) || !integer(result[2],86400)) throw fail('LUMINA_INVALID');
    return [result[0],result[1],result[2]];
  });
  let activeLevel = null;
  if (value.activeLevel !== null) {
    const active = value.activeLevel;
    if (!active || typeof active !== 'object' || Array.isArray(active) ||
        !integer(active.level,250) || active.level < 1 || active.level > value.unlocked ||
        !integer(active.moves,1000000) || !integer(active.elapsedSeconds,86400) ||
        typeof active.timed !== 'boolean' || !integer(active.hintsUsed,3)) throw fail('LUMINA_INVALID');
    const eventArt = active.level % 20 === 0 ? groveArt : active.level % 25 === 0 ? oceanArt : null;
    const pool = eventArt || (active.level >= 90 ? [...standardArt,...groveArt,...oceanArt] : standardArt);
    const pairs = Math.min(4 + Math.floor(active.level / 10),eventArt ? 6 : 20);
    activeLevel = {
      level:active.level,cards:savedCards(active.cards,pairs,new Set(pool),false),moves:active.moves,
      elapsedSeconds:active.elapsedSeconds,timed:active.timed,hintsUsed:active.hintsUsed
    };
  }
  return {unlocked:value.unlocked,results,activeLevel};
}

export function progressPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !integer(value.points,1000000000) || !integer(value.rounds,1000000000)) throw fail('LUMINA_INVALID');
  let activeRound = null;
  if (value.activeRound !== null) {
    const active = value.activeRound;
    if (!active || typeof active !== 'object' || Array.isArray(active) || !integer(active.moves,1000000)) throw fail('LUMINA_INVALID');
    activeRound = {cards:savedCards(active.cards,6,artNames),moves:active.moves};
  }
  if (!Object.prototype.hasOwnProperty.call(value,'version') && !Object.prototype.hasOwnProperty.call(value,'campaign')) {
    return {points:value.points,rounds:value.rounds,activeRound};
  }
  if (value.version !== 2) throw fail('LUMINA_INVALID');
  const progress = {version:2,points:value.points,rounds:value.rounds,activeRound,campaign:campaignPayload(value.campaign)};
  // Every retained field is an ASCII identifier, boolean, bounded number or
  // array, so the canonical JSON character count is also its UTF-8 byte count.
  if (JSON.stringify(progress).length > 16384) throw fail('LUMINA_INVALID');
  return progress;
}

export function gamePayload(action, input = {}) {
  if (!actions.has(action) || !input || typeof input !== 'object' || Array.isArray(input)) throw fail('LUMINA_INVALID');
  if (action === 'list' || action === 'progress') return {};
  if (action === 'save_progress') {
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw fail('LUMINA_INVALID');
    return {revision:input.revision,progress:progressPayload(input.progress)};
  }
  if (action === 'create') {
    if (typeof input.friend !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.friend)) throw fail('LUMINA_INVALID');
    return {friend:input.friend};
  }
  if (!validCode(input.code)) throw fail('LUMINA_INVALID');
  const payload = {code:input.code};
  if (action === 'flip') {
    if (!Number.isInteger(input.index) || input.index < 0 || input.index > 11 ||
        !Number.isSafeInteger(input.revision) || input.revision < 0) throw fail('LUMINA_INVALID');
    payload.index = input.index; payload.revision = input.revision;
  }
  return payload;
}

export async function requestGame(client, action, input, signal, expectedUser) {
  const payload = gamePayload(action,input);
  if (!client?.auth?.getSession || !client?.rpc) throw fail('LUMINA_UNAVAILABLE');
  const session = (await client.auth.getSession())?.data?.session;
  if (!session?.user?.id || session.user.is_anonymous) throw fail('LUMINA_AUTH_REQUIRED');
  const token = session.access_token;
  if (typeof token !== 'string' || !token.trim()) throw fail('LUMINA_AUTH_REQUIRED');
  if (expectedUser && session.user.id !== expectedUser) throw fail('LUMINA_AUTH_CHANGED');
  if (signal?.aborted) throw fail('LUMINA_UNAVAILABLE');
  let query = client.rpc('lumina_action', {p_action:action,p_payload:payload});
  // The SDK reads auth again at dispatch. Another tab can change its storage
  // before this page receives the auth event, so pin only this query's token.
  if (typeof query?.setHeader !== 'function') throw fail('LUMINA_UNAVAILABLE');
  query = query.setHeader('Authorization','Bearer ' + token);
  if (signal && typeof query.abortSignal === 'function') query = query.abortSignal(signal);
  const {data,error} = await query;
  if (error) {
    const code = String(error.message || '').match(/\bLUMINA_[A-Z_]+\b/)?.[0];
    const mapped = {
      LUMINA_SIGN_IN_REQUIRED:'LUMINA_AUTH_REQUIRED', LUMINA_FORBIDDEN:'LUMINA_FRIEND_REQUIRED',
      LUMINA_NOT_YOUR_TURN:'LUMINA_TURN', LUMINA_WAIT:'LUMINA_TURN', LUMINA_FINISHED:'LUMINA_EXPIRED'
    }[code];
    throw fail(mapped || code || (error.code === 'PGRST301' ? 'LUMINA_AUTH_REQUIRED' : 'LUMINA_UNAVAILABLE'));
  }
  return data;
}

export function createFriendsBridge(frame, options = {}) {
  let disposed = false, generation = 0;
  const pending = new Map();
  const origin = location.origin;
  function post(value) { if (!disposed) frame.contentWindow?.postMessage(value,origin); }
  function reset() {
    generation++;
    for (const {controller,timer} of pending.values()) { controller.abort(); clearTimeout(timer); }
    pending.clear();
    post({type:'lumina:auth-changed'});
  }
  async function receive(event) {
    if (disposed || event.source !== frame.contentWindow || event.origin !== origin) return;
    const message = event.data;
    if (message?.type === 'lumina:navigate') {
      const target = message.destination === 'profile' ? '/profile/profile.html' : message.destination === 'friends' ? '/friends.html' : null;
      if (target) { options.close?.(); location.assign(target); }
      return;
    }
    if (message?.type !== 'lumina:rpc' || typeof message.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(message.id)) return;
    if (pending.has(message.id)) return;
    if (pending.size >= 4) { post({type:'lumina:rpc-result',id:message.id,error:{code:'LUMINA_LIMIT'}}); return; }
    const opening = generation, controller = new AbortController();
    let timer;
    const timeout = new Promise((_,reject) => {
      timer = setTimeout(() => { controller.abort(); reject(fail('LUMINA_UNAVAILABLE')); },14000);
    });
    const operation = {controller,timer};
    pending.set(message.id,operation);
    try {
      const data = await Promise.race([requestGame(window.supabaseClient,message.action,message.payload,controller.signal),timeout]);
      if (!disposed && opening === generation) post({type:'lumina:rpc-result',id:message.id,data});
    } catch (error) {
      if (!disposed && opening === generation) post({type:'lumina:rpc-result',id:message.id,error:{code:/^LUMINA_[A-Z_]+$/.test(error.code || '') ? error.code : 'LUMINA_UNAVAILABLE'}});
    } finally { clearTimeout(timer); if (pending.get(message.id) === operation) pending.delete(message.id); }
  }
  window.addEventListener('message',receive);
  document.addEventListener('matchapp:authchange',reset);
  return function dispose() {
    disposed = true; reset();
    window.removeEventListener('message',receive);
    document.removeEventListener('matchapp:authchange',reset);
  };
}
