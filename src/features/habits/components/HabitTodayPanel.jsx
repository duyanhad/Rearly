import { useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Image as ImageIcon, Plus, Settings, Trash2 } from 'lucide-react';
import { PhotoThumb } from '../../water/components/AddWaterModal';
import { habitLogService } from '../../../services/habitLogService';
import { habitService } from '../../../services/habitService';
import { HABIT_KINDS } from '../config';
import { HabitAvatar3D } from './HabitAvatar3D';
import { HabitObjectAvatars } from './HabitObjectAvatars';
import { useHabitEvents } from '../useHabitEvents';
import { HabitLogModal } from './HabitLogModal';
import { HabitSettingsModal } from './HabitSettingsModal';

const STATUS = {
  approved: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700' },
};

/** Khung "hôm nay" cho thuốc / bữa ăn / học — dùng trong trang Hôm nay. */
export function HabitTodayPanel({ kind }) {
  const cfg = HABIT_KINDS[kind];
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['habit-day', kind],
    queryFn: async () => (await habitLogService.today(kind)).data,
    // Partner có thể duyệt/từ chối lúc mình đang mở trang → cập nhật để hiện hiệu ứng.
    refetchInterval: 15_000,
  });

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const setting = habits.find((h) => h.kind === kind);

  const remove = useMutation({
    mutationFn: (id) => habitLogService.remove(id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['habit-day', kind] }),
  });

  const target = data?.target ?? 0;
  const done = data?.done ?? 0;
  const logs = data?.logs ?? [];
  const pending = logs.filter((l) => l.status === 'pending').length;
  const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  // Bữa ăn / thuốc: báo cáo là sáng trước (kể cả chờ duyệt), partner từ chối mới trừ sáng.
  const SLOT_ROWS = {
    meal: [
      { id: 'breakfast', label: 'Sáng', emoji: '🌅' },
      { id: 'lunch', label: 'Trưa', emoji: '🍚' },
      { id: 'dinner', label: 'Tối', emoji: '🌙' },
    ],
    medicine: [
      { id: 'morning', label: 'Sáng', emoji: '🌅' },
      { id: 'noon', label: 'Trưa', emoji: '💊' },
      { id: 'night', label: 'Tối', emoji: '🌙' },
    ],
  };
  const slots = SLOT_ROWS[kind];
  const reportedMain = slots
    ? slots.filter((s) => logs.some((l) => l.mealSlot === s.id && l.status !== 'rejected')).length
    : 0;
  const litPercent = slots ? Math.round((reportedMain / slots.length) * 100) : percent;
  // Avatar bạn tác động khi được cộng, avatar partner tác động khi bị từ chối.
  const { pour, approve, spill } = useHabitEvents(logs);
  const Icon = cfg.icon;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="relative min-w-0 rounded-2xl bg-white p-4 shadow-sm">
          <HabitObjectAvatars pour={pour} approve={approve} spill={spill} />
          <div className="flex h-56 items-center justify-center">
            <HabitAvatar3D
              imageUrl={setting?.imageUrl}
              cutoutUrl={setting?.cutoutUrl}
              hit={done >= target && target > 0}
              percent={litPercent}
              signal={pour + done}
              spill={spill}
              kind={kind}
              fallback={Icon}
              plain
              className={setting?.imageUrl ? 'size-full' : 'size-28'}
            />
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            <div className="flex items-baseline gap-0.5">
              <span className="bg-gradient-to-br from-water-600 to-[#8e2f3c] bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                {percent}
              </span>
              <span className="bg-gradient-to-br from-water-500 to-water-700 bg-clip-text text-xl font-bold text-transparent">%</span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              <span className="text-sm font-semibold text-slate-800">{done}</span>
              <span className="text-slate-300"> / </span>
              {target} {cfg.unit}
            </p>
            <div className="h-1.5 w-full max-w-[230px] overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-water-600 to-[#c98883]" style={{ width: `${percent}%` }} />
            </div>
            {/* Bữa ăn / thuốc: 3 mục chính, mỗi mục duyệt xong là cộng 1 phần ba (= 33%). */}
            {slots && (
              <div className="mt-1 flex items-center gap-1.5">
                {slots.map((slot) => {
                  const approved = logs.some((l) => l.mealSlot === slot.id && l.status === 'approved');
                  const waiting = logs.some((l) => l.mealSlot === slot.id && l.status === 'pending');
                  const rejected = logs.some((l) => l.mealSlot === slot.id && l.status === 'rejected');
                  return (
                    <span
                      key={slot.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                        approved
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : waiting
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : rejected
                              ? 'bg-rose-50 text-rose-600 ring-rose-200'
                              : 'bg-slate-50 text-slate-400 ring-slate-200'
                      }`}
                    >
                      <span>{slot.emoji}</span> {slot.label}
                      {approved ? ' ✓' : waiting ? ' …' : rejected ? ' ✕' : ''}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
              {done >= target && target > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 className="size-3.5" /> Đủ mục tiêu hôm nay
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  Còn {Math.max(0, target - done)} {cfg.unit}
                </span>
              )}
              {pending > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {pending} {cfg.unit} chờ duyệt
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
              <Plus className="size-5" /> Ghi {cfg.unit === 'bữa' ? 'bữa ăn' : cfg.unit === 'lần' ? 'lần uống' : 'phiên học'}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Chụp ảnh minh chứng → ghi chú → lưu lần ghi</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Mục tiêu mỗi ngày</h2>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                <span className="block text-sm font-semibold tabular-nums text-slate-800">
                  {target} {cfg.unit}
                </span>
                <span className="block">Đã ghi hôm nay: {done}</span>
              </p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-water-300"
              >
                <Settings className="size-3.5" /> Sửa
              </button>
            </div>
            {(setting?.times?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {setting.times.map((t) => (
                  <span key={t} className="rounded-full bg-water-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-water-700">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {setting?.note && <p className="mt-2 text-[11px] text-slate-500">{setting.note}</p>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Hôm nay đã ghi</h2>

        {isLoading && <DearlyLoader size="sm" />}
        {!isLoading && logs.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có lần nào. Bấm nút phía trên để ghi.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {logs.map((l) => {
            const st = STATUS[l.status] ?? STATUS.approved;
            return (
              <div key={l.id} className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                <PhotoThumb url={l.photoUrl} note={l.note} full />
                <p className="text-sm font-semibold text-slate-800">{l.time}</p>
                <p className="truncate text-[11px] text-slate-500">{l.note || cfg.label}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${st.className}`}>{st.label}</span>
                  <button
                    onClick={() => remove.mutate(l.id)}
                    className="rounded p-1 text-slate-300 hover:text-rose-600"
                    aria-label="Xoá lần ghi"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {logs.some((l) => l.photoUrl) && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <ImageIcon className="size-3" /> Ảnh có partner duyệt sẽ được tính vào mục tiêu.
          </p>
        )}
      </section>

      {logOpen && <HabitLogModal kind={kind} onClose={() => setLogOpen(false)} />}
      {settingsOpen && <HabitSettingsModal kind={kind} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default HabitTodayPanel;
