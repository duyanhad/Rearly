import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

/**
 * Nút ghi âm tin nhắn thoại. Bấm để ghi, bấm lần nữa để gửi; nút thùng rác để huỷ.
 * Ghi bằng MediaRecorder của trình duyệt: iOS tạo audio/mp4, Chrome tạo audio/webm.
 */
export function VoiceRecorder({ onSend, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      window.clearInterval(timerRef.current);
      recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    },
    [],
  );

  const stopTracks = () => {
    recorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    recorderRef.current = null;
  };

  const start = async () => {
    setError(null);
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
        onSend(blob, durationMs);
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

  if (recording) {
    return (
      <span className="flex items-center gap-1">
        <span className="flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-600">
          <span className="size-2 animate-pulse rounded-full bg-rose-500" />
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
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
          aria-label="Gửi tin nhắn thoại"
        >
          <Square className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end">
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
