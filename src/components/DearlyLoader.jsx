import { DearlyMark } from './DearlyLogo';

/**
 * Hiệu ứng chờ dựa trên logo Dearly: trái tim đập nhẹ + vòng sáng lan toả.
 * Dùng cho mọi chỗ "đang tải dữ liệu" để trải nghiệm liền mạch thay vì chữ trơn.
 */
export function DearlyLoader({ label = 'Đang tải…', size = 'md', full = false, className = '' }) {
  const mark = { sm: 'size-6', md: 'size-9', lg: 'size-12' }[size] ?? 'size-9';
  const text = { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' }[size] ?? 'text-xs';

  const body = (
    <div className={`flex flex-col items-center gap-2.5 ${className}`} role="status" aria-live="polite">
      <span className="relative flex items-center justify-center">
        <span className="absolute inset-0 animate-loader-ring rounded-full bg-water-300/40" aria-hidden="true" />
        <span
          className="absolute inset-0 animate-loader-ring rounded-full bg-water-300/30"
          style={{ animationDelay: '0.7s' }}
          aria-hidden="true"
        />
        <DearlyMark className={`${mark} animate-logo-beat drop-shadow-sm`} />
      </span>
      {label && <span className={`${text} font-medium text-water-700/80`}>{label}</span>}
    </div>
  );

  return full ? <div className="flex min-h-[50vh] items-center justify-center">{body}</div> : body;
}

/** Khung xương mờ cho danh sách/thẻ đang tải (không gây nhấp nháy). */
export function DearlySkeleton({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl bg-slate-100/80 p-3 ring-1 ring-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div className="size-9 shrink-0 rounded-full bg-slate-200/80" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-2.5 w-1/3 rounded-full bg-slate-200/90" />
              <div className="h-2 w-2/3 rounded-full bg-slate-200/70" />
            </div>
          </div>
          <span className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      ))}
    </div>
  );
}

export default DearlyLoader;
