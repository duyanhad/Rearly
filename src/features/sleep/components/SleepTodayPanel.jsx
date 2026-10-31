import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Clock, Moon, Plus, RotateCcw, Settings, Sunrise } from 'lucide-react';
import { mediaUrl } from '../../../services/apiClient';
import { sleepService } from '../../../services/sleepService';
import { habitService } from '../../../services/habitService';
import { PhotoThumb } from '../../water/components/AddWaterModal';
import { HabitAvatar3D } from '../../habits/components/HabitAvatar3D';
import { HabitObjectAvatars } from '../../habits/components/HabitObjectAvatars';
import { useHabitEvents } from '../../habits/useHabitEvents';
import { isSleepWindow, nowHhmm } from '../sleepWindow';
import { SleepCountdown } from './SleepCountdown';
import { SleepLogModal } from './SleepLogModal';
import { SleepStartModal } from './SleepStartModal';
import { SleepSettingsModal } from './SleepSettingsModal';

const toHours = (m) => `${Math.floor((m || 0) / 60)}h${String((m || 0) % 60).padStart(2, '0')}`;

const STATUS = {
  approved: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Chờ partner duyệt', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700' },
  sleeping: { label: 'Đang ngủ', className: 'bg-indigo-50 text-indigo-600' },
};

/** Khung giấc ngủ nằm ngay trong trang Hôm nay (lật bằng mũi tên 2 bên). */
export function SleepTodayPanel() {
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // Cập nhật mỗi 10 s để % sáng của ảnh và nút "Ghi/Bắt đầu/Kết thúc" bám theo đồng hồ.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  const { data, isLoading } = useQuery({
    queryKey: ['sleep'],
    queryFn: async () => (await sleepService.summary()).data,
    refetchInterval: 20_000,
  });
  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });

  // Chốt ngày: reset % và quỹ giấc ngủ để bắt đầu ngày mới (server lưu mốc).
  const closeDay = useMutation({
    mutationFn: () => sleepService.closeDay(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sleep'] });
    },
  });
  const setting = habits.find((h) => h.kind === 'sleep');

  const logs = data?.logs ?? [];
  // Avatar bạn tác động khi được cộng, avatar partner tác động khi bị từ chối.
  const { pour, approve, spill } = useHabitEvents(logs);
  const approvedNights = logs.filter((l) => l.status === 'approved').length;
  // Trang Hôm nay chỉ quan tâm đêm của hôm nay; lịch sử xem ở trang Lịch.
  // Dùng ngày địa phương (toISOString là UTC → sau 00:00 sẽ lệch một ngày).
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // Phiếu "đang ngủ" có thể mang ngày hôm sau (bắt đầu trước nửa đêm) → luôn ưu tiên nó.
  const running = logs.find((l) => l.status === 'sleeping');
  // Nhiều phiếu trong ngày → lấy phiếu MỚI NHẤT (theo mốc bắt đầu/kết thúc), không lấy phiếu đầu tiên.
  const stamp = (l) => l.endedAtUtc ?? l.startedAtUtc ?? '';
  // Đêm nay có thể mang ngày mai (bắt đầu sau 18h) → lấy cả phiếu từ hôm nay trở đi.
  const todayLogs = logs.filter((l) => l.date >= todayIso);
  const last = running ?? [...todayLogs].sort((a, b) => stamp(a).localeCompare(stamp(b))).at(-1);
  const goal = data?.goalMinutes ?? 480;
  const logged = last?.minutes ?? 0;
  // Chỉ phiếu đã duyệt mới được cộng (giống backend khi tính chuỗi/trung bình).
  const approved = last?.status === 'approved';
  const status = last ? STATUS[last.status] ?? STATUS.approved : null;
  // Đang trong khung ngủ (23:00 → 07:00) thì nút ghi nhận đổi thành "Kết thúc giấc ngủ".
  const bedTime = setting?.times?.[0] ?? '23:00';
  const wakeTime = setting?.times?.[1] ?? '07:00';
  const sleepingNow = isSleepWindow(bedTime, wakeTime);
  // Phiếu "đang ngủ" (đã bấm bắt đầu) → lúc này chỉ còn chốt giờ thức + minh chứng dậy.
  const inProgress = last?.status === 'sleeping';
  // Trong khung ngủ thì luôn cho bắt đầu (ghi đè phiếu hôm nay), kể cả hôm nay đã ghi xong.
  // Chưa bắt đầu → luôn là "Bắt đầu ngủ"; đang ngủ → "Kết thúc giấc ngủ".
  const mode = inProgress ? 'end' : 'start';

  // Đang ngủ: hiện luôn thời gian đã ngủ trong phiên (cập nhật mỗi 30 s).
  const elapsedMin = (() => {
    if (!inProgress || !last) return 0;
    // Ưu tiên mốc server ghi lúc bấm "Bắt đầu ngủ" (chính xác, không phụ thuộc giờ hẹn).
    if (last.startedAtUtc) {
      return Math.max(0, Math.floor((Date.now() - new Date(last.startedAtUtc).getTime()) / 60000));
    }
    const [bh, bm] = last.bedTime.split(':').map(Number);
    const d = new Date();
    let m = d.getHours() * 60 + d.getMinutes() - (bh * 60 + bm);
    if (m < 0) m += 1440;
    return m;
  })();
  // % do server tính (cộng cả giấc CHỜ DUYỆT và giấc đang chạy) → kết thúc không bị reset về 0.
  const approvedTodayMin = data?.minutesToday ?? 0;
  // Đang chạy thì cộng thêm phần vừa trôi để thanh nhích ngay, không chờ refetch 20s.
  const shownMinutes = inProgress ? Math.max(approvedTodayMin, approvedTodayMin + elapsedMin) : approvedTodayMin;
  // Giữ phần trăm lẻ để thanh/ảnh nhích dần mỗi phút thay vì nhảy từng 1%.
  const shownPercentExact = goal > 0 ? Math.min(100, (shownMinutes / goal) * 100) : 0;
  const shownPercent = Math.round(shownPercentExact);
  const hit = shownPercent >= 100;
  // Nhật ký: các đêm đã ghi (bỏ phiếu đang ngủ), mới nhất trước.
  const history = logs
    .filter((l) => l.status !== 'sleeping')
    .slice(-6)
    .reverse();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="relative min-w-0 rounded-2xl bg-white p-4 shadow-sm">
          <HabitObjectAvatars pour={pour + approvedNights} approve={approve} spill={spill} color="#6366f1" />
          <div className="flex h-56 items-center justify-center">
            <HabitAvatar3D
              imageUrl={setting?.imageUrl ?? last?.photoUrl}
              cutoutUrl={setting?.cutoutUrl}
              hit={hit}
              percent={shownPercent}
              signal={pour + approvedNights}
              spill={spill}
              kind="sleep"
              sleeping={inProgress}
              fallback={Moon}
              plain
              className={setting?.imageUrl || last?.photoUrl ? 'size-full' : 'size-28'}
            />
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            <div className="flex items-baseline gap-0.5">
              <span className="bg-gradient-to-br from-water-600 to-[#8e2f3c] bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                {shownPercent}
              </span>
              <span className="bg-gradient-to-br from-water-500 to-water-700 bg-clip-text text-xl font-bold text-transparent">%</span>
            </div>
            <p className="text-xs font-medium tabular-nums text-slate-500">
              {inProgress ? `Đang ngủ từ ${last.bedTime}` : last ? `${last.bedTime} → ${last.wakeTime}` : 'Chưa ghi đêm nào'}
            </p>
            <p className="text-xs font-medium text-slate-500">
              <span className="text-sm font-semibold text-slate-800">{toHours(shownMinutes)}</span>
              <span className="text-slate-300"> / </span>mục tiêu {toHours(goal)}
            </p>
            {!approved && logged > 0 && !inProgress && (
              <p className="text-[11px] font-medium text-amber-600">
                {toHours(logged)} đang chờ partner duyệt
              </p>
            )}
            <div className="h-1.5 w-full max-w-[230px] overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-water-600 to-[#c98883]"
                style={{ width: `${shownPercentExact}%` }}
              />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
              {inProgress ? (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 ring-1 ring-indigo-100">
                  Đang ngủ · {shownPercent}%
                </span>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                    hit ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100'
                  }`}
                >
                  {hit ? 'Đủ mục tiêu' : `Thiếu ${toHours(Math.max(0, goal - shownMinutes))}`}
                </span>
              )}
              {last?.wakePhotoUrl && (
                <a
                  href={mediaUrl(last.wakePhotoUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100"
                >
                  <Sunrise className="size-3.5" /> Dậy đúng giờ
                </a>
              )}
              {status && !inProgress && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
              )}
            </div>
            {last?.status === 'rejected' && last.rejectReason && (
              <p className="text-[11px] text-rose-600">Lý do: {last.rejectReason}</p>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <SleepCountdown
            wake={wakeTime}
            alarmEnabled={Boolean(setting?.alarmEnabled)}
            started={inProgress}
            startedAtUtc={last?.startedAtUtc ?? null}
            goalMinutes={goal}
            approvedMinutes={approvedTodayMin}
          />

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <button
              onClick={() => (mode === 'start' ? setStartOpen(true) : setLogOpen(true))}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-water-600 py-4 text-base font-semibold text-white shadow-sm shadow-water-500/30 transition active:scale-[0.99] hover:bg-water-700"
            >
              {mode === 'end' ? <Sunrise className="size-5" /> : <Plus className="size-5" />}
              {mode === 'end' ? 'Kết thúc giấc ngủ' : mode === 'start' ? 'Bắt đầu giấc ngủ' : 'Ghi giấc ngủ'}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              {mode === 'end'
                ? 'Đang ngủ — bấm để dừng và chụp ảnh minh chứng lúc thức'
                : 'Nhập giờ ngủ → giờ thức → ảnh minh chứng → bộ đếm chạy'}
            </p>
            <button
              onClick={() => setConfirmClose(true)}
              disabled={closeDay.isPending || inProgress}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-water-300 hover:text-water-700 disabled:opacity-50"
              title={inProgress ? 'Hãy kết thúc giấc ngủ trước khi chốt ngày' : 'Bắt đầu ngày mới: % và quỹ giấc ngủ về 0'}
            >
              <RotateCcw className="size-3.5" /> {closeDay.isPending ? 'Đang chốt…' : 'Chốt ngày · bắt đầu ngày mới'}
            </button>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              Tự động làm mới khi sang ngày mới · hoặc bấm để chốt ngay
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Mục tiêu &amp; báo thức</h2>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                <span className="block text-sm font-semibold tabular-nums text-slate-800">{toHours(goal)} mỗi đêm</span>
                <span className="block">
                  {inProgress ? `Đang ngủ: ${toHours(elapsedMin)}` : last ? `Đêm nay: ${toHours(logged)}` : 'Đêm nay: chưa ghi'}
                </span>
              </p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-water-300"
              >
                <Settings className="size-3.5" /> Sửa
              </button>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-500">
                Nhật ký <b>6 đêm gần đây</b> ở dưới. Xem cả tháng trong phần <b>Lịch</b>.
              </p>
              <Link to="/calendar" className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-water-700">
                Mở Lịch <ChevronRight className="size-3.5" />
              </Link>
            </div>
            {last?.status === 'pending' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                Đêm nay đang chờ partner duyệt — số giờ sẽ được tính sau khi duyệt.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Nhật ký giấc ngủ các đêm gần đây — giống "Nhật ký hôm nay" bên tab Nước */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Nhật ký giấc ngủ</h2>
          <Link to="/calendar" className="flex items-center gap-0.5 text-xs font-semibold text-water-700">
            Xem tất cả <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đêm nào được ghi. Bấm nút phía trên để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {history.map((n) => {
              const st = STATUS[n.status] ?? STATUS.approved;
              return (
                <div key={n.id} className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                  <PhotoThumb url={n.photoUrl} note={`Giấc ngủ ${n.date}`} full />
                  <p className="text-sm font-semibold tabular-nums text-slate-800">
                    {n.bedTime} → {n.wakeTime}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {n.date} · {toHours(n.minutes)}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${st.className}`}>
                      {st.label}
                    </span>
                    {n.wakePhotoUrl && (
                      <a
                        href={mediaUrl(n.wakePhotoUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-amber-600"
                        title="Minh chứng dậy đúng giờ"
                      >
                        Dậy đúng giờ
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {startOpen && <SleepStartModal defaultBed={bedTime} defaultWake={wakeTime} onClose={() => setStartOpen(false)} />}
      {logOpen && (
        <SleepLogModal
          bed={mode === 'end' ? last?.bedTime ?? bedTime : bedTime}
          bedEditable={mode !== 'end'}
          defaultWake={mode === 'end' ? nowHhmm() : wakeTime}
          running={mode === 'end' ? last : null}
          onClose={() => setLogOpen(false)}
        />
      )}
      {settingsOpen && <SleepSettingsModal onClose={() => setSettingsOpen(false)} />}

      {confirmClose && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <RotateCcw className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">Chốt ngày giấc ngủ?</h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              Bạn sẽ bắt đầu một <b>ngày ngủ mới</b>: % và quỹ giấc ngủ về 0. Các giấc đã ghi vẫn còn trong nhật ký
              và partner vẫn xem được.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Huỷ
              </button>
              <button
                onClick={() => {
                  setConfirmClose(false);
                  closeDay.mutate();
                }}
                className="flex-1 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white hover:bg-water-700"
              >
                Chốt ngày
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SleepTodayPanel;
