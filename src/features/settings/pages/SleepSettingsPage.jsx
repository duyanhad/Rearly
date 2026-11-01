import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlarmClock,
  BedDouble,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flame,
  Loader2,
  Lock,
  Minus,
  Moon,
  Plus,
  Save,
  Target,
  Zap,
} from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';
import { sleepService } from '../../../services/sleepService';
import { isNativeApp, scheduleSleepAlarms } from '../../../utils/nativeReminders';
import { askNotificationPermission, showSystemNotification } from '../../../utils/notify';
import { SettingsTabs } from '../components/SettingsTabs';
import { HabitImageCard } from '../../habits/components/HabitImageCard';
import { stopSleepAlarmToday } from '../sleepAlarmStorage';

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];
const SNOOZE_OPTIONS = [0, 5, 10, 15, 20];
const GOAL_PRESETS = [420, 450, 480, 510];
const STEP = 30;

const ALARM_MODES = [
  { key: 'gentle', label: 'Nhẹ nhàng', icon: Moon, desc: 'Kêu 1 lần' },
  { key: 'insist', label: 'Nhắc dai', icon: BellRing, desc: 'Lặp vài lần' },
  { key: 'crazy', label: 'Điên cuồng', icon: Flame, desc: 'Nhiều vòng' },
];

const toHours = (minutes) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Công tắc gọn thay cho checkbox mặc định. */
function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-water-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, hint, children, action, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <div className="mb-3.5 flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function SleepSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    enabled: true,
    alarmEnabled: true,
    snoozeMinutes: 10,
    remindBeforeMin: 30,
    targetValue: 480,
    note: '',
    bed: '23:00',
    wake: '07:00',
    alarmMode: 'gentle',
    perRound: 3,
    rounds: 3,
    intervalMin: 1,
    lock: false,
  });
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ bed: '23:00', wake: '07:00' });
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState(null);
  const [alarmInfo, setAlarmInfo] = useState('');
  const alarmTimer = useRef(null);

  const { data: habits } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const { data: summary } = useQuery({ queryKey: ['sleep'], queryFn: async () => (await sleepService.summary()).data });

  const row = habits?.find((h) => h.kind === 'sleep');

  useEffect(() => {
    if (!row) return;
    const times = row.times ?? [];
    setForm({
      enabled: row.enabled,
      alarmEnabled: row.alarmEnabled ?? true,
      snoozeMinutes: row.snoozeMinutes ?? 10,
      remindBeforeMin: row.remindBeforeMin ?? 30,
      targetValue: row.targetValue || 480,
      note: row.note ?? '',
      bed: times[0] ?? '23:00',
      wake: times[1] ?? '07:00',
      alarmMode: row.alarmMode ?? 'gentle',
      perRound: row.alarmRepeatPerRound ?? 3,
      rounds: row.alarmRounds ?? 3,
      intervalMin: row.alarmIntervalMin ?? 1,
      lock: Boolean(row.lockUntilSettings),
    });
  }, [row]);

  useEffect(() => {
    const last = summary?.logs?.at(-1);
    setLogForm({ bed: last?.bedTime ?? '23:00', wake: last?.wakeTime ?? '07:00' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary?.logs?.length]);

  const save = useMutation({
    mutationFn: () =>
      habitService.save('sleep', {
        enabled: form.enabled,
        times: [form.bed, form.wake],
        targetValue: Number(form.targetValue) || 0,
        remindBeforeMin: Number(form.remindBeforeMin) || 0,
        note: form.note,
        alarmEnabled: form.alarmEnabled,
        snoozeMinutes: Number(form.snoozeMinutes) || 0,
        alarmMode: form.alarmMode,
        alarmRepeatPerRound: Number(form.perRound) || 1,
        alarmRounds: Number(form.rounds) || 1,
        alarmIntervalMin: Number(form.intervalMin) || 1,
        lockUntilSettings: form.alarmMode === 'gentle' ? false : Boolean(form.lock),
      }),
    onSuccess: async () => {
      setError(null);
      setSavedAt('Đã lưu cài đặt giấc ngủ.');
      setTimeout(() => setSavedAt(''), 2400);
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['sleep'] });

      if (isNativeApp()) {
        const ok = await scheduleSleepAlarms({
          alarmEnabled: form.alarmEnabled,
          wakeTime: form.wake,
          bedtime: form.bed,
          remindBeforeMin: Number(form.remindBeforeMin) || 0,
          snoozeMinutes: Number(form.snoozeMinutes) || 0,
          rounds: Number(form.rounds) || 1,
          perRound: Number(form.perRound) || 1,
          intervalMin: Number(form.intervalMin) || 1,
        });
        setAlarmInfo(ok ? 'Đã đặt báo thức trên máy.' : 'Chưa được cấp quyền thông báo nên báo thức chưa đặt được.');
      }
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const addLog = useMutation({
    mutationFn: () => sleepService.save({ bedTime: logForm.bed, wakeTime: logForm.wake }),
    onSuccess: async (res) => {
      setError(null);
      setSavedAt('Đã lưu giấc ngủ đêm qua.');
      setTimeout(() => setSavedAt(''), 2400);
      const last = res.data.logs?.at(-1);
      if (last) setLogForm({ bed: last.bedTime, wake: last.wakeTime });
      await qc.invalidateQueries({ queryKey: ['sleep'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  // Bản web: hẹn giờ báo thức khi tab còn mở (màn hình báo thức do SleepAlarmOverlay lo).
  useEffect(() => {
    clearTimeout(alarmTimer.current);
    if (!form.alarmEnabled || isNativeApp()) return;
    const [h, m] = form.wake.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    if (ms > 12 * 3600 * 1000) return;
    alarmTimer.current = setTimeout(async () => {
      const ok = await askNotificationPermission();
      if (ok) showSystemNotification('⏰ Báo thức Dearly', 'Dậy thôi! Ghi lại giấc ngủ đêm qua nhé.');
    }, ms);
    return () => clearTimeout(alarmTimer.current);
  }, [form.alarmEnabled, form.wake]);

  const goal = Number(form.targetValue) || 480;
  const planMinutes = (() => {
    const [bh, bm] = form.bed.split(':').map(Number);
    const [wh, wm] = form.wake.split(':').map(Number);
    let diff = wh * 60 + wm - (bh * 60 + bm);
    if (diff <= 0) diff += 1440;
    return diff;
  })();
  const planHit = planMinutes >= goal;
  const logMinutes = (() => {
    const [bh, bm] = logForm.bed.split(':').map(Number);
    const [wh, wm] = logForm.wake.split(':').map(Number);
    let diff = wh * 60 + wm - (bh * 60 + bm);
    if (diff <= 0) diff += 1440;
    return diff;
  })();
  const totalCalls = (Number(form.perRound) || 1) * (Number(form.rounds) || 1);
  const loudMode = form.alarmMode !== 'gentle';

  const timeInput =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none';

  return (
    <div className="pb-4">
      <SettingsTabs active="sleep" />


      {/* Tóm tắt đêm nay */}
      <div
        className="mb-4 overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ring-water-100"
        style={{ background: 'linear-gradient(135deg, #fdf5f4 0%, #f6e7e2 100%)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-water-600">Đêm nay</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tabular-nums text-slate-900">{form.bed}</span>
              <span className="text-slate-400">→</span>
              <span className="text-2xl font-extrabold tabular-nums text-slate-900">{form.wake}</span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{toHours(planMinutes)}</span> theo kế hoạch
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  planHit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {planHit ? 'Đủ mục tiêu' : `Thiếu ${toHours(goal - planMinutes)}`}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Nhắc</p>
              <Switch checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Bật nhắc nhở" />
            </div>
            <div className="text-center">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Báo thức</p>
              <Switch
                checked={form.alarmEnabled}
                onChange={(v) => setForm({ ...form, alarmEnabled: v })}
                label="Bật báo thức"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
        {/* Mục tiêu */}
        <Section icon={Target} title="Mục tiêu ngủ mỗi đêm" hint="Số giờ bạn muốn ngủ.">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-2">
            <button
              onClick={() => setForm({ ...form, targetValue: clamp(goal - STEP, 0, 1440) })}
              className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-water-700"
              aria-label="Giảm 30 phút"
            >
              <Minus className="size-4" />
            </button>
            <div className="text-center">
              <p className="text-2xl font-extrabold tabular-nums text-slate-900">{toHours(goal)}</p>
              <p className="text-[11px] text-slate-500">{goal} phút</p>
            </div>
            <button
              onClick={() => setForm({ ...form, targetValue: clamp(goal + STEP, 0, 1440) })}
              className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-water-700"
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
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold ${
                  goal === m ? 'bg-water-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {toHours(m)}
              </button>
            ))}
          </div>

          <Field label="Ghi chú" className="mt-3">
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ví dụ: tắt điện thoại trước 23:00"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
            />
          </Field>
        </Section>

        {/* Ghi nhanh đêm qua — thu gọn */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <button
            onClick={() => setLogOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
            aria-expanded={logOpen}
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <BedDouble className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">Ghi nhanh đêm qua</span>
              <span className="block text-[11px] text-slate-500">
                {logForm.bed} → {logForm.wake} · {toHours(logMinutes)}
              </span>
            </span>
            <ChevronDown className={`size-4 shrink-0 text-slate-400 transition ${logOpen ? 'rotate-180' : ''}`} />
          </button>

          {logOpen && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Đi ngủ</span>
                <input
                  type="time"
                  value={logForm.bed}
                  onChange={(e) => setLogForm({ ...logForm, bed: e.target.value })}
                  className="w-32 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-semibold tabular-nums text-slate-800"
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Thức dậy</span>
                <input
                  type="time"
                  value={logForm.wake}
                  onChange={(e) => setLogForm({ ...logForm, wake: e.target.value })}
                  className="w-32 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-semibold tabular-nums text-slate-800"
                />
              </label>
              <span className="rounded-lg bg-water-50 px-2.5 py-1.5 text-sm font-bold tabular-nums text-water-700">
                {toHours(logMinutes)}
              </span>
              <span
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${
                  logMinutes >= goal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                <CheckCircle2 className="size-3" />
                {logMinutes >= goal ? 'Đủ mục tiêu' : `Thiếu ${toHours(goal - logMinutes)}`}
              </span>
              <button
                onClick={() => addLog.mutate()}
                disabled={addLog.isPending}
                className="ml-auto rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {addLog.isPending ? 'Đang lưu…' : 'Lưu đêm qua'}
              </button>
            </div>
          )}
        </div>
        </div>

        <HabitImageCard kind="sleep" />

        {/* Báo thức */}
        <Section
          icon={AlarmClock}
          title="Báo thức mỗi giấc ngủ"
          hint="Giờ ngủ, giờ thức và kiểu kêu."
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="Đi ngủ">
              <input
                type="time"
                value={form.bed}
                onChange={(e) => setForm({ ...form, bed: e.target.value })}
                className={timeInput}
              />
            </Field>
            <Field label="Thức dậy">
              <input
                type="time"
                value={form.wake}
                onChange={(e) => setForm({ ...form, wake: e.target.value })}
                className={timeInput}
              />
            </Field>
          </div>

          <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chế độ báo thức</p>
          <div className="grid grid-cols-3 gap-1.5">
            {ALARM_MODES.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, alarmMode: key, lock: key === 'crazy' ? form.lock : false })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition ${
                  form.alarmMode === key
                    ? 'border-water-400 bg-water-50 text-water-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="size-4" />
                <span className="text-[11px] font-bold">{label}</span>
                <span className="text-[10px] leading-none opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          {loudMode && (
            <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-2.5">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'perRound', label: 'Lần / vòng', min: 1, max: 10 },
                  { key: 'rounds', label: 'Số vòng', min: 1, max: 10 },
                  { key: 'intervalMin', label: 'Cách (phút)', min: 1, max: 30 },
                ].map(({ key, label, min, max }) => (
                  <label key={key} className="rounded-lg bg-white p-1.5 ring-1 ring-slate-200">
                    <span className="block text-center text-[10px] font-semibold text-slate-500">{label}</span>
                    <div className="mt-1 flex items-center justify-between">
                      <button
                        onClick={() => setForm({ ...form, [key]: clamp(Number(form[key]) - 1, min, max) })}
                        className="rounded p-0.5 text-slate-400 hover:text-water-700"
                        aria-label={`Giảm ${label}`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="text-sm font-bold tabular-nums text-slate-800">{form[key]}</span>
                      <button
                        onClick={() => setForm({ ...form, [key]: clamp(Number(form[key]) + 1, min, max) })}
                        className="rounded p-0.5 text-slate-400 hover:text-water-700"
                        aria-label={`Tăng ${label}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </label>
                ))}
              </div>
              <p className="flex items-center gap-1 text-[11px] text-slate-500">
                <Zap className="size-3" /> Kêu {totalCalls} lần ({form.perRound}×{form.rounds}), cách {form.intervalMin}{' '}
                phút.
              </p>

              <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200">
                <Lock className={`size-4 shrink-0 ${form.lock ? 'text-water-700' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-slate-700">Chống tắt báo thức</p>
                  <p className="text-[10px] leading-snug text-slate-500">
                    Phải đủ {form.rounds} vòng, hoặc vào Cài đặt này để tắt.
                  </p>
                </div>
                <Switch checked={form.lock} onChange={(v) => setForm({ ...form, lock: v })} label="Chống tắt báo thức" />
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Nhắc trước khi ngủ">
              <select
                value={form.remindBeforeMin}
                onChange={(e) => setForm({ ...form, remindBeforeMin: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2 text-sm font-semibold text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
              >
                {REMIND_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? 'Đúng giờ' : `${m} phút`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ngủ thêm (snooze)">
              <select
                value={form.snoozeMinutes}
                onChange={(e) => setForm({ ...form, snoozeMinutes: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-2 text-sm font-semibold text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
              >
                {SNOOZE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? 'Tắt' : `${m} phút`}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            {isNativeApp()
              ? 'Bản app: báo thức do hệ điều hành đặt lịch nên vẫn kêu khi tắt app.'
              : 'Bản web: báo thức chỉ kêu khi app đang mở. Cài APK để chạy nền.'}
          </p>
          {alarmInfo && <p className="mt-1 text-[11px] font-medium text-water-700">{alarmInfo}</p>}
        </Section>
      </div>

      {/* Thanh lưu */}
      <div className="sticky bottom-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-sm ring-1 ring-slate-100 backdrop-blur md:bottom-4">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-1.5 rounded-xl bg-water-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu cài đặt
        </button>
        <button
          onClick={() => {
            stopSleepAlarmToday('settings');
            setSavedAt('Đã tắt báo thức đang kêu (chỉ áp dụng hôm nay).');
            setTimeout(() => setSavedAt(''), 2400);
          }}
          className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Tắt báo thức đang kêu
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {savedAt && <span className="text-sm text-emerald-600">{savedAt}</span>}
      </div>
    </div>
  );
}

export default SleepSettingsPage;
