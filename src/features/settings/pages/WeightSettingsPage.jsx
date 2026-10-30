import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';
import { habitLogService } from '../../../services/habitLogService';
import { SettingsTabs } from '../components/SettingsTabs';
import { HabitImageCard } from '../../habits/components/HabitImageCard';

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
        <Icon className="size-4" />
      </span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

/** Cài đặt cân nặng: mục tiêu kg + giờ nhắc + ảnh bàn cân (tách nền như các nhu cầu khác). */
export function WeightSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ enabled: true, targetValue: 60000, remindBeforeMin: 10, times: ['07:00'], direction: 'down' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [currentKg, setCurrentKg] = useState('');
  const [targetKgInput, setTargetKgInput] = useState('60.0');
  // Hướng mục tiêu do người dùng chọn trước, rồi mới tính lộ trình theo hướng đó.
  const [goalDir, setGoalDir] = useState('down');
  const [logSaved] = useState(false);

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitService.list()).data,
  });
  const row = habits.find((h) => h.kind === 'weight');

  const { data: history = [] } = useQuery({
    queryKey: ['habit-history', 'weight'],
    queryFn: async () => (await habitLogService.history('weight', 5)).data,
  });
  const latest = history.find((h) => h.status !== 'rejected' && h.value) ?? null;

  useEffect(() => {
    if (latest) setCurrentKg((latest.value / 1000).toFixed(1));
  }, [latest]);

  const nowHhmm = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const addWeight = useMutation({
    mutationFn: async () => {
      const kgNum = Number(String(currentKg).replace(',', '.'));
      const formData = new FormData();
      formData.append('time', nowHhmm());
      formData.append('value', String(Math.round(kgNum * 1000)));
      return habitLogService.add('weight', formData);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habit-day', 'weight'] });
      await qc.invalidateQueries({ queryKey: ['habit-history', 'weight'] });
      setLogSaved(true);
      setTimeout(() => setLogSaved(false), 2000);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const currentNumber = Number(String(currentKg).replace(',', '.'));
  const currentNumberValid =
    String(currentKg).trim() !== '' && Number.isFinite(currentNumber) && currentNumber >= 20 && currentNumber <= 300;
  const targetNumber = Number(String(targetKgInput).replace(',', '.'));
  const targetNumberValid =
    String(targetKgInput).trim() !== '' && Number.isFinite(targetNumber) && targetNumber >= 20 && targetNumber <= 300;
  // Hướng lấy theo lựa chọn "Giảm cân / Tăng cân" ở trên (không tự suy từ 2 con số).
  const directionLabel = goalDir;
  // Chọn hướng mà mục tiêu lại đi ngược (giảm nhưng cao hơn hiện tại…) thì cảnh báo.
  const dirConflict =
    currentNumberValid &&
    targetNumberValid &&
    ((goalDir === 'down' && targetNumber >= currentNumber) || (goalDir === 'up' && targetNumber <= currentNumber));

  useEffect(() => {
    if (!row) return;
    setForm({
      enabled: row.enabled,
      targetValue: row.targetValue || 60000,
      remindBeforeMin: row.remindBeforeMin ?? 10,
      times: row.times ?? ['07:00'],
      direction: row.direction ?? 'down',
    });
    setTargetKgInput(((row.targetValue || 60000) / 1000).toFixed(1));
    setGoalDir(row.direction ?? 'down');
  }, [row]);

  const save = useMutation({
    mutationFn: async () => {
      // Ghi cân hiện tại thành một lần cân hôm nay (nếu có nhập).
      if (currentNumberValid) {
        const formData = new FormData();
        formData.append('time', nowHhmm());
        formData.append('value', String(Math.round(currentNumber * 1000)));
        await habitLogService.add('weight', formData);
      }
      return habitService.save('weight', {
        enabled: form.enabled,
        times: form.times,
        targetValue: Math.round(targetNumber * 1000),
        remindBeforeMin: form.remindBeforeMin,
        note: '',
        direction: directionLabel,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['habit-day', 'weight'] });
      await qc.invalidateQueries({ queryKey: ['habit-history', 'weight'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(errorMessage(err)),
  });


  return (
    <div>
      <SettingsTabs active="weight" />

      {isLoading ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-100">Đang tải…</p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <SectionHeader icon={Target} title="Mục tiêu cân nặng" />

            {/* Chọn hướng trước: giảm hay tăng cân */}
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {[
                { key: 'down', label: 'Giảm cân', icon: TrendingDown },
                { key: 'up', label: 'Tăng cân', icon: TrendingUp },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoalDir(key)}
                  aria-pressed={goalDir === key}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                    goalDir === key ? 'bg-white text-water-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {/* Thiết lập kiểu "từ X kg xuống/đến Y kg" */}
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">Từ (kg hiện tại)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={currentKg}
                  onChange={(e) => setCurrentKg(e.target.value)}
                  placeholder="70.0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center text-lg font-bold tabular-nums text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-water-400 focus:bg-white focus:outline-none"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-slate-500">{goalDir === 'up' ? 'Tăng đến (kg)' : 'Giảm xuống (kg)'}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={targetKgInput}
                  onChange={(e) => setTargetKgInput(e.target.value)}
                  placeholder="60.0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center text-lg font-bold tabular-nums text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-water-400 focus:bg-white focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-water-50 px-3 py-2 text-sm font-semibold text-water-700">
              {directionLabel === 'up' ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {currentNumberValid && targetNumberValid && !dirConflict
                ? `${goalDir === 'up' ? 'Tăng' : 'Giảm'} từ ${currentNumber.toFixed(1)} kg ${goalDir === 'up' ? 'lên' : 'xuống'} ${targetNumber.toFixed(1)} kg (${Math.abs(currentNumber - targetNumber).toFixed(1)} kg)`
                : 'Nhập cân hiện tại và mục tiêu để xem lộ trình'}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Mục tiêu (sai lệch ≤ 0,2 kg) thì ảnh sáng hoàn toàn. Đi ngược hướng sẽ hiện báo động “nặng thêm” / “nhẹ đi”.
            </p>

            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              <p>
                {latest
                  ? `Lần cân gần nhất: ${(latest.value / 1000).toFixed(1)} kg · ${latest.date} ${latest.time}`
                  : 'Chưa có lần cân nào — nhập “Từ” rồi bấm lưu.'}
              </p>
              <p className="mt-0.5">
                {row?.startValue
                  ? `Mốc ban đầu (cố định): ${(row.startValue / 1000).toFixed(1)} kg · ${row.startDate ?? ''}`
                  : 'Mốc ban đầu sẽ chốt ở lần cân đầu tiên và không đổi.'}
              </p>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {(saved || logSaved) && <p className="mt-3 text-sm text-emerald-600">Đã lưu mục tiêu và cân hôm nay.</p>}
            {(!currentNumberValid && String(currentKg).trim() !== '') || (!targetNumberValid && String(targetKgInput).trim() !== '') ? (
              <p className="mt-2 text-xs text-amber-700">Cân nặng phải trong khoảng 20–300 kg.</p>
            ) : null}
            {dirConflict && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                Đang chọn <b>{goalDir === 'down' ? 'Giảm cân' : 'Tăng cân'}</b> nhưng mục tiêu{' '}
                {goalDir === 'down' ? 'không thấp hơn' : 'không cao hơn'} cân hiện tại — sửa lại số hoặc đổi hướng.
              </p>
            )}

            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || addWeight.isPending || !targetNumberValid || dirConflict}
              className="mt-4 w-full rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
            >
              {save.isPending || addWeight.isPending ? 'Đang lưu...' : 'Lưu mục tiêu'}
            </button>
          </section>

          <HabitImageCard kind="weight" />

          <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:col-span-2">
            <SectionHeader icon={BellRing} title="Nhắc cân nặng" />
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled}
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-water-300"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">Bật nhắc cân nặng</span>
                <span className={`block text-xs ${form.enabled ? 'text-water-700' : 'text-slate-500'}`}>
                  {form.enabled ? `Đang bật · nhắc lúc ${form.times?.[0] ?? '07:00'}` : 'Đang tắt · app không nhắc'}
                </span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.enabled ? 'bg-water-600' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                    form.enabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-600">Giờ nhắc</span>
                <input
                  type="time"
                  value={form.times?.[0] ?? '07:00'}
                  onChange={(e) => setForm({ ...form, times: [e.target.value] })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold tabular-nums text-slate-800"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-600">Nhắc trước</span>
                <select
                  value={form.remindBeforeMin}
                  onChange={(e) => setForm({ ...form, remindBeforeMin: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {REMIND_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m === 0 ? 'Đúng giờ' : `${m} phút`}
                    </option>
                  ))}
                </select>
              </label>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Scale className="size-3" /> Bấm Lưu cài đặt sau khi đổi
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default WeightSettingsPage;
