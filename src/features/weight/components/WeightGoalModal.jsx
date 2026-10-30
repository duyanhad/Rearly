import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Target, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';

/** Popup đặt mục tiêu cân nặng (kg) — lưu vào HabitSetting.targetValue (gam). */
export function WeightGoalModal({ onClose, targetKg = 60 }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(targetKg.toFixed(1));
  const [error, setError] = useState(null);

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const row = habits.find((h) => h.kind === 'weight');

  const save = useMutation({
    mutationFn: () =>
      habitService.save('weight', {
        enabled: row?.enabled ?? true,
        times: row?.times ?? ['07:00'],
        targetValue: Math.round(Number(value) * 1000),
        remindBeforeMin: row?.remindBeforeMin ?? 10,
        note: row?.note ?? '',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['habit-day', 'weight'] });
      onClose?.();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const kgValue = Number(String(value).replace(',', '.'));
  const valid = String(value).trim() !== '' && Number.isFinite(kgValue) && kgValue >= 20 && kgValue <= 300;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <Target className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Mục tiêu cân nặng</h2>
            <p className="text-[11px] text-slate-500">Cân nặng bạn muốn hướng tới</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mục tiêu (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-lg font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Huỷ
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !valid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu mục tiêu
          </button>
        </div>
      </div>
    </div>
  );
}

export default WeightGoalModal;
