import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, Loader2, ShieldAlert } from 'lucide-react';

const MAX_SIDE = 1280;

/**
 * Camera trong app: xem trực tiếp rồi chụp ảnh cốc nước bằng getUserMedia.
 * Camera bị chặn / không có thiết bị thì chuyển sang chọn ảnh từ máy.
 */
export function CameraCapture({ onCapture, onSkip, required = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInput = useRef(null);
  const [status, setStatus] = useState('starting');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let alive = true;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setMessage('Thiết bị không hỗ trợ camera trong trình duyệt. Bạn có thể chọn ảnh có sẵn.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        if (!alive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('live');
      } catch (err) {
        if (!alive) return;
        setStatus('error');
        setMessage(
          err?.name === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền camera. Cho phép camera trong thanh địa chỉ rồi thử lại, hoặc chọn ảnh có sẵn.'
            : 'Không mở được camera. Bạn có thể chọn ảnh có sẵn.',
        );
      }
    }

    void start();
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function shoot() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage('Chụp ảnh thất bại, thử lại giúp mình nhé.');
          return;
        }
        const file = new File([blob], `coc-nuoc-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.9,
    );
  }

  return (
    <div>
      <p className="mb-3 rounded-xl bg-water-50 px-3 py-2 text-xs text-water-800">
        Bước 1 · Chụp ảnh cốc nước bạn vừa uống
        {required ? ' (bắt buộc)' : ' (có thể bỏ qua)'}
      </p>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`size-full object-cover ${status === 'live' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Khung ngắm */}
        {status === 'live' && (
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/60">
            <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white">
              Đặt cốc vào giữa khung
            </span>
          </div>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <Loader2 className="size-7 animate-spin" />
            <p className="text-sm">Đang mở camera...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/90">
            <ShieldAlert className="size-8" />
            <p className="text-sm">{message}</p>
          </div>
        )}
      </div>

      {status === 'live' ? (
        <button
          type="button"
          onClick={shoot}
          className="mx-auto mt-4 flex size-16 items-center justify-center rounded-full bg-white ring-4 ring-water-200 transition active:scale-95"
          aria-label="Chụp ảnh cốc nước"
        >
          <Camera className="size-7 text-water-700" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600"
        >
          <ImageUp className="size-4" /> Chọn ảnh có sẵn
        </button>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCapture(file, URL.createObjectURL(file));
          e.target.value = '';
        }}
      />

      {!required && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          Bỏ qua, không chụp ảnh
        </button>
      )}
    </div>
  );
}

export default CameraCapture;
