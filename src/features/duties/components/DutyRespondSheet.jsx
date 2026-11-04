import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, Clock3, X, XCircle } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { DUTY_QUICK_REASONS } from './DutySheets';
import { dueLabel } from './dutyStatus';

/**
 * Chọn nhận / từ chối từng việc trong lô (thân dùng chung): mặc định nhận hết,
 * bấm vào việc để đổi sang từ chối (lý do chung + ghi chú riêng), rồi xác nhận một lần.
 * `flush` = cha đã có padding ngang (màn kêu nhiệm vụ), khỏi cộng thêm.
 */
export function DutyRespondBody({ duties, onDone, flush = false }) {
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
      onDone?.();
    },
    onError: (err) => toast.show('Chưa gửi được', errorMessage(err)),
  });

  const toggle = (id) => setDeclined((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <div
        className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto ${flush ? '' : 'px-4 py-3 sm:px-0 sm:py-0'}`}
      >
        {duties.map((duty) => {
          const isDeclined = Boolean(declined[duty.id]);
          return (
            <div
              key={duty.id}
              className={`overflow-hidden rounded-xl ring-1 transition ${
                isDeclined ? 'bg-rose-50/80 ring-rose-200' : 'bg-white ring-slate-200/80'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(duty.id)}
                aria-pressed={!isDeclined}
                aria-label={`${isDeclined ? 'Nhận' : 'Từ chối'} ${duty.title}`}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition active:scale-[0.995]"
              >
                <span
                  className={`mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-md border transition ${
                    isDeclined ? 'border-slate-300 bg-white text-slate-300' : 'border-water-700 bg-water-700 text-white'
                  }`}
                >
                  {isDeclined ? <X className="size-3" /> : <Check className="size-3.5" strokeWidth={3} />}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13px] font-bold ${
                      isDeclined ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'
                    }`}
                  >
                    {duty.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock3 className="size-3 shrink-0" />
                    {dueLabel(duty.startsAtUtc)} <span className="text-slate-300">→</span> {dueLabel(duty.dueAtUtc)}
                  </span>
                  {duty.note && <span className="mt-0.5 line-clamp-1 block text-[11px] text-slate-400">{duty.note}</span>}
                </span>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    isDeclined ? 'bg-rose-100 text-rose-700' : 'bg-water-50 text-water-700'
                  }`}
                >
                  {isDeclined ? 'Từ chối' : 'Nhận'}
                </span>
              </button>

              {isDeclined && (
                <div className="border-t border-rose-200/70 px-3 py-2">
                  <input
                    value={notes[duty.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [duty.id]: e.target.value }))}
                    maxLength={200}
                    placeholder="Ghi chú riêng cho việc này…"
                    className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-rose-400"
                  />
                </div>
              )}
            </div>
          );
        })}

        {declinedIds.length > 0 && (
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/80">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600">
              <XCircle className="size-3.5" /> Lý do từ chối · {declinedIds.length} việc
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DUTY_QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(reason === r ? '' : r)}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    reason === r ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-water-400 focus:bg-white"
            />
          </div>
        )}
      </div>

      <div className={`flex shrink-0 items-center gap-2 pt-3 ${flush ? '' : 'px-4 sm:px-0'}`}>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 shrink-0 rounded-full px-3 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          Để sau
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || duties.length === 0}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-water-700 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
        >
          <Check className="size-4" />
          {save.isPending
            ? 'Đang gửi…'
            : `Xác nhận · nhận ${acceptIds.length}${declinedIds.length ? ` · từ chối ${declinedIds.length}` : ''}`}
        </button>
      </div>
    </>
  );
}

/** Popup trả lời cả lô nhiệm vụ (mở từ danh sách Nhiệm vụ). */
export function DutyRespondSheet({ duties, onClose }) {
  return (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end bg-slate-900/45 backdrop-blur-[2px] sm:items-center sm:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chọn nhận nhiệm vụ"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-cream-50 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl sm:pb-4"
      >
        <div className="flex items-start gap-2 px-4 pb-2 pt-4 sm:pb-0">
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
        <DutyRespondBody duties={duties} onDone={onClose} />
      </div>
    </div>
  );
}

export default DutyRespondSheet;
