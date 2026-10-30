import { api } from '../services/apiClient';

/**
 * Thông báo hệ thống (Windows/macOS/Android/iOS PWA) cho nhắc uống nước.
 * - Đã đăng ký Web Push → server tự đẩy, kể cả khi app đóng (không hiện trùng từ trang).
 * - Chưa đăng ký (iOS cũ, trình duyệt không hỗ trợ) → hiện thông báo ngay từ trang.
 */
let pushActive = false;

export const notificationState = () =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

export async function askNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // mode=dev: service worker không cache gì (tránh dính bản cũ khi đang phát triển).
    const mode = import.meta.env.PROD ? 'prod' : 'dev';
    return await navigator.serviceWorker.register(`/sw.js?mode=${mode}`);
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Đăng ký nhận Web Push; trả về true nếu thiết bị này đã đăng ký được. */
export async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (notificationState() !== 'granted') return false;
  try {
    const { data } = await api.get('/api/push/key');
    if (!data?.enabled || !data.publicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    let existing = await registration.pushManager.getSubscription();
    // Server đổi khoá VAPID → subscription cũ không dùng được, phải đăng ký lại.
    const wanted = urlBase64ToUint8Array(data.publicKey);
    if (existing) {
      const current = existing.options?.applicationServerKey;
      const same =
        current &&
        current.byteLength === wanted.byteLength &&
        [...new Uint8Array(current)].every((v, i) => v === wanted[i]);
      if (!same) {
        await existing.unsubscribe().catch(() => undefined);
        existing = null;
      }
    }

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: wanted,
      }));

    const json = subscription.toJSON();
    await api.post('/api/push/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    });
    pushActive = true;
    return true;
  } catch {
    return false;
  }
}

/** Hiện thông báo hệ thống ngay tại chỗ (dùng khi chưa có Web Push). */
export async function showSystemNotification(title, body, style = 'normal') {
  if (pushActive || notificationState() !== 'granted') return;
  try {
    const registration = (await navigator.serviceWorker?.getRegistration()) ?? null;
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/favicon.svg',
        tag: 'drinkwater-reminder',
        renotify: true,
        requireInteraction: style === 'demon',
        vibrate: style === 'demon' ? [600, 200, 600, 200, 900] : [300, 150, 300],
      });
      return;
    }
    new Notification(title, { body, icon: '/icon-192.png' });
  } catch {
    // trình duyệt chặn thì bỏ qua, trong app vẫn có banner
  }
}

export const isPushActive = () => pushActive;
