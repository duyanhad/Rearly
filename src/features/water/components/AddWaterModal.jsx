import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, Check, ChevronDown, CupSoda, ImageOff, Search, X } from 'lucide-react';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { waterService } from '../../../services/waterService';
import { cupService } from '../../../services/cupService';
import { useAuth } from '../../../context/AuthProvider';
import { CameraCapture } from './CameraCapture';
const periodLabels = {
  Morning: 'Sáng',
  Afternoon: 'Trưa',
  Evening: 'Tối'
};

/** Ca tự động theo giờ hiện tại của máy: <12h sáng, <18h trưa, còn lại tối. */
function detectPeriod(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
}
export function AddWaterModal({
  onClose
}) {
  const queryClient = useQueryClient();
  const {
    user
  } = useAuth();
  const requirePhoto = user?.requirePhoto ?? true;
  // Bước 1 luôn là camera: chụp ảnh cốc nước rồi mới nhập ghi chú và thêm nước.
  const [step, setStep] = useState('photo');
  const [amountMl, setAmountMl] = useState(250);
  const [selectedCup, setSelectedCup] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const now = useMemo(() => new Date(), []);
  const period = useMemo(() => detectPeriod(now), [now]);
  const {
    data: cups = []
  } = useQuery({
    queryKey: ['cups'],
    queryFn: async () => (await cupService.list()).data
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (requirePhoto && !photo) throw new Error('Bạn cần chụp ảnh cốc nước trước khi thêm nước.');
      const form = new FormData();
      form.append('AmountMl', String(amountMl));
      // Không gửi Period: server tự xác định ca theo giờ để dữ liệu không bị lệch.
      if (note.trim()) form.append('Note', note.trim());
      if (photo) form.append('image', photo);
      return waterService.addLog(form);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['today']
      });
      void queryClient.invalidateQueries({
        queryKey: ['calendar']
      });
      void queryClient.invalidateQueries({
        queryKey: ['feed']
      });
      void queryClient.invalidateQueries({
        queryKey: ['notifications']
      });
      onClose();
    },
    onError: err => setError(errorMessage(err))
  });
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          {step === 'details' ? <button onClick={() => setStep('photo')} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Quay lại chụp ảnh">
              <ArrowLeft className="size-5" />
            </button> : <h2 className="text-lg font-semibold">Chụp ảnh cốc nước</h2>}
          {step === 'details' && <h2 className="-ml-1 flex-1 text-lg font-semibold">Thêm nước</h2>}
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>

        {step === 'photo' ? (
          <CameraCapture
            required={requirePhoto}
            onSkip={requirePhoto ? null : () => setStep('details')}
            onCapture={(file, previewUrl) => {
              setPhoto(file);
              setPreview(previewUrl);
              setError(null);
              setStep('details');
            }}
          />
        ) : (
          <>
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-water-50 px-3 py-2">
          <span className="text-sm text-water-800">
            Ca <strong>{periodLabels[period]}</strong>
            <span className="text-water-600/80"> · tự nhận theo giờ</span>
          </span>
          <span className="text-xs text-water-700/80">
            {now.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
          </span>
        </div>

        <button type="button" onClick={() => setPickerOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-water-300">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-water-50 text-water-600">
            <CupSoda className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-slate-500">Loại cốc</span>
            <span className={`block truncate text-sm ${selectedCup ? 'font-medium' : 'text-slate-400'}`}>
              {selectedCup ? `${selectedCup.name} · ${selectedCup.volumeMl} ml` : 'Chọn loại cốc'}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        </button>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Số ml</span>
            <input type="number" min={1} max={5000} value={amountMl} onChange={e => setAmountMl(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Ghi chú</span>
            <input value={note} maxLength={255} onChange={e => setNote(e.target.value)} placeholder="Đã uống xong!" className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-sm text-slate-600">
            Ảnh minh chứng {requirePhoto ? '(bắt buộc)' : '(không bắt buộc)'}
          </span>

          {preview ? <div className="flex items-center gap-3">
              <img src={preview} alt="Ảnh cốc nước" className="h-24 w-24 rounded-lg object-cover" />
              <button type="button" onClick={() => setStep('photo')} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                <Camera className="size-4" /> Chụp lại
              </button>
            </div> : <button type="button" onClick={() => setStep('photo')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:border-water-300">
              <Camera className="size-4" /> Chụp ảnh cốc nước
            </button>}

          {requirePhoto && !preview && <p className="mt-2 text-xs text-rose-600">
              Bạn đang bật "Bắt buộc chụp ảnh" nên cần chụp ảnh trước khi thêm nước.
            </p>}
          {user?.partnerId && <p className="mt-2 text-xs text-amber-600">
              Ảnh sẽ chờ partner duyệt trước khi được cộng vào tiến trình.
            </p>}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button onClick={() => {
          setError(null);
          mutation.mutate();
        }} disabled={mutation.isPending || amountMl <= 0 || (requirePhoto && !photo)} className="mt-5 w-full rounded-xl bg-water-600 py-3 font-semibold text-white disabled:opacity-50">
          {mutation.isPending ? 'Đang lưu...' : `Thêm ${amountMl} ml · ${periodLabels[period]}`}
        </button>
          </>
        )}
      </div>

      {pickerOpen && <CupPicker cups={cups} selected={selectedCup} onClose={() => setPickerOpen(false)} onSelect={async cup => {
      if (cup.isCatalog) {
        // Cốc mẫu của admin: nhận về thành cốc của mình rồi mới chọn.
        const adopted = (await cupService.adopt(cup.id)).data;
        void queryClient.invalidateQueries({ queryKey: ['cups'] });
        setSelectedCup(adopted);
        setAmountMl(adopted.volumeMl);
      } else {
        setSelectedCup(cup);
        setAmountMl(cup.volumeMl);
      }
      setPickerOpen(false);
    }} />}
    </div>;
}

/** Bottom sheet chọn cốc: portal ra body để không bị modal cha cắt/z-index. */
function CupPicker({
  cups,
  selected,
  onClose,
  onSelect
}) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const filtered = cups.filter(cup => !term || cup.name.toLowerCase().includes(term) || String(cup.volumeMl).includes(term));
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(<div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-label="Đóng chọn cốc" onClick={onClose} />

      <div className="animate-slide-up relative flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:max-h-[80vh] sm:max-w-sm sm:rounded-3xl">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex shrink-0 items-center justify-between px-5 pt-3">
          <h3 className="text-base font-semibold text-slate-900">Chọn loại cốc</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>

        <div className="shrink-0 px-5 pb-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc số ml" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-water-400 focus:bg-white focus:ring-4 focus:ring-water-100" />
            {search && <button onClick={() => setSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Xoá tìm kiếm">
                <X className="size-4" />
              </button>}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {filtered.map(cup => {
          const active = selected?.id === cup.id;
          return <li key={cup.id}>
                <button onClick={() => onSelect(cup)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-water-50' : 'hover:bg-slate-50'}`}>
                  <span className={`grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl ${active ? 'bg-water-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {cup.cutoutUrl || cup.imageUrl ? (
                      <img src={mediaUrl(cup.cutoutUrl || cup.imageUrl)} alt={cup.name} className="size-full object-contain" loading="lazy" decoding="async" />
                    ) : (
                      <CupSoda className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                      {cup.name}
                      {cup.isCatalog && (
                        <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600 ring-1 ring-violet-100">
                          Mẫu
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">{cup.volumeMl} ml</span>
                  </span>
                  {active && <Check className="size-5 shrink-0 text-water-600" />}
                </button>
              </li>;
        })}

          {filtered.length === 0 && <li className="px-4 py-10 text-center">
              <CupSoda className="mx-auto size-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Không tìm thấy cốc phù hợp</p>
              <p className="text-xs text-slate-400">Thêm cốc mới trong Cài đặt</p>
            </li>}
        </ul>
      </div>
    </div>, document.body);
}
export function PhotoThumb({
  url,
  note,
  full = false
}) {
  const src = mediaUrl(url);
  // url đổi thì tự hiện lại ảnh; chỉ nhớ đúng src bị lỗi
  const [brokenSrc, setBrokenSrc] = useState(null);
  const broken = Boolean(src) && brokenSrc === src;
  const box = full ? 'aspect-square w-full rounded-lg object-cover' : 'h-24 w-24 rounded-lg object-cover';
  if (!src || broken) {
    if (!full) return null;
    return <div className="grid aspect-square w-full place-items-center rounded-lg bg-white text-slate-400">
        <div className="flex flex-col items-center gap-1 text-[11px]">
          <ImageOff className="size-5" />
          {broken ? 'Ảnh không còn' : 'Chưa có ảnh'}
        </div>
      </div>;
  }
  return <a href={src} target="_blank" rel="noreferrer" className="block">
      <img src={src} alt={note ?? 'Ảnh minh chứng'} className={box} onError={() => setBrokenSrc(src)} />
    </a>;
}