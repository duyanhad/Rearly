import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellRing, Check, Clock, Search, Send, Trash2 } from 'lucide-react';
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

const STEPS = [
  { key: 1, label: 'Ghi âm' },
  { key: 2, label: 'Người nhận' },
  { key: 3, label: 'Giờ gửi' },
];

/**
 * Hẹn lời nhắn thoại theo 3 bước: ghi âm → chọn người nhận → chọn giờ & xác nhận.
 * Gửi xong tự về trạng thái ban đầu (không giữ bản ghi cũ) và hiện xác nhận "đã hẹn".
 */
export function VoiceNoteComposer({ showList = true, onScheduled }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [receiverId, setReceiverId] = useState(null);
  const [term, setTerm] = useState('');
  const [when, setWhen] = useState(defaultWhen);
  const [take, setTake] = useState(null); // { blob, durationMs }
  const [uploading, setUploading] = useState(0);
  const [justScheduled, setJustScheduled] = useState(null);
  const previewRef = useRef(null);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => (await socialService.getFriends()).data,
  });
  const { data: sent = [] } = useQuery({
    queryKey: ['voice-notes-sent'],
    queryFn: async () => (await voiceNoteService.sent()).data,
  });

  const receiver = friends.find((f) => f.id === receiverId) ?? null;
  const visibleFriends = friends.filter(
    (f) => !term || `${f.nickname ?? ''} ${f.fullName}`.toLowerCase().includes(term.toLowerCase()),
  );

  const reset = () => {
    setStep(1);
    setTake(null);
    setReceiverId(null);
    setTerm('');
    setWhen(defaultWhen());
  };

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
    onSuccess: (res) => {
      const note = res?.data ?? null;
      const name = receiver?.nickname || receiver?.fullName;
      toast.show('Đã hẹn gửi', `Sẽ gửi tới ${name} lúc ${whenLabel(when)}.`);
      setJustScheduled({ receiverName: name, when, id: note?.id ?? null });
      reset();
      setUploading(0);
      void qc.invalidateQueries({ queryKey: ['voice-notes-sent'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      onScheduled?.();
    },
    onError: (err) => {
      setUploading(0);
      toast.show('Không hẹn được', errorMessage(err));
    },
  });

  const cancel = useMutation({
    mutationFn: (id) => voiceNoteService.cancel(id),
    onSuccess: () => {
      toast.show('Đã huỷ', 'Lời nhắn này sẽ không được gửi nữa.');
      setJustScheduled(null);
      void qc.invalidateQueries({ queryKey: ['voice-notes-sent'] });
    },
    onError: (err) => toast.show('Không huỷ được', errorMessage(err)),
  });

  useEffect(() => {
    if (!take) return undefined;
    const url = URL.createObjectURL(take.blob);
    if (previewRef.current) previewRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [take]);

  const canNext = step === 1 ? !!take : step === 2 ? !!receiverId : !!take && !!receiverId;

  return (
    <div className="space-y-3">
      {/* Thanh tiến trình 3 bước */}
      <ol className="flex items-center gap-1.5 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
        {STEPS.map((s) => {
          const done = step > s.key;
          const active = step === s.key;
          return (
            <li key={s.key} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => (s.key < step ? setStep(s.key) : null)}
                disabled={s.key > step}
                className={`flex w-full items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition ${
                  active ? 'bg-water-600 text-white' : done ? 'bg-water-50 text-water-700' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${
                    active ? 'bg-white/25' : done ? 'bg-water-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {done ? <Check className="size-2.5" /> : s.key}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Xác nhận sau khi hẹn xong */}
      {justScheduled && (
        <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
            <Check className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-800">Đã hẹn gửi</p>
            <p className="text-xs text-emerald-700">
              Tới <b>{justScheduled.receiverName}</b> lúc <b>{whenLabel(justScheduled.when)}</b>. Huỷ được bất cứ lúc nào
              trước giờ trên.
            </p>
          </div>
          {justScheduled.id && (
            <button
              type="button"
              onClick={() => cancel.mutate(justScheduled.id)}
              className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200"
            >
              Huỷ gửi
            </button>
          )}
        </div>
      )}

      {/* BƯỚC 1 — Ghi âm */}
      {step === 1 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Ghi âm lời nhắn</h2>
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
      )}

      {/* BƯỚC 2 — Người nhận */}
      {step === 2 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Gửi cho ai?</h2>
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
            <>
              {friends.length > 4 && (
                <label className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <Search className="size-4 text-slate-400" />
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Tìm người nhận"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>
              )}
              <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                {visibleFriends.map((f) => {
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
                        {active && <Check className="size-4 shrink-0 text-water-700" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {/* BƯỚC 3 — Giờ gửi + xác nhận */}
      {step === 3 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Gửi lúc nào?</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Giờ gửi (giờ máy của bạn)</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
            />
          </label>

          <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-water-600" /> Gửi tới{' '}
              <b className="text-slate-800">{receiver?.nickname || receiver?.fullName}</b> lúc{' '}
              <b className="text-slate-800">{whenLabel(when)}</b>
            </p>
            <p className="flex items-center gap-1.5">
              <BellRing className="size-3.5 text-amber-500" /> Tới giờ, app sẽ kêu lặp tới khi người nhận bấm “Đã nghe”
            </p>
          </div>

          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={!canNext || create.isPending}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
          >
            <Send className="size-4" />
            {create.isPending ? `Đang gửi... ${uploading}%` : 'Hẹn gửi lời nhắn'}
          </button>
        </section>
      )}

      {/* Điều hướng bước */}
      <div className="flex gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <ArrowLeft className="size-3.5" /> Quay lại
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="flex-1 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
          >
            Tiếp tục
          </button>
        )}
      </div>

      {showList && sent.length > 0 && (
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

export default VoiceNoteComposer;
