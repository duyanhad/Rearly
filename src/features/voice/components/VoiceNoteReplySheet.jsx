import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, Send, X } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { voiceNoteService } from '../../../services/voiceNoteService';
import { VoiceRecorder } from '../../chat/components/VoiceRecorder';

/**
 * Trả lời nhanh một lời nhắn thoại đã nhận: ghi âm rồi gửi ngay lại cho người gửi.
 * Không bắt buộc — người nhận tự chọn có trả lời hay không.
 */
export function VoiceNoteReplySheet({ note, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [take, setTake] = useState(null);

  const send = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('receiverId', note.senderId);
      // Trả lời trực tiếp: hẹn ngay bây giờ (server sẽ kêu trong vòng 20 giây).
      form.append('scheduledAtUtc', new Date().toISOString());
      form.append('durationMs', String(take.durationMs));
      form.append('audio', take.blob, 'voice-reply.webm');
      return voiceNoteService.create(form);
    },
    onSuccess: () => {
      toast.show('Đã gửi trả lời', `${note.senderName} sẽ nhận được lời nhắn của bạn.`);
      void qc.invalidateQueries({ queryKey: ['voice-notes-sent'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
    onError: (err) => toast.show('Không gửi được', errorMessage(err)),
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Trả lời lời nhắn của ${note.senderName}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Avatar url={note.senderAvatar} name={note.senderName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Trả lời {note.senderName}</p>
            <p className="truncate text-[11px] text-slate-500">Ghi âm lại lời nhắn của bạn — gửi ngay</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {take ? (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              Đã ghi {Math.round(take.durationMs / 1000)} giây — bấm gửi để trả lời.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setTake(null)}
                className="flex-1 rounded-xl bg-white py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                Ghi lại
              </button>
              <button
                type="button"
                onClick={() => send.mutate()}
                disabled={send.isPending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-water-600 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Send className="size-3.5" /> {send.isPending ? 'Đang gửi...' : 'Gửi trả lời'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <VoiceRecorder onSend={(blob, durationMs) => setTake({ blob, durationMs })} />
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
              <Mic className="size-3" /> Không muốn trả lời? Bấm X để đóng, không ai bị làm phiền.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default VoiceNoteReplySheet;
