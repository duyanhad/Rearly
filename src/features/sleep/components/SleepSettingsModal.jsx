import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Flame, Loader2, Lock, Minus, Moon, Plus, Save, Target, X, Zap } from 'lucide-react';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';
import { isNativeApp, scheduleSleepAlarms } from '../../../utils/nativeReminders';

const GOAL_PRESETS = [420, 450, 480, 510];
const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];
const SNOOZE_OPTIONS = [0, 5, 10, 15, 20];
const STEP = 30;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const toHours = (m) => `${Math.floor((m || 0) / 60)}h${String((m || 0) % 60).padStart(2, '0')}`;

const MODES = [
  { key: 'gentle', label: 'Nhẹ', icon: Moon },
  { key: 'insist', label: 'Dai', icon: AlarmClock },
  { key: 'crazy', label: 'Điên', icon: Flame },
];

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-water-600' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

/** Popup mục tiêu & báo thức giấc ngủ — sửa nhanh ngay tại trang Hôm nay. */
export function SleepSettingsModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState('');

  const { data: habits } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const row = habits?.find((h) => h.kind === 'sleep');

  useEffect(() => {
    if (!row || form) return;
    const times = row.times ?? [];
    setForm({
      enabled: row.enabled,
      alarmEnabled: row.alarmEnabled ?? true,
      snoozeMinutes: row.snoozeMinutes ?? 10,
      remindBeforeMin: row.remindBeforeMin ?? 30,
      targetValue: row.targetValue || 480,
      bed: times[0] ?? '23:00',
      wake: times[1] ?? '07:00',
      alarmMode: row.alarmMode ?? 'gentle',
      perRound: row.alarmRepeatPerRound ?? 3,
      rounds: row.alarmRounds ?? 3,
      intervalMin: row.alarmIntervalMin ?? 1,
      lock: Boolean(row.lockUntilSettings),
    });
  }, [row, form]);

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      await habitService.uploadImage('sleep', form);
      await qc.invalidateQueries({ queryKey: ['habits'] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    setError(null);
    try {
      await habitService.removeImage('sleep');
      await qc.invalidateQueries({ queryKey: ['habits'] });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const save = useMutation({
    mutationFn: () =>
      habitService.save('sleep', {
        enabled: form.enabled,
        times: [form.bed, form.wake],
        targetValue: Number(form.targetValue) || 0,
        remindBeforeMin: Number(form.remindBeforeMin) || 0,
        alarmEnabled: form.alarmEnabled,
        snoozeMinutes: Number(form.snoozeMinutes) || 0,
        alarmMode: form.alarmMode,
        alarmRepeatPerRound: Number(form.perRound) || 1,
        alarmRounds: Number(form.rounds) || 1,
        alarmIntervalMin: Number(form.intervalMin) || 1,
        lockUntilSettings: form.alarmMode === 'gentle' ? false : Boolean(form.lock),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['sleep'] });
      if (isNativeApp()) {
        await scheduleSleepAlarms({
          alarmEnabled: form.alarmEnabled,
          wakeTime: form.wake,
          bedtime: form.bed,
          remindBeforeMin: Number(form.remindBeforeMin) || 0,
          snoozeMinutes: Number(form.snoozeMinutes) || 0,
          rounds: Number(form.rounds) || 1,
          perRound: Number(form.perRound) || 1,
          intervalMin: Number(form.intervalMin) || 1,
        });
      }
      setSaved('Đã lưu cài đặt giấc ngủ.');
      setTimeout(() => onClose?.(), 600);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!form) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-5 py-4 text-sm text-slate-500">Đang tải…</div>
      </div>
    );
  }

  const loud = form.alarmMode !== 'gentle';
  const totalCalls = (Number(form.perRound) || 1) * (Number(form.rounds) || 1);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <Target className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Mục tiêu &amp; báo thức</h2>
            <p className="text-[11px] text-slate-500">Chỉnh nhanh cho giấc ngủ đêm nay</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        {/* Mục tiêu */}
        {/* Ảnh vật thể: giống "Cốc nước của bạn" */}
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
            {row?.cutoutUrl || row?.imageUrl ? (
              <img src={mediaUrl(row.cutoutUrl || row.imageUrl)} alt="Ảnh của bạn" className="size-full object-cover" />
            ) : (
              <Moon className="size-5 text-slate-300" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-700">
              {row?.imageUrl ? 'Đang dùng ảnh của bạn' : 'Ảnh của bạn (tuỳ chọn)'}
            </p>
            <p className="text-[10px] text-slate-500">Đủ chỉ tiêu sẽ mở ảnh gốc</p>
          </div>
          <label className="cursor-pointer rounded-lg bg-water-600 px-2 py-1.5 text-[11px] font-semibold text-white">
            {uploading ? 'Đang tải…' : row?.imageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => uploadImage(e.target.files?.[0])}
            />
          </label>
          {row?.imageUrl && (
            <button onClick={removeImage} className="rounded-lg bg-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
              Xoá
            </button>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-2">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setForm({ ...form, targetValue: clamp(form.targetValue - STEP, 0, 1440) })}
              className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
              aria-label="Giảm 30 phút"
            >
              <Minus className="size-4" />
            </button>
            <div className="text-center">
              <p className="text-xl font-extrabold tabular-nums text-slate-900">{toHours(form.targetValue)}</p>
              <p className="text-[10px] text-slate-500">mục tiêu mỗi đêm</p>
            </div>
            <button
              onClick={() => setForm({ ...form, targetValue: clamp(form.targetValue + STEP, 0, 1440) })}
              className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
              aria-label="Tăng 30 phút"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {GOAL_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setForm({ ...form, targetValue: m })}
                className={`flex-1 rounded-lg py-1 text-[11px] font-bold ${
                  Number(form.targetValue) === m ? 'bg-water-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                {toHours(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Báo thức */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-sm font-medium text-slate-700">Báo thức thức dậy</span>
          <Switch checked={form.alarmEnabled} onChange={(v) => setForm({ ...form, alarmEnabled: v })} label="Báo thức" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Đi ngủ</span>
            <input
              type="time"
              value={form.bed}
              onChange={(e) => setForm({ ...form, bed: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-800"
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Thức dậy</span>
            <input
              type="time"
              value={form.wake}
              onChange={(e) => setForm({ ...form, wake: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-800"
            />
          </label>
        </div>

        {/* Chế độ */}
        <div className="mt-3 flex gap-1.5">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setForm({ ...form, alarmMode: key, lock: key === 'crazy' ? form.lock : false })}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-1.5 text-[11px] font-bold ${
                form.alarmMode === key
                  ? 'border-water-400 bg-water-50 text-water-800'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loud && (
          <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'perRound', label: 'Lần/vòng', min: 1, max: 10 },
                { key: 'rounds', label: 'Số vòng', min: 1, max: 10 },
                { key: 'intervalMin', label: 'Cách (p)', min: 1, max: 30 },
              ].map(({ key, label, min, max }) => (
                <div key={key} className="rounded-lg bg-white p-1.5 ring-1 ring-slate-200">
                  <p className="text-center text-[10px] font-semibold text-slate-500">{label}</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <button
                      onClick={() => setForm({ ...form, [key]: clamp(Number(form[key]) - 1, min, max) })}
                      className="rounded p-0.5 text-slate-400"
                      aria-label={`Giảm ${label}`}
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-sm font-bold tabular-nums text-slate-800">{form[key]}</span>
                    <button
                      onClick={() => setForm({ ...form, [key]: clamp(Number(form[key]) + 1, min, max) })}
                      className="rounded p-0.5 text-slate-400"
                      aria-label={`Tăng ${label}`}
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="flex items-center gap-1 text-[10px] text-slate-500">
              <Zap className="size-3" /> {totalCalls} lần ({form.perRound}×{form.rounds}), cách {form.intervalMin} phút
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
              <Lock className={`size-3.5 shrink-0 ${form.lock ? 'text-water-700' : 'text-slate-400'}`} />
              <span className="min-w-0 flex-1 text-[11px] font-semibold text-slate-700">Chống tắt (đủ vòng mới tắt)</span>
              <Switch checked={form.lock} onChange={(v) => setForm({ ...form, lock: v })} label="Chống tắt" />
            </div>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Nhắc trước khi ngủ
            </span>
            <select
              value={form.remindBeforeMin}
              onChange={(e) => setForm({ ...form, remindBeforeMin: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2 text-xs font-semibold text-slate-800"
            >
              {REMIND_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'Đúng giờ' : `${m} phút`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Snooze</span>
            <select
              value={form.snoozeMinutes}
              onChange={(e) => setForm({ ...form, snoozeMinutes: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2 text-xs font-semibold text-slate-800"
            >
              {SNOOZE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'Tắt' : `${m} phút`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>}
        {saved && <p className="mt-2 text-xs font-medium text-emerald-600">{saved}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Đóng
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

export default SleepSettingsModal;
