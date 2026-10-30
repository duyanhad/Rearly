import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Minus, Plus, Save, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';
import { HABIT_KINDS } from '../config';
import { HabitImageCard } from './HabitImageCard';

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Popup mục tiêu nhanh cho thuốc / bữa ăn / học: số lần mỗi ngày + giờ nhắc + ghi chú. */
export function HabitSettingsModal({ kind, onClose }) {
  const cfg = HABIT_KINDS[kind];
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  const { data: habits } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const row = habits?.find((h) => h.kind === kind);

  useEffect(() => {
    if (!row || form) return;
    setForm({
      enabled: row.enabled,
      targetValue: row.targetValue || 0,
      remindBeforeMin: row.remindBeforeMin ?? 10,
      note: row.note ?? '',
      times: row.times ?? [],
    });
  }, [row, form]);

  const save = useMutation({
    mutationFn: () =>
      habitService.save(kind, {
        enabled: form.enabled,
        times: form.times,
        targetValue: Number(form.targetValue) || 0,
        remindBeforeMin: Number(form.remindBeforeMin) || 0,
        note: form.note,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['habit-day', kind] });
      onClose?.();
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

  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Mục tiêu {cfg.label.toLowerCase()}</h2>
            <p className="text-[11px] text-slate-500">Số {cfg.unit} mỗi ngày và giờ nhắc</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        {/* Ảnh vật thể: cùng khối với trang Cài đặt (tách nền + tiến trình) */}
        <div className="mb-3">
          <HabitImageCard kind={kind} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2">
          <button
            onClick={() => setForm({ ...form, targetValue: clamp(form.targetValue - 1, 0, 12) })}
            className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
            aria-label="Giảm"
          >
            <Minus className="size-4" />
          </button>
          <div className="text-center">
            <p className="text-xl font-extrabold tabular-nums text-slate-900">{form.targetValue}</p>
            <p className="text-[10px] text-slate-500">{cfg.unit} / ngày</p>
          </div>
          <button
            onClick={() => setForm({ ...form, targetValue: clamp(form.targetValue + 1, 0, 12) })}
            className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
            aria-label="Tăng"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-sm font-medium text-slate-700">Bật nhắc nhở</span>
          <button
            type="button"
            role="switch"
            aria-checked={form.enabled}
            aria-label="Bật nhắc nhở"
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.enabled ? 'bg-water-600' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                form.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <label className="mt-2 flex items-center justify-between rounded-xl bg-water-50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-water-700">
            <Clock className="size-3.5" /> Nhắc trước
          </span>
          <select
            value={form.remindBeforeMin}
            onChange={(e) => setForm({ ...form, remindBeforeMin: Number(e.target.value) })}
            className="rounded-lg border border-water-200 bg-white px-2 py-1.5 text-sm font-semibold text-water-700"
          >
            {REMIND_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Đúng giờ' : `${m} phút`}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ghi chú</span>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder={cfg.notePlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800"
          />
        </label>

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>}

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

export default HabitSettingsModal;
