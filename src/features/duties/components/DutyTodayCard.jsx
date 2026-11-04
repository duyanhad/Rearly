import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { socialService } from '../../../services/socialService';
import { DutySheet, DutyRow, useDuties } from './DutySheet';

/**
 * Khối "Nhiệm vụ" trong trang Hôm nay: hiện các việc cần làm (được giao trước, rồi tới việc mình giao)
 * và mở popup nhiệm vụ khi bấm. Không có partner thì ẩn hẳn để trang gọn.
 */
export function DutyTodayCard() {
  const [open, setOpen] = useState(false);
  const { mine, given, isLoading } = useDuties();
  const { data: myPartner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000,
  });

  if (!myPartner) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <Link to="/partner" className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">Nhiệm vụ</p>
            <p className="truncate text-[11px] text-slate-500">Chưa có partner — vào Kênh partner để mời một người.</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        </Link>
      </section>
    );
  }

  // Việc cần xử lý lên trước: chưa nhận việc, chưa báo cáo, hoặc chờ mình duyệt.
  const pendingAccept = mine.filter((d) => d.needsAccept);
  const toReport = mine.filter((d) => !d.needsAccept && d.status !== 'approved');
  const toReview = given.filter((d) => d.status === 'submitted');
  const top = [...pendingAccept, ...toReport, ...toReview].slice(0, 3);
  const total = pendingAccept.length + toReport.length + toReview.length;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700 ring-1 ring-water-100">
          <ClipboardList className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Nhiệm vụ</p>
          <p className="truncate text-[11px] text-slate-500">
            {isLoading
              ? 'Đang tải…'
              : total === 0
                ? 'Không có việc nào cần làm — bấm để giao việc cho partner.'
                : `${total} việc cần bạn xử lý`}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-slate-400" />
      </button>

      {top.length > 0 && (
        <ul className="mt-2.5 space-y-2">
          {top.map((duty) => (
            <li key={duty.id}>
              <DutyRow duty={duty} onOpen={() => setOpen(true)} />
            </li>
          ))}
        </ul>
      )}

      {open && <DutySheet onClose={() => setOpen(false)} />}
    </section>
  );
}

export default DutyTodayCard;
