/* Account progress stays behind MatchApp's parent authentication boundary.
 * Closing the game removes its UI, but a bounded account save can finish. */
import {requestGame} from './friends-bridge.mjs?v=20261027-3';

const artwork = new Set(['moon','star','planet','heart','crystal','butterfly','orb','sun']);
const fail = code => Object.assign(new Error(code),{code});
const integer = (value,max) => Number.isSafeInteger(value) && value >= 0 && value <= max;

export function progressSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !integer(input.points,1000000000) || !integer(input.rounds,1000000000)) throw fail('LUMINA_INVALID');
  let activeRound = null;
  if (input.activeRound !== null) {
    const round = input.activeRound;
    if (!round || typeof round !== 'object' || !Array.isArray(round.cards) || round.cards.length !== 12 ||
        !integer(round.moves,1000000)) throw fail('LUMINA_INVALID');
    const counts = new Map();
    const cards = round.cards.map(card => {
      if (!card || typeof card !== 'object' || !artwork.has(card.art) || typeof card.matched !== 'boolean') throw fail('LUMINA_INVALID');
      const pair = counts.get(card.art) || {count:0,matched:card.matched};
      if (pair.matched !== card.matched) throw fail('LUMINA_INVALID');
      pair.count++;counts.set(card.art,pair);
      // Transient reveals are deliberately absent from persisted game state.
      return {art:card.art,matched:card.matched};
    });
    if (counts.size !== 6 || [...counts.values()].some(pair=>pair.count !== 2)) throw fail('LUMINA_INVALID');
    activeRound = {cards,moves:round.moves};
  }
  return {points:input.points,rounds:input.rounds,activeRound};
}

function progressRecord(value) {
  if (!value || !integer(value.revision,Number.MAX_SAFE_INTEGER) || !Object.prototype.hasOwnProperty.call(value,'progress')) throw fail('LUMINA_UNAVAILABLE');
  return {revision:value.revision,progress:value.progress === null ? null : progressSnapshot(value.progress)};
}

export function createProgressBridge(frame, options = {}) {
  const host = options.window || window;
  const doc = host.document;
  const origin = host.location.origin;
  const invoke = options.requestGame || requestGame;
  const client = () => options.client || host.supabaseClient;
  let detached = false, cleaned = false, generation = 0;
  let mode = 'loading', owner = null, revision = null, savedKey = null;
  let latest = null, latestKey = null, blocked = true, loadQueued = false;
  let operation = null, authTimer = null;
  let finishClose;
  const finished = new Promise(resolve => {finishClose = resolve;});

  function post(nextMode, extra = {}) {
    mode = nextMode;
    if (!detached && !cleaned) frame.contentWindow?.postMessage({type:'lumina:progress-state',mode:nextMode,...extra},origin);
  }
  function clean() {
    if (cleaned) return;
    cleaned = true;
    if (authTimer !== null) host.clearTimeout(authTimer);
    host.removeEventListener('message',receive);
    doc.removeEventListener('matchapp:authchange',authChanged);
    latest = null;latestKey = null;owner = null;savedKey = null;revision = null;
    finishClose();
  }
  function maybeFinish() {
    if (detached && !operation && (blocked || !latest || latestKey === savedKey)) clean();
  }
  function cancelOperation() {operation?.cancel();}
  function account(session) {
    return session?.user && !session.user.is_anonymous && typeof session.user.id === 'string' && session.user.id ? session.user.id : null;
  }
  async function sessionFor(service,job) {
    if (!service?.auth?.getSession) throw fail('LUMINA_UNAVAILABLE');
    const result = await service.auth.getSession();
    if (job.controller.signal.aborted || job.generation !== generation) throw fail('LUMINA_CANCELED');
    if (result?.error) throw fail('LUMINA_UNAVAILABLE');
    return account(result?.data?.session);
  }
  function run(kind, task) {
    const job = {kind,generation,controller:new host.AbortController(),timer:null,cancel:null};
    operation = job;
    let rejectCancel;
    const canceled = new Promise((_,reject) => {rejectCancel = reject;});
    job.cancel = () => {job.controller.abort();rejectCancel(fail('LUMINA_CANCELED'));};
    const timeout = new Promise((_,reject) => {
      job.timer = host.setTimeout(() => {job.controller.abort();reject(fail('LUMINA_UNAVAILABLE'));},14000);
    });
    // This bound includes session lookup, so a stalled authentication lock
    // cannot leave the game or its detached save waiting indefinitely.
    const result = Promise.race([Promise.resolve().then(()=>task(job)),timeout,canceled]);
    return {job,result};
  }
  function complete(job) {
    host.clearTimeout(job.timer);
    if (operation === job) operation = null;
    if (cleaned) return;
    if (!operation && !blocked && latest && latestKey !== savedKey) {save();return;}
    if (loadQueued && !detached && !operation) {loadQueued = false;load();return;}
    maybeFinish();
  }
  function authChanged() {
    if (cleaned) return;
    generation++;loadQueued = false;blocked = true;
    owner = null;revision = null;savedKey = null;latest = null;latestKey = null;
    cancelOperation();
    if (authTimer !== null) host.clearTimeout(authTimer);
    authTimer = null;
    if (detached) {maybeFinish();return;}
    post('loading',{progress:null,revision:null});
    // MatchApp dispatches inside Supabase's auth callback. Read the new session
    // after that callback releases its lock, never by awaiting inside it.
    authTimer = host.setTimeout(() => {authTimer = null;requestLoad();},0);
  }
  function requestLoad() {
    if (detached || cleaned) return;
    if (authTimer !== null) {host.clearTimeout(authTimer);authTimer = null;}
    if (operation) {
      if (operation.kind === 'save') loadQueued = true;
      return;
    }
    load();
  }
  async function load() {
    if (detached || cleaned || operation) return;
    blocked = true;owner = null;revision = null;savedKey = null;latest = null;latestKey = null;
    post('loading');
    const {job,result} = run('load',async current => {
      const service = client();
      const user = await sessionFor(service,current);
      if (!user) return {guest:true};
      const value = await invoke(service,'progress',{},current.controller.signal,user);
      if (current.controller.signal.aborted || current.generation !== generation) throw fail('LUMINA_CANCELED');
      if (await sessionFor(service,current) !== user) throw fail('LUMINA_AUTH_CHANGED');
      return {user,record:progressRecord(value)};
    });
    try {
      const value = await result;
      if (cleaned || detached || job.generation !== generation) return;
      if (value.guest) {post('guest');return;}
      owner = value.user;revision = value.record.revision;
      savedKey = value.record.progress === null ? null : JSON.stringify(value.record.progress);
      blocked = false;
      post('account',{progress:value.record.progress,revision});
    } catch(error) {
      if (!cleaned && !detached && job.generation === generation && error?.code !== 'LUMINA_CANCELED') {
        if (error?.code === 'LUMINA_AUTH_CHANGED') authChanged();
        else if (['LUMINA_AUTH_REQUIRED','LUMINA_SIGN_IN_REQUIRED'].includes(error?.code)) post('guest',{progress:null,revision:null});
        else post(error?.code === 'LUMINA_CONFLICT' ? 'conflict' : 'offline');
      }
    } finally {complete(job);}
  }
  function change(input) {
    if (cleaned || blocked || !owner || !integer(revision,Number.MAX_SAFE_INTEGER)) return;
    let snapshot;
    try {snapshot = progressSnapshot(input);} catch (_) {blocked = true;latest = null;latestKey = null;post('offline');return;}
    const key = JSON.stringify(snapshot);
    if (key === latestKey || (key === savedKey && !operation)) return;
    latest = snapshot;latestKey = key;
    if (!operation) save();
  }
  async function save() {
    if (cleaned || blocked || operation || !latest || latestKey === savedKey || !owner) {maybeFinish();return;}
    const target = latest, targetKey = latestKey, expectedRevision = revision, expectedOwner = owner;
    post('saving');
    const {job,result} = run('save',async current => {
      const service = client();
      const user = await sessionFor(service,current);
      if (user !== expectedOwner) throw fail('LUMINA_AUTH_CHANGED');
      const value = await invoke(service,'save_progress',{revision:expectedRevision,progress:target},current.controller.signal,expectedOwner);
      if (current.controller.signal.aborted || current.generation !== generation) throw fail('LUMINA_CANCELED');
      if (await sessionFor(service,current) !== expectedOwner) throw fail('LUMINA_AUTH_CHANGED');
      const record = progressRecord(value);
      if (record.progress === null || record.revision <= expectedRevision || JSON.stringify(record.progress) !== targetKey) throw fail('LUMINA_CONFLICT');
      return record;
    });
    try {
      const record = await result;
      if (cleaned || job.generation !== generation) return;
      revision = record.revision;savedKey = targetKey;
      if (latestKey === targetKey) {latest = null;latestKey = null;}
      if (!blocked && !latest) post('saved',{revision});
    } catch(error) {
      if (!cleaned && job.generation === generation && error?.code !== 'LUMINA_CANCELED') {
        if (['LUMINA_AUTH_CHANGED','LUMINA_AUTH_REQUIRED','LUMINA_SIGN_IN_REQUIRED'].includes(error?.code)) authChanged();
        else {blocked = true;post(error?.code === 'LUMINA_CONFLICT' ? 'conflict' : 'offline');}
      }
    } finally {complete(job);}
  }
  function receive(event) {
    if (detached || cleaned || event.source !== frame.contentWindow || event.origin !== origin) return;
    const message = event.data;
    if (message?.type === 'lumina:progress-load') requestLoad();
    else if (message?.type === 'lumina:progress-change') change(message.progress);
  }
  host.addEventListener('message',receive);
  doc.addEventListener('matchapp:authchange',authChanged);
  return function disposeProgress() {
    if (detached || cleaned) return finished;
    // Read before the adapter removes the iframe. The function returns only
    // the game's normalized snapshot, never authentication data.
    try {
      const snapshot = frame.contentWindow?.LuminaGameProgress?.snapshot?.();
      if (snapshot) change(snapshot);
    } catch (_) { /* The most recent valid change message remains queued. */ }
    detached = true;loadQueued = false;
    host.removeEventListener('message',receive);
    if (authTimer !== null) {host.clearTimeout(authTimer);authTimer = null;}
    if (operation?.kind === 'load') cancelOperation();
    // Keep the auth listener until writes settle; account switching must abort
    // old progress even after the frame and its UI have been removed.
    if (!operation && !blocked && latest && latestKey !== savedKey) save();
    else maybeFinish();
    return finished;
  };
}
