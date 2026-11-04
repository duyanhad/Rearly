import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarClock, Check, Flag, X, XCircle } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { errorMessage } from '../../../services/apiClient';
import { dutyService } from '../../../services/dutyService';
import { DeclineReasonSheet } from './DutySheets';
import { dueLabel } from './dutyStatus';

/**
 * Màn hình "kêu" nhiệm vụ mới — cùng kiểu với màn nhận lời nhắn thoại.
 * Hiện khi có nhiệm vụ partner giao mà tôi chưa bấm nhận; server nhắc lại mỗi phút nên
 * đóng đi rồi vòng nhắc sau sẽ bật lại cho tới khi nhận hoặc từ chối.
 */
export function DutyAcceptOverlay() {
  const toast = useToast();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState([]);
  const [declining, setDeclining] = useState(false);

  const { data: mine = [] } = useQuery({
    queryKey: ['duties', 'mine'],
    queryFn: async () => (await dutyService.list('mine')).data,
    refetchInterval: 15_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const duty =
    mine.find((d) => d.needsAccept && d.status === 'open' && !dismissed.includes(d.id)) ?? null;

  // Server kêu lại mỗi phút → mở lại màn hình dù người dùng đã đóng trước đó.
  useEffect(() => {
    const onRing = (event) => {
      const id = event?.detail?.id;
      setDismissed((prev) => (id ? prev.filter((x) => x !== id) : []));
      void qc.invalidateQueries({ queryKey: ['duties'] });
    };
    window.addEventListener('dearly:duty-ring', onRing);
    return () => window.removeEventListener('dearly:duty-ring', onRing);
  }, [qc]);

  const accept = useMutation({
    mutationFn: (id) => dutyService.accept(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['duties'] });
      toast.show('Đã nhận nhiệm vụ', 'Hệ thống thôi nhắc và báo cho người giao.');
    },
    onError: (err) => toast.show('Chưa nhận được', errorMessage(err)),
  });

  const decline = useMutation({
    mutationFn: ({ id, note }) => dutyService.decline(id, note),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['duties'] });
      toast.show('Đã từ chối nhiệm vụ', 'Người giao sẽ nhận thông báo.');
      setDeclining(false);
    },
    onError: (err) => toast.show('Chưa từ chối được', errorMessage(err)),
  });

  if (!duty) return null;

  return (
    <div
      className="fixed inset-0 z-[96] flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#4a1520]/97 to-[#2b1a1e]/97 p-6 text-center text-cream-50 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={`Nhiệm vụ từ ${duty.assignerName}`}
    >
      <button
        type="button"
        onClick={() => setDismissed((prev) => [...prev, duty.id])}
        aria-label="Đóng"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid size-10 place-items-center rounded-full bg-white/10 text-cream-50/80"
      >
        <X className="size-5" />
      </button>

      <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-200">
        <BellRing className="size-3.5" /> Nhiệm vụ đang chờ bạn nhận
      </span>

      <Avatar url={duty.assignerAvatar} name={duty.assignerName} size="xl" />
      <div className="w-full max-w-xs">
        <p className="text-xs text-cream-50/70">Nhiệm vụ từ</p>
        <p className="text-2xl font-extrabold">{duty.assignerName}</p>
        <p className="mt-1 line-clamp-2 text-base font-bold text-cream-50">“{duty.title}”</p>
        {duty.note && <p className="mt-1 line-clamp-2 text-[11px] text-cream-50/60">{duty.note}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-cream-50/85">
          <CalendarClock className="size-3" /> Bắt đầu {dueLabel(duty.startsAtUtc)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-cream-50/85">
          <Flag className="size-3" /> Hạn {dueLabel(duty.dueAtUtc)}
        </span>
      </div>

      <div className="mt-1 w-full max-w-xs space-y-2">
        <button
          type="button"
          onClick={() => accept.mutate(duty.id)}
          disabled={accept.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-sm font-bold text-water-700 shadow-lg transition active:scale-[0.99] disabled:opacity-60"
        >
          <Check className="size-4" /> {accept.isPending ? 'Đang nhận…' : 'Đã nhận nhiệm vụ'}
        </button>
        <button
          type="button"
          onClick={() => setDeclining(true)}
          disabled={decline.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/15 py-2.5 text-sm font-semibold text-cream-50 ring-1 ring-white/25 transition active:scale-[0.99] disabled:opacity-60"
        >
          <XCircle className="size-4" /> Từ chối nhiệm vụ
        </button>
      </div>

      <p className="max-w-xs text-[11px] text-cream-50/50">
        Màn hình này sẽ kêu lại mỗi phút cho tới khi bạn nhận hoặc từ chối.
      </p>

      {declining && (
        <DeclineReasonSheet
          title={duty.title}
          pending={decline.isPending}
          onClose={() => setDeclining(false)}
          onConfirm={(note) => decline.mutate({ id: duty.id, note })}
        />
      )}
    </div>
  );
}

export default DutyAcceptOverlay;
