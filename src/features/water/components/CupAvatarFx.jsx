import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../../components/Avatar';
import { pourSeconds } from '../pourTiming';

const HIT_MS = 900;

/**
 * Avatar ở góc thẻ cốc, tự "đẩy lên" rồi tác động vào cốc:
 * - action="pour": nghiêng người về phía cốc và rót nước vào (thời gian tỉ lệ số ml).
 * - action="hit" : đẩy lên rồi đập vào cốc (vòng va chạm + rung), cốc sẽ nghiêng đổ nước.
 * `signal` đổi giá trị mỗi lần có hành động; `amount` là số ml của lần đó.
 */
export function CupAvatarFx({
  action = 'pour',
  avatarUrl,
  name,
  side = 'left',
  signal = 0,
  amount = 0,
  color = '#38bdf8',
  anchorRef,
  runOnMount = false,
}) {
  const [phase, setPhase] = useState('idle');
  // Khởi tạo bằng chính signal hiện tại: mount lại sau khi chuyển trang KHÔNG chạy hiệu ứng,
  // chỉ khi signal thực sự tăng mới rót (tránh avatar bị "treo" ở trạng thái nghiêng).
  // runOnMount: chạy ngay khi mount nếu đã có hành động (dùng để phát lại hiệu ứng khi vào lại trang).
  const lastSignal = useRef(runOnMount ? 0 : signal);
  // Thời gian rót dài/ngắn theo số ml vừa uống, khớp với dòng nước trong cốc 3D.
  const pourMs = pourSeconds(amount) * 1000;
  const durationMs = action === 'pour' ? pourMs : HIT_MS;

  useEffect(() => {
    if (signal === lastSignal.current) return;
    lastSignal.current = signal;
    setPhase(action);
    const id = setTimeout(() => setPhase('idle'), durationMs);
    return () => clearTimeout(id);
  }, [signal, action, durationMs]);

  const dir = side === 'left' ? 1 : -1;
  const active = phase !== 'idle';

  return (
    <div className={`pointer-events-none relative flex flex-col items-center gap-0.5 ${active ? 'z-10' : ''}`}>
      <div
        className={`relative ${active ? 'animate-avatar-push' : ''}`}
        style={{
          '--push-x': `${dir * 14}px`,
          '--push-y': '-16px',
        }}
      >
        <div className={active && action === 'hit' ? 'animate-impact-shake' : ''}>
          {/* Nghiêng avatar bằng transform + transition (không dùng keyframes) để luôn
              chạy dù component vừa mount lại sau khi chuyển trang. */}
          <div
            ref={anchorRef}
            style={{
              transformOrigin: '70% 88%',
              transform: active && action === 'pour' ? `rotate(${dir * 42}deg)` : 'rotate(0deg)',
              transition: `transform ${active ? 200 : 260}ms cubic-bezier(0.34, 1.4, 0.5, 1)`,
            }}
          >
            <Avatar url={avatarUrl} name={name ?? '?'} size="sm" />
          </div>
        </div>

        {/* Vòng va chạm khi đập vào cốc */}
        {active && action === 'hit' && (
          <>
            <span
              className="animate-impact-ring absolute left-1/2 top-1/2 block size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ borderColor: color }}
            />
            <span
              className="animate-impact-ring absolute left-1/2 top-1/2 block size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              style={{ borderColor: color, animationDelay: '0.12s' }}
            />
          </>
        )}
      </div>

      <span
        className={`max-w-[76px] truncate rounded-full px-1.5 text-[10px] font-medium ${
          action === 'hit' ? 'bg-rose-50 text-rose-600' : 'bg-water-50 text-water-700'
        }`}
      >
        {name}
      </span>
    </div>
  );
}

export default CupAvatarFx;
