import { useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, ImageIcon, Moon, Plus, Settings, Target } from 'lucide-react';
import { mediaUrl } from '../../../services/apiClient';
import { sleepService } from '../../../services/sleepService';
import { SleepLogModal } from '../components/SleepLogModal';
import { SleepSettingsModal } from '../components/SleepSettingsModal';
import { SleepDayProgress, SleepRunningCard, SleepStartCard } from '../components/SleepSessionCards';

const toHours = (minutes) => `${Math.floor((minutes || 0) / 60)}h${String((minutes || 0) % 60).padStart(2, '0')}`;

const STATUS = {
  approved: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Chờ partner duyệt', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700' },
};

/** Trang chính của giấc ngủ: đêm qua ngủ bao nhiêu, mục tiêu, và nút sang trang ghi phiếu. */
export function SleepHomePage() {
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['sleep'], queryFn: async () => (await sleepService.summary()).data });

  const refreshSleep = () => {
    void queryClient.invalidateQueries({ queryKey: ['sleep'] });
    void queryClient.invalidateQueries({ queryKey: ['today'] });
  };

  // Bắt đầu ngủ: gửi 1 ảnh + giờ đi ngủ hiện tại, bộ đếm do server giữ mốc StartedAtUtc.
  const startSession = useMutation({
    mutationFn: async ({ file }) => {
      const form = new FormData();
      const now = new Date();
      form.append('bedTime', `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      if (file) form.append('photo', file);
      return sleepService.start(form);
    },
    onSuccess: refreshSleep,
  });

  const stopSession = useMutation({
    mutationFn: async ({ file }) => {
      const form = new FormData();
      if (file) form.append('photo', file);
      return sleepService.stop(running.id, form);
    },
    onSuccess: refreshSleep,
  });

  const logs = data?.logs ?? [];
  const last = logs.at(-1);
  const goal = data?.goalMinutes ?? 480;
  const running = logs.find((l) => l.status === 'sleeping') ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = logs.filter((l) => String(l.date) === today);
  const minutes = last?.minutes ?? 0;
  const percent = goal ? Math.min(100, Math.round((minutes / goal) * 100)) : 0;
  const hit = minutes >= goal;
  const status = last ? STATUS[last.status] ?? STATUS.approved : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100"
          aria-label="Về trang chính"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Giấc ngủ</h1>
          <p className="text-xs text-slate-500">Ghi lại giấc ngủ, partner duyệt và giữ chuỗi đêm đủ giấc</p>
        </div>
        <Link
          to="/settings/sleep"
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          <Settings className="size-4" /> Cài đặt
        </Link>
      </div>

      {/* Thẻ chính: ảnh minh chứng + số giờ đêm qua */}
      <section
        className="relative overflow-hidden rounded-3xl p-4 shadow-sm ring-1 ring-white/40"
        style={{ background: 'radial-gradient(120% 110% at 50% 0%, #fdf5f4 0%, #f0d9d4 100%)' }}
      >
        <div className="flex items-start gap-4">
          <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/70 ring-1 ring-white/80">
            {last?.photoUrl ? (
              <img src={mediaUrl(last.photoUrl)} alt="Ảnh giấc ngủ" className="size-full object-cover" />
            ) : (
              <Moon className="size-12 text-water-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-water-600">Đêm gần nhất</p>
            <p className="mt-0.5 text-xl font-extrabold tabular-nums text-slate-900">
              {last ? `${last.bedTime} → ${last.wakeTime}` : 'Chưa ghi đêm nào'}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <b className="text-base">{toHours(minutes)}</b> / mục tiêu {toHours(goal)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  hit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {hit ? 'Đủ mục tiêu' : `Thiếu ${toHours(goal - minutes)}`}
              </span>
              {status && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                  {status.label}
                </span>
              )}
            </div>
            {last?.status === 'rejected' && last.rejectReason && (
              <p className="mt-1 text-[11px] text-rose-600">Lý do: {last.rejectReason}</p>
            )}
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-water-600 to-[#c98883]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] font-semibold tabular-nums text-water-700">{percent}%</p>
      </section>

      {/* Hành động: bắt đầu ngủ bằng 1 ảnh, hoặc ghi phiếu thủ công */}
      {running ? (
        <SleepRunningCard session={running} onStop={stopSession.mutate} stopping={stopSession.isPending} />
      ) : (
        <SleepStartCard onStart={startSession.mutate} starting={startSession.isPending} goalMinutes={goal} />
      )}

      <SleepDayProgress sessions={todaySessions} goalMinutes={goal} percent={data?.percentToday ?? 0} />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setLogOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-water-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-water-700"
        >
          <Plus className="size-4" /> {running ? 'Kết thúc giấc ngủ' : 'Ghi bù giấc ngủ'}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          <Target className="size-4" /> Mục tiêu &amp; báo thức
        </button>
      </div>

      {/* Ghi chú + lịch sử ngắn */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Các đêm gần đây</h2>
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Target className="size-3.5" /> mục tiêu {toHours(goal)}
          </span>
        </div>

        {isLoading && <DearlyLoader size="sm" />}
        {!isLoading && logs.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có đêm nào. Bấm “Ghi giấc ngủ” để bắt đầu.</p>
        )}

        <div className="space-y-1.5">
          {[...logs].reverse().slice(0, 5).map((l) => {
            const ok = l.minutes >= goal;
            const st = STATUS[l.status] ?? STATUS.approved;
            return (
              <div key={l.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-water-600 ring-1 ring-slate-200">
                  {l.photoUrl ? <ImageIcon className="size-4" /> : <Moon className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-800">
                    {l.bedTime} → {l.wakeTime}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {l.date} {l.note ? `· ${l.note}` : ''}
                  </span>
                </span>
                <span className={`text-sm font-bold tabular-nums ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {toHours(l.minutes)}
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${st.className}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>

        {logs.some((l) => l.status === 'approved') && (
          <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="size-3" /> Chỉ đêm đã duyệt mới được tính vào số giờ.
          </p>
        )}
      </section>

      {logOpen && <SleepLogModal onClose={() => setLogOpen(false)} />}
      {settingsOpen && <SleepSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default SleepHomePage;
