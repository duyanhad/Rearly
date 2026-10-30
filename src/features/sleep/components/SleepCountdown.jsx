import { useEffect, useState } from 'react';
import { AlarmClock, Moon, Sunrise } from 'lucide-react';

const toSec = (hhmm = '00:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
};

const hhmmss = (sec) =>
  [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
    .map((n) => String(Math.max(0, n)).padStart(2, '0'))
    .join(':');

const toHours = (m) => `${Math.floor((m || 0) / 60)}h${String(Math.round((m || 0) % 60)).padStart(2, '0')}`;

/**
 * Đồng hồ "quỹ giấc ngủ": tổng thời gian còn phải ngủ để đạt mục tiêu trong ngày.
 * - Đang ngủ (`started`): đếm ngược theo thời gian đã ngủ (mỗi giây).
 * - Không ngủ: đồng hồ **dừng** ở phần còn lại.
 * - Về 0 = 100 % mục tiêu → ảnh sáng hoàn toàn.
 */
export function SleepCountdown({
  bed = '23:00',
  wake = '07:00',
  alarmEnabled = false,
  started = false,
  goalMinutes = 480,
  approvedMinutes = 0,
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  // Thời gian của phiên đang ngủ (từ giờ đi ngủ tới hiện tại), có thể vắt qua nửa đêm.
  let sessionSec = 0;
  if (started) {
    sessionSec = secOfDay - toSec(bed);
    if (sessionSec < 0) sessionSec += 86400;
  }

  const goalSec = Math.max(60, goalMinutes * 60);
  const sleptSec = approvedMinutes * 60 + sessionSec;
  const remainSec = Math.max(0, goalSec - sleptSec);
  const percent = Math.min(100, Math.round((sleptSec / goalSec) * 100));
  const done = remainSec === 0;
  const Icon = started ? Sunrise : Moon;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">Quỹ giấc ngủ</h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            started ? 'bg-indigo-50 text-indigo-600' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-water-50 text-water-700'
          }`}
        >
          <Icon className="size-3.5" /> {started ? 'Đang đếm' : done ? 'Đã đủ' : 'Đang dừng'}
        </span>
      </div>

      <p className="text-center text-4xl font-extrabold tabular-nums tracking-tight text-slate-900">
        {hhmmss(remainSec)}
      </p>
      <p className="mt-1 text-center text-xs text-slate-500">
        {done ? 'Đã đủ giấc hôm nay' : 'Còn phải ngủ để đạt mục tiêu'} <b className="text-slate-800">{toHours(goalMinutes)}</b>
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-water-600 to-[#c98883] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-1 text-xs text-slate-500">
        Đã ngủ <b className="text-slate-800">{toHours(Math.floor(sleptSec / 60))}</b>
        <span className="text-slate-300">/</span> mục tiêu {toHours(goalMinutes)}
        <span
          className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            percent >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {percent}%
        </span>
      </p>
      <p className="mt-1 text-center text-[11px] text-slate-400">
        {started ? 'Bấm Kết thúc giấc ngủ để ghi nhận khoảng thời gian vừa ngủ' : 'Bấm Bắt đầu giấc ngủ để đồng hồ chạy tiếp'}
      </p>

      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
        <AlarmClock className="size-3" /> {alarmEnabled ? `Báo thức ${wake} đang bật` : 'Báo thức đang tắt'}
      </p>
    </div>
  );
}

export default SleepCountdown;
