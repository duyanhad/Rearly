import { X } from 'lucide-react';

/** Lớp phủ phóng to một ảnh (avatar/ảnh minh chứng); bấm ra ngoài hoặc nút X để đóng. */
export function ImageLightbox({ src, alt = '', onClose }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${alt}`}
    >
      <button
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/20"
      />
    </div>
  );
}

export default ImageLightbox;
