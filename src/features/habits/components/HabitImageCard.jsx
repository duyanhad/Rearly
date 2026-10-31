import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { habitService } from '../../../services/habitService';
import { WaterLoader } from '../../../components/WaterLoader';
import { HABIT_KINDS } from '../config';

const LABELS = {
  sleep: 'Ảnh giấc ngủ của bạn',
  medicine: 'Ảnh thuốc của bạn',
  meal: 'Ảnh bữa ăn của bạn',
  study: 'Ảnh góc học của bạn',
  weight: 'Ảnh bàn cân của bạn',
};

/** Khối "Ảnh của bạn" trong trang Cài đặt — dựng y như "Cốc nước của bạn" bên tab Nước. */
export function HabitImageCard({ kind }) {
  const ItemIcon = HABIT_KINDS[kind]?.icon;
  const title = LABELS[kind] ?? LABELS.meal;
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [error, setError] = useState(null);
  // Popup tiến trình: 0–55% là byte đã gửi, 55–95% là server tách nền, 100% khi xong.
  const [progress, setProgress] = useState(null);

  const { data: habits = [] } = useQuery({ queryKey: ['habits'], queryFn: async () => (await habitService.list()).data });
  const row = habits.find((h) => h.kind === kind);
  const hasPhoto = Boolean(row?.imageUrl);
  const waiting = Boolean(progress) && progress.value >= 55 && progress.value < 100;

  const upload = async (file) => {
    if (!file) return;
    setError(null);
    setProgress({ value: 2, label: 'Đang chuẩn bị ảnh...' });
    try {
      const form = new FormData();
      form.append('image', file);
      await habitService.uploadImage(kind, form, (event) => {
        const total = event.total || 0;
        const percent = total ? Math.round((event.loaded / total) * 55) : 30;
        setProgress({ value: Math.max(2, Math.min(55, percent)), label: 'Đang tải ảnh lên...' });
      });
      setProgress({ value: 100, label: 'Đã tách nền xong!' });
      await qc.invalidateQueries({ queryKey: ['habits'] });
      setTimeout(() => setProgress(null), 700);
    } catch (err) {
      setProgress(null);
      setError(errorMessage(err));
    }
  };

  // Server tách nền có thể lâu → cho nước dâng dần 55 → 95% trong lúc chờ.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => {
      setProgress((prev) => {
        if (!prev || prev.value >= 95) return prev;
        return {
          value: Math.min(95, prev.value + Math.max(0.7, (95 - prev.value) * 0.12)),
          label: 'AI đang tách nền...',
        };
      });
    }, 320);
    return () => clearInterval(id);
  }, [waiting]);

  const remove = async () => {
    setError(null);
    try {
      await habitService.removeImage(kind);
      await qc.invalidateQueries({ queryKey: ['habits'] });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
          {ItemIcon ? <ItemIcon className="size-4" /> : <Camera className="size-4" />}
        </span>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-water-50 to-white ring-1 ring-slate-200">
          {hasPhoto ? (
            <img
              src={mediaUrl(row.cutoutUrl || row.imageUrl) ?? ''}
              alt={title}
              className={`size-full object-cover ${
                row.cutoutUrl ? 'bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:12px_12px]' : ''
              }`}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 text-slate-300">
              {ItemIcon ? <ItemIcon className="size-8" /> : <Camera className="size-8" />}
              <span className="text-[10px]">Mặc định</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {hasPhoto ? 'Đang dùng ảnh của bạn' : 'Đang dùng biểu tượng mặc định'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">JPG, PNG hoặc WebP · tối đa 5 MB</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-water-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-water-700">
              <Camera className="size-3.5" />
              {hasPhoto ? 'Đổi ảnh' : 'Tải ảnh'}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = '';
                }}
              />
            </label>

            {hasPhoto && (
              <button
                onClick={remove}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
              >
                <Trash2 className="size-3.5" /> Xoá ảnh
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      </div>

      {progress && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="mb-1 font-semibold text-slate-800">Đang xử lý ảnh</h3>
            <p className="mb-4 text-xs text-slate-500">Nước dâng = % hoàn thành</p>
            <WaterLoader percent={progress.value} label={progress.label} />
            <p className="mt-4 text-[11px] text-slate-400">Lần đầu có thể mất ~30 giây.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default HabitImageCard;
