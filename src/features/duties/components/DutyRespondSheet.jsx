import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, X, XCircle } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { DUTY_QUICK_REASONS } from './DutySheets';
import { dueLabel } from './dutyStatus';

/**
 * Trả lời cả lô nhiệm vụ: chọn nhận việc nào, từ chối việc nào (lý do dùng chung,
 * mỗi việc bị từ chối ghi thêm được ghi chú riêng).
 */
export function DutyRespondSheet({ duties, onClose }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [declined, setDeclined] = useState(() => ({}));
  const [notes, setNotes] = useState({});
  const [reason, setReason] = useState('');

  const declinedIds = duties.filter((d) => declined[d.id]).map((d) => d.id);
  const acceptIds = duties.filter((d) => !declined[d.id]).map((d) => d.id);

  const save = useMutation({
    mutationFn: () =>
      dutyService.respond(
        acceptIds,
        declinedIds.map((id) => ({ id, note: notes[id] ?? '' })),
        reason.trim(),
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['duties'] });
      const parts = [];
      if (acceptIds.length) parts.push(`nhận ${acceptIds.length}`);
      if (declinedIds.length) parts.push(`từ chối ${declinedIds.length}`);
      toast.show('Đã trả lời nhiệm vụ', `Bạn ${parts.join(' · ')} việc. Người giao được báo ngay.`);
      onClose();
    },
    onError: (err) => toast.show('Chưa gửi được', errorMessage(err)),
  });

  const toggle = (id) => setDeclined((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end bg-slate-900/45 backdrop-blur-[2px] sm:items-center sm:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chọn nhận nhiệm vụ"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-cream-50 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl sm:pb-4"
      >
        <div className="flex items-start gap-2 px-4 pt-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Nhận việc nào?</p>
            <p className="truncate text-[11px] text-slate-500">
              {duties.length} việc đang chờ bạn · bấm để đổi nhận / từ chối
            </p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {duties.map((duty) => {
            const isDeclined = Boolean(declined[duty.id]);
            return (
              <div
                key={duty.id}
                className={`rounded-2xl p-2.5 ring-1 transition ${
                  isDeclined ? 'bg-rose-50/60 ring-rose-200' : 'bg-white ring-slate-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800">{duty.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      Bắt đầu {dueLabel(duty.startsAtUtc)} · hạn {dueLabel(duty.dueAtUtc)}
                    </p>
                    {duty.note && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{duty.note}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => (isDeclined ? toggle(duty.id) : null)}
                      className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition ${
                        !isDeclined ? 'bg-water-700 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                      }`}
                    >
                      <Check className="size-3.5" /> Nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => (!isDeclined ? toggle(duty.id) : null)}
                      className={`flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition ${
                        isDeclined ? 'bg-rose-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                      }`}
                    >
                      <XCircle className="size-3.5" /> Từ chối
                    </button>
                  </div>
                </div>

                {isDeclined && (
                  <input
                    value={notes[duty.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [duty.id]: e.target.value }))}
                    maxLength={200}
                    placeholder="Ghi chú riêng cho việc này (không bắt buộc)"
                    className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 outline-none focus:border-rose-400"
                  />
                )}
              </div>
            );
          })}

          {declinedIds.length > 0 && (
            <div className="rounded-2xl bg-white p-2.5 ring-1 ring-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Lý do từ chối ({declinedIds.length} việc)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DUTY_QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(reason === r ? '' : r)}
                    className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      reason === r ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="Lý do khác (không bắt buộc)…"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-800 outline-none focus:border-water-400"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || duties.length === 0}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-water-700 text-sm font-bold text-white disabled:opacity-50"
          >
            <Check className="size-4" />
            {save.isPending
              ? 'Đang gửi…'
              : `Xác nhận · nhận ${acceptIds.length}${declinedIds.length ? ` · từ chối ${declinedIds.length}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DutyRespondSheet;
