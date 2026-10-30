import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Scale, Settings, Target } from 'lucide-react';
import { habitLogService } from '../../../services/habitLogService';
import { habitService } from '../../../services/habitService';
import { PhotoThumb } from '../../water/components/AddWaterModal';
import { HabitAvatar3D } from '../../habits/components/HabitAvatar3D';
import { HabitObjectAvatars } from '../../habits/components/HabitObjectAvatars';
import { useHabitEvents } from '../../habits/useHabitEvents';
import { WeightLogModal } from './WeightLogModal';
import { WeightGoalModal } from './WeightGoalModal';

const kg = (grams) => ((grams ?? 0) / 1000).toFixed(1);
const STATUS = {
  approved: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700' },
};

/**
 * Khung "Cân nặng" trong trang Hôm nay: cân gần nhất, % tiến tới mục tiêu,
 * ghi cân mới (kèm ảnh bàn cân) và lịch sử các lần cân.
 */
export function WeightTodayPanel() {
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const setting = habits.find((h) => h.kind === 'weight');

  const { data: today } = useQuery({
    queryKey: ['habit-day', 'weight'],
    queryFn: async () => (await habitLogService.today('weight')).data,
  });
  const { data: history = [] } = useQuery({
    queryKey: ['habit-history', 'weight'],
    queryFn: async () => (await habitLogService.history('weight', 60)).data,
    refetchInterval: 20_000,
  });

  const remove = useMutation({
    mutationFn: (id) => habitLogService.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habit-day', 'weight'] });
      await qc.invalidateQueries({ queryKey: ['habit-history', 'weight'] });
    },
  });

  const targetG = (setting?.targetValue ?? today?.target ?? 60000) || 60000;
  const targetKg = targetG / 1000;
  // Avatar bạn tác động khi được cộng, avatar partner tác động khi bị từ chối.
  const { pour, spill } = useHabitEvents(history);
  const approvedCount = history.filter((h) => h.status === 'approved').length;
  // Bỏ phiếu bị từ chối; lịch sử trả mới nhất trước.
  const entries = history.filter((h) => h.status !== 'rejected' && h.value);
  const latest = entries[0];
  const first = entries[entries.length - 1];
  const latestKg = latest ? latest.value / 1000 : null;
  // Mốc ban đầu cố định (chốt ở lần cân đầu tiên), fallback về lần cân cũ nhất trong lịch sử.
  const startKg = setting?.startValue ? setting.startValue / 1000 : first ? first.value / 1000 : null;
  const startDate = setting?.startDate ?? first?.date ?? null;

  // Hướng mục tiêu: 'down' = giảm cân, 'up' = tăng cân (null → suy ra từ mục tiêu so với cân đầu).
  const direction = setting?.direction ?? (startKg !== null && targetKg <= startKg ? 'down' : 'up');

  // —— Báo cáo đầu ngày / cuối ngày và so sánh ——
  const localDate = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = localDate();
  const byTime = (a, b) => a.time.localeCompare(b.time);
  const todayList = entries.filter((e) => e.date === todayKey).sort(byTime);
  const morning = todayList[0] ?? null;
  const evening = todayList.length > 1 ? todayList[todayList.length - 1] : morning;
  const inDayDeltaKg = morning && evening && morning !== evening ? (evening.value - morning.value) / 1000 : null;

  // Hôm trước = ngày gần nhất trước hôm nay có ghi cân (lấy lần cuối của ngày đó).
  const prevDayKey = [...new Set(entries.map((e) => e.date))].filter((d) => d < todayKey).sort().pop() ?? null;
  const prevDayEntries = prevDayKey ? entries.filter((e) => e.date === prevDayKey).sort(byTime) : [];
  const prevWeightKg = prevDayEntries.length ? prevDayEntries[prevDayEntries.length - 1].value / 1000 : null;
  const vsPrevKg = prevWeightKg !== null && latestKg !== null ? latestKg - prevWeightKg : null;
  const vsStartKg = startKg !== null && latestKg !== null ? latestKg - startKg : null;
  // Giảm cân là tốt khi mục tiêu là giảm.
  const goodWhenDown = direction === 'down';
  const deltaClass = (v) =>
    v === null || Math.abs(v) < 0.05 ? 'text-slate-500' : (v < 0) === goodWhenDown ? 'text-emerald-600' : 'text-rose-600';
  const deltaText = (v) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} kg`);

  const reached = latestKg !== null && Math.abs(latestKg - targetKg) <= 0.2;
  // Xu hướng gần nhất: so lần cân mới nhất với lần ngay trước đó.
  const prevEntry = entries[1] ?? null;
  const trendKg = latest && prevEntry ? (latest.value - prevEntry.value) / 1000 : null;
  // Đi ngược mục tiêu: muốn tăng mà giảm (hoặc ngược lại) quá 0,1 kg → báo động, cân nứt.
  const wrongWay = trendKg !== null && !reached && (direction === 'up' ? trendKg < -0.1 : trendKg > 0.1);
  // Mức "sai hướng" 0–1: lệch càng nhiều (và càng nhiều lần liên tiếp) thì cân nứt càng to, càng nhiều đường nứt.
  const wrongStreak = (() => {
    let n = 0;
    for (let i = 0; i < entries.length - 1; i += 1) {
      const d = (entries[i].value - entries[i + 1].value) / 1000;
      if (direction === 'up' ? d < -0.05 : d > 0.05) n += 1;
      else break;
    }
    return n;
  })();
  const severity = wrongWay
    ? Math.min(1, (Math.abs(trendKg) / 1.5) * 0.6 + (Math.min(wrongStreak, 3) / 3) * 0.4)
    : 0;
  const span = startKg !== null ? Math.abs(startKg - targetKg) : 0;
  const percent =
    latestKg === null
      ? 0
      : reached
        ? 100
        : span < 0.1
          ? 0
          : Math.min(100, Math.max(0, Math.round((1 - Math.abs(latestKg - targetKg) / span) * 100)));
  const delta = latestKg !== null ? latestKg - targetKg : null;
  const todayLogs = (today?.logs ?? []).filter((l) => l.status !== 'rejected');

  // Báo động giữa ảnh: "nặng quá" / "nhẹ quá" kèm mức độ theo % sai hướng.
  const severityWord = severity > 0.67 ? 'Quá ' : severity < 0.34 ? 'Hơi ' : '';
  const alarmText =
    trendKg === null
      ? ''
      : `${severityWord}${direction === 'down' ? 'nặng thêm' : 'nhẹ đi'} ${Math.abs(trendKg).toFixed(1)} kg`;
  const alarmStyle =
    severity > 0.67
      ? 'bg-rose-600/95 text-white ring-rose-300'
      : severity > 0.34
        ? 'bg-orange-500/95 text-white ring-orange-200'
        : 'bg-amber-400/95 text-amber-950 ring-amber-200';

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="relative min-w-0 rounded-2xl bg-white p-4 shadow-sm">
          <div className="relative flex h-56 items-center justify-center">
            <HabitObjectAvatars pour={pour + approvedCount} spill={spill} color="#0d9488" />
            <HabitAvatar3D
              imageUrl={setting?.imageUrl}
              cutoutUrl={setting?.cutoutUrl}
              hit={reached}
              percent={percent}
              kind="weight"
              signal={pour + approvedCount}
              spill={spill}
              fallback={Scale}
              plain
              className={setting?.imageUrl ? 'size-full' : 'size-28'}
            />
            {wrongWay && alarmText && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <span
                  className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-extrabold shadow-lg ring-2 backdrop-blur-sm ${alarmStyle}`}
                >
                  <AlertTriangle className="size-4" /> {alarmText}
                </span>
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            <div className="flex items-baseline gap-0.5">
              <span className="bg-gradient-to-br from-water-600 to-[#8e2f3c] bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                {percent}
              </span>
              <span className="bg-gradient-to-br from-water-500 to-water-700 bg-clip-text text-xl font-bold text-transparent">%</span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              {latestKg !== null ? (
                <>
                  <span className="text-sm font-semibold tabular-nums text-slate-800">{latestKg.toFixed(1)} kg</span>
                  <span className="text-slate-300"> / </span>mục tiêu {targetKg.toFixed(1)} kg
                </>
              ) : (
                'Chưa cân lần nào'
              )}
            </p>
            <div className="h-1.5 w-full max-w-[230px] overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-water-600 to-[#c98883]" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
              {reached ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  Đã đạt mục tiêu
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  {delta === null ? 'Chưa có dữ liệu' : `Còn ${Math.abs(delta).toFixed(1)} kg`}
                </span>
              )}
              {todayLogs.some((l) => l.status === 'pending') && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {todayLogs.filter((l) => l.status === 'pending').length} lần chờ duyệt
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <button
              onClick={() => setLogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-water-600 py-4 text-base font-semibold text-white shadow-sm shadow-water-500/30 transition active:scale-[0.99] hover:bg-water-700"
            >
              <Plus className="size-5" /> Ghi cân nặng
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Cân buổi sáng, chụp ảnh bàn cân → lưu lại</p>
          </div>

          {wrongWay && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700">
                <AlertTriangle className="size-4" /> Báo động: đang đi ngược mục tiêu
              </p>
              <p className="mt-1 text-xs leading-relaxed text-rose-600">
                Mục tiêu là <b>{direction === 'up' ? 'tăng' : 'giảm'} cân</b>, nhưng lần cân này lại{' '}
                <b>{trendKg > 0 ? 'tăng' : 'giảm'} {Math.abs(trendKg).toFixed(1)} kg</b>
                {wrongStreak > 1 ? ` (${wrongStreak} lần liên tiếp sai hướng)` : ''}. Quay lại đúng hướng thì cân
                sáng màu trở lại, đạt mục tiêu thì sáng hoàn toàn.
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-1.5 font-semibold">
              <Target className="size-4 text-water-600" /> Mục tiêu cân nặng
            </h2>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                <span className="block text-sm font-semibold tabular-nums text-slate-800">{targetKg.toFixed(1)} kg</span>
                <span className="block">
                  {startKg !== null ? `Bắt đầu: ${startKg.toFixed(1)} kg` : 'Ghi lần cân đầu tiên để tính tiến trình'}
                </span>
                <span className="mt-0.5 inline-flex rounded-full bg-water-50 px-2 py-0.5 text-[11px] font-semibold text-water-700">
                  {direction === 'up' ? 'Đang tăng cân' : 'Đang giảm cân'}
                </span>
              </p>
              <button
                onClick={() => setGoalOpen(true)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-water-300"
              >
                <Settings className="size-3.5" /> Sửa
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Báo cáo đầu ngày / cuối ngày + so sánh */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Báo cáo cân nặng</h2>

        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Ghi lần cân đầu tiên để xem báo cáo đầu ngày, cuối ngày và so sánh.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Trong ngày: sáng → tối */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Trong ngày</p>
              <div className="mt-1.5 space-y-1 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Đầu ngày{morning ? ` · ${morning.time}` : ''}</span>
                  <b className="tabular-nums text-slate-800">{morning ? `${(morning.value / 1000).toFixed(1)} kg` : '—'}</b>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Cuối ngày{evening ? ` · ${evening.time}` : ''}</span>
                  <b className="tabular-nums text-slate-800">{evening ? `${(evening.value / 1000).toFixed(1)} kg` : '—'}</b>
                </p>
              </div>
              <p className={`mt-2 text-xs font-semibold ${deltaClass(inDayDeltaKg)}`}>
                {inDayDeltaKg === null ? 'Chưa đủ 2 lần cân hôm nay' : `Chênh lệch ${deltaText(inDayDeltaKg)}`}
              </p>
            </div>

            {/* So với hôm trước */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">So với hôm trước</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {prevDayKey ? `${prevDayKey} · ${prevWeightKg?.toFixed(1)} kg` : 'Chưa có dữ liệu hôm trước'}
              </p>
              <p className={`mt-2 text-sm font-bold tabular-nums ${deltaClass(vsPrevKg)}`}>{deltaText(vsPrevKg)}</p>
            </div>

            {/* So với ngày bắt đầu */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Từ ngày bắt đầu</p>
              <p className="mt-1.5 text-sm text-slate-500">
                {startDate ? `${startDate} · ${(startKg ?? 0).toFixed(1)} kg` : 'Chưa có dữ liệu'}
              </p>
              <p className={`mt-2 text-sm font-bold tabular-nums ${deltaClass(vsStartKg)}`}>{deltaText(vsStartKg)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Lịch sử cân nặng</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có lần cân nào. Bấm nút phía trên để ghi.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entries.slice(0, 6).map((l) => {
              const st = STATUS[l.status] ?? STATUS.approved;
              return (
                <div key={l.id} className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                  <PhotoThumb url={l.photoUrl} note="Bàn cân" full />
                  <p className="text-sm font-semibold tabular-nums text-slate-800">{kg(l.value)} kg</p>
                  <p className="text-[11px] text-slate-500">
                    {l.date} · {l.time}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${st.className}`}>{st.label}</span>
                    <button
                      onClick={() => remove.mutate(l.id)}
                      className="rounded px-1 text-slate-300 hover:text-rose-600"
                      aria-label="Xoá lần cân"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {logOpen && <WeightLogModal lastKg={latestKg} onClose={() => setLogOpen(false)} />}
      {goalOpen && <WeightGoalModal targetKg={targetKg} onClose={() => setGoalOpen(false)} />}
    </div>
  );
}

export default WeightTodayPanel;
