import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Check, X } from 'lucide-react';
import { notificationService } from '../../../services/notificationService';
import { nudgeVideoService } from '../../../services/nudgeVideoService';

const SEEN_KEY = 'dearly:nudge-video-seen';

const seenIds = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const markSeen = (id) => {
  const next = [...seenIds().slice(-40), id];
  localStorage.setItem(SEEN_KEY, JSON.stringify(next));
};

/**
 * Màn phát video gửi kèm nhắc nhở: hiện khi có nhắc mới (realtime) hoặc khi mở app
 * mà còn nhắc kèm video chưa xem.
 */
export function NudgeVideoOverlay() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState(null);

  // Mở app: tìm nhắc kèm video chưa đọc, chưa từng phát.
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'video-check'],
    queryFn: async () => (await notificationService.list(20)).data,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!notifications.length) return;
    const seen = seenIds();
    const found = notifications.find(
      (n) => n.type === 'Nudge' && n.videoUrl && !n.isRead && !seen.includes(n.id),
    );
    if (found) setCurrent(found);
  }, [notifications]);

  // Nhắc mới tới trong lúc đang mở app.
  useEffect(() => {
    const onVideo = (event) => {
      const detail = event?.detail;
      if (detail?.videoUrl) setCurrent(detail);
    };
    window.addEventListener('dearly:nudge-video', onVideo);
    return () => window.removeEventListener('dearly:nudge-video', onVideo);
  }, []);

  if (!current) return null;

  const close = async () => {
    if (current.id) {
      markSeen(current.id);
      await notificationService.markRead(current.id).catch(() => {});
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    }
    setCurrent(null);
  };

  return (
    <div
      className="fixed inset-0 z-[94] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={current.title ?? 'Nhắc nhở'}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-cream-50 shadow-2xl"
      >
        <div className="relative">
          <video
            src={nudgeVideoService.url(current.videoUrl)}
            className="aspect-[4/3] w-full bg-slate-900 object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-slate-900/50 text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-water-700">
            <BellRing className="size-3.5" /> Nhắc nhở có video
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">{current.title}</p>
          <p className="mt-1 text-sm text-slate-600">{current.message}</p>
          <button
            type="button"
            onClick={close}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-water-700 py-3 text-sm font-bold text-white"
          >
            <Check className="size-4" /> Đã xem
          </button>
        </div>
      </div>
    </div>
  );
}

export default NudgeVideoOverlay;
