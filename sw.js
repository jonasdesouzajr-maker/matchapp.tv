/* ============================================================
   MatchApp — Service Worker

   This worker deliberately does not cache or intercept application requests.
   Its job is installability plus safe takeover between releases. Navigations
   and assets stay under normal browser/network handling so a stale worker can
   never trap the app on an old or redirected response.
   ============================================================ */

const SW_VERSION = 'v20-full-home-recovery';

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
