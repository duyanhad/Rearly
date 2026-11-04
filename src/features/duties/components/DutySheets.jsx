import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarClock, Check, ClipboardList, Pencil, Send, Trash2, X, XCircle } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { ImageLightbox } from '../../../components/ImageLightbox';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { AudioBubble } from '../../chat/components/VoiceRecorder';
import { DutyMediaPicker } from './DutyMediaPicker';
import { dueLabel, statusMeta } from './dutyStatus';

const emptyMedia = { text: '', files: [], voice: null };

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];

const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Bảng "giờ bắt đầu / hạn" có nhãn rõ ràng để không bị lẫn hai mốc. */
function TimeField({ label, hint, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-water-400"
      />
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

/**
 * Tạo nhiệm vụ mới (người giao): tên, mô tả, giờ bắt đầu, nhắc trước, hạn báo cáo và nội dung kèm.
 * `duty` có giá trị = đang sửa nhiệm vụ đã giao (chỉ đổi thông tin, không đổi tệp đính kèm).
 */
export function DutyCreateSheet({ partner, duty, onClose, onSaved }) {
  const toast = useToast();
  const qc = useQueryClient();
  const editing = Boolean(duty);

  const [title, setTitle] = useState(duty?.title ?? '');
  const [note, setNote] = useState(duty?.note ?? '');
  const [start, setStart] = useState(() => toLocalInput(duty?.startsAtUtc));
  const [remindBeforeMin, setRemindBeforeMin] = useState(duty?.remindBeforeMin ?? 10);
  const [due, setDue] = useState(() => toLocalInput(duty?.dueAtUtc ?? new Date(Date.now() + 3 * 3600_000).toISOString()));
  const [media, setMedia] = useState(emptyMedia);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return dutyService.update(duty.id, {
          title: title.trim(),
          note,
          startsAtUtc: new Date(start).toISOString(),
          remindBeforeMin,
          dueAtUtc: new Date(due).toISOString(),
        });
      }
      const files = [...media.files];
      if (media.voice) files.push(new File([media.voice.blob], `voice-${Date.now()}.webm`, { type: media.voice.blob.type }));
      return dutyService.create({
        title: title.trim(),
        note,
        startsAtUtc: new Date(start).toISOString(),
        remindBeforeMin,
        dueAtUtc: new Date(due).toISOString(),
        text: media.text,
        files,
        voiceDurationMs: media.voice?.durationMs,
      });
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['duties'] });
      toast.show(editing ? 'Đã cập nhật nhiệm vụ' : 'Đã giao nhiệm vụ', editing ? '' : 'Người kia được báo tới khi bấm nhận.');
      onSaved?.(res.data);
      onClose();
    },
    onError: (err) => toast.show('Không lưu được', errorMessage(err)),
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const disabled = !title.trim() || save.isPending;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Sửa nhiệm vụ' : 'Giao nhiệm vụ'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl"
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{editing ? 'Sửa nhiệm vụ' : 'Giao nhiệm vụ'}</p>
            <p className="truncate text-[11px] text-slate-500">
              {partner?.fullName ? `Giao cho ${partner.fullName}` : 'Chưa có partner'} · đặt hạn để họ báo cáo
            </p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nhiệm vụ</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Ví dụ: Uống đủ 2 lít nước trước 21:00"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-water-400"
          />
        </label>

        <label className="mt-2 block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mô tả (không bắt buộc)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Dặn dò thêm…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-water-400"
          />
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <TimeField label="Giờ bắt đầu" value={start} onChange={(e) => setStart(e.target.value)} />
          <TimeField label="Hạn báo cáo" hint="phải sau giờ bắt đầu" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>

        <label className="mt-2 block">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <BellRing className="size-3.5" /> Nhắc trước giờ bắt đầu
          </span>
          <select
            value={remindBeforeMin}
            onChange={(e) => setRemindBeforeMin(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-water-400"
          >
            {REMIND_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Không nhắc sớm' : `${m} phút trước`}
              </option>
            ))}
          </select>
        </label>

        {!editing && (
          <div className="mt-2">
            <DutyMediaPicker value={media} onChange={setMedia} label="Gửi kèm (tuỳ chọn)" />
          </div>
        )}

        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={disabled}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-water-700 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Send className="size-4" /> {save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Giao nhiệm vụ'}
        </button>
      </div>
    </div>
  );
}

/**
 * Chi tiết nhiệm vụ: nội dung người giao, các lần báo cáo, form báo cáo (người nhận)
 * và nút duyệt đạt / chưa đạt (người giao).
 */
export function DutyDetailSheet({ duty, onClose, onEdit }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [report, setReport] = useState(emptyMedia);
  const [reportNote, setReportNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [zoom, setZoom] = useState(null);
  const meta = statusMeta(duty);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['duties'] });
  };

  const submitReport = useMutation({
    mutationFn: async () => {
      const files = [...report.files];
      if (report.voice) files.push(new File([report.voice.blob], `voice-${Date.now()}.webm`, { type: report.voice.blob.type }));
      return dutyService.report({
        id: duty.id,
        note: reportNote,
        text: report.text,
        files,
        voiceDurationMs: report.voice?.durationMs,
      });
    },
    onSuccess: async () => {
      await refresh();
      setReport(emptyMedia);
      setReportNote('');
      toast.show('Đã gửi báo cáo', 'Người giao nhận thông báo để duyệt.');
      onClose();
    },
    onError: (err) => toast.show('Chưa gửi được', errorMessage(err)),
  });

  const review = useMutation({
    mutationFn: (approve) => dutyService.review(duty.id, { approve, note: approve ? '' : reviewNote }),
    onSuccess: async (_res, approve) => {
      await refresh();
      toast.show(approve ? 'Đã duyệt đạt' : 'Đã trả lại để làm tiếp');
      onClose();
    },
    onError: (err) => toast.show('Không duyệt được', errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => dutyService.remove(duty.id),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã xoá nhiệm vụ');
      onClose();
    },
    onError: (err) => toast.show('Không xoá được', errorMessage(err)),
  });

  const accept = useMutation({
    mutationFn: () => dutyService.accept(duty.id),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã nhận nhiệm vụ', 'Hệ thống thôi nhắc và báo cho người giao.');
      onClose();
    },
    onError: (err) => toast.show('Chưa nhận được', errorMessage(err)),
  });

  const assignMedia = duty.media.filter((m) => m.side === 'assign');
  const reports = duty.media.filter((m) => m.side === 'report');
  const attempts = [...new Set(reports.map((m) => m.attempt))].sort((a, b) => b - a);
  const canReport = !duty.mine && duty.status !== 'approved' && !duty.needsAccept;  const canReview = duty.mine && duty.status === 'submitted';

  const mediaBlock = (items) => (
    <div className="mt-1.5 space-y-1.5">
      {items
        .filter((m) => m.kind === 'text')
        .map((m) => (
          <p key={m.id} className="rounded-xl bg-white px-2.5 py-2 text-sm text-slate-700 ring-1 ring-slate-100">
            {m.text}
          </p>
        ))}
      {items.filter((m) => m.kind === 'image').length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {items
            .filter((m) => m.kind === 'image')
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setZoom(dutyService.mediaUrl(m.url))}
                className="aspect-square overflow-hidden rounded-xl bg-slate-100"
              >
                <img src={dutyService.mediaUrl(m.url)} alt="Ảnh đính kèm" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
        </div>
      )}
      {items
        .filter((m) => m.kind === 'voice')
        .map((m) => (
          <AudioBubble key={m.id} src={dutyService.mediaUrl(m.url)} durationMs={m.durationMs} tone="light" />
        ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Nhiệm vụ ${duty.title}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl"
      >
        <div className="mb-2 flex items-start gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.tone}`}>{meta.label}</span>
          <span className="flex-1" />
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <h2 className="text-base font-bold leading-snug text-slate-900">{duty.title}</h2>
        {duty.note && <p className="mt-1 text-sm text-slate-600">{duty.note}</p>}

        <div className="mt-2 flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-100">
          <Avatar
            url={duty.mine ? duty.assigneeAvatar : duty.assignerAvatar}
            name={duty.mine ? duty.assigneeName : duty.assignerName}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-slate-800">
              {duty.mine ? `Bạn giao cho ${duty.assigneeName}` : `${duty.assignerName} giao cho bạn`}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Bắt đầu {dueLabel(duty.startsAtUtc)} · hạn {dueLabel(duty.dueAtUtc)}
            </p>
            {duty.remindBeforeMin > 0 && (
              <p className="truncate text-[10px] text-slate-400">Nhắc trước {duty.remindBeforeMin} phút</p>
            )}
          </div>
        </div>

        {duty.needsAccept && !duty.mine && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[12px] font-semibold text-amber-800">Bạn chưa nhận nhiệm vụ này</p>
            <p className="mt-0.5 text-[11px] text-amber-700">App sẽ nhắc liên tục cho tới khi bạn bấm nhận.</p>
            <button
              type="button"
              onClick={() => accept.mutate()}
              disabled={accept.isPending}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-amber-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Check className="size-4" /> {accept.isPending ? 'Đang nhận…' : 'Đã nhận nhiệm vụ'}
            </button>
          </div>
        )}

        {duty.needsAccept && duty.mine && (
          <p className="mt-2 rounded-xl bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700 ring-1 ring-amber-200">
            Đang chờ {duty.assigneeName} bấm “Đã nhận nhiệm vụ” — app sẽ nhắc họ mỗi phút.
          </p>
        )}

        {assignMedia.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nội dung kèm theo</p>
            {mediaBlock(assignMedia)}
          </div>
        )}

        {attempts.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Báo cáo ({attempts.length} lần)
            </p>
            {attempts.map((attempt) => (
              <div key={attempt} className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                <p className="text-[11px] font-semibold text-slate-600">
                  Lần {attempt}
                  {attempt === attempts[0] && duty.submittedAtUtc ? ' · mới nhất' : ''}
                  {attempt === attempts[0] && duty.submittedAtUtc && new Date(duty.submittedAtUtc) > new Date(duty.dueAtUtc)
                    ? ' · báo cáo muộn'
                    : ''}
                </p>
                {mediaBlock(reports.filter((m) => m.attempt === attempt))}
              </div>
            ))}
          </div>
        )}

        {duty.reviewNote && duty.status === 'rejected' && (
          <p className="mt-2 rounded-xl bg-rose-50 px-2.5 py-2 text-[12px] text-rose-700">Lý do trả lại: {duty.reviewNote}</p>
        )}

        {canReport && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {duty.status === 'rejected' ? 'Làm lại & báo cáo' : 'Báo cáo hoàn thành'}
            </p>
            <DutyMediaPicker value={report} onChange={setReport} label="Bằng chứng (chọn nhiều loại)" />
            <input
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              maxLength={300}
              placeholder="Ghi chú cho người giao (không bắt buộc)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-water-400"
            />
            <button
              type="button"
              onClick={() => submitReport.mutate()}
              disabled={submitReport.isPending}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-water-700 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Check className="size-4" /> {submitReport.isPending ? 'Đang gửi…' : 'Báo cáo hoàn thành'}
            </button>
          </div>
        )}

        {canReview && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Duyệt báo cáo</p>
            <input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              maxLength={300}
              placeholder="Lý do chưa đạt (bắt buộc nếu trả lại)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-water-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => review.mutate(true)}
                disabled={review.isPending}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Check className="size-4" /> Đạt
              </button>
              <button
                type="button"
                onClick={() => review.mutate(false)}
                disabled={review.isPending || !reviewNote.trim()}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <XCircle className="size-4" /> Chưa đạt
              </button>
            </div>
          </div>
        )}

        {duty.mine && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(duty)}
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              <Pencil className="size-3.5" /> Sửa
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Xoá nhiệm vụ này? Người kia sẽ nhận thông báo.')) remove.mutate();
              }}
              disabled={remove.isPending}
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-50 py-2.5 text-xs font-semibold text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" /> Xoá
            </button>
          </div>
        )}
      </div>

      {zoom && <ImageLightbox src={zoom} alt={duty.title} onClose={() => setZoom(null)} />}
    </div>
  );
}

export default DutyDetailSheet;
