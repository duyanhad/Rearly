import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Clock, Loader2, Send, X } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { habitLogService } from '../../../services/habitLogService';
import { HABIT_KINDS } from '../config';

const nowText = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Popup ghi nhận nhanh một lần (thuốc / bữa ăn / học), có thể kèm ảnh để partner duyệt. */
export function HabitLogModal({ kind, onClose }) {
  const cfg = HABIT_KINDS[kind];
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [time, setTime] = useState(nowText());
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(null);

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('time', time);
      if (note.trim()) form.append('note', note.trim());
      if (photo) form.append('photo', photo);
      return habitLogService.add(kind, form);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['habit-day', kind] });
      onClose?.();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const Icon = cfg.icon;
  const noteSuggestions = useMemo(
    () =>
      ({
        medicine: ['Thuốc sáng', 'Thuốc trưa', 'Thuốc tối'],
        meal: ['Bữa sáng', 'Bữa trưa', 'Bữa tối'],
        study: ['Học 30 phút', 'Đọc sách', 'Ôn bài'],
      })[kind] ?? [],
    [kind],
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Ghi {cfg.label.toLowerCase()}</h2>
            <p className="text-[11px] text-slate-500">{cfg.hint}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <label className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Clock className="size-3.5" /> Lúc
          </span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold tabular-nums text-slate-800"
          />
        </label>

        {preview ? (
          <div className="relative mt-2 overflow-hidden rounded-xl ring-1 ring-slate-200">
            <img src={preview} alt="Ảnh minh chứng" className="h-32 w-full object-cover" />
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
            className="mt-2 flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-water-300 hover:text-water-700"
          >
            <Camera className="size-5" />
            <span className="text-xs font-semibold">Chụp ảnh minh chứng (tuỳ chọn)</span>
            <span className="text-[10px]">Có ảnh + có partner → chờ duyệt</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
          }}
        />

        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ghi chú</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={cfg.notePlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {noteSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => setNote(s)}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Huỷ
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-water-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {photo ? 'Gửi partner duyệt' : 'Lưu lại'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HabitLogModal;
