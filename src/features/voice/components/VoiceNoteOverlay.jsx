import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, PhoneCall } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { voiceNoteService } from '../../../services/voiceNoteService';

/**
 * Màn hình "kêu" lời nhắn thoại hẹn giờ: hiện khi có lời nhắn đã tới giờ mà tôi chưa nghe.
 * Audio phát lặp lại liên tục; chỉ tắt khi bấm "Đã nghe" (báo server ngừng kêu).
 */
export function VoiceNoteOverlay() {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState([]);
  const audioRef = useRef(null);

  // Poll 10s: server là nguồn đúng (push/realtime chỉ để đánh thức app).
  const { data: incoming = [] } = useQuery({
    queryKey: ['voice-notes-incoming'],
    queryFn: async () => (await voiceNoteService.incoming()).data,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const note = incoming.find((n) => !dismissed.includes(n.id)) ?? null;

  const listen = useMutation({
    mutationFn: (id) => voiceNoteService.listen(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['voice-notes-incoming'] });
    },
  });

  // Mỗi lần mở, cố gắng phát lặp; nếu bị chặn autoplay thì người dùng bấm "Nghe".
  useEffect(() => {
    if (!note || !audioRef.current) return undefined;
    const audio = audioRef.current;
    audio.loop = true;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [note?.id]);

  if (!note) return null;

  const stop = () => {
    audioRef.current?.pause();
    setDismissed((prev) => [...prev, note.id]);
    listen.mutate(note.id);
  };

  return (
    <div
      className="fixed inset-0 z-[96] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#4a1520]/97 to-[#2b1a1e]/97 p-6 text-center text-cream-50 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={`Lời nhắn thoại từ ${note.senderName}`}
    >
      <audio ref={audioRef} src={voiceNoteService.audioUrl(note.audioUrl)} preload="auto" />

      <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-200">
        <BellRing className="size-3.5" /> Tin nhắn thoại đang kêu
      </span>

      <Avatar url={note.senderAvatar} name={note.senderName} size="xl" />
      <div>
        <p className="text-xs text-cream-50/70">Lời nhắn từ</p>
        <p className="text-2xl font-extrabold">{note.senderName}</p>
        <p className="mt-1 text-xs text-cream-50/60">
          {Math.round((note.durationMs || 0) / 1000)} giây
          {note.ringCount > 1 ? ` · đã kêu ${note.ringCount} lần` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) void audio.play().catch(() => {});
          else audio.pause();
        }}
        className="flex size-16 items-center justify-center rounded-full bg-white/15 text-cream-50 ring-1 ring-white/25 transition active:scale-95"
        aria-label="Phát hoặc tạm dừng lời nhắn"
      >
        <PhoneCall className="size-6" />
      </button>

      <button
        type="button"
        onClick={stop}
        disabled={listen.isPending}
        className="w-full max-w-xs rounded-2xl bg-white py-3 text-sm font-bold text-water-700 shadow-lg transition active:scale-[0.99] disabled:opacity-60"
      >
        Đã nghe
      </button>

      <p className="max-w-xs text-[11px] text-cream-50/50">
        Lời nhắn sẽ tiếp tục kêu cho tới khi bạn bấm “Đã nghe”.
      </p>
    </div>
  );
}

export default VoiceNoteOverlay;
