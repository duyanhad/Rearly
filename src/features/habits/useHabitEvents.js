import { useEffect, useRef, useState } from 'react';

const stampOf = (l) => {
  const reviewed = l.reviewedAt ? new Date(l.reviewedAt).getTime() : 0;
  const created = l.createdAt ? new Date(l.createdAt).getTime() : 0;
  return Math.max(reviewed, created);
};

/**
 * Hành động gần nhất trên danh sách lần ghi:
 * - `pour`    : bạn vừa gửi báo cáo -> avatar bạn tác động vào vật thể.
 * - `approve` : partner vừa duyệt -> avatar partner tác động, vật thể vẫn sáng.
 * - `spill`   : partner vừa từ chối (hoặc bạn xoá) -> vật thể "ói" ra và tối đi.
 * Vào lại/chuyển trang: phát lại đúng một lần theo hành động được ghi nhận gần nhất.
 */
export function useHabitEvents(logs) {
  const [pour, setPour] = useState(0);
  const [approve, setApprove] = useState(0);
  const [spill, setSpill] = useState(0);
  const prev = useRef(null);
  const replayed = useRef(false);

  useEffect(() => {
    const list = logs ?? [];

    // Lần đầu mở trang: dựng lại hiệu ứng của hành động gần nhất (sau khi layout xong).
    if (prev.current === null) {
      prev.current = list;
      if (replayed.current || list.length === 0) return;
      replayed.current = true;
      const latest = list.reduce((a, b) => (stampOf(b) >= stampOf(a) ? b : a));
      const action =
        latest.status === 'rejected' ? 'spill' : latest.reviewedAt && latest.status === 'approved' ? 'approve' : 'pour';
      const id = setTimeout(() => {
        if (action === 'spill') setSpill((n) => n + 1);
        else if (action === 'approve') setApprove((n) => n + 1);
        else setPour((n) => n + 1);
      }, 600);
      return () => clearTimeout(id);
    }

    const before = new Map(prev.current.map((l) => [l.id, l.status]));
    prev.current = list;
    const added = list.some((l) => !before.has(l.id));
    const becameRejected = list.some(
      (l) => before.has(l.id) && l.status === 'rejected' && before.get(l.id) !== 'rejected',
    );
    const becameApproved = list.some(
      (l) => before.has(l.id) && l.status === 'approved' && before.get(l.id) === 'pending',
    );
    if (added) setPour((n) => n + 1);
    if (becameRejected) setSpill((n) => n + 1);
    if (becameApproved) setApprove((n) => n + 1);
  }, [logs]);

  return { pour, approve, spill };
}

export default useHabitEvents;
