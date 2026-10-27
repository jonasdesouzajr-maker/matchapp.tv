/* The isolated game receives game data only. MatchApp owns its existing auth session. */
const actions = new Set(['list','create','accept','decline','cancel','get','flip','leave','progress','save_progress']);
const validCode = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(value);
const fail = code => Object.assign(new Error(code), {code});
const artNames = new Set(['moon','star','planet','heart','crystal','butterfly','orb','sun']);

function progressPayload(value) {
  const integer = (n,max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !integer(value.points,1000000000) || !integer(value.rounds,1000000000)) throw fail('LUMINA_INVALID');
  let activeRound = null;
  if (value.activeRound !== null) {
    const active = value.activeRound;
    if (!active || !integer(active.moves,1000000) || !Array.isArray(active.cards) || active.cards.length !== 12) throw fail('LUMINA_INVALID');
    const pairs = new Map();
    const cards = active.cards.map(card => {
      if (!card || !artNames.has(card.art) || typeof card.matched !== 'boolean') throw fail('LUMINA_INVALID');
      const values = pairs.get(card.art) || []; values.push(card.matched); pairs.set(card.art,values);
      return {art:card.art,matched:card.matched};
    });
    if (pairs.size !== 6 || [...pairs.values()].some(pair => pair.length !== 2 || pair[0] !== pair[1])) throw fail('LUMINA_INVALID');
    activeRound = {cards,moves:active.moves};
  }
  return {points:value.points,rounds:value.rounds,activeRound};
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
