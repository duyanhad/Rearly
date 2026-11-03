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
 *
 * Hai điểm quan trọng cho Android:
 * - Mỗi lần kêu phải có `id` riêng, nếu dùng chung một id thì lịch sau ghi đè lịch trước → chỉ kêu 1 lần.
 * - Phải dùng notification channel riêng, importance 5 + âm thanh `alarm_beep` + rung, nếu không
 *   Android sẽ coi là thông báo thường và không đánh thức được máy.
 */
export const SLEEP_CHANNEL = 'dearly-alarm';
const SLEEP_ALARM_BASE = 201000;
const SLEEP_BED_ID = 201900;
const ALARM_IDS_KEY = 'dearly.nativeSleepAlarmIds';
/** Số đêm đặt trước (iOS giới hạn 64 thông báo chờ sẵn). */
const ALARM_NIGHTS = 3;

function readAlarmIds() {
  try {
    return JSON.parse(localStorage.getItem(ALARM_IDS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeAlarmIds(ids) {
  try {
    localStorage.setItem(ALARM_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* trình duyệt chặn localStorage thì thôi */
  }
}

async function ensureAlarmChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: SLEEP_CHANNEL,
      name: 'Báo thức Dearly',
      description: 'Báo thức thức dậy — kêu to, rung mạnh cho tới khi bạn tắt.',
      importance: 5,
      visibility: 1,
      sound: 'alarm_beep',
      vibration: true,
      lights: true,
      bypassDnd: true,
    });
  } catch {
    // thiếu channel thì Android dùng channel mặc định
  }
}

/** Huỷ mọi lần kêu đã hẹn (khi người dùng tắt báo thức hoặc đổi cấu hình). */
export async function cancelNativeSleepAlarms() {
  if (!isNativeApp()) return;
  const ids = readAlarmIds();
  const notifications = ids.map((id) => ({ id }));
  if (notifications.length) {
    await LocalNotifications.cancel({ notifications }).catch(() => {});
  }
  // Dọn thêm id của bản cũ (trước khi tách id từng lần kêu).
  await LocalNotifications.cancel({ notifications: [{ id: SLEEP_ALARM_BASE + 1 }, { id: 201 }, { id: 202 }] }).catch(() => {});
  writeAlarmIds([]);
}

export async function scheduleSleepAlarms({ alarmEnabled, wakeTime, bedtime, remindBeforeMin, snoozeMinutes, perRound = 1, rounds = 1, intervalMin = 1 }) {
  if (!isNativeApp()) return false;
  await cancelNativeSleepAlarms();
  if (!alarmEnabled) return false;
  if (!(await ensureNativePermission())) return false;
  await ensureAlarmChannel();

  const [wh, wm] = (wakeTime || '07:00').split(':').map(Number);
  if (Number.isNaN(wh) || Number.isNaN(wm)) return false;

  const notifications = [];
  const total = Math.max(1, perRound) * Math.max(1, rounds);
  const step = Math.max(1, intervalMin);
  const cap = Capacitor.getPlatform() === 'ios' ? 50 : 120;
  const now = Date.now();
  let id = SLEEP_ALARM_BASE;

  for (let night = 0; night < ALARM_NIGHTS && notifications.length < cap; night += 1) {
    const wake = new Date();
    wake.setDate(wake.getDate() + night);
    wake.setHours(wh, wm, 0, 0);
    if (wake.getTime() <= now) continue;

    for (let i = 0; i < total && notifications.length < cap; i += 1) {
      const at = new Date(wake.getTime() + i * step * 60_000);
      notifications.push({
        id: (id += 1),
        title: '⏰ Báo thức Dearly',
        body: `Vòng ${Math.floor(i / perRound) + 1}/${rounds} · lần ${(i % perRound) + 1}/${perRound} — dậy thôi!`,
        schedule: { at, allowWhileIdle: true },
        channelId: SLEEP_CHANNEL,
        sound: 'alarm_beep',
        ...(Capacitor.getPlatform() === 'android' ? { smallIcon: 'ic_stat_water', priority: 5 } : {}),
        extra: { kind: 'sleep-wake', snoozeMinutes: snoozeMinutes ?? 10 },
      });
    }
  }

  if (bedtime) {
    const [bh, bm] = bedtime.split(':').map(Number);
    if (!Number.isNaN(bh) && !Number.isNaN(bm)) {
      const totalMin = bh * 60 + bm - (remindBeforeMin || 0) + 1440;
      notifications.push({
        id: SLEEP_BED_ID,
        title: '🌙 Chuẩn bị đi ngủ',
        body: `Còn ${remindBeforeMin || 0} phút nữa tới giờ ngủ. Dọn dẹp và thư giãn nhé.`,
        schedule: { on: { hour: Math.floor((totalMin % 1440) / 60), minute: totalMin % 60 }, repeats: true, allowWhileIdle: true },
        channelId: SLEEP_CHANNEL,
        sound: 'alarm_beep',
        ...(Capacitor.getPlatform() === 'android' ? { smallIcon: 'ic_stat_water', priority: 3 } : {}),
        extra: { kind: 'sleep-prebed' },
      });
    }
  }

  try {
    await LocalNotifications.schedule({ notifications });
    writeAlarmIds(notifications.map((n) => n.id));
    return true;
  } catch {
    return false;
  }
}

/**
 * Bấm vào thông báo báo thức → mở màn hình kêu trong app (vẫn phải bấm "Tắt báo thức" mới hết).
 * Trả về hàm huỷ listener.
 */
export async function listenNativeAlarmTap() {
  if (!isNativeApp()) return () => {};
  const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const kind = action?.notification?.extra?.kind;
    if (kind !== 'sleep-wake') return;
    window.dispatchEvent(new CustomEvent('dearly:sleep-alarm', { detail: { fromNotification: true } }));
  }).catch(() => null);
  return () => {
    handle?.remove?.();
  };
}

const HABIT_BASE = { medicine: 301000, meal: 302000, study: 303000, weight: 304000 };
const HABIT_IDS_KEY = 'dearly.nativeHabitIds';
const HABIT_TEXT = {
  medicine: '💊 Đến giờ uống thuốc',
  meal: '🍚 Đến giờ ăn',
  study: '📚 Đến giờ học',
  weight: '⚖️ Giờ cân nặng',
};

function readHabitIds() {
  try {
    return JSON.parse(localStorage.getItem(HABIT_IDS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeHabitIds(map) {
  try {
    localStorage.setItem(HABIT_IDS_KEY, JSON.stringify(map));
  } catch {
    /* trình duyệt chặn localStorage thì thôi */
  }
}

/**
 * Nhắc thuốc / bữa ăn / học tập / cân nặng bằng lịch của hệ điều hành (bản APK): lặp hằng ngày,
 * nhắc trước `remindBeforeMin` phút. `times` là mảng "HH:mm".
 */
export async function scheduleHabitReminders({ kind, enabled, times = [], remindBeforeMin = 0 }) {
  if (!isNativeApp()) return false;
  const base = HABIT_BASE[kind];
  if (!base) return false;

  const map = readHabitIds();
  const previous = map[kind] ?? [];
  if (previous.length) await LocalNotifications.cancel({ notifications: previous.map((id) => ({ id })) }).catch(() => {});
  map[kind] = [];
  writeHabitIds(map);

  if (!enabled) return false;
  if (!(await ensureNativePermission())) return false;
  await ensureAlarmChannel();

  const before = Math.max(0, Number(remindBeforeMin) || 0);
  const title = HABIT_TEXT[kind] ?? 'Nhắc nhở Dearly';
  const notifications = [];
  (times ?? []).forEach((raw, index) => {
    const [h, m] = String(raw).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const total = (((h * 60 + m - before) % 1440) + 1440) % 1440;
    notifications.push({
      id: base + index,
      title,
      body:
        before > 0
          ? `Còn ${before} phút là tới giờ đặt (${raw}). Mở Dearly để ghi lại nhé.`
          : `Tới giờ đặt (${raw}). Mở Dearly để ghi lại nhé.`,
      schedule: { on: { hour: Math.floor(total / 60), minute: total % 60 }, repeats: true, allowWhileIdle: true },
      channelId: SLEEP_CHANNEL,
      ...(Capacitor.getPlatform() === 'android' ? { smallIcon: 'ic_stat_water', priority: 4 } : {}),
      extra: { kind: `habit-${kind}` },
    });
  });
  if (!notifications.length) return false;

  try {
    await LocalNotifications.schedule({ notifications });
    map[kind] = notifications.map((n) => n.id);
    writeHabitIds(map);
    return true;
  } catch {
    return false;
  }
}
