import { lazy, Suspense, useEffect, useState } from 'react';

// three.js + react-three-fiber chỉ tải khi cốc thật sự render → bundle chính nhẹ hơn hẳn.
const WaterCup3D = lazy(() => import('./WaterCup3D').then((m) => ({ default: m.WaterCup3D })));

/**
 * Trì hoãn nạp three.js tới khi trang đã vẽ xong khung đầu (idle ~400ms):
 * người dùng thấy nội dung + số % ngay, cốc 3D hiện sau trong cùng một nhịp.
 * Tính năng 3D giữ nguyên (không đổi hành vi, chỉ đổi thời điểm tải).
 */
export function WaterCup3DLazy(props) {
  const [ready, setReady] = useState(false);
  const fallback = <div className={props.size === 'sm' ? 'h-40 w-full' : 'h-64 w-full md:h-80'} />;

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };
    const idle = window.requestIdleCallback?.bind(window);
    const id = idle ? idle(mount, { timeout: 1200 }) : window.setTimeout(mount, 400);
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, []);

  if (!ready) return fallback;
  return <Suspense fallback={fallback}><WaterCup3D {...props} /></Suspense>;
}

export default WaterCup3DLazy;