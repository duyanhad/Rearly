import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellRing, ClipboardList, Paperclip, Plus, Send, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { socialService } from '../../../services/socialService';
import { DutyMediaPicker } from '../components/DutyMediaPicker';
import { TimeField } from '../components/DutySheets';

const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60];
const MAX_ITEMS = 10;

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const emptyItem = () => ({
  title: '',
  note: '',
  start: toLocalInput(new Date(Date.now() + 30 * 60_000)),
  due: toLocalInput(new Date(Date.now() + 3 * 3600_000)),
  remindBeforeMin: 10,
  media: { text: '', files: [], voice: null },
  attachOpen: false,
});

const attachCount = (media) =>
  (media.voice ? 1 : 0) + (media.files?.length ?? 0) + (media.text?.trim() ? 1 : 0);

/**
 * Trang giao nhiệm vụ (người giao): mỗi việc có tên, mô tả, giờ bắt đầu, hạn báo cáo,
 * mức nhắc trước và nội dung gửi kèm riêng. Gửi một lần cho tất cả.
 */
export function DutyCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [items, setItems] = useState([emptyItem()]);

  const { data: partner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000,
  });

  const patch = (index, next) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...next } : item)));

  const filled = items.filter((item) => item.title.trim());

  const save = useMutation({
    mutationFn: () =>
      dutyService.createMany(
        filled.map((item) => {
          const files = [...item.media.files];
          if (item.media.voice) {
            files.push(
              new File([item.media.voice.blob], `voice-${Date.now()}.webm`, { type: item.media.voice.blob.type }),
            );
          }
          return {
            title: item.title.trim(),
            note: item.note,
            startsAtUtc: item.start,
            dueAtUtc: item.due,
            remindBeforeMin: item.remindBeforeMin,
            text: item.media.text,
            voiceDurationMs: item.media.voice?.durationMs,
            files,
          };
        }),
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['duties'] });
      toast.show(
        filled.length > 1 ? `Đã giao ${filled.length} nhiệm vụ` : 'Đã giao nhiệm vụ',
        'Người kia được báo tới khi bấm nhận.',
      );
      navigate('/', { replace: true });
    },
    onError: (err) => toast.show('Chưa giao được', errorMessage(err)),
  });

  if (partner === null) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-100">
          <ClipboardList className="mx-auto size-7 text-slate-300" />
          <p className="mt-1.5 text-sm font-semibold text-slate-800">Chưa có partner</p>
          <p className="mt-1 text-xs text-slate-500">Nhiệm vụ chỉ dùng giữa 2 partner.</p>
          <Link to="/partner" className="mt-3 inline-flex rounded-full bg-water-700 px-4 py-2 text-xs font-semibold text-white">
            Đi tới Kênh partner
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-cream-200 bg-cream-50/95 px-3 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-white"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Giao nhiệm vụ</p>
          <p className="truncate text-[11px] text-slate-500">
            Giao cho {partner.fullName} · {filled.length || items.length} việc
          </p>
        </div>
      </div>

      <div className="space-y-2.5 px-3 pt-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-water-50 text-[10px] font-bold text-water-700">
                {index + 1}
              </span>
              <input
                value={item.title}
                onChange={(e) => patch(index, { title: e.target.value })}
                maxLength={120}
                placeholder={index === 0 ? 'Ví dụ: Uống đủ 2 lít nước trước 21:00' : 'Tên nhiệm vụ…'}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-water-400"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Bỏ nhiệm vụ ${index + 1}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <TimeField
                label="Giờ bắt đầu"
                value={item.start}
                onChange={(e) => patch(index, { start: e.target.value })}
              />
              <TimeField
                label="Hạn báo cáo"
                hint="sau giờ bắt đầu"
                value={item.due}
                onChange={(e) => patch(index, { due: e.target.value })}
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                <BellRing className="size-3.5 shrink-0 text-water-600" />
                <select
                  value={item.remindBeforeMin}
                  onChange={(e) => patch(index, { remindBeforeMin: Number(e.target.value) })}
                  aria-label="Nhắc trước giờ bắt đầu"
                  className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-slate-700 outline-none"
                >
                  {REMIND_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m === 0 ? 'Không nhắc sớm' : `Nhắc trước ${m} phút`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => patch(index, { attachOpen: !item.attachOpen })}
                className={`flex min-h-9 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold transition ${
                  attachCount(item.media) > 0
                    ? 'bg-water-50 text-water-700 ring-1 ring-water-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Paperclip className="size-3.5" />
                {attachCount(item.media) > 0 ? `Kèm ${attachCount(item.media)}` : 'Gửi kèm'}
              </button>
            </div>

            <input
              value={item.note}
              onChange={(e) => patch(index, { note: e.target.value })}
              maxLength={1000}
              placeholder="Mô tả / dặn dò thêm (không bắt buộc)"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-water-400"
            />

            {(item.attachOpen || attachCount(item.media) > 0) && (
              <div className="mt-2">
                <DutyMediaPicker
                  value={item.media}
                  onChange={(next) => patch(index, { media: next })}
                  label="Nội dung gửi kèm việc này"
                />
              </div>
            )}
          </div>
        ))}

        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-water-300 bg-white/60 text-[12px] font-semibold text-water-700 transition hover:bg-water-50"
          >
            <Plus className="size-4" /> Thêm nhiệm vụ ({items.length}/{MAX_ITEMS})
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-cream-200 bg-cream-50/95 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={filled.length === 0 || save.isPending}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-water-700 text-sm font-bold text-white disabled:opacity-50"
          >
            <Send className="size-4" />
            {save.isPending ? 'Đang gửi…' : filled.length > 1 ? `Giao ${filled.length} nhiệm vụ` : 'Giao nhiệm vụ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DutyCreatePage;
