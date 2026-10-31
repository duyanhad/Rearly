import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Flame, Plus, TrendingDown } from 'lucide-react';
import { mediaUrl } from '../../../services/apiClient';
import { waterService } from '../../../services/waterService';
import { cupService } from '../../../services/cupService';
import { socialService } from '../../../services/socialService';
import { useAuth } from '../../../context/AuthProvider';
import { eraService } from '../../../services/eraService';
import { WaterCup3DLazy as WaterCup3D } from '../components/WaterCup3DLazy';
import { CupAvatarFx } from '../components/CupAvatarFx';
import { useLiquidColor } from '../hooks/useLiquidColor';
import { AddWaterModal } from '../components/AddWaterModal';
import { GoalCelebration } from '../components/GoalCelebration';
import { LogCarousel } from '../components/LogCarousel';
import { WaterBar } from '../../../components/WaterBar';
import { accent, shade } from '../../../utils/color';
import { readLastAction, saveLastAction } from '../../../utils/lastAction';
const periodLabels = {
  Morning: 'Sáng',
  Afternoon: 'Trưa',
  Evening: 'Tối'
};
export function DashboardPage() {
  const [open, setOpen] = useState(false);
  // { key, ml }: key tăng mỗi lần để hiệu ứng luôn chạy lại kể cả khi cùng số ml.
  const [spillFx, setSpillFx] = useState({ key: 0, ml: 0 });
  const [pourFx, setPourFx] = useState({ key: 0, ml: 0 });
  const [celebrate, setCelebrate] = useState(false);
  // Điểm rót thật (px trong canvas) = mép dưới-phải avatar của chính chủ.
  const [pourOrigin, setPourOrigin] = useState(null);
  const pourAnchor = useRef(null);
  const cupBox = useRef(null);
  // % hiển thị (đếm mượt) — khi bị trừ nước, số % và mực nước cùng tụt xuống.
  const [shownPercent, setShownPercent] = useState(0);
  const queryClient = useQueryClient();
  const lastTotal = useRef(null);
  const lastPending = useRef(null);
  const { user } = useAuth();

  const {
    data: today,
    isLoading
  } = useQuery({
    queryKey: ['today'],
    queryFn: async () => (await waterService.getToday()).data,
    refetchOnWindowFocus: true
  });
  const {
    data: cups = []
  } = useQuery({
    queryKey: ['cups'],
    queryFn: async () => (await cupService.list()).data
  });
  // Kỷ nguyên + giọt: dùng chung cache với trang /mascot
  const { data: eraCatalog } = useQuery({
    queryKey: ['eras'],
    queryFn: async () => (await eraService.getCatalog()).data,
    staleTime: 30_000,
  });

  const { data: myPartner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000
  });
  const displayCup = cups.find(cup => cup.isDefault) ?? cups.find(cup => cup.imageUrl) ?? null;
  // Server đã tách nền sẵn (PNG trong suốt) thì dùng luôn, không tách lại trên máy.
  const isPreCut = !!displayCup?.cutoutUrl;
  const cupTexture = mediaUrl(displayCup?.cutoutUrl || displayCup?.imageUrl || null);
  const liquidColor = useLiquidColor(cupTexture, isPreCut);

  // Uống thêm nước → nước rót vào cốc. Tính cả phần chờ duyệt để bấm "Uống nước" là có hiệu ứng ngay.
  useEffect(() => {
    if (!today) return;
    const total = today.totalDrankMl + (today.pendingMl ?? 0);
    if (lastTotal.current !== null && total > lastTotal.current) {
      const delta = Math.max(1, total - lastTotal.current);
      setPourFx((prev) => ({ key: prev.key + 1, ml: delta }));
      if (user?.id) saveLastAction(`u:${user.id}`, 'pour', delta);
    }
    lastTotal.current = total;
  }, [today?.totalDrankMl, today?.pendingMl]);

  // Một lần đổ nước thôi: realtime và chênh lệch số liệu có thể cùng bắn về một lượt.
  const lastSpillAt = useRef(0);
  const triggerSpill = (ml) => {
    if (Date.now() - lastSpillAt.current < 1000) return;
    lastSpillAt.current = Date.now();
    setSpillFx((prev) => ({ key: prev.key + 1, ml }));
    if (user?.id) saveLastAction(`u:${user.id}`, 'spill', ml);
  };

  // Mở lại app / quay lại trang → phát lại hiệu ứng của hành động gần nhất (một lần).
  const replayed = useRef(false);
  useEffect(() => {
    if (replayed.current || !today || !user?.id) return;
    replayed.current = true;
    const action = readLastAction(`u:${user.id}`);
    if (!action) return;
    if (action.type === 'pour') setPourFx((prev) => ({ key: prev.key + 1, ml: action.ml }));
    else setSpillFx((prev) => ({ key: prev.key + 1, ml: action.ml }));
  }, [today, user?.id]);

  // Phần chờ duyệt bị giảm (bị từ chối) → nước trong cốc đổ ra ngoài.
  useEffect(() => {
    if (!today) return;
    const pending = today.pendingMl ?? 0;
    if (lastPending.current !== null && pending < lastPending.current) {
      triggerSpill(Math.max(1, lastPending.current - pending));
    }
    lastPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today?.pendingMl]);

  // Bị partner trừ nước (realtime) → cốc nghiêng đổ nước.
  useEffect(() => {
    const onDeduct = (event) => {
      triggerSpill(Math.max(1, Number(event.detail?.amountMl) || 1));
      void queryClient.invalidateQueries({ queryKey: ['today'] });
      void queryClient.invalidateQueries({ queryKey: ['cups'] });
    };
    window.addEventListener('cup:deduct', onDeduct);
    return () => window.removeEventListener('cup:deduct', onDeduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  // Đo điểm rót thật từ avatar (mép dưới-phải = miệng ly) → px trong canvas của khối 3D.
  useEffect(() => {
    function measure() {
      const anchor = pourAnchor.current;
      const canvas = cupBox.current?.querySelector('canvas');
      if (!anchor || !canvas) return;
      const a = anchor.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      if (!a.width || !c.width) return;
      setPourOrigin({
        x: a.left - c.left + a.width * 0.7,
        y: a.top - c.top + a.height * 0.86,
      });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [user?.avatarUrl]);

  // % nước chờ duyệt (cộng vào số hiển thị để bấm "Uống nước" là thấy tăng ngay).
  const pendingPercent = today?.targetMl ? Math.min(100, (today.pendingMl / today.targetMl) * 100) : 0;
  const displayPercent = Math.min(100, (today?.percent ?? 0) + pendingPercent);

  // Đếm % mượt về giá trị mới (tăng khi uống, giảm khi bị trừ) trong ~0.9s.
  useEffect(() => {
    if (!today) return;
    const from = shownPercent;
    const to = displayPercent;
    if (Math.abs(to - from) < 0.5) {
      if (from !== to) setShownPercent(to);
      return;
    }
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - (1 - k) * (1 - k);
      setShownPercent(from + (to - from) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPercent]);
  // Vừa đạt 100% mục tiêu → chờ nước rót xong mới bật popup chúc mừng (mỗi ngày một lần).
  const celebrated = useRef(null);
  useEffect(() => {
    if (!today?.isCompleted) return;
    if (celebrated.current === today.date) return;
    const key = `dw-goal-celebrated-${today.date}`;
    if (localStorage.getItem(key)) {
      celebrated.current = today.date;
      return;
    }
    const id = setTimeout(() => {
      localStorage.setItem(key, '1');
      celebrated.current = today.date;
      setCelebrate(true);
    }, 2200);
    return () => clearTimeout(id);
  }, [today?.isCompleted, today?.date]);

  if (isLoading || !today) {
    return <DearlyLoader full />;
  }
  return <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <section ref={cupBox} className="relative min-w-0 rounded-2xl bg-white p-4 shadow-sm">
          {/* Hai avatar ở 2 góc: tôi rót nước (trái) và người duyệt ảnh tác động (phải). */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between">
            <CupAvatarFx
              action="pour"
              avatarUrl={user?.avatarUrl}
              name="Bạn"
              side="left"
              signal={pourFx.key}
              amount={pourFx.ml}
              anchorRef={pourAnchor}
              color={liquidColor}
            />
            {myPartner && (
              <CupAvatarFx
                action="hit"
                avatarUrl={myPartner.avatarUrl}
                name={myPartner.fullName}
                side="right"
                signal={spillFx.key}
                amount={spillFx.ml}
                color={liquidColor}
              />
            )}
          </div>

          <WaterCup3D
            percent={Math.max(0, shownPercent)}
            textureUrl={cupTexture}
            spill={spillFx.ml}
            spillKey={spillFx.key}
            pourIn={pourFx.ml}
            pourKey={pourFx.key}
            pourOrigin={pourOrigin}
            preCut={isPreCut}
          />
          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            {/* Số % lớn + thanh nước cho biết mức hoàn thành */}
            <div className="flex items-baseline gap-0.5">
              <span
                className="bg-clip-text text-4xl font-extrabold tracking-tight text-transparent tabular-nums"
                style={{ backgroundImage: `linear-gradient(135deg, ${shade(accent(liquidColor), 28)}, ${shade(accent(liquidColor), -26)})` }}
              >
                {Math.round(shownPercent)}
              </span>
              <span
                className="bg-clip-text text-xl font-bold text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${shade(accent(liquidColor), 18)}, ${shade(accent(liquidColor), -16)})` }}
              >
                %
              </span>
            </div>

            <p className="text-xs font-medium text-slate-500">
              <span className="text-sm font-semibold text-slate-800">{today.totalDrankMl + today.pendingMl}</span>
              <span className="text-slate-300"> / </span>
              {today.targetMl} ml
            </p>

            <div className="w-full max-w-[230px]">
              <WaterBar percent={displayPercent} height="h-1.5" color={liquidColor} showFlames={false} />
            </div>

            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
              <Link
                to="/mascot"
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 text-xs font-medium text-orange-600 ring-1 ring-orange-100"
              >
                <Flame className="size-3.5" />
                Chuỗi {today.streakCount} ngày
                <span className="text-orange-400">·</span>
                {eraCatalog?.coins ?? 0} giọt
              </Link>
              {today.pendingMl > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  <Clock className="size-3.5" /> {today.pendingMl} ml chờ duyệt
                </span>
              )}
              {today.deductedMl > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-100">
                  <TrendingDown className="size-3.5" /> −{today.deductedMl} ml hôm nay
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-water-600 py-4 text-base font-semibold text-white shadow-sm shadow-water-500/30 transition active:scale-[0.99]">
              <Plus className="size-5" /> Uống nước
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              Mở camera chụp ảnh cốc nước → ghi chú → thêm nước
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Tiến độ theo ca</h2>
            <div className="space-y-3">
              {today.periods.map(p => <div key={p.period}>
                  <div className="mb-1 text-xs text-slate-500">
                    <span className="block">{periodLabels[p.period]}</span>
                    <span className="block tabular-nums">
                      {p.drankMl} / {p.targetMl} ml
                    </span>
                  </div>
                  <WaterBar percent={p.percent} height="h-2" color={liquidColor} />
                </div>)}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Nhật ký hôm nay</h2>
        <LogCarousel logs={today.logs} />
      </section>
      {open && <AddWaterModal onClose={() => setOpen(false)} />}

      <GoalCelebration
        open={celebrate}
        percent={today.percent}
        totalMl={today.totalDrankMl}
        targetMl={today.targetMl}
        streakCount={today.streakCount}
        textureUrl={cupTexture}
        preCut={isPreCut}
        onClose={() => setCelebrate(false)}
      />
    </div>;
}