import { useEffect, useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, BookOpen, Clock, Flame, Moon, Pill, Plus, Soup, Target, Trash2 } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';
import { SettingsTabs } from '../components/SettingsTabs';
import { FeatureEnableCard } from '../components/FeatureEnableCard';
import { HabitImageCard } from '../../habits/components/HabitImageCard';

/** Cấu hình hiển thị cho từng nhu cầu — thêm nhu cầu mới chỉ cần thêm một mục ở đây. */
const KINDS = {
  medicine: {
    label: 'Uống thuốc',
    icon: Pill,
    intro: 'Nhắc bạn uống thuốc đúng giờ mỗi ngày.',
    timesLabel: 'Các lần uống',
    timeHint: 'Thêm giờ uống',
    targetLabel: 'Số lần mỗi ngày',
    unit: 'lần',
    max: 12,
    notePlaceholder: 'Ví dụ: thuốc huyết áp, uống sau ăn',
  },
  study: {
    label: 'Học tập',
    icon: BookOpen,
    intro: 'Đặt mục tiêu số phiên học mỗi ngày và giờ nhắc.',
    timesLabel: 'Giờ học',
    timeHint: 'Thêm giờ học',
    targetLabel: 'Số phiên mỗi ngày',
    unit: 'phiên',
    max: 12,
    notePlaceholder: 'Ví dụ: tiếng Anh 30 phút, đọc 20 trang',
  },
  meal: {
    label: 'Bữa ăn',
    icon: Soup,
    intro: 'Nhắc các bữa trong ngày để không bỏ bữa.',
    timesLabel: 'Giờ các bữa',
    timeHint: 'Thêm giờ bữa',
    targetLabel: 'Số bữa mỗi ngày',
    unit: 'bữa',
    max: 6,
    notePlaceholder: 'Ví dụ: ăn nhẹ buổi chiều, hạn chế đồ ngọt',
  },
};

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];

// Giống trang giấc ngủ: 3 kiểu báo thức cho thuốc / bữa ăn / học tập.
const ALARM_MODES = [
  { key: 'gentle', label: 'Nhẹ nhàng', icon: Moon, desc: 'Kêu 1 lần' },
  { key: 'insist', label: 'Nhắc dai', icon: BellRing, desc: 'Lặp vài lần' },
  { key: 'crazy', label: 'Điên cuồng', icon: Flame, desc: 'Nhiều vòng' },
];

function SectionHeader({ icon: Icon, title, hint }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function HabitSettingsPage({ kind }) {
  const cfg = KINDS[kind];
  const qc = useQueryClient();
  const [form, setForm] = useState({ enabled: true, times: [], targetValue: 0, remindBeforeMin: 10, note: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [newTime, setNewTime] = useState('08:00');

  const { data, isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitService.list()).data,
  });

  const row = data?.find((h) => h.kind === kind);

  // Nạp giá trị từ server khi có dữ liệu (mỗi lần đổi nhu cầu là một state mới).
  useEffect(() => {
    if (!row) return;
    setForm({
      enabled: row.enabled,
      times: row.times ?? [],
      targetValue: row.targetValue,
      remindBeforeMin: row.remindBeforeMin,
      note: row.note ?? '',
      alarmEnabled: row.alarmEnabled ?? false,
      alarmMode: row.alarmMode ?? 'gentle',
    });
  }, [row]);

  const save = useMutation({
    mutationFn: () => habitService.save(kind, { ...form }),
    onSuccess: async () => {
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await qc.invalidateQueries({ queryKey: ['habits'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <div>
      <SettingsTabs active={kind} />
      <FeatureEnableCard kind={kind} label={{ medicine: 'thuốc', meal: 'bữa ăn', study: 'học tập' }[kind] ?? cfg.label} />

      {isLoading ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><DearlyLoader /></div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <section className="order-3 min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:col-span-2">
            <SectionHeader icon={Clock} title={cfg.timesLabel} />

            <div className="space-y-2">
              {form.times.map((t, i) => (
                <div key={`${t}-${i}`} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, times: f.times.map((x, j) => (j === i ? e.target.value : x)) }))
                    }
                    className="w-32 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-semibold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
                  />
                  <button
                    onClick={() => setForm((f) => ({ ...f, times: f.times.filter((_, j) => j !== i) }))}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Xoá mốc ${t}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {form.times.length === 0 && <p className="text-xs text-slate-500">Chưa có mốc giờ nào.</p>}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-32 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm tabular-nums text-slate-700 focus:border-water-400 focus:bg-white focus:outline-none"
              />
              <button
                onClick={() =>
                  setForm((f) =>
                    f.times.includes(newTime)
                      ? f
                      : { ...f, times: [...f.times, newTime].sort((a, b) => a.localeCompare(b)) },
                  )
                }
                className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Plus className="size-3.5" /> {cfg.timeHint}
              </button>
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-water-50 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-water-700">
                <BellRing className="size-3.5" /> Nhắc trước
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
          </section>

          <section className="order-1 min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <SectionHeader icon={Target} title={cfg.targetLabel} />

            <div className="flex items-end gap-2">
              <input
                type="number"
                min={0}
                max={cfg.max}
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })}
                className="w-28 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-right text-lg font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
              />
              <span className="pb-2 text-sm font-medium text-slate-500">{cfg.unit}</span>
            </div>
            {kind === 'sleep' && (
              <p className="mt-2 text-xs text-slate-500">
                {Math.round((form.targetValue || 0) / 60)} giờ {form.targetValue % 60 ? `${form.targetValue % 60} phút` : ''} mỗi đêm
              </p>
            )}

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Ghi chú</span>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={cfg.notePlaceholder}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {saved && <p className="mt-3 text-sm text-emerald-600">Đã lưu cài đặt.</p>}

            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="mt-4 w-full rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
            >
              {save.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </section>

          <div className="order-2 min-w-0">
            <HabitImageCard kind={kind} />
          </div>

          <section className="order-4 min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:col-span-2">
            <SectionHeader icon={Icon} title={cfg.label} />
            <button
              type="button"
              role="switch"
              aria-checked={form.alarmEnabled}
              onClick={() => setForm({ ...form, alarmEnabled: !form.alarmEnabled })}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-water-300"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">Bật nhắc nhở</span>
                <span className={`block text-xs ${form.alarmEnabled ? 'text-water-700' : 'text-slate-500'}`}>
                  {form.alarmEnabled ? 'Đang bật · app sẽ nhắc đúng các mốc giờ' : 'Đang tắt · app không nhắc gì'}
                </span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  form.alarmEnabled ? 'bg-water-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                    form.alarmEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            {form.alarmEnabled && (
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">Kiểu báo thức khi đến giờ</p>
              <p className="text-xs text-slate-500">
                Mở app tới mốc giờ sẽ hiện màn hình báo thức kêu theo kiểu đã chọn.
              </p>
              {true && (
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {ALARM_MODES.map((m) => {
                    const active = form.alarmMode === m.key;
                    const ModeIcon = m.icon;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, alarmMode: m.key }))}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition ${
                          active ? 'border-water-500 bg-water-50 ring-1 ring-water-200' : 'border-slate-200 hover:border-water-300'
                        }`}
                      >
                        <ModeIcon className="size-4 text-water-700" />
                        <span className="text-[11px] font-semibold text-slate-700">{m.label}</span>
                        <span className="text-[9px] text-slate-400">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default HabitSettingsPage;
