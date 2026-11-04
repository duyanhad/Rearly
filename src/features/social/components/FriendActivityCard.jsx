import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronLeft, ChevronRight, Droplet, Flame, Lock, Moon, Pill, Scale, Soup } from 'lucide-react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { socialService } from '../../../services/socialService';
import { LogCarousel } from '../../water/components/LogCarousel';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n) => String(n).padStart(2, '0');

/** Màu + icon từng nhu cầu, giữ giống trang Lịch để người dùng không phải học lại. */
const CATS = [
  { key: 'water', label: 'Nước', icon: Droplet, dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700' },
  { key: 'sleep', label: 'Ngủ', icon: Moon, dot: 'bg-indigo-400', chip: 'bg-indigo-50 text-indigo-700' },
  { key: 'meal', label: 'Bữa ăn', icon: Soup, dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700' },
  { key: 'medicine', label: 'Thuốc', icon: Pill, dot: 'bg-rose-400', chip: 'bg-rose-50 text-rose-700' },
  { key: 'study', label: 'Học tập', icon: BookOpen, dot: 'bg-violet-400', chip: 'bg-violet-50 text-violet-700' },
  { key: 'weight', label: 'Cân nặng', icon: Scale, dot: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700' },
];
const byKey = Object.fromEntries(CATS.map((c) => [c.key, c]));

function monthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Thứ 2 đầu tuần
  const cells = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Khối "Chuỗi thành tựu + Lịch" trên trang cá nhân người khác.
 * Bạn bè chỉ thấy quyển lịch có chấm (nhu cầu nào có ghi nhận); partner xem được chi tiết từng ngày.
 * Server là nơi quyết định quyền (không gửi số liệu chi tiết cho bạn bè).
 */
export function FriendActivityCard({ userId }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['friend-overview', userId, year, month],
    queryFn: async () => (await socialService.getFriendOverview(userId, { year, month })).data,
  });

  // Chi tiết ngày giống trang Lịch: chỉ gọi khi người xem là partner.
  const { data: day, isLoading: dayLoading } = useQuery({
    queryKey: ['friend-day', userId, selected],
    enabled: Boolean(selected) && Boolean(data?.isPartner),
    queryFn: async () => (await socialService.getFriendDay(userId, selected)).data,
  });

  const shift = (delta) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelected(null);
  };

  const isPartner = Boolean(data?.isPartner);
  const streaks = data?.streaks ?? [];
  const byDate = new Map((data?.days ?? []).map((d) => [d.date, d]));
  const cells = monthMatrix(year, month);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const selectedRow = selected ? byDate.get(selected) : null;

  if (isLoading) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <DearlyLoader size="sm" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      {/* Chuỗi thành tựu */}
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Flame className="size-4 text-orange-500" /> Chuỗi thành tựu
      </h2>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {streaks.map((s) => {
          const cat = byKey[s.kind];
          if (!cat) return null;
          const Icon = cat.icon;
          const on = s.days > 0;
          return (
            <div
              key={s.kind}
              className={`flex min-w-[86px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-2 ring-1 ${
                on ? `${cat.chip} ring-transparent` : 'bg-slate-50 text-slate-400 ring-slate-100'
              }`}
              title={`${cat.label}: ${s.days} ngày liên tiếp${s.doneToday ? ' · hôm nay đã xong' : ''}`}
            >
              <Icon className="size-4" />
              <span className="text-[10px] font-semibold">{cat.label}</span>
              <span className={`text-sm font-extrabold tabular-nums ${on ? '' : 'text-slate-400'}`}>
                {s.days}
                <span className="ml-0.5 text-[10px] font-semibold">ngày</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Lịch tháng */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Tháng trước"
          className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-slate-800">
          Tháng {month}/{year}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Tháng sau"
          className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((dayNumber, index) => {
          if (dayNumber === null) return <div key={`empty-${index}`} />;
          const date = `${year}-${pad(month)}-${pad(dayNumber)}`;
          const row = byDate.get(date);
          const isToday = date === todayKey;
          const isSelected = date === selected;
          const kinds = row?.kinds ?? [];
          return (
            <button
              key={date}
              type="button"
              onClick={() => isPartner && setSelected(isSelected ? null : date)}
              disabled={!isPartner}
              aria-pressed={isSelected}
              className={`relative aspect-square rounded-lg text-[13px] transition ${
                isSelected
                  ? 'bg-water-600 font-bold text-white shadow-sm'
                  : kinds.length > 0
                    ? 'bg-slate-50 font-semibold text-slate-700'
                    : 'text-slate-400'
              } ${isToday && !isSelected ? 'ring-2 ring-water-400' : ''} ${isPartner ? '' : 'cursor-default'}`}
            >
              <span className="relative z-10">{dayNumber}</span>
              {kinds.length > 0 && (
                <span className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5">
                  {kinds.map((k) => (
                    <span key={k} className={`size-1.5 rounded-full ${isSelected ? 'bg-white/80' : byKey[k]?.dot ?? 'bg-slate-300'}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chi tiết ngày: chỉ partner */}
      {isPartner ? (
        selectedRow && selectedRow.kinds.length > 0 ? (
          <div className="mt-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chi tiết ngày {selected}</p>
            {selectedRow.kinds.map((k) => {
              const cat = byKey[k];
              if (!cat) return null;
              return (
                <div key={k} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${cat.chip}`}>
                  <span className={`size-2 shrink-0 rounded-full ${cat.dot}`} />
                  <span className="text-[12px] font-semibold">{cat.label}</span>
                  <span className="ml-auto text-[12px] font-semibold tabular-nums">{selectedRow.detail?.[k] ?? ''}</span>
                </div>
              );
            })}

            {/* Nhật ký nước của ngày đó — cùng kiểu với trang Lịch (có ảnh minh chứng). */}
            {dayLoading ? (
              <DearlyLoader size="sm" />
            ) : day?.logs?.length > 0 ? (
              <div className="pt-2">
                <p className="mb-2 text-[12px] text-slate-600">
                  Tổng {day.totalDrankMl} / {day.targetMl} ml{' '}
                  {day.isCompleted && <span className="font-medium text-emerald-600">· Đạt mục tiêu</span>}
                </p>
                <LogCarousel logs={day.logs} />
              </div>
            ) : null}
          </div>
        ) : selected ? (
          <p className="mt-3 text-center text-[12px] text-slate-500">Ngày này không có ghi nhận nào.</p>
        ) : (
          <p className="mt-2 text-center text-[11px] text-slate-400">Bấm một ngày để xem chi tiết (partner xem được).</p>
        )
      ) : (
        <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <Lock className="size-3" /> Chỉ partner mới xem được chi tiết từng ngày.
        </p>
      )}
    </section>
  );
}

export default FriendActivityCard;
