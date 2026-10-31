import { useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Moon, X } from 'lucide-react';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { sleepService } from '../../../services/sleepService';
import { habitLogService } from '../../../services/habitLogService';
import { HABIT_KINDS } from '../../habits/config';

const toHours = (minutes) => `${Math.floor((minutes || 0) / 60)}h${String((minutes || 0) % 60).padStart(2, '0')}`;

/** Partner duyệt phiếu giấc ngủ của người mình theo dõi (giống duyệt phiếu uống nước). */
export function PartnerSleepPage() {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const { data: sleepInbox = [], isLoading } = useQuery({
    queryKey: ['sleep-inbox'],
    queryFn: async () => (await sleepService.inbox()).data,
  });

  const { data: habitInbox = [] } = useQuery({
    queryKey: ['habit-inbox'],
    queryFn: async () => (await habitLogService.inbox()).data,
  });

  const review = useMutation({
    mutationFn: ({ id, kind, approve, why }) =>
      kind === 'sleep'
        ? sleepService.review(id, { approve, reason: why })
        : habitLogService.review(id, { approve, reason: why }),
    onSuccess: async () => {
      setRejecting(null);
      setReason('');
      setError(null);
      await qc.invalidateQueries({ queryKey: ['sleep-inbox'] });
      await qc.invalidateQueries({ queryKey: ['habit-inbox'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  // Gộp phiếu ngủ + phiếu thuốc/ăn/học thành một danh sách.
  const inbox = [
    ...sleepInbox.map((p) => ({ ...p, kind: 'sleep' })),
    ...habitInbox.map((p) => ({ ...p, kind: p.kind })),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <Link
          to="/partner"
          className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Duyệt phiếu</h1>
          <p className="text-xs text-slate-500">Phiếu giấc ngủ, uống thuốc, bữa ăn và học tập đang chờ bạn</p>
        </div>
      </div>

      {isLoading && <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><DearlyLoader size="sm" /></div>}
      {!isLoading && inbox.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
          <Moon className="mx-auto size-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">Không có phiếu nào đang chờ duyệt.</p>
        </div>
      )}

      <div className="space-y-2">
        {inbox.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
              {p.photoUrl ? (
                <img src={mediaUrl(p.photoUrl)} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Moon className="size-6" />
                </span>
              )}
              {p.wakePhotoUrl && (
                <a href={mediaUrl(p.wakePhotoUrl)} target="_blank" rel="noreferrer" className="relative shrink-0">
                  <img
                    src={mediaUrl(p.wakePhotoUrl)}
                    alt=""
                    className="size-16 rounded-xl object-cover ring-2 ring-amber-200"
                  />
                  <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-amber-500/90 text-center text-[9px] font-bold text-white">
                    Dậy đúng giờ
                  </span>
                </a>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {p.kind === 'sleep'
                    ? `${p.date} · ${p.bedTime} → ${p.wakeTime}`
                    : `${HABIT_KINDS[p.kind]?.label ?? p.kind} · ${p.time ?? ''}`}
                </p>
                <p className="text-xs text-slate-500">
                  {p.kind === 'sleep' ? toHours(p.minutes) : p.date} {p.note ? `· ${p.note}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => review.mutate({ id: p.id, kind: p.kind, approve: true })}
                  disabled={review.isPending}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Check className="size-3.5" /> Duyệt
                </button>
                <button
                  onClick={() => {
                    setRejecting(p.id);
                    setReason('');
                  }}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                >
                  <X className="size-3.5" /> Từ chối
                </button>
              </div>
            </div>

            {rejecting === p.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Lý do từ chối (tuỳ chọn)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => review.mutate({ id: p.id, kind: p.kind, approve: false, why: reason })}
                  disabled={review.isPending}
                  className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Xác nhận từ chối
                </button>
                <button onClick={() => setRejecting(null)} className="text-xs text-slate-500">
                  Huỷ
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

export default PartnerSleepPage;
