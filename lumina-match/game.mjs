/* Mount Grok's browser game in its own document, loaded only after Play. */
import {createFriendsBridge} from './friends-bridge.mjs?v=20261028-1';
import {createProgressBridge} from './progress-bridge.mjs?v=20261028-1';
export function mountGame(container, options = {}) {
  const frame = document.createElement('iframe');
  frame.className = 'lm-game-frame';
  frame.title = 'Lumina Match';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  const source = new URL('/lumina-match/browser/index.html', location.origin);
  source.searchParams.set('v', '20261030-2');
  source.searchParams.set('lang', options.language?.() || 'en');
  source.searchParams.set('reducedMotion', document.documentElement.classList.contains('reduce-motion') ? '1' : '0');
  const roomCode = new URLSearchParams(location.search).get('lumina');
  if (roomCode && /^[a-zA-Z0-9_-]{8,64}$/.test(roomCode)) source.searchParams.set('room',roomCode);
  frame.src = source.href;
  let disposed = false;
  let ready = false;
  function translate() {
    if (!disposed && ready) frame.contentWindow?.postMessage({
      type: 'lumina:set-language', language: options.language?.() || 'en',
      reducedMotion:document.documentElement.classList.contains('reduce-motion')
    }, location.origin);
  }
  function failed() {
    if (!disposed && !ready) options.onError?.(new Error('Lumina browser document did not become ready'));
  }
  function receive(event) {
    if (disposed || event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'lumina:ready') {
      ready = true;
      clearTimeout(timeout);
      frame.setAttribute('aria-busy', 'false');
      translate();
    } else if (event.data?.type === 'lumina:close') {
      options.close?.();
    } else if (event.data?.type === 'lumina:register') {
      if (disposeProgress.stageRegistration?.(event.data.progress)) {
        if (options.register) options.register();
        else { options.close?.(); location.assign('/?openAuth=1'); }
      } else {
        frame.contentWindow?.postMessage({type:'lumina:registration-return'},location.origin);
      }
    }
  }
  frame.setAttribute('aria-busy', 'true');
  frame.addEventListener('error', failed);
  window.addEventListener('message', receive);
  document.addEventListener('matchapp:langchange', translate);
  const observer = new MutationObserver(translate);
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['lang','class']});
  const timeout = setTimeout(failed, 20000);
  const disposeFriends = createFriendsBridge(frame,options);
  const disposeProgress = createProgressBridge(frame,{
    onAccountReady() {
      if (disposed) return;
      options.onRegistered?.();
      frame.contentWindow?.postMessage({type:'lumina:registration-return'},location.origin);
    }
  });
  container.replaceChildren(frame);
  return function disposeGame() {
    disposed = true;
    clearTimeout(timeout);
    observer.disconnect();
    disposeFriends();
    disposeProgress();
    try { frame.contentWindow?.LuminaAudio?.dispose?.(); } catch (_) { /* Close remains available if the document failed. */ }
    document.removeEventListener('matchapp:langchange', translate);
    window.removeEventListener('message', receive);
    frame.removeEventListener('error', failed);
    frame.remove();
  };
}
