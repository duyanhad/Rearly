import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Droplet, Moon, Pill, Scale, Soup } from 'lucide-react';
import { sleepService } from '../services/sleepService';
import { isSleepWindow, nowHhmm } from '../features/sleep/sleepWindow';
import { AddWaterModal } from '../features/water/components/AddWaterModal';
import { HabitLogModal } from '../features/habits/components/HabitLogModal';
import { WeightLogModal } from '../features/weight/components/WeightLogModal';
import { SleepStartModal } from '../features/sleep/components/SleepStartModal';
import { SleepLogModal } from '../features/sleep/components/SleepLogModal';

const NEEDS = [
  { key: 'water', label: 'Nước', icon: Droplet, tone: 'bg-sky-50 text-sky-600' },
  { key: 'sleep', label: 'Giấc ngủ', icon: Moon, tone: 'bg-indigo-50 text-indigo-600' },
  { key: 'meal', label: 'Bữa ăn', icon: Soup, tone: 'bg-amber-50 text-amber-600' },
  { key: 'medicine', label: 'Thuốc', icon: Pill, tone: 'bg-rose-50 text-rose-600' },
  { key: 'study', label: 'Học tập', icon: BookOpen, tone: 'bg-violet-50 text-violet-600' },
  { key: 'weight', label: 'Cân nặng', icon: Scale, tone: 'bg-teal-50 text-teal-600' },
];

/**
 * Bảng "Báo cáo nhanh": gạt lên để mở, chọn nhu cầu là mở đúng popup ghi nhận của nhu cầu đó
 * (nước / giấc ngủ / bữa ăn / thuốc / học tập / cân nặng) — không chỉ riêng nước.
 */
export function QuickReportSheet({ onClose }) {
  const [pick, setPick] = useState(null);
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragFrom = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Dùng chung cache với trang Hôm nay để biết đang ngủ dở hay chưa.
  const { data: sleep } = useQuery({
    queryKey: ['sleep'],
    queryFn: async () => (await sleepService.summary()).data,
    staleTime: 30_000,
  });

  const close = () => {
    setPick(null);
    onClose();
  };

  if (pick === 'water') return <AddWaterModal onClose={close} />;
  if (pick === 'meal' || pick === 'medicine' || pick === 'study')
    return <HabitLogModal kind={pick} onClose={close} />;
  if (pick === 'weight') return <WeightLogModal onClose={close} />;
  if (pick === 'sleep') {
    const logs = sleep?.logs ?? [];
    const running = logs.find((l) => l.status === 'sleeping');
    const bed = running?.bedTime ?? '23:00';
    const wake = running?.wakeTime ?? '07:00';
    return running || isSleepWindow(bed, wake) ? (
      <SleepLogModal
        bed={bed}
        bedEditable={!running}
        defaultWake={running ? nowHhmm() : wake}
        onClose={close}
      />
    ) : (
      <SleepStartModal defaultBed={bed} onClose={close} />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />

      <div
        style={{ transform: `translateY(${shown ? dragY : 420}px)` }}
        className={`relative rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl transition-transform ${
          dragY ? 'duration-0' : 'duration-300'
        }`}
      >
        <div
          onPointerDown={(e) => {
            dragFrom.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragFrom.current == null) return;
            setDragY(Math.max(0, e.clientY - dragFrom.current));
          }}
          onPointerUp={() => {
            dragFrom.current = null;
            if (dragY > 90) onClose();
            else setDragY(0);
          }}
          className="flex cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="px-4 pb-1">
          <h2 className="text-base font-semibold text-slate-900">Báo cáo nhanh</h2>
          <p className="text-[11px] text-slate-500">Chọn nhu cầu để ghi kèm ảnh minh chứng (gạt xuống để đóng).</p>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4">
          {NEEDS.map(({ key, label, icon: Icon, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPick(key)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-slate-200 transition active:scale-95"
            >
              <span className={`flex size-10 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickReportSheet;
