import { useEffect, useRef, useState } from 'react';
import { mediaUrl } from '../../../services/apiClient';
import { HabitFx } from './HabitFx';

/**
 * Hiển thị "vật thể" của nhu cầu với hiệu ứng 3D lắc lư nhẹ (giống cốc nước bên tab Nước).
 * Dùng bản đã tách nền khi có (giống cốc 3D luôn dùng ảnh tách nền), chỉ khi server chưa tách
 * được mới rơi về ảnh gốc.
 * `signal` = số lần đã ghi (tăng là thả hạt vào), `hit` = đủ chỉ tiêu (chạy hiệu ứng hồi máu).
 */
export function HabitAvatar3D({
  imageUrl,
  cutoutUrl,
  hit = false,
  signal = 0,
  spill = 0,
  kind,
  fallback: Fallback,
  plain = false,
  percent,
  sleeping = false,
  className = 'size-16',
}) {
  // Vật thể phản ứng: được tác động (nhận đồ) thì nảy lên, bị partner từ chối thì lắc/nghiêng.
  const [react, setReact] = useState('');
  const lastSignal = useRef(signal);
  const lastSpill = useRef(spill);
  useEffect(() => {
    if (spill > lastSpill.current) {
      setReact('hit');
      const id = setTimeout(() => setReact(''), 700);
      lastSpill.current = spill;
      return () => clearTimeout(id);
    }
    lastSpill.current = spill;
  }, [spill]);
  useEffect(() => {
    if (signal > lastSignal.current) {
      setReact('pop');
      const id = setTimeout(() => setReact(''), 700);
      lastSignal.current = signal;
      return () => clearTimeout(id);
    }
    lastSignal.current = signal;
  }, [signal]);

  const src = cutoutUrl ?? imageUrl;
  const cut = Boolean(cutoutUrl);
  // `plain` = không khung nền/viền, dùng cho thẻ lớn ở trang Hôm nay (giống cốc nước).
  // Ảnh chưa tách nền thì vẫn cần khung để không thành một khối trắng trên nền trắng.
  const frame = plain && cut ? 'rounded-none' : 'rounded-2xl bg-white/70 ring-1 ring-white/80';
  // Thẻ lớn: chưa đủ chỉ tiêu thì ảnh tối đi, đủ rồi mới sáng lên (như nước dâng đầy cốc).
  // Có `percent` (0–100) thì sáng dần theo đúng % đã làm được — dùng cho giấc ngủ.
  const tone = typeof percent === 'number' ? 'habit-tone' : plain ? (hit ? 'habit-lit' : 'habit-dim') : '';
  const litStyle =
    typeof percent === 'number'
      ? {
          filter: `brightness(${(0.5 + (0.6 * Math.min(100, Math.max(0, percent))) / 100).toFixed(2)}) saturate(${(
            0.55 +
            (0.53 * Math.min(100, Math.max(0, percent))) / 100
          ).toFixed(2)}) drop-shadow(0 6px 14px rgba(255, 205, 140, ${(0.15 + (0.4 * Math.min(100, Math.max(0, percent))) / 100).toFixed(2)}))`,
        }
      : undefined;
  if (!src) {
    return (
      <span className={`relative flex items-center justify-center overflow-hidden ${frame} ${className}`}>
        <span
          className={`flex size-full items-center justify-center ${
            react === 'pop' ? 'habit-object-pop' : react === 'hit' ? 'habit-object-hit' : ''
          }`}
        >
          {Fallback ? <Fallback className="size-1/2 text-water-600" /> : null}
        </span>
        <HabitFx kind={kind} signal={signal} hit={hit} spill={spill} sleeping={sleeping} />
      </span>
    );
  }
  return (
    <span className={`habit-stage relative flex items-center justify-center overflow-hidden ${frame} ${className}`}>
      {/* Quầng ấm nằm sau vật thể: đủ mục tiêu thì "sáng cả gối" */}
      {hit && <span className="habit-sleep-glow pointer-events-none absolute inset-0" />}
      {/* Bóng tiếp xúc dưới vật thể, như cốc nước đặt trên mặt bàn */}
      {cut && plain && <span className="habit-object-shadow" />}
      <span className={`flex size-full items-center justify-center ${react === 'pop' ? 'habit-object-pop' : react === 'hit' ? 'habit-object-hit' : ''}`}>
      <img
        src={mediaUrl(src)}
        alt=""
        style={litStyle}
        className={`habit-float3d relative size-full object-contain drop-shadow-md ${tone}`}
      />
      </span>
      <HabitFx kind={kind} signal={signal} hit={hit} spill={spill} sleeping={sleeping} />
    </span>
  );
}

export default HabitAvatar3D;
