// Service worker tối giản: hiện thông báo hệ thống (nhắc uống nước) và mở lại app khi bấm vào.
self.addEventListener('install', () => self.skipWaiting());
// activate: xoá cache phiên bản cũ (xem phần bộ nhớ đệm ở cuối file).

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
        // Chấm đỏ trên icon app (PWA đã cài): dùng số backend gửi kèm, không hỗ trợ thì bỏ qua.
        if (typeof data.badge === 'number' && navigator.setAppBadge) {
          try {
            await navigator.setAppBadge(data.badge);
          } catch {
            // trình duyệt không hỗ trợ badge → bỏ qua
          }
        }
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

// ---- Bộ nhớ đệm: chỉ cache tài nguyên có hash (an toàn), KHÔNG cache index.html ----
// Lý do: index.html cũ trỏ tới /assets/index-<hash cũ>.js đã bị xoá sau mỗi lần deploy
// → phục vụ index cũ = trang trắng. Vì vậy điều hướng luôn lấy từ mạng.
const CACHE = 'drinkwater-shell-v2';
const SHELL = ['/icon.svg', '/icon-192.png', '/manifest.webmanifest'];
const isDev = new URL(self.location.href).searchParams.get('mode') !== 'prod';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (isDev || request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/hubs') || url.pathname.startsWith('/uploads')) return;

  // Điều hướng: luôn lấy bản mới trên mạng (không dùng index cũ trong cache).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request, { cache: 'no-store' });
        } catch {
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<body style="font-family:system-ui;padding:2rem;text-align:center;color:#334155">' +
              '<p style="font-size:1.1rem;font-weight:600">Không có kết nối mạng</p>' +
              '<p style="font-size:.9rem">Bật mạng rồi mở lại Dearly nhé.</p>' +
              '<button onclick="location.reload()" style="margin-top:1rem;padding:.6rem 1.2rem;border:0;border-radius:.8rem;background:#7d2836;color:#fff;font-weight:600">Thử lại</button>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
      })(),
    );
    return;
  }

  // Tài nguyên tĩnh của bản build (tên có hash): lấy từ cache trước.
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
