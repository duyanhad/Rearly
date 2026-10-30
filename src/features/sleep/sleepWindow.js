/** Khung ngủ có thể vắt qua nửa đêm (23:00 → 07:00). Dùng chung cho đồng hồ ngược và nút kết thúc giấc ngủ. */
const toSec = (hhmm = '00:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
};

export function isSleepWindow(bed, wake, date = new Date()) {
  const secOfDay = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const bedSec = toSec(bed);
  const wakeSec = toSec(wake);
  return bedSec > wakeSec ? secOfDay >= bedSec || secOfDay < wakeSec : secOfDay >= bedSec && secOfDay < wakeSec;
}

/** "HH:mm" của hiện tại — dùng khi bấm kết thúc giấc ngủ. */
export function nowHhmm(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
