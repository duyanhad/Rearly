import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Power } from 'lucide-react';
import { habitService } from '../../../services/habitService';

/**
 * Công tắc BẬT/TẮT cả tính năng của một nhu cầu, đặt ở trang cài đặt của nhu cầu đó.
 * Tắt → nhu cầu ẩn khỏi trang Hôm nay và trang Partner (backend cũng bỏ qua trong ClientNeeds);
 * bật lại bất cứ lúc nào từ chính trang cài đặt này.
 */
export function FeatureEnableCard({ kind, label }) {
  const qc = useQueryClient();
  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitService.list()).data,
  });
  const row = habits.find((h) => h.kind === kind);
  const enabled = row?.enabled !== false;

  const toggle = useMutation({
    mutationFn: () =>
      habitService.save(kind, {
        enabled: !enabled,
        times: row?.times ?? [],
        targetValue: row?.targetValue ?? 0,
        remindBeforeMin: row?.remindBeforeMin ?? 10,
        note: row?.note ?? '',
        alarmEnabled: row?.alarmEnabled ?? false,
        alarmMode: row?.alarmMode ?? 'gentle',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['habit-day', kind] });
      await qc.invalidateQueries({ queryKey: ['partner-needs'] });
    },
  });

  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
          <Power className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Sử dụng tính năng {label}</h2>
          <p className="text-xs text-slate-500">Tắt nếu bạn không dùng tính năng này.</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate()}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-water-300 disabled:opacity-50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-800">Bật tính năng {label}</span>
          <span className={`block text-xs ${enabled ? 'text-water-700' : 'text-slate-500'}`}>
            {enabled
              ? 'Đang bật · hiện ở Hôm nay và Partner'
              : 'Đang tắt · ẩn khỏi Hôm nay và Partner'}
          </span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-water-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
              enabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
    </section>
  );
}

export default FeatureEnableCard;
