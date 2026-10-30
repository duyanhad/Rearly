/**
 * Logo Dearly theo bộ nhận diện: trái tim vẽ bằng hai dải ruy-băng bắt chéo ở đáy,
 * màu đỏ rượu vang trên nền kem. `DearlyMark` chỉ là biểu tượng, `DearlyLogo` thêm chữ serif.
 */
import { useId } from 'react';

export function DearlyMark({ className = 'size-8', tone = 'rose' }) {
  // id gradient riêng cho từng lần render: tránh trùng id khi 1 bản nằm trong khối display:none
  const gid = `dearly-heart-${useId().replace(/:/g, '')}`;
  const stroke = tone === 'cream' ? '#f7ece7' : `url(#${gid})`;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Dearly">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a8434f" />
          <stop offset="55%" stopColor="#8e2f3c" />
          <stop offset="100%" stopColor="#6b1f2b" />
        </linearGradient>
      </defs>
      {/* thân trái của trái tim */}
      <path
        d="M50 74C44 64 21 57 21 41c0-13 11-21 21-17 4 2 7 5 8 9"
        fill="none"
        stroke={stroke}
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      {/* thân phải của trái tim */}
      <path
        d="M50 74c6-10 29-17 29-33 0-13-11-21-21-17-4 2-7 5-8 9"
        fill="none"
        stroke={stroke}
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      {/* hai dải bắt chéo ở đáy */}
      <path
        d="M50 74c3 10 9 15 18 18"
        fill="none"
        stroke={stroke}
        strokeWidth="5.6"
        strokeLinecap="round"
      />
      <path
        d="M50 74c-3 10-9 15-18 18"
        fill="none"
        stroke={stroke}
        strokeWidth="5.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + chữ "Dearly" kiểu serif (giống bộ nhận diện). */
export function DearlyLogo({ markClass = 'size-8', textClass = 'text-lg', mark = true }) {
  return (
    <span className="flex items-center gap-2">
      {mark && <DearlyMark className={markClass} />}
      <span className={`font-brand font-semibold tracking-tight ${textClass}`}>Dearly</span>
    </span>
  );
}

export default DearlyLogo;
