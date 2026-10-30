// Service worker tối giản: hiện thông báo hệ thống (nhắc uống nước) và mở lại app khi bấm vào.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Rung theo tính cách (Android/desktop có hỗ trợ; iOS bỏ qua).
const VIBRATE = {
  demon: [600, 200, 600, 200, 600, 400, 900],
  normal: [400, 150, 400],
  gentle: [180],
};

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const style = data.style ?? 'normal';
  const title = data.title ?? 'Uống nước đi 💧';

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, {
          body: data.body ?? '',
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          // Cùng tag → nhắc mới thay nhắc cũ, không xếp chồng hàng chục thông báo.
          tag: data.tag ?? 'drinkwater-reminder',
          renotify: true,
          requireInteraction: style === 'demon',
          vibrate: VIBRATE[style] ?? VIBRATE.normal,
          data: { url: data.url ?? '/' },
        });
        await broadcast({ type: 'push-received', title, ok: true });
      } catch (error) {
        await broadcast({ type: 'push-received', title, ok: false, error: String(error) });
      }
    })(),
  );
});

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const app = all.find((c) => c.url.includes(self.location.origin));
      if (app) {
        await app.focus();
        return;
      }
      return self.clients.openWindow(target);
    })(),
  );
});

// ---- Bộ nhớ đệm để mở app khi mất mạng (chỉ bật ở bản build production) ----
const CACHE = 'drinkwater-shell-v1';
const SHELL = ['/', '/icon.svg', '/icon-192.png', '/manifest.webmanifest'];
const isDev = new URL(self.location.href).searchParams.get('mode') !== 'prod';

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (isDev || request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/hubs') || url.pathname.startsWith('/uploads')) return;

  // Điều hướng: ưu tiên mạng, mất mạng thì mở bản đã lưu.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          void cache.put('/', fresh.clone());
          return fresh;
        } catch {
          return (await caches.match('/')) ?? new Response('Offline', { status: 503 });
        }
      })(),
    );
    return;
  }

  // Tài nguyên tĩnh của bản build: lấy từ cache trước.
  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        void cache.put(request, fresh.clone());
        return fresh;
      })(),
    );
  }
});
