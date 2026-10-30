import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, RotateCcw, Send, Square, Trash2 } from 'lucide-react';

/** Vạch sóng (chiều cao cố định để không đổi mỗi lần render). */
const BARS = [8, 14, 20, 12, 18, 24, 10, 16, 22, 14, 20, 12, 18, 24, 16, 10, 20, 14, 18, 8];

const timeOf = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Nút phát + vạch sóng + thời lượng: dùng cho nghe thử trước khi gửi và cho tin nhắn thoại đã gửi. */
export function AudioBubble({ src, durationMs, tone = 'light' }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play().catch(() => setPlaying(false));
  };

  const total = durationMs || 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  const dark = tone === 'dark';

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime * 1000)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={toggle}
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          dark ? 'bg-white/25 text-white' : 'bg-water-600 text-white'
        }`}
        aria-label={playing ? 'Tạm dừng ghi âm' : 'Nghe ghi âm'}
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5 translate-x-px" />}
      </button>
      <span className="flex h-7 items-center gap-[2px]" aria-hidden="true">
        {BARS.map((height, i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full ${
              dark
                ? i / BARS.length <= progress ? 'bg-white' : 'bg-white/40'
                : i / BARS.length <= progress ? 'bg-water-600' : 'bg-water-600/30'
            }`}
            style={{ height: `${height}px` }}
          />
        ))}
      </span>
      <span className={`text-[11px] tabular-nums ${dark ? 'text-white/90' : 'text-slate-500'}`}>
        {timeOf(playing || current > 0 ? current : total)}
      </span>
    </div>
  );
}

/**
 * Ghi âm tin nhắn thoại: bấm mic để ghi → dừng → **nghe thử** rồi mới Gửi (hoặc Ghi lại / Xoá).
 * iOS tạo audio/mp4, Chrome tạo audio/webm.
 */
export function VoiceRecorder({ onSend, disabled, onBusyChange }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(null); // { blob, url, durationMs }
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(0);
  const cancelledRef = useRef(false);
  const pendingUrlRef = useRef(null);

  const clearPendingUrl = () => {
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = null;
    }
  };

  // Báo cho khung chat biết đang ghi/nghe thử để ẩn ô nhập chữ.
  useEffect(() => {
    onBusyChange?.(recording || !!pending);
  }, [recording, pending, onBusyChange]);

  useEffect(
    () => () => {
      window.clearInterval(timerRef.current);
      recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
      clearPendingUrl();
    },
    [],
  );

  const stopTracks = () => {
    recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    recorderRef.current = null;
  };

  const start = async () => {
    setError(null);
    clearPendingUrl();
    setPending(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Thiết bị không hỗ trợ ghi âm.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(
        (type) => MediaRecorder.isTypeSupported?.(type),
      );
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stopTracks();
        setRecording(false);
        setSeconds(0);
        window.clearInterval(timerRef.current);
        if (cancelledRef.current || durationMs < 700 || blob.size === 0) return;
        const url = URL.createObjectURL(blob);
        pendingUrlRef.current = url;
        setPending({ blob, url, durationMs });
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setSeconds(0);
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 120) recorder.stop(); // giới hạn 2 phút
      }, 500);
    } catch {
      setError('Không mở được micro. Hãy cho phép quyền ghi âm.');
    }
  };

  const finish = () => recorderRef.current?.stop();

  const cancel = () => {
    cancelledRef.current = true;
    recorderRef.current?.stop();
  };

  const sendNow = () => {
    if (!pending) return;
    onSend(pending.blob, pending.durationMs);
    clearPendingUrl();
    setPending(null);
  };

  const discard = () => {
    clearPendingUrl();
    setPending(null);
  };

  if (recording) {
    return (
      <span className="flex items-center gap-1">
        <span className="flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-600">
          <span className="size-2 animate-pulse rounded-full bg-rose-500" />
          {timeOf(seconds * 1000)}
        </span>
        <button
          type="button"
          onClick={cancel}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100"
          aria-label="Huỷ ghi âm"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={finish}
          className="rounded-xl bg-water-600 p-2 text-white transition hover:bg-water-700"
          aria-label="Dừng ghi âm"
        >
          <Square className="size-4" />
        </button>
      </span>
    );
  }

  if (pending) {
    return (
      <span className="flex w-full items-center gap-1.5">
        <button
          type="button"
          onClick={discard}
          className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50"
          aria-label="Xoá bản ghi"
        >
          <Trash2 className="size-4" />
        </button>
        <span className="min-w-0 flex-1 rounded-xl bg-water-50 px-2 py-1.5 ring-1 ring-water-200">
          <AudioBubble src={pending.url} durationMs={pending.durationMs} />
        </span>
        <button
          type="button"
          onClick={start}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Ghi lại"
          title="Ghi lại"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          onClick={sendNow}
          disabled={disabled}
          className="rounded-xl bg-water-600 p-2 text-white transition hover:bg-water-700 disabled:opacity-50"
          aria-label="Gửi tin nhắn thoại"
          title="Gửi"
        >
          <Send className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <span className="relative flex items-center">
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        className="rounded-xl border border-slate-200 p-2 text-water-700 transition hover:bg-water-50 disabled:opacity-50"
        aria-label="Ghi âm tin nhắn thoại"
        title="Ghi tin nhắn thoại"
      >
        <Mic className="size-4" />
      </button>
      {error && <span className="absolute -bottom-6 right-0 whitespace-nowrap text-[10px] text-rose-600">{error}</span>}
    </span>
  );
}

export default VoiceRecorder;
