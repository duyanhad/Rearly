import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PhotoThumb } from './AddWaterModal';
import { LogStatusChip } from '../../../components/LogStatusChip';
import { periodLabel, timeLabel } from '../../../utils/format';

/**
 * Dải thẻ nhật ký uống nước: hiện đúng 3 thẻ mỗi lần, vuốt ngang (snap) hoặc bấm 2 nút mũi tên.
 * Dùng chung cho trang Hôm nay và trang Lịch.
 */
export function LogCarousel({ logs, emptyText = 'Chưa có lần uống nước nào. Bắt đầu thôi!' }) {
  const listRef = useRef(null);
  const [nav, setNav] = useState({ prev: false, next: false });

  const sync = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setNav({
      prev: el.scrollLeft > 4,
      next: max > 4 && el.scrollLeft < max - 4,
    });
  }, []);

  const scrollByPage = useCallback((dir) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync, logs.length]);

  if (logs.length === 0) return <p className="text-sm text-slate-500">{emptyText}</p>;

  const many = logs.length > 3;

  return (
    <div>
      {many && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">{logs.length} lần · vuốt hoặc bấm mũi tên</p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!nav.prev}
              aria-label="Xem lần uống trước"
              className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition active:scale-95 disabled:opacity-35"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!nav.next}
              aria-label="Xem lần uống sau"
              className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition active:scale-95 disabled:opacity-35"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      <ul
        ref={listRef}
        onScroll={sync}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {logs.map((log) => (
          <li key={log.id} className="w-[calc((100%-1.5rem)/3)] shrink-0 snap-start">
            <div className="flex h-full flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
              <PhotoThumb url={log.imageUrl} note={log.note} full />
              <p className="truncate text-sm font-semibold text-slate-800">{log.amountMl} ml</p>
              <p className="truncate text-[11px] text-slate-500">
                {periodLabel(log.period)} · {timeLabel(log.logTime)}
              </p>
              <LogStatusChip status={log.status} />
              {log.note && <p className="truncate text-[11px] text-slate-400">{log.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LogCarousel;
