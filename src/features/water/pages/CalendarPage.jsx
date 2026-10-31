import { useQuery } from '@tanstack/react-query';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { waterService } from '../../../services/waterService';
import { sleepService } from '../../../services/sleepService';
import { habitLogService } from '../../../services/habitLogService';
import { LogCarousel } from '../components/LogCarousel';
import { LogStatusChip } from '../../../components/LogStatusChip';
import { periodLabel, timeLabel } from '../../../utils/format';
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
function monthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday first

  const cells = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
const pad = n => String(n).padStart(2, '0');
export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState(null);
  const {
    data
  } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => (await waterService.getCalendar({
      params: {
        year,
        month
      }
    })).data
  });
  const {
    data: sleepNights = []
  } = useQuery({
    queryKey: ['sleep-month', year, month],
    queryFn: async () => (await sleepService.month({
      year,
      month
    })).data
  });
  // Cân nặng các ngày trong tháng (để xem lại ngày cũ)
  const { data: weightAll = [] } = useQuery({
    queryKey: ['habit-history', 'weight'],
    queryFn: async () => (await habitLogService.history('weight', 200)).data
  });
  const { data: medicineAll = [] } = useQuery({
    queryKey: ['habit-history', 'medicine'],
    queryFn: async () => (await habitLogService.history('medicine', 300)).data
  });
  const { data: mealAll = [] } = useQuery({
    queryKey: ['habit-history', 'meal'],
    queryFn: async () => (await habitLogService.history('meal', 300)).data
  });
  const { data: studyAll = [] } = useQuery({
    queryKey: ['habit-history', 'study'],
    queryFn: async () => (await habitLogService.history('study', 300)).data
  });

  const monthPrefix = `${year}-${pad(month)}`;
  const weightOfDay = selected ? weightAll.filter((l) => l.date === selected && l.status !== 'rejected') : [];

  // Gộp hoạt động mọi nhu cầu theo ngày: { '2026-10-29': { water: {...}, sleep: {...}, weight: [...], medicine: [...], meal: [...], study: [...] } }
  const activity = new Map();
  const at = (date) => {
    if (!activity.has(date)) activity.set(date, { date, water: null, sleep: null, weight: [], medicine: [], meal: [], study: [] });
    return activity.get(date);
  };
  (data?.days ?? []).forEach((d) => {
    if ((d.totalDrankMl ?? 0) > 0) at(String(d.date)).water = d;
  });
  sleepNights.forEach((n) => {
    at(String(n.date)).sleep = n;
  });
  [['weight', weightAll], ['medicine', medicineAll], ['meal', mealAll], ['study', studyAll]].forEach(([key, list]) => {
    list.filter((l) => l.status !== 'rejected' && String(l.date).startsWith(monthPrefix)).forEach((l) => {
      at(String(l.date))[key].push(l);
    });
  });
  const monthDays = [...activity.values()].sort((a, b) => b.date.localeCompare(a.date));

  const CATS = [
    { key: 'water', label: 'Nước', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700' },
    { key: 'sleep', label: 'Ngủ', dot: 'bg-indigo-400', chip: 'bg-indigo-50 text-indigo-700' },
    { key: 'meal', label: 'Bữa ăn', dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700' },
    { key: 'medicine', label: 'Thuốc', dot: 'bg-rose-400', chip: 'bg-rose-50 text-rose-700' },
    { key: 'study', label: 'Học tập', dot: 'bg-violet-400', chip: 'bg-violet-50 text-violet-700' },
    { key: 'weight', label: 'Cân nặng', dot: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700' }
  ];
  const catsOf = (rec) => (rec ? CATS.filter((c) => (c.key === 'water' || c.key === 'sleep' ? !!rec[c.key] : rec[c.key].length > 0)) : []);
  // Chi tiết từng loại, để mỗi nhu cầu nằm một dòng riêng (không gộp chips khó nhìn).
  const catDetail = (c, rec) => {
    if (c.key === 'water' && rec.water) return `${rec.water.totalDrankMl} ml`;
    if (c.key === 'sleep' && rec.sleep)
      return `${Math.floor(rec.sleep.minutes / 60)}h${String(rec.sleep.minutes % 60).padStart(2, '0')}`;
    if (c.key === 'weight' && rec.weight.length) return `${(rec.weight[rec.weight.length - 1].value / 1000).toFixed(1)} kg`;
    if ((c.key === 'medicine' || c.key === 'meal' || c.key === 'study') && rec[c.key].length)
      return `${rec[c.key].length} lần`;
    return '';
  };

  const {
    data: day
  } = useQuery({
    queryKey: ['day', selected],
    enabled: !!selected,
    queryFn: async () => (await waterService.getDay(selected)).data
  });
  const byDate = new Map((data?.days ?? []).map(d => [d.date, d]));
  const cells = monthMatrix(year, month);
  function shift(delta) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelected(null);
  }
  return <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tháng trước">
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              Tháng {month}/{year}
            </h2>
            <p className="inline-flex items-center gap-1 text-xs text-orange-600">
              <Flame className="size-3.5" /> Chuỗi hiện tại: {data?.currentStreak ?? 0} ngày
            </p>
          </div>
          <button onClick={() => shift(1)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tháng sau">
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {weekdays.map(w => <div key={w} className="py-1">
              {w}
            </div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((dayNumber, index) => {
          if (dayNumber === null) return <div key={`empty-${index}`} />;
          const date = `${year}-${pad(month)}-${pad(dayNumber)}`;
          const entry = byDate.get(date);
          const isToday = date === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
          const isSelected = date === selected;
          return <button
            key={date}
            onClick={() => setSelected(date)}
            aria-pressed={isSelected}
            className={`relative aspect-square rounded-lg text-sm transition ${
              isSelected
                ? 'bg-water-600 font-bold text-white shadow-sm'
                : entry?.isCompleted
                  ? 'bg-emerald-100 font-semibold text-emerald-700'
                  : entry
                    ? 'bg-water-50 text-water-700'
                    : 'text-slate-500 hover:bg-slate-50'
            } ${isToday && !isSelected ? 'ring-2 ring-water-400' : ''}`}
          >
                <span className="relative z-10">{dayNumber}</span>
                {(() => {
                  const cats = catsOf(activity.get(date));
                  if (cats.length === 0) return null;
                  return (
                    <span className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5">
                      {cats.map((c) => (
                        <span key={c.key} className={`size-1.5 rounded-full ${isSelected ? 'bg-white/80' : c.dot}`} />
                      ))}
                    </span>
                  );
                })()}
              </button>;
        })}
        </div>
      </section>

      {selected && <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Nhật ký ngày {selected}</h3>
          {(() => {
            const rec = activity.get(selected);
            const cats = catsOf(rec);
            if (!rec || cats.length === 0) return null;
            return (
              <div className="mb-3 space-y-1">
                {cats.map((c) => (
                  <div key={c.key} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${c.chip}`}>
                    <span className={`size-2 shrink-0 rounded-full ${c.dot}`} />
                    <span className="text-[12px] font-semibold">{c.label}</span>
                    <span className="ml-auto text-[12px] font-semibold tabular-nums">{catDetail(c, rec)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {weightOfDay.length > 0 && (
            <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Cân nặng:</span>
              {weightOfDay.map((w) => (
                <span key={w.id} className="rounded-full bg-water-50 px-2 py-0.5 font-semibold tabular-nums text-water-700">
                  {(w.value / 1000).toFixed(1)} kg · {w.time}
                </span>
              ))}
            </p>
          )}
          {!day ? <DearlyLoader size="sm" /> : day.logs.length === 0 ? <p className="text-sm text-slate-500">Không có dữ liệu ngày này.</p> : <>
              <p className="mb-3 text-sm text-slate-600">
                Tổng {day.totalDrankMl} / {day.targetMl} ml{' '}
                {day.isCompleted && <span className="font-medium text-emerald-600">· Đạt mục tiêu</span>}
              </p>
              <LogCarousel logs={day.logs} />
            </>}
        </section>}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Nhật ký tháng {month}</h3>
          <span className="text-xs text-slate-500">{monthDays.length} ngày có ghi</span>
        </div>

        {monthDays.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có ghi nhận nào trong tháng này.</p>
        ) : (
          <div className="space-y-2">
            {monthDays.map((rec) => (
              <button
                key={rec.date}
                onClick={() => setSelected(rec.date)}
                className="block w-full rounded-xl bg-slate-50 px-2.5 py-2 text-left transition hover:bg-slate-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold tabular-nums text-slate-800">{rec.date}</span>
                  <span className="flex items-center gap-1">
                    {catsOf(rec).map((c) => (
                      <span key={c.key} className={`size-2 rounded-full ${c.dot}`} />
                    ))}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {catsOf(rec).map((c) => (
                    <div key={c.key} className="flex items-center gap-1.5">
                      <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
                      <span className="text-[11px] font-semibold text-slate-600">{c.label}</span>
                      <span className="text-[11px] tabular-nums text-slate-500">{catDetail(c, rec)}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>;
}