import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BellRing, Send, Volume2, VolumeX, X } from 'lucide-react';
import { nudgeVideoService } from '../../../services/nudgeVideoService';

// Chọn nhắc nhu cầu nào (kèm lời nhắn) — dùng chung cho chat và trang Bạn/Partner.
const KINDS = [
  { id: 'water', label: 'Nước', emoji: '💧' },
  { id: 'meal', label: 'Bữa ăn', emoji: '🍚' },
  { id: 'medicine', label: 'Thuốc', emoji: '💊' },
  { id: 'study', label: 'Học tập', emoji: '📚' },
  { id: 'sleep', label: 'Giấc ngủ', emoji: '😴' },
  { id: 'weight', label: 'Cân nặng', emoji: '⚖️' },
];

export function NudgeSheet({ name, onClose, onSend, sending }) {
  const [kind, setKind] = useState('water');
  const [message, setMessage] = useState('');
  const [withVideo, setWithVideo] = useState(false);
  const previewRef = useRef(null);
  const [previewMuted, setPreviewMuted] = useState(true);

  const { data: videos = [] } = useQuery({
    queryKey: ['nudge-videos'],
    queryFn: async () => (await nudgeVideoService.list()).data,
    staleTime: 5 * 60_000,
  });

  // Mỗi nhu cầu có thể có nhiều video → chọn ngẫu nhiên một cái để xem trước; đổi nhu cầu là đổi video.
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    const pool = videos.filter((v) => v.kind === kind);
    setPreview(pool.length ? pool[Math.floor(Math.random() * pool.length)].url : null);
    setWithVideo(false);
  }, [kind, videos]);

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Nhắc {name ?? 'bạn ấy'}</h2>
            <p className="text-[11px] text-slate-500">Chọn nhắc điều gì và thêm lời nhắn (không bắt buộc)</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-xl border px-1 py-2 text-center transition ${
                  active ? 'border-water-500 bg-water-50 ring-1 ring-water-200' : 'border-slate-200 hover:border-water-300'
                }`}
              >
                <span className="block text-base leading-none">{k.emoji}</span>
                <span className="mt-1 block text-[11px] font-semibold text-slate-700">{k.label}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lời nhắn</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            placeholder="Ví dụ: nhớ uống 2 cốc trước 10h nhé"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

        {preview && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
            <div className="relative">
              <video
                ref={previewRef}
                src={nudgeVideoService.url(preview)}
                className={`w-full rounded-lg bg-slate-900 object-cover transition ${withVideo ? '' : 'opacity-50'}`}
                style={{ maxHeight: '32vh' }}
                autoPlay
                loop
                muted
                playsInline
              />
              <button
                type="button"
                onClick={() => {
                  const v = previewRef.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setPreviewMuted(v.muted);
                  if (!v.muted) void v.play().catch(() => {});
                }}
                aria-label={previewMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                className="absolute bottom-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-slate-900/55 text-white backdrop-blur"
              >
                {previewMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-800">Kèm video ngắn</p>
                <p className="text-[11px] text-slate-500">
                  {withVideo ? 'Sẽ gửi kèm video này' : 'Không gửi video — chỉ gửi lời nhắc như thường'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={withVideo}
                onClick={() => setWithVideo((v) => !v)}
                aria-label="Gửi kèm video"
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${withVideo ? 'bg-water-600' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${withVideo ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => onSend?.({ kind, message: message.trim(), sendVideo: Boolean(preview) && withVideo })}
          disabled={sending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-water-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-water-700 disabled:opacity-60"
        >
          <Send className="size-4" /> {sending ? 'Đang gửi…' : withVideo && preview ? 'Gửi nhắc + video' : 'Gửi nhắc nhở'}
        </button>
      </div>
    </div>
  );
}

export default NudgeSheet;
