import { useEffect, useRef, useState } from 'react';

// Hạt rơi vào vật thể khi vừa ghi nhận (giống nước chảy vào cốc bên tab Nước).
// Đồ vật bay vào: cơm nắm cho bữa ăn, "kg" cho cân nặng (tránh trùng ảnh cái cân).
const TOSS = {
  meal: { text: '🍙', className: 'text-[18px] drop-shadow-sm' },
  medicine: { text: '💊', className: 'text-[15px] drop-shadow-sm' },
  study: { text: '📄', className: 'text-[15px] drop-shadow-sm' },
  weight: {
    text: 'kg',
    className:
      'rounded-full bg-teal-500 px-1.5 py-[2px] text-[9px] font-extrabold leading-none text-white shadow-sm ring-1 ring-white/70',
  },
};

// Đủ chỉ tiêu: mỗi nhu cầu có nhãn + màu lấp lánh riêng (giấc ngủ dùng Zz ở dưới).
const HIT_STYLE = {
  meal: { label: 'Đủ bữa', tone: 'text-amber-500' },
  medicine: { label: 'Đủ liều', tone: 'text-rose-500' },
  study: { label: 'Đủ giờ', tone: 'text-amber-500' },
  weight: { label: 'Đạt mục tiêu', tone: 'text-teal-500' },
};

/**
 * Lớp hiệu ứng đặt trong khung ảnh: mỗi lần `signal` (số lần đã ghi) tăng thì thả vài hạt
 * vào vật thể; khi `hit` (đủ chỉ tiêu) vừa bật thì chạy hiệu ứng hồi máu.
 */
export function HabitFx({ kind, signal = 0, hit = false, spill = 0, sleeping = false }) {
  const [drops, setDrops] = useState([]);
  const [healKey, setHealKey] = useState(0);
  const [spillKey, setSpillKey] = useState(0);
  const lastSignal = useRef(signal);
  // Mở lại trang/thẻ khi đã đủ mục tiêu thì vẫn chạy lại hiệu ứng (Zz, hồi máu) một lần.
  const lastHit = useRef(false);
  const lastSpill = useRef(spill);
  const seq = useRef(0);

  useEffect(() => {
    if (signal > lastSignal.current) {
      const count = Math.min(10, Math.max(4, (signal - lastSignal.current) * 3));
      const batch = Array.from({ length: count }, () => ({
        id: seq.current++,
        left: 10 + Math.random() * 16,
        delay: Math.random() * 0.35,
      }));
      setDrops((prev) => [...prev, ...batch]);
      const id = setTimeout(() => {
        const ids = new Set(batch.map((b) => b.id));
        setDrops((prev) => prev.filter((d) => !ids.has(d.id)));
      }, 1400);
      lastSignal.current = signal;
      return () => clearTimeout(id);
    }
    lastSignal.current = signal;
  }, [signal]);

  useEffect(() => {
    if (hit && !lastHit.current) setHealKey((k) => k + 1);
    lastHit.current = hit;
  }, [hit]);

  // Partner từ chối → đồ vật bị "đập" cho rớt ra ngoài.
  useEffect(() => {
    if (spill > lastSpill.current) setSpillKey((k) => k + 1);
    lastSpill.current = spill;
  }, [spill]);

  if (!hit && !drops.length && !spillKey && !sleeping) return null;

  // Giấc ngủ: đang ngủ → Zzz bay lên liên tục (gấu sáng dần nhờ HabitAvatar3D bên dưới);
  // đủ mục tiêu → thêm tia sáng + nhãn Zz.
  if (kind === 'sleep') {
    return (
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {sleeping && (
          <span aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={`zz-${i}`}
                className="habit-zz-loop absolute font-extrabold text-indigo-400"
                style={{
                  // Bốc ra từ phía trên đầu con gấu (góc phải trên của khung ảnh).
                  right: `${22 + i * 7}%`,
                  bottom: `${52 + i * 4}%`,
                  fontSize: `${13 + i * 6}px`,
                  animationDelay: `${i * 1.05}s`,
                }}
              >
                Z
              </span>
            ))}
          </span>
        )}
        {hit && (
          <span className="absolute right-3 top-2 text-[11px] font-extrabold tracking-tight text-indigo-400/80">Z z</span>
        )}
        {hit &&
          healKey > 0 &&
          [0, 1, 2].map((i) => (
            <span
              key={`${healKey}-${i}`}
              className="habit-zz absolute font-extrabold text-indigo-400"
              style={{
                right: `${16 + i * 10}%`,
                bottom: `${34 + i * 4}%`,
                fontSize: `${11 + i * 5}px`,
                animationDelay: `${i * 0.22}s`,
              }}
            >
              Z
            </span>
          ))}
        {hit && healKey > 0 && (
          <>
            <span key={`s1-${healKey}`} className="habit-spark absolute text-amber-300" style={{ left: '18%', top: '22%' }}>✦</span>
            <span key={`s2-${healKey}`} className="habit-spark absolute text-amber-200" style={{ left: '70%', top: '16%', animationDelay: '0.3s' }}>✦</span>
            <span key={`s3-${healKey}`} className="habit-spark absolute text-amber-300" style={{ left: '52%', top: '8%', animationDelay: '0.55s' }}>✦</span>
          </>
        )}
      </span>
    );
  }

  const hitStyle = HIT_STYLE[kind] ?? { label: 'Đủ mục tiêu', tone: 'text-emerald-500' };

  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {/* Đủ chỉ tiêu: nhãn riêng của nhu cầu + quầng hồi máu + sao lấp lánh */}
      {hit && (
        <span className={`absolute right-3 top-2 text-[10px] font-extrabold tracking-tight ${hitStyle.tone}`}>
          {hitStyle.label}
        </span>
      )}
      {/* Được cộng đủ chỉ tiêu: quầng hồi máu quanh vật thể */}
      {hit && healKey > 0 && (
        <span key={healKey} className="habit-heal absolute inset-0 rounded-2xl bg-emerald-300/25 ring-2 ring-emerald-400/70" />
      )}
      {/* Bị partner từ chối: nháy đỏ + đồ vật rớt ra ngoài */}
      {!!spillKey && (
        <span key={`spill-${spillKey}`} className="absolute inset-0">
          <span className="habit-flash absolute inset-0 rounded-2xl bg-rose-300/25 ring-2 ring-rose-400/70" />
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`habit-spill absolute leading-none ${TOSS[kind]?.className ?? 'text-[13px]'}`}
              style={{ left: `${40 + i * 6}%`, top: '44%', animationDelay: `${i * 0.09}s` }}
            >
              {TOSS[kind]?.text ?? '•'}
            </span>
          ))}
        </span>
      )}
      {TOSS[kind] &&
        drops.map((d) => (
          <span
            key={d.id}
            className={`habit-toss absolute top-2 block leading-none ${TOSS[kind].className}`}
            style={{ left: `${d.left}%`, animationDelay: `${d.delay}s` }}
          >
            {TOSS[kind].text}
          </span>
        ))}
    </span>
  );
}

export default HabitFx;
