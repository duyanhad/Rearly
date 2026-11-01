import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Mic, Send, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../components/Avatar';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { socialService } from '../../../services/socialService';
import { voiceNoteService } from '../../../services/voiceNoteService';
import { VoiceRecorder } from '../../chat/components/VoiceRecorder';

/** Giờ mặc định cho ô hẹn: bây giờ + 5 phút, theo giờ máy. */
function defaultWhen() {
  const d = new Date(Date.now() + 5 * 60_000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const whenLabel = (iso) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/**
 * Hẹn lời nhắn thoại: ghi âm → chọn người nhận (bạn bè/partner) + giờ gửi.
 * Tới giờ, app người nhận kêu lặp (3 lần/phút) cho tới khi họ bấm "đã nghe".
 */
export function VoiceNotePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [receiverId, setReceiverId] = useState(null);
  const [when, setWhen] = useState(defaultWhen);
  const [take, setTake] = useState(null); // { blob, durationMs }
  const [uploading, setUploading] = useState(0);
  const previewRef = useRef(null);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await socialService.getFriends()).data,
  });
  const { data: sent = [] } = useQuery({
    queryKey: ['voice-notes-sent'],
    queryFn: async () => (await voiceNoteService.sent()).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('receiverId', receiverId);
      // Đổi giờ máy sang ISO UTC để server so sánh chính xác.
      form.append('scheduledAtUtc', new Date(when).toISOString());
      form.append('durationMs', String(take.durationMs));
      form.append('audio', take.blob, 'voice-note.webm');
      setUploading(1);
      return voiceNoteService.create(form, setUploading);
    },
    onSuccess: () => {
      toast.show('Đã hẹn gửi', 'Tới giờ, người nhận sẽ được kêu liên tục tới khi nghe.');
      setTake(null);
      setUploading(0);
      void qc.invalidateQueries({ queryKey: ['voice-notes-sent'] });
    },
    onError: (err) => {
      setUploading(0);
      toast.show('Không hẹn được', errorMessage(err));
    },
  });

  const cancel = useMutation({
    mutationFn: (id) => voiceNoteService.cancel(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['voice-notes-sent'] }),
    onError: (err) => toast.show('Không huỷ được', errorMessage(err)),
  });

  useEffect(() => {
    if (!take) return undefined;
    const url = URL.createObjectURL(take.blob);
    if (previewRef.current) previewRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [take]);

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

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">1. Ghi âm</h2>
        {take ? (
          <div className="rounded-xl bg-slate-50 p-3">
            <audio ref={previewRef} controls className="w-full" />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">{Math.round(take.durationMs / 1000)} giây</span>
              <button
                type="button"
                onClick={() => setTake(null)}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Ghi lại
              </button>
            </div>
          </div>
        ) : (
          <VoiceRecorder onSend={(blob, durationMs) => setTake({ blob, durationMs })} />
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">2. Gửi cho ai & lúc nào</h2>

        {isLoading ? (
          <DearlyLoader size="sm" />
        ) : friends.length === 0 ? (
          <p className="text-xs text-slate-500">
            Chưa có bạn bè. Kết bạn trước ở{' '}
            <Link to="/friends" className="font-semibold text-water-700">
              trang Bạn bè
            </Link>
            .
          </p>
        ) : (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {friends.map((f) => {
              const active = receiverId === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setReceiverId(f.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition ${
                      active ? 'bg-water-50 ring-1 ring-water-300' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <Avatar url={f.avatarUrl} name={f.fullName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {f.nickname || f.fullName}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {f.isMyPartner ? 'Partner duyệt ảnh' : 'Bạn bè'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Giờ gửi (giờ máy của bạn)</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={!take || !receiverId || create.isPending}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
        >
          <Send className="size-4" />
          {create.isPending ? `Đang gửi... ${uploading}%` : 'Hẹn gửi lời nhắn'}
        </button>
      </section>

      {sent.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <BellRing className="size-4 text-water-600" /> Đã hẹn ({sent.length})
          </h2>
          <ul className="space-y-1.5">
            {sent.map((v) => (
              <li key={v.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{v.senderName}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {whenLabel(v.scheduledAtUtc)} · {Math.round(v.durationMs / 1000)}s
                    {v.listenedAtUtc ? ' · đã nghe' : v.ringCount > 0 ? ` · đã kêu ${v.ringCount} lần` : ' · chờ tới giờ'}
                  </p>
                </div>
                {!v.listenedAtUtc && (
                  <button
                    type="button"
                    onClick={() => cancel.mutate(v.id)}
                    aria-label="Huỷ lời nhắn"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default VoiceNotePage;
