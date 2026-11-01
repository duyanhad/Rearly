/** Cờ "hôm nay đã tắt báo thức ngủ" — dùng chung giữa màn hình báo thức và trang Cài đặt. */
const stopKey = (iso) => `dearly.sleepAlarmStop.${iso}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

export function stopSleepAlarmToday(reason = 'settings') {
  try {
    localStorage.setItem(stopKey(todayIso()), reason);
  } catch {
    /* bỏ qua nếu trình duyệt chặn localStorage */
  }
  window.dispatchEvent(new CustomEvent('dearly:sleep-alarm-stop'));
}

export function isSleepAlarmStoppedToday() {
  try {
    return Boolean(localStorage.getItem(stopKey(todayIso())));
  } catch {
    return false;
  }
}

/* ---- Nhắc TRƯỚC giờ đi ngủ: cờ riêng để tắt nhắc ngủ không làm mất báo thức dậy ---- */
const reminderKey = (iso) => `dearly.sleepReminderStop.${iso}`;

export function stopSleepReminderToday(reason = 'dismissed') {
  try {
    localStorage.setItem(reminderKey(todayIso()), reason);
  } catch {
    /* bỏ qua */
  }
}

export function isSleepReminderStoppedToday() {
  try {
    return Boolean(localStorage.getItem(reminderKey(todayIso())));
  } catch {
    return false;
  }
}