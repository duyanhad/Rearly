import { Mic, X } from 'lucide-react';
import { VoiceNoteComposer } from './VoiceNoteComposer';

/**
 * Popup hẹn lời nhắn thoại — mở từ menu nhanh (nút +) để không phải rời trang đang xem.
 */
export function VoiceNoteSheet({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Hẹn lời nhắn thoại"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream-50 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Mic className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Hẹn lời nhắn thoại</h2>
            <p className="truncate text-[11px] text-slate-500">Ghi âm → chọn người nhận & giờ gửi</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <VoiceNoteComposer
            showList={false}
            onScheduled={() => {
              // Đóng popup sau khi hẹn xong để thấy thông báo thành công.
              setTimeout(onClose, 700);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default VoiceNoteSheet;
