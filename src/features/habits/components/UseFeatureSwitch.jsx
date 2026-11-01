import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitService } from '../../../services/habitService';

/**
 * Công tắc "đang dùng tính năng này" đặt dưới ảnh vật thể của mỗi nhu cầu.
 * Tắt → ẩn tab ở trang Hôm nay, ngừng báo thức/nhắc; bật lại bất cứ lúc nào.
 */
export function UseFeatureSwitch({ kind, label, setting }) {
  const qc = useQueryClient();
  const enabled = setting?.enabled !== false;

  const toggle = useMutation({
    mutationFn: async () =>
      habitService.save(kind, {
        enabled: !enabled,
        times: setting?.times ?? [],
        targetValue: setting?.targetValue ?? 0,
        remindBeforeMin: setting?.remindBeforeMin ?? 10,
        note: setting?.note ?? '',
        // Báo thức đi theo công tắc chung (gộp làm một như yêu cầu).
        alarmEnabled: !enabled,
        alarmMode: setting?.alarmMode ?? 'gentle',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habits'] });
      await qc.invalidateQueries({ queryKey: ['habit-day', kind] });
    },
  });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate()}
      className="mx-auto mt-1.5 flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-50"
      title={enabled ? 'Tắt để ẩn nhu cầu này khỏi trang Hôm nay' : 'Bật lại để hiện nhu cầu này'}
    >
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${enabled ? 'bg-water-600' : 'bg-slate-300'}`}>
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-all ${enabled ? 'left-[14px]' : 'left-0.5'}`}
        />
      </span>
      {enabled ? `Đang dùng ${label}` : `Đang ẩn ${label} · bật lại`}
    </button>
  );
}

export default UseFeatureSwitch;
