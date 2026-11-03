import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Headphones, Pause, Play, Reply, Trash2 } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { voiceNoteService } from '../../../services/voiceNoteService';
import { VoiceNoteReplySheet } from './VoiceNoteReplySheet';

const whenLabel = (iso) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/**
 * Hộp thư lời nhắn thoại ĐÃ NHẬN — nghe lại bất cứ lúc nào và trả lời bằng voice nếu muốn.
 * Lời nhắn chưa tới giờ hẹn không nằm trong danh sách này (server chặn).
 */
export function VoiceNoteInbox() {
  const toast = useToast();
  const qc = useQueryClient();
  const [playingId, setPlayingId] = useState(null);
  const [replying, setReplying] = useState(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['voice-notes-inbox'],
    queryFn: async () => (await voiceNoteService.inbox()).data,
    refetchInterval: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id) => voiceNoteService.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['voice-notes-inbox'] });
      toast.show('Đã xoá lời nhắn');
    },
    onError: () => toast.show('Không xoá được', 'Thử lại sau nhé.'),
  });

  if (isLoading || items.length === 0) return null;

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Headphones className="size-4 text-water-600" /> Lời nhắn đã nhận ({items.length})
        </h2>
        <ul className="space-y-1.5">
          {items.map((v) => {
            const playing = playingId === v.id;
            return (
              <li key={v.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Avatar url={v.senderAvatar} name={v.senderName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{v.senderName}</p>
                    <p className="truncate text-[10px] text-slate-500">
                      {whenLabel(v.scheduledAtUtc)} · {Math.round(v.durationMs / 1000)}s
                      {v.listenedAtUtc ? ' · đã nghe' : v.ringCount > 0 ? ' · chưa nghe' : ' · đã tới giờ'}
                    </p>
                  </div>
                {v.ringCount > 0 && !v.listenedAtUtc && (
                    <BellRing className="size-3.5 shrink-0 text-amber-500" aria-label="Chưa nghe" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPlayingId(playing ? null : v.id)}
                    aria-label={playing ? 'Dừng phát' : 'Nghe lại lời nhắn'}
                    className={`grid size-8 shrink-0 place-items-center rounded-full transition ${
                      playing ? 'bg-water-700 text-white' : 'bg-white text-water-700 ring-1 ring-slate-200'
                    }`}
                  >
                    {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplying(v)}
                    disabled={(v.round ?? 0) >= 2}
                    aria-label={`Trả lời ${v.senderName} bằng voice`}
                    title={(v.round ?? 0) >= 2 ? 'Đã hết 2 vòng trả lời' : 'Trả lời bằng voice'}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:text-water-700 disabled:opacity-40"
                  >
                    <Reply className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(v.id)}
                    disabled={remove.isPending}
                    aria-label="Xoá lời nhắn khỏi hộp thư"
                    title="Xoá khỏi hộp thư"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {playing && (
                  <audio
                    key={v.id}
                    autoPlay
                    controls
                    src={voiceNoteService.audioUrl(v.audioUrl)}
                    onEnded={() => setPlayingId(null)}
                    className="mt-2 w-full"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {replying && <VoiceNoteReplySheet note={replying} onClose={() => setReplying(null)} />}
    </>
  );
}

export default VoiceNoteInbox;