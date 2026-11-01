import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlarmClock, BookOpen, Pill, Soup } from 'lucide-react';
import { habitService } from '../../../services/habitService';
import { askNotificationPermission, showSystemNotification } from '../../../utils/notify';

const KIND_META = {
  medicine: { label: 'Uống thuốc', icon: Pill, verb: 'Đến giờ uống thuốc rồi!' },
  meal: { label: 'Bữa ăn', icon: Soup, verb: 'Đến giờ ăn rồi!' },
  study: { label: 'Học tập', icon: BookOpen, verb: 'Đến giờ học rồi!' },
};

// Số lần kêu mỗi vòng / số vòng theo kiểu báo thức (giống trang giấc ngủ).
const MODE_PLAN = {
  gentle: { perRound: 1, rounds: 1 },
  insist: { perRound: 3, rounds: 2 },
  crazy: { perRound: 4, rounds: 3 },
};

const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const stoppedKey = (kind, time) => `dearly.habitAlarm:${kind}:${time}:${dayKey()}`;
const isStopped = (kind, time) => localStorage.getItem(stoppedKey(kind, time)) === '1';
const stop = (kind, time) => localStorage.setItem(stoppedKey(kind, time), '1');

/**
 * Báo thức cho thuốc / bữa ăn / học tập: kêu tại từng mốc giờ khi app đang mở,
 * kiểu kêu (nhẹ nhàng / nhắc dai / điên cuồng) chọn trong Cài đặt của nhu cầu.
 */
export function HabitAlarmOverlay() {
  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitService.list()).data,
    staleTime: 60_000,
  });

  const [ring, setRing] = useState(null); // { kind, time }
  const [call, setCall] = useState(1);

  useEffect(() => {
    const rows = habits.filter((h) => KIND_META[h.kind] && h.enabled !== false && h.alarmEnabled && (h.times ?? []).length > 0);
    if (rows.length === 0) return undefined;
    const tick = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      for (const row of rows) {
        for (const time of row.times) {
          const [h, m] = time.split(':').map(Number);
          const diff = nowMin - (h * 60 + m);
          if (diff >= 0 && diff < 45 && !isStopped(row.kind, time)) {
            setRing((cur) => cur ?? { kind: row.kind, time });
            return;
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [habits]);

  const row = habits.find((h) => h.kind === ring?.kind);
  const plan = MODE_PLAN[row?.alarmMode ?? 'gentle'] ?? MODE_PLAN.gentle;

  const close = useCallback(() => {
    if (ring) stop(ring.kind, ring.time);
    setRing(null);
  }, [ring]);

  useEffect(() => {
    if (!ring) return undefined;
    setCall(1);
    const total = plan.perRound * plan.rounds;
    let count = 1;
    const fire = async () => {
      if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
      const ok = await askNotificationPermission();
      if (ok) {
        const meta = KIND_META[ring.kind];
        const round = Math.floor((count - 1) / plan.perRound) + 1;
        const per = ((count - 1) % plan.perRound) + 1;
        showSystemNotification(`⏰ ${meta.label} ${ring.time}`, `${meta.verb} Vòng ${round}/${plan.rounds} · lần ${per}/${plan.perRound}`);
      }
    };
    void fire();
    const id = setInterval(() => {
      count += 1;
      if (count > total) {
        clearInterval(id);
        stop(ring.kind, ring.time);
        setRing(null);
        return;
      }
      setCall(count);
      void fire();
    }, 60_000);
    return () => clearInterval(id);
  }, [ring, plan.perRound, plan.rounds]);

  if (!ring) return null;
  const meta = KIND_META[ring.kind];
  const Icon = meta.icon;
  const round = Math.floor((call - 1) / plan.perRound) + 1;
  const per = ((call - 1) % plan.perRound) + 1;

  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#571722]/95 to-[#2b1a1e]/95 p-6 text-center text-cream-50 backdrop-blur">
      <span className="flex size-20 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/20">
        <Icon className="size-10 animate-pulse" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cream-200/80">{meta.label} · {ring.time}</p>
      <p className="text-2xl font-bold">
        Vòng {round}/{plan.rounds} · lần {per}/{plan.perRound}
      </p>
      <p className="max-w-xs text-sm text-cream-200/80">{meta.verb} Mở Dearly ghi nhận nhé.</p>
      <div className="mt-2 w-full max-w-xs space-y-2">
        <button onClick={close} className="w-full rounded-xl bg-cream-200 py-3 text-sm font-bold text-water-800">
          Tắt báo thức
        </button>
        <Link to="/" onClick={close} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-semibold text-cream-50">
          <AlarmClock className="size-4" /> Ghi nhận ngay
        </Link>
      </div>
    </div>
  );
}

export default HabitAlarmOverlay;
