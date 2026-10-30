import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Moon, Play, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { sleepService } from '../../../services/sleepService';

/**
 * Bước 1 của giấc ngủ: chốt giờ đi ngủ + chụp ảnh minh chứng (ảnh này chỉ chụp lúc bắt đầu).
 * Phiếu được lưu ở trạng thái "đang ngủ"; lúc dậy sẽ chốt giờ thức + minh chứng dậy.
 */
export function SleepStartModal({ onClose, defaultBed = '23:00' }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [bed, setBed] = useState(defaultBed);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const pickPhoto = (file) => {
    if (!file) return;
    setPhoto(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('bedTime', bed);
      if (photo) form.append('photo', photo);
      return sleepService.start(form);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sleep'] });
      onClose?.();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <Moon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Bắt đầu giấc ngủ</h2>
            <p className="text-[11px] text-slate-500">Chốt giờ đi ngủ và chụp ảnh minh chứng</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Moon className="size-3.5" /> Đi ngủ
          </span>
          <input
            type="time"
            value={bed}
            onChange={(e) => setBed(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

        {preview ? (
          <div className="relative mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
            <img src={preview} alt="Ảnh minh chứng đi ngủ" className="h-40 w-full object-cover" />
            <button
              onClick={() => {
                setPhoto(null);
                setPreview('');
              }}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow"
              aria-label="Bỏ ảnh"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-water-300 hover:text-water-700"
          >
            <Camera className="size-6" />
            <span className="text-sm font-semibold">Chụp ảnh minh chứng đi ngủ</span>
            <span className="text-[10px]">Ví dụ: gối, giường, đèn đã tắt</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Huỷ
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Bắt đầu ngủ
          </button>
        </div>
      </div>
    </div>
  );
}

export default SleepStartModal;
