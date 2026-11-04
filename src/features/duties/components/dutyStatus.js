/** Nhãn + màu trạng thái nhiệm vụ, dùng chung cho danh sách và chi tiết. */
export function statusMeta(duty) {
  if (duty.status === 'approved')
    return { label: 'Đã đạt', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  if (duty.status === 'submitted')
    return { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-700 ring-amber-200' };
  if (duty.status === 'rejected')
    return { label: 'Chưa đạt · làm lại', tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
  if (duty.status === 'declined') return { label: 'Đã từ chối', tone: 'bg-slate-100 text-slate-600 ring-slate-200' };
  if (duty.needsAccept) return { label: 'Chờ nhận việc', tone: 'bg-violet-50 text-violet-700 ring-violet-200' };
  if (duty.overdue) return { label: 'Quá hạn', tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
  return { label: 'Chờ báo cáo', tone: 'bg-water-50 text-water-700 ring-water-200' };
}

export function dueLabel(iso) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `${time} hôm nay`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `${time} mai`;
  return `${time} ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
}

/** Đếm ngược ngắn gọn cho thẻ nhiệm vụ (còn 2 giờ 5 phút / quá 3 giờ). */
export function dueCountdown(iso) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const totalMinutes = Math.round(Math.abs(diffMs) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const text = hours > 0 ? `${hours} giờ${minutes ? ` ${minutes} phút` : ''}` : `${minutes} phút`;
  return diffMs >= 0 ? `còn ${text}` : `quá ${text}`;
}
