import { useEffect, useRef, useState } from 'react';

/**
 * Theo dõi danh sách lần ghi của một nhu cầu để biết vừa có gì xảy ra:
 * - `pour` tăng khi có lần ghi mới (người dùng vừa báo cáo).
 * - `spill` tăng khi một lần ghi bị từ chối hoặc bị xoá (partner vừa tác động).
 * Mở lại trang thì không chạy lại (giữ đúng cảm giác "vừa xảy ra").
 */
export function useHabitEvents(logs) {
  const [pour, setPour] = useState(0);
  const [spill, setSpill] = useState(0);
  const prev = useRef(null);

  useEffect(() => {
    const list = logs ?? [];
    if (prev.current === null) {
      prev.current = list;
      return;
    }
    const before = new Map(prev.current.map((l) => [l.id, l.status]));
    const added = list.some((l) => !before.has(l.id));
    const becameRejected = list.some(
      (l) => before.has(l.id) && l.status === 'rejected' && before.get(l.id) !== 'rejected',
    );
    const removed = prev.current.some((l) => !list.some((x) => x.id === l.id));
    prev.current = list;
    if (added) setPour((n) => n + 1);
    if (becameRejected || removed) setSpill((n) => n + 1);
  }, [logs]);

  return { pour, spill };
}

export default useHabitEvents;
