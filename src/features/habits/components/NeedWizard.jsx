import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X } from 'lucide-react';
import { habitService } from '../../../services/habitService';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';

/**
 * "Thiết lập nhanh": hỏi từng câu một cho đúng nhu cầu rồi lưu.
 * Mỗi bước là một câu hỏi; chọn/điền xong mới sang câu tiếp theo.
 */
const KINDS = {
  medicine: {
    label: 'thuốc',
    title: 'Bạn uống thuốc thế nào?',
    defaults: ['08:00', '13:00', '20:00', '22:00'],
    steps: [
      { key: 'count', q: 'Mỗi ngày bạn uống thuốc mấy lần?', type: 'choice', options: [1, 2, 3, 4], fmt: (v) => `${v} lần` },
      { key: 'times', q: 'Uống vào những giờ nào?', type: 'times', countKey: 'count' },
      { key: 'remind', q: 'Muốn nhắc trước bao lâu?', type: 'choice', options: [0, 5, 10, 15, 30], fmt: (v) => (v === 0 ? 'Đúng giờ' : `${v} phút`) },
      { key: 'alarm', q: 'Đến giờ có báo thức kêu không?', type: 'choice', options: ['Có báo thức', 'Chỉ nhắc trong app'], fmt: (v) => v },
    ],
  },
  meal: {
    label: 'bữa ăn',
    title: 'Bạn ăn mấy bữa mỗi ngày?',
    defaults: ['07:00', '12:00', '19:00', '21:30'],
    steps: [
      { key: 'count', q: 'Mỗi ngày bạn ăn mấy bữa?', type: 'choice', options: [1, 2, 3, 4], fmt: (v) => `${v} bữa` },
      { key: 'times', q: 'Ăn vào những giờ nào?', type: 'times', countKey: 'count' },
      { key: 'remind', q: 'Muốn nhắc trước bao lâu?', type: 'choice', options: [0, 5, 10, 15, 30], fmt: (v) => (v === 0 ? 'Đúng giờ' : `${v} phút`) },
      { key: 'alarm', q: 'Đến giờ có báo thức kêu không?', type: 'choice', options: ['Có báo thức', 'Chỉ nhắc trong app'], fmt: (v) => v },
    ],
  },
  study: {
    label: 'học tập',
    title: 'Bạn muốn học mấy phiên mỗi ngày?',
    defaults: ['09:00', '15:00', '20:00', '22:00'],
    steps: [
      { key: 'count', q: 'Mỗi ngày bạn muốn học mấy phiên?', type: 'choice', options: [1, 2, 3, 4], fmt: (v) => `${v} phiên` },
      { key: 'times', q: 'Học vào những giờ nào?', type: 'times', countKey: 'count' },
      { key: 'remind', q: 'Muốn nhắc trước bao lâu?', type: 'choice', options: [0, 5, 10, 15, 30], fmt: (v) => (v === 0 ? 'Đúng giờ' : `${v} phút`) },
      { key: 'alarm', q: 'Đến giờ có báo thức kêu không?', type: 'choice', options: ['Có báo thức', 'Chỉ nhắc trong app'], fmt: (v) => v },
    ],
  },
  sleep: {
    label: 'giấc ngủ',
    title: 'Bạn muốn ngủ thế nào?',
    steps: [
      { key: 'bed', q: 'Bạn muốn đi ngủ lúc mấy giờ?', type: 'time', fallback: '23:00' },
      { key: 'wake', q: 'Buổi sáng thức dậy lúc mấy giờ?', type: 'time', fallback: '07:00' },
      { key: 'remind', q: 'Nhắc trước khi đi ngủ bao lâu?', type: 'choice', options: [0, 10, 15, 30, 60], fmt: (v) => (v === 0 ? 'Không nhắc' : `${v} phút`) },
      { key: 'alarm', q: 'Buổi sáng có báo thức đánh thức không?', type: 'choice', options: ['Có báo thức', 'Không cần'], fmt: (v) => v },
    ],
  },
  weight: {
    label: 'cân nặng',
    title: 'Mục tiêu cân nặng của bạn?',
    steps: [
      { key: 'current', q: 'Cân hiện tại của bạn (kg)?', type: 'number', placeholder: '70', unit: 'kg', fallback: 70 },
      { key: 'target', q: 'Bạn muốn đạt bao nhiêu kg?', type: 'number', placeholder: '65', unit: 'kg', fallback: 65 },
      { key: 'time', q: 'Mấy giờ bạn thường cân?', type: 'time', fallback: '07:00' },
    ],
  },
};

const pad = (n) => String(n).padStart(2, '0');

export function NeedWizard({ kind, row, onClose }) {
  const cfg = KINDS[kind];
  const toast = useToast();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const step = cfg?.steps[index];
  const value = step ? answers[step.key] : undefined;
  const ready = useMemo(() => {
    if (!step) return false;
    if (step.type === 'times') return Array.isArray(value) && value.length === (answers.count ?? 1);
    if (step.type === 'number') return Number(value) > 0;
    // Câu hỏi giờ: bỏ trống thì dùng giờ gợi ý.
    if (step.type === 'time') return true;
    return value !== undefined && value !== '';
  }, [step, value, answers.count]);

  // Mỗi câu trả lời được lưu ngay, câu sau dùng lại (số lần → danh sách giờ).
  const answer = (raw) => setAnswers((prev) => {
    const next = { ...prev, [step.key]: raw };
    if (step.key === 'count') {
      next.times = Array.from({ length: raw }, (_, i) => cfg.defaults[i] ?? cfg.defaults[cfg.defaults.length - 1]);
    }
    return next;
  });

  const save = useMutation({
    mutationFn: () => {
      const base = {
        enabled: row?.enabled !== false,
        times: row?.times ?? [],
        targetValue: row?.targetValue ?? 0,
        remindBeforeMin: row?.remindBeforeMin ?? 10,
        note: row?.note ?? '',
        alarmEnabled: row?.alarmEnabled ?? false,
        alarmMode: row?.alarmMode ?? 'gentle',
      };

      if (kind === 'sleep') {
        return habitService.save(kind, {
          ...base,
          enabled: true,
          times: [answers.bed ?? '23:00', answers.wake ?? '07:00'],
          remindBeforeMin: answers.remind ?? 10,
          alarmEnabled: answers.alarm === 'Có báo thức',
        });
      }

      if (kind === 'weight') {
        const from = Number(answers.current) * 1000;
        const to = Number(answers.target) * 1000;
        return habitService.save(kind, {
          ...base,
          enabled: true,
          targetValue: to,
          times: [answers.time],
          direction: to < from ? 'down' : 'up',
        });
      }

      return habitService.save(kind, {
        ...base,
        enabled: true,
        times: answers.times,
        targetValue: answers.count,
        remindBeforeMin: answers.remind ?? 10,
        alarmEnabled: answers.alarm === 'Có báo thức',
      });
    },
    onSuccess: async () => {
      toast.show('Đã thiết lập', 'Bạn có thể chỉnh lại chi tiết bên dưới bất cứ lúc nào.');
      await qc.invalidateQueries({ queryKey: ['habits'] });
      onClose();
    },
    onError: (err) => toast.show('Không lưu được', errorMessage(err)),
  });

  if (!cfg) return null;
  const last = index === cfg.steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[86] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Thiết lập nhanh ${cfg.label}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-water-600">
              Câu {index + 1}/{cfg.steps.length} · {cfg.label}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">{step.q}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Thanh tiến trình câu hỏi */}
        <div className="mb-3 flex gap-1" aria-hidden="true">
          {cfg.steps.map((s, i) => (
            <span
              key={s.key}
              className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-water-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        {step.type === 'choice' && (
          <div className="grid grid-cols-2 gap-2">
            {step.options.map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={String(opt)}
                  type="button"
                  onClick={() => answer(opt)}
                  aria-pressed={active}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active ? 'bg-water-600 text-white' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {step.fmt ? step.fmt(opt) : opt}
                </button>
              );
            })}
          </div>
        )}

        {step.type === 'times' && (
          <div className="space-y-2">
            {Array.from({ length: answers[step.countKey] ?? 1 }, (_, i) => (
              <label key={i} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-600">Lần {i + 1}</span>
                <input
                  type="time"
                  value={(value ?? [])[i] ?? '08:00'}
                  onChange={(e) => {
                    const next = [...(value ?? cfg.defaults.slice(0, answers[step.countKey] ?? 1))];
                    next[i] = e.target.value;
                    setAnswers((prev) => ({ ...prev, [step.key]: next }));
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-water-400 focus:outline-none"
                />
              </label>
            ))}
          </div>
        )}

        {step.type === 'time' && (
          <input
            type="time"
            value={value ?? step.fallback}
            onChange={(e) => answer(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-center text-lg font-bold text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        )}

        {step.type === 'number' && (
          <div className="flex items-end gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={value ?? ''}
              onChange={(e) => answer(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder={step.placeholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-center text-lg font-bold text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
            />
            <span className="pb-3 text-sm font-medium text-slate-500">{step.unit}</span>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              className="flex items-center gap-1 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
            >
              <ArrowLeft className="size-3.5" /> Trước
            </button>
          )}
          <button
            type="button"
            disabled={!ready || save.isPending}
            onClick={() => (last ? save.mutate() : setIndex((i) => i + 1))}
            className="flex-1 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
          >
            {save.isPending ? 'Đang lưu...' : last ? 'Lưu thiết lập' : 'Câu tiếp theo'}
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-400">
          {pad(index + 1)}/{pad(cfg.steps.length)} · trả lời từng câu, có thể bỏ qua và chỉnh tay bên dưới
        </p>
      </div>
    </div>
  );
}

export default NeedWizard;
