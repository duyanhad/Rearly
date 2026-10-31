import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import { WaterCup3DLazy as WaterCup3D } from './WaterCup3DLazy';

const CONFETTI = [
  { left: '8%', delay: '0s', color: '#38bdf8', size: 8 },
  { left: '18%', delay: '0.35s', color: '#fbbf24', size: 6 },
  { left: '29%', delay: '0.12s', color: '#34d399', size: 7 },
  { left: '41%', delay: '0.5s', color: '#f472b6', size: 6 },
  { left: '52%', delay: '0.22s', color: '#60a5fa', size: 9 },
  { left: '63%', delay: '0.62s', color: '#f97316', size: 6 },
  { left: '74%', delay: '0.05s', color: '#a78bfa', size: 8 },
  { left: '86%', delay: '0.42s', color: '#22d3ee', size: 7 },
];

/**
 * Popup chúc mừng khi vừa đạt 100% mục tiêu ngày: cốc 3D nhảy múa + confetti.
 */
export function GoalCelebration({ open, percent, totalMl, targetMl, streakCount = 0, textureUrl, preCut = false, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="animate-celebrate-pop relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 via-white to-water-50 p-5 text-center shadow-2xl">
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI.map((dot, i) => (
            <span
              key={i}
              className="animate-confetti absolute top-0 block rounded-sm"
              style={{
                left: dot.left,
                width: dot.size,
                height: dot.size * 1.6,
                backgroundColor: dot.color,
                animationDelay: dot.delay,
              }}
            />
          ))}
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <Trophy className="size-3.5" /> Hoàn thành mục tiêu
          </span>

          <div className="relative mt-2 h-56">
            <div className="animate-glow-pulse pointer-events-none absolute inset-x-10 bottom-2 h-32 rounded-full bg-sky-300/50 blur-2xl" />
            <WaterCup3D percent={percent} textureUrl={textureUrl} preCut={preCut} celebrate size="sm" />
            <Sparkles className="absolute left-4 top-10 size-5 animate-pulse text-amber-400" />
            <Sparkles className="absolute right-5 top-16 size-4 animate-pulse text-sky-400" />
          </div>

          <h2 className="mt-1 text-xl font-bold text-water-800">Chúc mừng bạn! 🎉</h2>
          <p className="mt-1 text-sm text-slate-600">
            Hôm nay bạn đã uống đủ <strong>{totalMl}</strong> / {targetMl} ml — chạm 100% mục tiêu.
          </p>
          {streakCount > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
              <Flame className="size-3.5" /> Chuỗi {streakCount} ngày liên tiếp
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-water-600 py-3 font-semibold text-white shadow-sm shadow-water-500/30"
          >
            Tuyệt vời!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default GoalCelebration;
