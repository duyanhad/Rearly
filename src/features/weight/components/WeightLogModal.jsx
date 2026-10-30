import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Save, Scale, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitLogService } from '../../../services/habitLogService';

const nowHhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Popup ghi một lần cân: số kg, giờ cân, ảnh bàn cân và ghi chú. */
export function WeightLogModal({ onClose, lastKg }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [weight, setWeight] = useState(lastKg ? lastKg.toFixed(1) : '');
  const [time, setTime] = useState(nowHhmm());
  const [note, setNote] = useState('');
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
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh quá lớn (tối đa 5 MB) — chọn ảnh nhỏ hơn hoặc chụp lại.');
      return;
    }
    setError(null);
    setPhoto(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  // Nhận cả dấu phẩy (bàn phím VN) lẫn dấu chấm.
  const normalized = weight.replace(',', '.').trim();
  const kgNumber = Number(normalized);
  const valid = normalized !== '' && Number.isFinite(kgNumber) && kgNumber >= 20 && kgNumber <= 300;
  const value = Math.round(kgNumber * 1000);

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('time', time);
      form.append('value', String(value));
      if (note.trim()) form.append('note', note.trim());
      if (photo) form.append('photo', photo);
      return habitLogService.add('weight', form);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habit-day', 'weight'] });
      await qc.invalidateQueries({ queryKey: ['habit-history', 'weight'] });
      onClose?.();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <Scale className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Ghi cân nặng</h2>
            <p className="text-[11px] text-slate-500">Cân gần nhất: {lastKg ? `${lastKg.toFixed(1)} kg` : 'chưa có'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cân nặng (kg)</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="62.5"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-water-400 focus:bg-white focus:outline-none"
            />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Giờ cân</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
            />
          </label>
        </div>

        {preview ? (
          <div className="relative mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
            <img src={preview} alt="Ảnh bàn cân" className="max-h-40 w-full bg-slate-50 object-contain" />
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
            className="mt-3 flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-water-300 hover:text-water-700"
          >
            <Camera className="size-5" />
            <span className="text-xs font-semibold">Chụp / chọn ảnh bàn cân</span>
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

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ghi chú</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: cân buổi sáng sau khi thức dậy"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>}
        {!valid && weight.trim() !== '' && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
            Cân nặng phải trong khoảng 20–300 kg (dùng dấu chấm hoặc phẩy).
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Huỷ
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !valid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu cân nặng
          </button>
        </div>
      </div>
    </div>
  );
}

export default WeightLogModal;
