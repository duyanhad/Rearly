import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Lock, Mic, Pause, Play, RotateCcw, Send, Trash2 } from 'lucide-react';

/**
 * Ghi âm tin nhắn thoại kiểu Messenger (React + Pointer Events + Web Audio API).
 *
 * State machine:
 *   IDLE --giữ mic--> RECORDING --vuốt trái--> SWIPING_CANCEL
 *                              --vuốt lên-->  LOCKED_RECORDING
 *                              --buông-->     PREVIEW
 * Gesture: deltaX < -60 → huỷ, deltaY < -60 → khoá (thả tay vẫn ghi).
 */

const CANCEL_DX = -60;
const LOCK_DY = -60;
const MAX_MS = 120_000;
const BARS = 34;
const BUBBLE_BARS = 20;

const timeOf = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Định dạng ghi âm tốt nhất thiết bị hỗ trợ (iOS: mp4, Chrome: webm/opus). */
const pickMime = () =>
  ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
    (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type),
  );

/**
 * Bong bóng audio: nút phát + vạch sóng + thời lượng.
 * `peaks`: biên độ 0..1 (bản thu thật) hoặc chiều cao pixel (tin đã gửi).
 * `onSeek`: có thì chạm/vuốt trên sóng để phát từ vị trí bất kỳ.
 */
export function AudioBubble({ src, durationMs, tone = 'light', peaks, onSeek, autoPlay }) {
  const audioRef = useRef(null);
  const waveRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);

  const bars = peaks?.length ? peaks : Array.from({ length: BUBBLE_BARS }, (_, i) => [8, 14, 20, 12, 18, 24, 10, 16, 22, 14][i % 10]);
  const heights = bars.map((raw) => (raw <= 1 ? raw * 100 : raw));
  const maxHeight = Math.max(...heights, 1);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  useEffect(() => {
    if (autoPlay) void audioRef.current?.play().catch(() => undefined);
  }, [autoPlay, src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play().catch(() => setPlaying(false));
  };

  const total = durationMs || 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  const dark = tone === 'dark';

  const seekAt = (clientX) => {
    const box = waveRef.current;
    const audio = audioRef.current;
    if (!box || !audio || !total) return;
    const rect = box.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = (ratio * total) / 1000;
    setCurrent(ratio * total);
  };

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
      <span
        ref={waveRef}
        onPointerDown={(e) => {
          if (!onSeek) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          seekAt(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!onSeek || !e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
          seekAt(e.clientX);
        }}
        className={`flex h-7 flex-1 items-center gap-[2px] ${onSeek ? 'cursor-pointer touch-none' : ''}`}
        aria-hidden="true"
      >
        {heights.map((height, i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full ${
              dark
                ? i / heights.length <= progress ? 'bg-white' : 'bg-white/40'
                : i / heights.length <= progress ? 'bg-water-600' : 'bg-water-600/30'
            }`}
            style={{ height: `${Math.max(3, (height / maxHeight) * 26)}px` }}
          />
        ))}
      </span>
      <span className={`shrink-0 text-[11px] tabular-nums ${dark ? 'text-white/90' : 'text-slate-500'}`}>
        {timeOf(playing || current > 0 ? current : total)}
      </span>
    </div>
  );
}

/** Bản thu đang xem lại: bottom sheet có sóng chạm/vuốt để tua + Xoá / Thu lại / Gửi. */
function PreviewSheet({ take, onDiscard, onRetry, onSend, sending }) {
  const [autoPlay, setAutoPlay] = useState(true);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40" role="dialog" aria-label="Xem lại bản ghi âm">
      <button type="button" aria-label="Đóng" onClick={onDiscard} className="flex-1" />
      <div className="rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        <p className="mb-3 text-center text-xs text-slate-500">Chạm hoặc vuốt trên sóng để nghe từ đoạn bất kỳ</p>
        <div className="rounded-2xl bg-water-50 px-3 py-2.5 ring-1 ring-water-200">
          <AudioBubble src={take.url} durationMs={take.durationMs} peaks={take.peaks} onSeek autoPlay={autoPlay} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onDiscard}
            className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"
            aria-label="Xoá bản ghi"
          >
            <Trash2 className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoPlay(false);
              onRetry();
            }}
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Thu lại"
          >
            <RotateCcw className="size-5" />
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="flex h-11 items-center gap-2 rounded-full bg-water-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
            aria-label="Gửi tin nhắn thoại"
          >
            <Send className="size-4" /> Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

export function VoiceRecorder({ onSend, disabled, onBusyChange }) {
  const [state, setState] = useState('IDLE'); // IDLE | RECORDING | SWIPING_CANCEL | LOCKED_RECORDING | PREVIEW
  const [seconds, setSeconds] = useState(0);
  const [peaks, setPeaks] = useState([]);
  const [take, setTake] = useState(null); // { blob, url, durationMs, peaks }
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(0);
  const cancelledRef = useRef(false);
  const takeUrlRef = useRef(null);
  const startPointRef = useRef(null);
  const peaksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const lockedRef = useRef(false);

  const recording = state === 'RECORDING' || state === 'SWIPING_CANCEL' || state === 'LOCKED_RECORDING';
  const cancelling = state === 'SWIPING_CANCEL';
  const cancellingRef = useRef(false);
  cancellingRef.current = cancelling;

  useEffect(() => {
    onBusyChange?.(recording || state === 'PREVIEW');
  }, [recording, state, onBusyChange]);

  const cleanupAudio = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    recorderRef.current = null;
    void audioCtxRef.current?.close?.().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const clearTakeUrl = () => {
    if (takeUrlRef.current) {
      URL.revokeObjectURL(takeUrlRef.current);
      takeUrlRef.current = null;
    }
  };

  useEffect(
    () => () => {
      window.clearInterval(timerRef.current);
      cleanupAudio();
      clearTakeUrl();
    },
    [cleanupAudio],
  );

  /** Vẽ biên độ thật từ AnalyserNode (RMS) thành mảng peaks. */
  const pumpWaveform = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      if (!analyserRef.current) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();
      if (now - (peaksRef.current.at(-1)?.t ?? 0) > 90) {
        peaksRef.current.push({ t: now, v: Math.min(1, Math.max(0.08, rms * 4.5)) });
        setPeaks(peaksRef.current.map((p) => p.v));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const begin = useCallback(async () => {
    setError(null);
    clearTakeUrl();
    setTake(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Thiết bị không hỗ trợ ghi âm.');
      setState('IDLE');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      lockedRef.current = false;
      peaksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupAudio();
        window.clearInterval(timerRef.current);
        setSeconds(0);
        if (cancelledRef.current || durationMs < 500 || !blob.size) {
          setState('IDLE');
          setPeaks([]);
          return;
        }
        const url = URL.createObjectURL(blob);
        takeUrlRef.current = url;
        setTake({ blob, url, durationMs, peaks: peaksRef.current.map((p) => p.v) });
        setState('PREVIEW');
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();

      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        pumpWaveform();
      } catch {
        // Không có Web Audio vẫn ghi âm được, sóng chỉ hiện thanh giả.
      }

      setSeconds(0);
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setSeconds(Math.floor(elapsed / 1000));
        if (elapsed >= MAX_MS) recorderRef.current?.stop();
      }, 250);
    } catch {
      setError('Không mở được micro. Hãy cho phép quyền ghi âm.');
      setState('IDLE');
    }
  }, [cleanupAudio]);

  const finish = (cancelled) => {
    cancelledRef.current = cancelled;
    lockedRef.current = false;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    else {
      cleanupAudio();
      window.clearInterval(timerRef.current);
      setState('IDLE');
      setPeaks([]);
    }
  };

  // ---- Gesture: giữ để ghi, vuốt trái để huỷ, vuốt lên để khoá ----
  // Nút mic bị unmount khi vào RECORDING nên phải nghe sự kiện ở window, không nghe trên nút.
  useEffect(() => {
    if (!recording) return undefined;

    const onMove = (event) => {
      if (lockedRef.current || !startPointRef.current) return;
      const dx = event.clientX - startPointRef.current.x;
      const dy = event.clientY - startPointRef.current.y;
      if (dy < LOCK_DY && Math.abs(dy) > Math.abs(dx)) {
        lockedRef.current = true;
        setState('LOCKED_RECORDING');
        return;
      }
      setState(dx < CANCEL_DX ? 'SWIPING_CANCEL' : 'RECORDING');
    };

    const onUp = (event) => {
      const start = startPointRef.current;
      startPointRef.current = null;
      if (!start || lockedRef.current) return; // đã khoá → thả tay không dừng
      const dx = event.clientX - start.x;
      finish(cancellingRef.current || dx < CANCEL_DX);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [recording]);

  const onPointerDown = (event) => {
    if (disabled || state !== 'IDLE') return;
    startPointRef.current = { x: event.clientX, y: event.clientY };
    setState('RECORDING');
    void begin();
  };

  const stopLocked = () => finish(false);

  const discard = () => {
    clearTakeUrl();
    setTake(null);
    setPeaks([]);
    setState('IDLE');
  };

  const shownPeaks = useMemo(() => {
    if (!peaks.length) return Array.from({ length: BARS }, () => 0.15);
    return peaks.length <= BARS ? peaks : peaks.slice(-BARS);
  }, [peaks]);

  if (state === 'PREVIEW' && take) {
    return (
      <PreviewSheet
        take={take}
        sending={disabled}
        onDiscard={discard}
        onRetry={() => {
          discard();
          void begin();
          setState('RECORDING');
        }}
        onSend={() => {
          onSend(take.blob, take.durationMs);
          discard();
        }}
      />
    );
  }

  if (recording) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[65] flex flex-col items-center gap-1.5">
        <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] text-white">
          {state === 'LOCKED_RECORDING'
            ? 'Đang ghi · thả tay vẫn tiếp tục'
            : cancelling
              ? 'Buông ra để huỷ'
              : 'Vuốt sang trái để huỷ hoặc vuốt lên để khoá'}
        </span>
        <div className="flex w-full max-w-md items-center gap-2 px-3">
          <Trash2
            className={`size-6 shrink-0 transition-colors duration-150 ${cancelling ? 'text-rose-500' : 'text-slate-400'}`}
            aria-hidden="true"
          />
          <div
            className={`flex h-11 flex-1 items-center gap-2 rounded-full px-3 text-white shadow-lg transition-colors duration-150 ${
              cancelling ? 'bg-rose-500' : 'bg-[#0084FF]'
            }`}
          >
            <span className="flex h-7 flex-1 items-center gap-[2px]">
              {shownPeaks.map((value, i) => (
                <span
                  key={i}
                  className="w-[2px] rounded-full bg-white/90"
                  style={{ height: `${Math.max(3, value * 26)}px` }}
                />
              ))}
            </span>
            <span className="shrink-0 text-xs font-semibold tabular-nums">{timeOf(seconds * 1000)}</span>
          </div>
          {state === 'LOCKED_RECORDING' ? (
            <button
              type="button"
              onClick={stopLocked}
              className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0084FF] text-white"
              aria-label="Dừng ghi âm"
            >
              <ArrowUp className="size-4 rotate-90" />
            </button>
          ) : (
            <Lock className="size-5 shrink-0 text-slate-500" aria-hidden="true" />
          )}
        </div>
      </div>
    );
  }

  return (
    <span className="relative flex items-center">
      <button
        type="button"
        onPointerDown={onPointerDown}
        onContextMenu={(event) => event.preventDefault()}
        disabled={disabled}
        className="touch-none select-none rounded-xl border border-slate-200 p-2 text-water-700 transition hover:bg-water-50 active:bg-water-100 disabled:opacity-50"
        aria-label="Giữ để ghi tin nhắn thoại"
        title="Giữ để ghi tin nhắn thoại"
      >
        <Mic className="size-4" />
      </button>
      {error && (
        <span className="absolute -bottom-6 right-0 whitespace-nowrap text-[10px] text-rose-600">{error}</span>
      )}
    </span>
  );
}

export default VoiceRecorder;
