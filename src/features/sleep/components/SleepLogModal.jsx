import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ImageIcon, Loader2, Moon, Send, Sunrise, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { sleepService } from '../../../services/sleepService';

const toHours = (m) => `${Math.floor((m || 0) / 60)}h${String((m || 0) % 60).padStart(2, '0')}`;

/**
 * Chốt giấc ngủ: giờ thức + minh chứng dậy đúng giờ + ghi chú giấc mơ.
 * `bedEditable` = ghi tay một đêm đã xong (được sửa giờ đi ngủ và có thêm ảnh minh chứng đi ngủ);
 * khi đã bấm "Bắt đầu giấc ngủ" thì giờ đi ngủ khoá theo phiếu đang ngủ.
 */
export function SleepLogModal({ onClose, bed: bedProp = '23:00', bedEditable = true, defaultWake = '07:00' }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const wakeFileRef = useRef(null);
  const [bed, setBed] = useState(bedProp);
  const [wake, setWake] = useState(defaultWake);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [wakePhoto, setWakePhoto] = useState(null);
  const [wakePreview, setWakePreview] = useState('');
  const [error, setError] = useState(null);

  // Dọn URL xem trước khi đóng popup.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
      if (wakePreview) URL.revokeObjectURL(wakePreview);
    },
    [preview, wakePreview],
  );

  const minutes = (() => {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let diff = wh * 60 + wm - (bh * 60 + bm);
    if (diff <= 0) diff += 1440;
    return diff;
  })();

  const pickPhoto = (file) => {
    if (!file) return;
    setPhoto(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const pickWakePhoto = (file) => {
    if (!file) return;
    setWakePhoto(file);
    setWakePreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (bedEditable) form.append('bedTime', bed);
      form.append('wakeTime', wake);
      if (note.trim()) form.append('note', note.trim());
      if (photo) form.append('photo', photo);
      if (wakePhoto) form.append('wakePhoto', wakePhoto);
      return sleepService.submit(form);
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
            <Sunrise className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">
              {bedEditable ? 'Ghi giấc ngủ' : 'Kết thúc giấc ngủ'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {bedEditable
                ? 'Nhập giờ ngủ, giờ thức và ghi chú giấc mơ'
                : `Đã bắt đầu từ ${bed} — chỉ cần chốt giờ thức và ảnh dậy`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Moon className="size-3.5" /> Đi ngủ
            </span>
            <input
              type="time"
              value={bed}
              onChange={(e) => setBed(e.target.value)}
              readOnly={!bedEditable}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none read-only:text-slate-500"
            />
          </label>
          <label>
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Sunrise className="size-3.5" /> Thức dậy
            </span>
            <input
              type="time"
              value={wake}
              onChange={(e) => setWake(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center text-base font-bold tabular-nums text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-2 flex items-baseline justify-between rounded-xl bg-water-50 px-3 py-2">
          <span className="text-xs font-medium text-water-700">Số giờ đạt được</span>
          <span className="text-lg font-extrabold tabular-nums text-water-700">{toHours(minutes)}</span>
        </div>

        {/* Ảnh minh chứng đi ngủ — chỉ ở luồng ghi tay; luồng bắt đầu đã chụp rồi */}
        {bedEditable &&
          (preview ? (
            <div className="relative mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={preview} alt="Ảnh minh chứng đi ngủ" className="h-28 w-full object-cover" />
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
              className="mt-3 flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 hover:border-water-300 hover:text-water-700"
            >
              <Camera className="size-4" /> Ảnh minh chứng lúc đi ngủ (tuỳ chọn)
            </button>
          ))}
        {bedEditable && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        )}

        {/* Minh chứng dậy đúng giờ */}
        <div className="mt-3 rounded-xl border border-slate-200 p-2">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Sunrise className="size-3.5 text-amber-500" /> Minh chứng dậy đúng giờ
          </p>
          {wakePreview ? (
            <div className="relative overflow-hidden rounded-lg ring-1 ring-slate-200">
              <img src={wakePreview} alt="Ảnh dậy đúng giờ" className="h-28 w-full object-cover" />
              <button
                onClick={() => {
                  setWakePhoto(null);
                  setWakePreview('');
                }}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow"
                aria-label="Bỏ ảnh dậy đúng giờ"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => wakeFileRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 hover:border-water-300 hover:text-water-700"
            >
              <Camera className="size-4" /> Chụp ảnh lúc vừa thức (tuỳ chọn)
            </button>
          )}
          <input
            ref={wakeFileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => pickWakePhoto(e.target.files?.[0])}
          />
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ghi chú giấc mơ
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: mơ thấy biển, dậy đúng giờ"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

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
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {photo || wakePhoto ? 'Gửi partner duyệt' : bedEditable ? 'Lưu giấc ngủ' : 'Kết thúc giấc ngủ'}
          </button>
        </div>
        {!photo && !wakePhoto && (
          <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <ImageIcon className="size-3" /> Không có ảnh thì phiếu được ghi nhận luôn.
          </p>
        )}
      </div>
    </div>
  );
}

export default SleepLogModal;
