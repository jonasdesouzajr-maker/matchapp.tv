/* ============================================================
   MatchApp — Service Worker

   WHY THIS IS DELIBERATELY MINIMAL:

   Chrome's beforeinstallprompt (the event that makes "Install" actually work)
   only fires once a page has a valid manifest AND a registered service worker
   with a fetch handler. So this file's only real job is to exist and register.

   It does NOT cache app.js, i18n.js, index.html, or anything else that
   changes. This codebase pushes updates constantly — cache-bust version
   numbers on every script tag exist specifically to defeat stale caching.

   ------------------------------------------------------------
   INCIDENT FIX — why the site 404'd in normal tabs but worked in
   InPrivate:

   The previous version ended with:

       event.respondWith(fetch(event.request));

   which looks harmless but breaks navigations that get redirected. A service
   worker may not return a redirected response to a request whose redirect
   mode is "manual" — which is exactly what browsers use for top-level
   navigations. The moment matchapp.cc began 301-ing to matchapp.tv, every
   navigation through this worker produced a redirected response the worker
   could not legally return, the promise passed to respondWith rejected, and
   the browser failed the navigation outright.

   InPrivate windows register no service worker, so they bypassed all of this
   and loaded normally — which is precisely why the two behaved differently.

   The same shape also breaks on any transient network failure: a rejected
   fetch() inside respondWith takes down the whole navigation instead of
   letting the browser do what it would normally do.

   THE FIX: never intercept navigations at all. Calling respondWith is
   optional — if the handler returns without calling it, the browser handles
   the request natively, redirects and all, and the listener still exists so
   installability is unaffected.
   ============================================================ */

const SW_VERSION = 'v16-startup-unfreeze';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
        } catch (e) { /* caches API unavailable — nothing to clean */ }

        await self.clients.claim();

        try {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: SW_VERSION }));
        } catch (e) { /* non-fatal */ }
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') return;
    return;
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
