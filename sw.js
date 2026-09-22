/* ============================================================
   MatchApp — Service Worker

   This worker deliberately does not cache or intercept application requests.
   Its job is installability plus safe takeover between releases. Navigations
   and assets stay under normal browser/network handling so a stale worker can
   never trap the app on an old or redirected response.
   ============================================================ */

const SW_VERSION = 'v23-pwa-install';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Some installability engines still look for a fetch handler. This listener
// deliberately does not intercept requests, preserving normal HTTPS/network handling.
self.addEventListener('fetch', () => {});


self.addEventListener('push', (event) => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch (_) {}
    const title = String(payload.title || 'MatchApp');
    const body = String(payload.body || '');
    const rawUrl = String(payload.url || '/');
    let url = '/';
    try {
        const parsed = new URL(rawUrl, self.location.origin);
        url = parsed.origin === self.location.origin ? parsed.pathname + parsed.search + parsed.hash : '/';
    } catch (_) {}
    event.waitUntil(self.registration.showNotification(title, {
        body,
        tag: String(payload.tag || 'matchapp-notification'),
        icon: '/assets/brand/matchapp-ai-install-192.png?v=20260922-install1',
        badge: '/assets/brand/matchapp-icon-192.png',
        data: { url }
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = String(event.notification.data?.url || '/');
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find((client) => {
            try { return new URL(client.url).pathname + new URL(client.url).search === url; } catch (_) { return false; }
        });
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
    })());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});