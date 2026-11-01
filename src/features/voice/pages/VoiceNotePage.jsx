import { Mic } from 'lucide-react';
import { VoiceNoteComposer } from '../components/VoiceNoteComposer';

/** Trang hẹn lời nhắn thoại (bản đầy đủ, có danh sách đã hẹn). */
export function VoiceNotePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
          <Mic className="size-4" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Hẹn lời nhắn thoại</h1>
          <p className="text-xs text-slate-500">Ghi âm, hẹn giờ gửi — tới giờ app người nhận kêu tới khi họ nghe.</p>
        </div>
      </header>

      <VoiceNoteComposer />
    </div>
  );
}

export default VoiceNotePage;