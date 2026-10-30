/**
 * Vòng tròn nước dâng hiển thị % tải lên: mặt nước gợn sóng (2 lớp xoay lệch nhau),
 * bọt nước nổi lên, số % ở giữa. Dùng cho popup khi tải ảnh cốc.
 */
export function WaterLoader({ percent = 0, label, size = 132 }) {
  const p = Math.max(0, Math.min(100, percent));

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative overflow-hidden rounded-full bg-slate-100 ring-4 ring-water-100"
        style={{ width: size, height: size }}
      >
        {/* Nước dâng theo % */}
        <div
          className="absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-out"
          style={{ height: `${p}%`, background: 'linear-gradient(180deg,#7dd3fc 0%,#38bdf8 45%,#0284c7 100%)' }}
        >
          {/* Hai lớp sóng xoay lệch pha → mặt nước gợn (khung ngoài giữ vị trí, khung trong xoay) */}
          <span className="absolute left-1/2 top-0 block size-[200%] -translate-x-1/2 -translate-y-[94%]">
            <span className="water-wave block size-full rounded-[42%] bg-sky-200/85" />
          </span>
          <span className="absolute left-1/2 top-0 block size-[200%] -translate-x-1/2 -translate-y-[96%]">
            <span className="water-wave-slow block size-full rounded-[47%] bg-sky-50/70" />
          </span>
        </div>

        {/* Bọt nước nổi lên */}
        {p > 3 && (
          <>
            <span className="water-bubble left-[30%] bottom-2 size-1.5" />
            <span className="water-bubble left-[55%] bottom-1 size-2" style={{ animationDelay: '0.9s' }} />
            <span className="water-bubble left-[70%] bottom-3 size-1" style={{ animationDelay: '1.7s' }} />
          </>
        )}

        <span className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-white/75 px-2.5 py-0.5 text-lg font-bold tabular-nums text-water-800 shadow-sm">
            {Math.round(p)}%
          </span>
        </span>
      </div>
      {label && <p className="text-center text-sm text-slate-600">{label}</p>}
    </div>
  );
}

export default WaterLoader;
