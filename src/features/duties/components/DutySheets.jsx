import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarClock, Check, ClipboardList, Flag, Pencil, Send, Trash2, X, XCircle } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { ImageLightbox } from '../../../components/ImageLightbox';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { AudioBubble } from '../../chat/components/VoiceRecorder';
import { DutyMediaPicker } from './DutyMediaPicker';
import { dueLabel, statusMeta } from './dutyStatus';

const emptyMedia = { text: '', files: [], voice: null };

export const DUTY_QUICK_REASONS = ['Bận việc đột xuất', 'Không kịp trong giờ này', 'Không phù hợp với mình'];

/**
 * Hộp thoại nhập lý do từ chối nhiệm vụ (thay cho prompt mặc định của trình duyệt).
 * Dùng chung cho thẻ nhiệm vụ ở màn chính và trang chi tiết.
 */
export function DeclineReasonSheet({ title, onClose, onConfirm, pending = false }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Từ chối nhiệm vụ"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-3xl bg-cream-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl sm:max-w-lg sm:rounded-3xl sm:pb-4"
      >
        <div className="flex items-start gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <XCircle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Từ chối nhiệm vụ</p>
            <p className="truncate text-[11px] text-slate-500">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {DUTY_QUICK_REASONS.map((reason) => {
            const active = note === reason;
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setNote(active ? '' : reason)}
                className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  active ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {reason}
              </button>
            );
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Lý do khác (không bắt buộc)…"
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-water-400"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-white py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200"
          >
            Giữ lại
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note.trim())}
            disabled={pending}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <XCircle className="size-4" /> {pending ? 'Đang gửi…' : 'Từ chối'}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">Người giao sẽ nhận thông báo kèm lý do này.</p>
      </div>
    </div>
  );
}

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];

const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Ô chọn ngày-giờ: hiện gọn "HH:mm · dd/MM" và mở bộ chọn gốc khi bấm (tránh chữ tràn như input gốc). */
export function TimeField({ label, hint, value, onChange }) {
  const inputRef = useRef(null);
  const label2 = (() => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Chọn thời gian';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  })();

  // Trên máy tính bấm vào ô trong suốt không tự mở lịch -> gọi showPicker() trong cú bấm.
  const open = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
      else el.focus();
    } catch {
      el.focus();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="relative block min-w-0 cursor-pointer rounded-xl border border-slate-300 bg-white px-2.5 py-2 shadow-sm focus-within:border-water-400 focus-within:ring-4 focus-within:ring-water-100"
    >
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-0.5 block truncate text-[15px] font-bold tabular-nums text-slate-800">{label2}</span>
      {hint && <span className="block truncate text-[10px] text-slate-400">{hint}</span>}
      <input
        ref={inputRef}
        type="datetime-local"
        value={value}
        onChange={onChange}
        aria-label={label}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </div>
  );
}

/**
 * Sửa nhiệm vụ đã giao (chỉ người giao, không đổi tệp đính kèm).
 * Việc giao nhiệm vụ mới nằm ở trang riêng `DutyCreatePage` (mỗi việc có giờ + nội dung riêng).
 */
export function DutyCreateSheet({ partner, duty, onClose, onSaved }) {
  const toast = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState(duty?.title ?? '');
  const [note, setNote] = useState(duty?.note ?? '');
  const [start, setStart] = useState(() => toLocalInput(duty?.startsAtUtc));
  const [remindBeforeMin, setRemindBeforeMin] = useState(duty?.remindBeforeMin ?? 10);
  const [due, setDue] = useState(() => toLocalInput(duty?.dueAtUtc ?? new Date(Date.now() + 3 * 3600_000).toISOString()));

  const save = useMutation({
    mutationFn: () =>
      dutyService.update(duty.id, {
        title: title.trim(),
        note,
        startsAtUtc: new Date(start).toISOString(),
        remindBeforeMin,
        dueAtUtc: new Date(due).toISOString(),
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['duties'] });
      toast.show('Đã cập nhật nhiệm vụ');
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
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sửa nhiệm vụ"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Sửa nhiệm vụ</p>
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
          <TimeField label="Hạn báo cáo" hint="sau giờ bắt đầu" value={due} onChange={(e) => setDue(e.target.value)} />
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

        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={disabled}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-water-700 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Send className="size-4" />
          {save.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
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
  const [declineOpen, setDeclineOpen] = useState(false);
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

  const decline = useMutation({
    mutationFn: (note) => dutyService.decline(duty.id, note),
    onSuccess: async () => {
      await refresh();
      toast.show('Đã từ chối nhiệm vụ', 'Người giao sẽ nhận thông báo.');
      onClose();
    },
    onError: (err) => toast.show('Chưa từ chối được', errorMessage(err)),
  });

  const withdraw = useMutation({
    mutationFn: () => dutyService.withdraw(duty.id),
    onSuccess: async () => {
      await refresh();
      setReport(emptyMedia);
      setReportNote('');
      toast.show('Đã thu hồi báo cáo', 'Sửa lại rồi gửi — người giao sẽ nhận bản mới.');
    },
    onError: (err) => toast.show('Không sửa được', errorMessage(err)),
  });

  const assignMedia = duty.media.filter((m) => m.side === 'assign');
  const reports = duty.media.filter((m) => m.side === 'report');
  const attempts = [...new Set(reports.map((m) => m.attempt))].sort((a, b) => b - a);
  const sentMode = !duty.mine && duty.status === 'submitted';
  const canReport = !duty.mine && (duty.status === 'open' || duty.status === 'rejected') && !duty.needsAccept;
  const canReview = duty.mine && duty.status === 'submitted';

  const mediaBlock = (items) => (
    <div className="space-y-1.5">
      {items
        .filter((m) => m.kind === 'text')
        .map((m) => (
          <p
            key={m.id}
            className="whitespace-pre-wrap rounded-xl rounded-tl-sm bg-cream-50 px-3 py-2 text-[13px] leading-snug text-slate-800 ring-1 ring-slate-200/70"
          >
            {m.text}
          </p>
        ))}
      {items.filter((m) => m.kind === 'image').length > 0 && (
        <div className={`grid gap-1.5 ${items.filter((m) => m.kind === 'image').length === 1 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {items
            .filter((m) => m.kind === 'image')
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setZoom(dutyService.mediaUrl(m.url))}
                aria-label="Xem ảnh đính kèm"
                className="aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/70 transition active:scale-[0.98]"
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
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Nhiệm vụ ${duty.title}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl"
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

        <div className="mt-2 rounded-2xl bg-white p-2.5 ring-1 ring-slate-100">
          <div className="flex items-center gap-2">
            <Avatar
              url={duty.mine ? duty.assigneeAvatar : duty.assignerAvatar}
              name={duty.mine ? duty.assigneeName : duty.assignerName}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-slate-800">
                {duty.mine ? `Bạn giao cho ${duty.assigneeName}` : `${duty.assignerName} giao cho bạn`}
              </p>
              <p className="truncate text-[10px] text-slate-400">{duty.mine ? 'Người nhận' : 'Người giao'}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
              <CalendarClock className="size-3" /> Bắt đầu {dueLabel(duty.startsAtUtc)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
              <Flag className="size-3" /> Hạn {dueLabel(duty.dueAtUtc)}
            </span>
            {duty.remindBeforeMin > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                <BellRing className="size-3" /> Nhắc trước {duty.remindBeforeMin}′
              </span>
            )}
          </div>
        </div>

        {duty.needsAccept && !duty.mine && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[12px] font-semibold text-amber-800">Bạn chưa nhận nhiệm vụ này</p>
            <p className="mt-0.5 text-[11px] text-amber-700">App sẽ nhắc liên tục cho tới khi bạn bấm nhận.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => accept.mutate()}
                disabled={accept.isPending}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Check className="size-4" /> {accept.isPending ? 'Đang nhận…' : 'Đã nhận nhiệm vụ'}
              </button>
              <button
                type="button"
                onClick={() => setDeclineOpen(true)}
                disabled={decline.isPending}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 disabled:opacity-50"
              >
                <XCircle className="size-4" /> Từ chối
              </button>
            </div>
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
              Báo cáo · {attempts.length} lần
            </p>
            {attempts.map((attempt, index) => {
              const latest = index === 0;
              const late = latest && duty.submittedAtUtc && new Date(duty.submittedAtUtc) > new Date(duty.dueAtUtc);
              return (
                <div
                  key={attempt}
                  className={`rounded-2xl border p-2.5 ${
                    latest ? 'border-water-200 bg-white shadow-sm' : 'border-slate-200 bg-white/60'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <span
                      className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                        latest ? 'bg-water-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {attempt}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700">Lần {attempt}</span>
                    {latest && (
                      <span className="rounded-full bg-water-50 px-1.5 py-0.5 text-[9px] font-bold text-water-700 ring-1 ring-water-200">
                        Mới nhất
                      </span>
                    )}
                    {late && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">
                        Muộn
                      </span>
                    )}
                  </div>
                  {mediaBlock(reports.filter((m) => m.attempt === attempt))}
                </div>
              );
            })}
          </div>
        )}

        {duty.reviewNote && duty.status === 'rejected' && (
          <p className="mt-2 rounded-xl bg-rose-50 px-2.5 py-2 text-[12px] text-rose-700">Lý do trả lại: {duty.reviewNote}</p>
        )}

        {sentMode && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800">
              <Check className="size-4" /> Đã gửi báo cáo — đang chờ người giao duyệt
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-700">
              Muốn sửa? Bấm nút dưới để thu hồi; người giao sẽ không thấy bản này nữa cho tới khi bạn gửi lại.
            </p>
            <button
              type="button"
              onClick={() => withdraw.mutate()}
              disabled={withdraw.isPending}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-300 disabled:opacity-50"
            >
              <Pencil className="size-4" /> {withdraw.isPending ? 'Đang mở lại…' : 'Đã gửi · Bấm để sửa'}
            </button>
          </div>
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

      {declineOpen && (
        <DeclineReasonSheet
          title={duty.title}
          pending={decline.isPending}
          onClose={() => setDeclineOpen(false)}
          onConfirm={(note) => decline.mutate(note)}
        />
      )}
    </div>
  );
}

export default DutyDetailSheet;
