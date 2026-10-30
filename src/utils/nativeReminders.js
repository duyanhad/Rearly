import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Nhắc uống nước bằng lịch thông báo của hệ điều hành (chỉ trong app đóng gói Capacitor).
 * - Ác quỷ: thông báo "dính" cho tới khi người dùng bấm vào (Android) + rung mạnh.
 * - Nhịp lặp đúng theo khoảng cách cố định của từng tính cách (3/10/60 phút);
 *   "nhắc tới khi uống" ở bản web làm được nhờ server, bản native dùng lịch lặp của OS.
 * - iOS giới hạn 64 thông báo đang chờ → chỉ đặt cho 12 giờ tới của ngày hiện tại.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

const REPEAT_MINUTES = { demon: 3, normal: 10, gentle: 60 };
const MAX_SLOTS = { android: 60, ios: 40 };

const VIBRATE_HINT = { demon: 'nặng', normal: 'vừa', gentle: 'nhẹ' };

function slotTimes(startHour, endHour, intervalMinutes, limit) {
  const times = [];
  const now = new Date();
  const dayEnd = new Date(now);
  dayEnd.setHours(endHour, 0, 0, 0);
  const cursor = new Date(now);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(Math.max(startHour, now.getHours()), Math.max(0, now.getMinutes() > 0 ? 1 : 0), 0, 0);

  while (cursor <= dayEnd && times.length < limit) {
    if (cursor > now) times.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + intervalMinutes);
  }
  return times;
}

export async function ensureNativePermission() {
  if (!isNativeApp()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === 'granted';
  } catch {
    return false;
  }
}

export async function cancelNativeReminders() {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications });
  } catch {
    // chưa từng đặt lịch thì bỏ qua
  }
}

/** Đặt lịch nhắc theo cấu hình hiện tại của người dùng. */
export async function scheduleNativeReminders({ enabled, style, intervalMinutes, ml, startHour, endHour }) {
  if (!isNativeApp()) return false;
  await cancelNativeReminders();
  if (!enabled) return false;
  if (!(await ensureNativePermission())) return false;

  const repeat = REPEAT_MINUTES[style] ?? REPEAT_MINUTES.normal;
  const limit = Capacitor.getPlatform() === 'ios' ? MAX_SLOTS.ios : MAX_SLOTS.android;
  const times = slotTimes(startHour, endHour, repeat, limit);
  if (!times.length) return false;

  const notifications = times.map((at, index) => ({
    id: index + 1,
    title: style === 'demon' ? '😈 Uống nước đi!' : style === 'gentle' ? 'Nhắc nhẹ thôi 💧' : 'Đến giờ uống nước 💧',
    body:
      style === 'demon'
        ? `Uống ${ml} ml ngay! Đừng để ta phải nhắc lại lần nữa.`
        : `Bạn uống ${ml} ml nước nhé — hẹn lại sau ${Math.round(intervalMinutes / 60) || 1} giờ.`,
    schedule: { at, allowWhileIdle: true },
    sound: undefined,
    // Android: rung theo tính cách (iOS luôn dùng rung/âm mặc định của hệ thống).
    ...(Capacitor.getPlatform() === 'android'
      ? { smallIcon: 'ic_stat_water', ongoing: style === 'demon', priority: style === 'demon' ? 5 : 3 }
      : {}),
    extra: { vibrateHint: VIBRATE_HINT[style] ?? 'vừa' },
  }));

  try {
    await LocalNotifications.schedule({ notifications });
    return notifications.length;
  } catch {
    return false;
  }
}

const SLEEP_ALARM_ID = 201;

/**
 * Báo thức ngủ (chỉ trong app đóng gói Capacitor): hẹn giờ thức hằng ngày + nhắc đi ngủ trước N phút.
 * Web không đặt được báo thức nền — trang cài đặt giấc ngủ sẽ tự bắn thông báo khi app đang mở.
 */
export async function scheduleSleepAlarms({ alarmEnabled, wakeTime, bedtime, remindBeforeMin, snoozeMinutes, perRound = 1, rounds = 1, intervalMin = 1 }) {
  if (!isNativeApp()) return false;
  await LocalNotifications.cancel({ notifications: [{ id: SLEEP_ALARM_ID }, { id: SLEEP_ALARM_ID + 1 }] }).catch(() => {});
  if (!alarmEnabled) return false;
  if (!(await ensureNativePermission())) return false;

  const [wh, wm] = (wakeTime || '07:00').split(':').map(Number);
  const notifications = [];

  // Chế độ lặp: mỗi vòng `perRound` lần, tổng `rounds` vòng, cách nhau `intervalMin` phút.
  // iOS giới hạn 64 thông báo đang chờ nên chặn tổng lại.
  const total = Math.max(1, perRound) * Math.max(1, rounds);
  const limit = Math.min(total, Capacitor.getPlatform() === 'ios' ? 30 : 50);
  let offset = 0;
  for (let i = 0; i < limit; i += 1) {
    const mins = wh * 60 + wm + offset;
    notifications.push({
      id: SLEEP_ALARM_ID,
      title: '⏰ Báo thức Dearly',
      body: `Vòng ${Math.floor(i / perRound) + 1}/${rounds} · lần ${(i % perRound) + 1}/${perRound} — dậy thôi!`,
      schedule: { on: { hour: Math.floor((mins % 1440) / 60), minute: mins % 60 }, allowWhileIdle: true },
      ...(Capacitor.getPlatform() === 'android' ? { smallIcon: 'ic_stat_water', priority: 5 } : {}),
      extra: { kind: 'sleep-wake', snoozeMinutes: snoozeMinutes ?? 10 },
    });
    offset += Math.max(1, intervalMin);
  }

  if (bedtime) {
    const [bh, bm] = bedtime.split(':').map(Number);
    const totalMin = bh * 60 + bm - (remindBeforeMin || 0) + 1440;
    notifications.push({
      id: SLEEP_ALARM_ID + 1,
      title: '🌙 Chuẩn bị đi ngủ',
      body: `Còn ${remindBeforeMin || 0} phút nữa tới giờ ngủ. Dọn dẹp và thư giãn nhé.`,
      schedule: { on: { hour: Math.floor((totalMin % 1440) / 60), minute: totalMin % 60 }, repeats: true, allowWhileIdle: true },
      ...(Capacitor.getPlatform() === 'android' ? { smallIcon: 'ic_stat_water', priority: 3 } : {}),
    });
  }

  try {
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch {
    return false;
  }
}
