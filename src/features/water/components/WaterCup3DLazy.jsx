import { lazy, Suspense } from 'react';

// three.js + react-three-fiber chỉ tải khi cốc thật sự render → bundle chính nhẹ hơn hẳn.
const WaterCup3D = lazy(() => import('./WaterCup3D').then((m) => ({ default: m.WaterCup3D })));

export function WaterCup3DLazy(props) {
  return (
    <Suspense fallback={<div className={props.size === 'sm' ? 'h-40 w-full' : 'h-64 w-full md:h-80'} />}>
      <WaterCup3D {...props} />
    </Suspense>
  );
}

export default WaterCup3DLazy;
