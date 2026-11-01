import { useEffect, useMemo, useRef, useState } from 'react';
import { DearlyLoader, DearlySkeleton } from '../../../components/DearlyLoader';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BellRing,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  Flame,
  Image as ImageIcon,
  Inbox,
  Moon,
  Pencil,
  Pill,
  Scale,
  Search,
  ShieldCheck,
  Soup,
  TrendingDown,
  Users,
  X,
} from 'lucide-react';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { socialService } from '../../../services/socialService';
import { habitLogService } from '../../../services/habitLogService';
import { sleepService } from '../../../services/sleepService';
import { HABIT_KINDS } from '../../habits/config';
import { HabitAvatar3D } from '../../habits/components/HabitAvatar3D';
import { HabitObjectAvatars } from '../../habits/components/HabitObjectAvatars';
import { useAuth } from '../../../context/AuthProvider';
import { useToast } from '../../../components/Toast';
import { Avatar } from '../../../components/Avatar';
import { WaterCup3DLazy as WaterCup3D } from '../../water/components/WaterCup3DLazy';
import { CupAvatarFx } from '../../water/components/CupAvatarFx';
import { WaterBar } from '../../../components/WaterBar';
import { accent, shade } from '../../../utils/color';
import { useLiquidColor } from '../../water/hooks/useLiquidColor';
import { periodLabel, timeLabel } from '../../../utils/format';
import { readLastAction, saveLastAction } from '../../../utils/lastAction';
import { NudgeSheet } from '../../social/components/NudgeSheet';

const periodLabels = { Morning: 'Sáng', Afternoon: 'Trưa', Evening: 'Tối' };
const emptyFx = { key: 0, ml: 0 };

/**
 * Trang partner 2 bước:
 * 1) Danh sách người nhờ mình duyệt (có biệt hiệu, %, số phiếu chờ).
 * 2) Chọn một người → "nhà" của người đó: cốc, tiến độ hôm nay, tiến độ theo ca,
 *    trừ nước và duyệt phiếu (từ chối có thể kèm trừ đúng số ml vừa thêm).
 */
const proofText = (p) => {
  if (p.kind === 'water') return `${p.amountMl} ml · ${periodLabel(p.period)}`;
  if (p.kind === 'sleep') return `Giấc ngủ ${p.bedTime} → ${p.wakeTime}`;
  if (p.kind === 'weight') return `Cân nặng ${(p.value / 1000).toFixed(1)} kg`;
  return `${HABIT_KINDS[p.kind]?.label ?? p.kind} · ${timeLabel(p.logTime)}`;
};

const PROOF_PAGE_SIZE = 4;

const fmtHours = (min) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;

export function PartnerPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const [selectedId, setSelectedId] = useState(null);
  const [term, setTerm] = useState('');
  const [spillFx, setSpillFx] = useState(emptyFx);
  const [pourFx, setPourFx] = useState(emptyFx);
  const [renaming, setRenaming] = useState(null); // { id, value }
  const [rejecting, setRejecting] = useState(null); // proof
  const [approving, setApproving] = useState(null); // proof
  const [message, setMessage] = useState('');
  const [pourOrigin, setPourOrigin] = useState(null);
  const lastTotal = useRef(null);
  const pourAnchor = useRef(null);
  const cupBox = useRef(null);

  // Đo điểm rót thật từ avatar người đang xem (mép dưới-phải = miệng ly) → px trong canvas.
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
  }, [selectedId]);

  const { data: clients = [] } = useQuery({
    queryKey: ['partner-clients'],
    queryFn: async () => (await socialService.getPartnerClients()).data,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  // Người đang duyệt ảnh cho tôi — hiện ngay trên trang để thấy rõ quan hệ 2 chiều.
  const { data: myPartner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000,
  });
  // Người tôi đã xin duyệt ảnh (chờ họ đồng ý) + những người xin tôi duyệt.
  const { data: pendingPartner } = useQuery({
    queryKey: ['partner-pending'],
    queryFn: async () => (await socialService.getPendingPartner()).data,
    staleTime: 30_000,
  });
  const { data: partnerRequests = [] } = useQuery({
    queryKey: ['partner-requests'],
    queryFn: async () => (await socialService.getPartnerRequests()).data,
    refetchInterval: 30_000,
  });
  const answerPartner = useMutation({
    mutationFn: async ({ id, accept }) => socialService.respondPartnerRequest(id, accept),
    onSuccess: async (_, { accept }) => {
      toast.show(accept ? 'Đã đồng ý duyệt ảnh' : 'Đã từ chối', accept ? 'Người này sẽ thấy bạn là người duyệt.' : '');
      for (const key of ['partner-requests', 'partner-clients', 'pending-proofs', 'notifications']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (err) => toast.show('Không thực hiện được', errorMessage(err)),
  });

  const { data: proofs = [], isLoading: proofsLoading } = useQuery({
    queryKey: ['pending-proofs'],
    queryFn: async () => (await socialService.getPendingProofs()).data,
    refetchOnWindowFocus: true,
  });

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const displayName = (c) => c?.nickname || c?.fullName || '';

  const { data: clientToday } = useQuery({
    queryKey: ['partner-today', selectedId],
    queryFn: async () => (await socialService.getClientToday(selectedId)).data,
    enabled: !!selectedId,
    refetchInterval: 20_000,
  });

  const isPreCut = !!selected?.cupCutoutUrl;
  const cupUrl = mediaUrl(selected?.cupCutoutUrl || selected?.cupImageUrl || null);
  const liquidColor = useLiquidColor(cupUrl, isPreCut);

  // Tổng nước nhìn thấy trong cốc = đã duyệt + chờ duyệt (khách thêm nước là phiếu chờ duyệt).
  const clientTank = (clientToday?.totalDrankMl ?? 0) + (clientToday?.pendingMl ?? 0);

  // Một lần rót thôi: realtime và chênh lệch số liệu có thể cùng bắn về.
  const lastPourAt = useRef(0);
  const triggerPour = (ml) => {
    if (Date.now() - lastPourAt.current < 1000) return;
    lastPourAt.current = Date.now();
    setPourFx((prev) => ({ key: prev.key + 1, ml }));
    if (selectedId) saveLastAction(`partner:${selectedId}`, 'pour', ml);
  };

  // Mở lại trang → phát lại hiệu ứng hành động gần nhất của khách này (một lần).
  const replayed = useRef(false);
  useEffect(() => {
    replayed.current = false;
  }, [selectedId]);
  useEffect(() => {
    if (replayed.current || !selectedId || !clientToday) return;
    replayed.current = true;
    const action = readLastAction(`partner:${selectedId}`);
    if (!action) return;
    if (action.type === 'pour') setPourFx((prev) => ({ key: prev.key + 1, ml: action.ml }));
    else setSpillFx((prev) => ({ key: prev.key + 1, ml: action.ml }));
  }, [selectedId, clientToday]);

  // Người kia uống thêm nước → nước rót vào cốc (mỗi lần đều chạy lại).
  useEffect(() => {
    if (clientToday === undefined) return;
    if (lastTotal.current !== null && clientTank > lastTotal.current) {
      triggerPour(Math.max(1, clientTank - lastTotal.current));
    }
    lastTotal.current = clientTank;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientTank, selectedId]);

  // Realtime: khách vừa thêm nước → rót ngay, không chờ vòng tải lại.
  useEffect(() => {
    const onPour = (event) => {
      const detail = event.detail ?? {};
      if (detail.userId && detail.userId !== selectedId) return;
      triggerPour(Math.max(1, Number(detail.amountMl) || 1));
    };
    window.addEventListener('cup:pour', onPour);
    return () => window.removeEventListener('cup:pour', onPour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const percentOf = (c) =>
    c?.targetMl ? Math.min(100, Math.round((c.totalDrankMl / c.targetMl) * 100)) : 0;
  // Số liệu hôm nay của khách đang xem (có cả phần chờ duyệt).
  const dailyPercent = clientToday?.targetMl
    ? Math.min(100, Math.round(((clientToday.totalDrankMl + (clientToday.pendingMl ?? 0)) / clientToday.targetMl) * 100))
    : percentOf(selected);
  const dailyMl = (clientToday?.totalDrankMl ?? 0) + (clientToday?.pendingMl ?? 0);

  // Thanh danh mục như trang Hôm nay: chọn nhu cầu để xem tiến độ + duyệt phiếu của nhu cầu đó.
  const [kindFilter, setKindFilter] = useState('water');
  const needStrip = useRef(null);
  const {
    data: needs = [],
    isLoading: needsLoading,
  } = useQuery({
    queryKey: ['partner-needs', selectedId],
    queryFn: async () => (await socialService.getClientNeeds(selectedId)).data,
    enabled: !!selectedId,
    staleTime: 10_000,
  });
  const needOf = (kind) => needs.find((n) => n.kind === kind);
  const needText = (n) => {
    if (!n) return '—';
    if (n.kind === 'water') return `${n.done} / ${n.target} ml`;
    if (n.kind === 'sleep') return `${fmtHours(n.done)} / ${fmtHours(n.target)}`;
    if (n.kind === 'weight') return `${(n.done / 1000).toFixed(1)} / ${(n.target / 1000).toFixed(1)} kg`;
    return `${n.done} / ${n.target} lần`;
  };
  const scrollNeeds = (dir) =>
    needStrip.current?.scrollBy({ left: dir * 140, behavior: 'smooth' });
  const PROOF_TABS = [
    { key: 'all', label: 'Tất cả', icon: Inbox },
    { key: 'water', label: 'Nước', icon: Droplet },
    { key: 'sleep', label: 'Giấc ngủ', icon: Moon },
    { key: 'meal', label: 'Bữa ăn', icon: Soup },
    { key: 'medicine', label: 'Thuốc', icon: Pill },
    { key: 'study', label: 'Học tập', icon: BookOpen },
    { key: 'weight', label: 'Cân nặng', icon: Scale },
  ];

  const byClient = useMemo(
    () => (selectedId ? proofs.filter((p) => p.userId === selectedId) : proofs),
    [proofs, selectedId],
  );
  const kindCount = (key) =>
    key === 'all' ? byClient.length : byClient.filter((p) => (p.kind ?? 'water') === key).length;
  // Nhu cầu nào phía khách đã tắt tính năng thì ẩn tab luôn (vẫn giữ tab nếu còn phiếu chờ duyệt).
  const visibleTabs = needsLoading
    ? PROOF_TABS
    : PROOF_TABS.filter((t) => t.key === 'all' || t.key === 'water' || needs.some((n) => n.kind === t.key) || kindCount(t.key) > 0);
  useEffect(() => {
    if (!needsLoading && kindFilter !== 'all' && !visibleTabs.some((t) => t.key === kindFilter)) setKindFilter('water');
  }, [needsLoading, visibleTabs, kindFilter]);
  const filteredProofs = useMemo(
    () => (kindFilter === 'all' ? byClient : byClient.filter((p) => (p.kind ?? 'water') === kindFilter)),
    [byClient, kindFilter],
  );
  // Nhiều phiếu thì chia trang cho dễ thao tác trên điện thoại.
  const [proofPage, setProofPage] = useState(0);
  // Hiệu ứng ở thẻ nhu cầu: duyệt → avatar khách "rót" đồ vào; từ chối → avatar mình đập, đồ rớt ra.
  const [needFx, setNeedFx] = useState({ pour: 0, spill: 0 });
  const pageCount = Math.max(1, Math.ceil(filteredProofs.length / PROOF_PAGE_SIZE));
  const safePage = Math.min(proofPage, pageCount - 1);
  const pageProofs = filteredProofs.slice(safePage * PROOF_PAGE_SIZE, safePage * PROOF_PAGE_SIZE + PROOF_PAGE_SIZE);

  const pendingCountOf = (userId) => proofs.filter((p) => p.userId === userId).length;

  // Chuông: chọn loại nhắc (nước/bữa ăn/thuốc…) + lời nhắn, gửi realtime/push.
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const nudge = useMutation({
    mutationFn: async ({ userId, kind, message }) => socialService.nudge(userId, { kind, message }),
    onSuccess: () => {
      setNudgeOpen(false);
      toast.show('Đã gửi nhắc nhở', `${selected ? displayName(selected) : 'Khách'} sẽ nhận thông báo ngay.`);
    },
    onError: (err) => toast.show('Không gửi được', errorMessage(err)),
  });

  const invalidate = () => {
    for (const key of ['partner-clients', 'pending-proofs', 'feed', 'notifications', 'partner-needs']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ['partner-today', selectedId] });
  };

  const review = useMutation({
    mutationFn: async ({ logId, kind, approve, message }) => {
      // Mỗi loại phiếu duyệt ở endpoint riêng.
      if (kind === 'sleep') return sleepService.review(logId, { approve, reason: message });
      if (kind && kind !== 'water') return habitLogService.review(logId, { approve, reason: message });
      return socialService.reviewProof(logId, approve, message);
    },
    onSuccess: (_data, variables) => {
      setNeedFx((f) =>
        variables.approve ? { ...f, pour: f.pour + 1 } : { ...f, spill: f.spill + 1 },
      );
      // Từ chối → phần nước chờ duyệt biến mất, cho cốc của khách nghiêng đổ ra.
      if (!variables.approve && variables.amountMl > 0) {
        setSpillFx((prev) => ({ key: prev.key + 1, ml: variables.amountMl }));
        if (selectedId) saveLastAction(`partner:${selectedId}`, 'spill', variables.amountMl);
      }
      invalidate();
      toast.show(
        variables.approve ? 'Đã duyệt phiếu' : 'Đã từ chối phiếu',
        variables.approve ? 'ml đã được cộng vào tiến trình của bạn ấy.' : 'ml không được tính.',
      );
    },
    onError: (err) => toast.show('Không duyệt được', errorMessage(err)),
  });

  const rename = useMutation({
    mutationFn: async ({ id, value }) => socialService.setNickname(id, value),
    onSuccess: () => {
      setRenaming(null);
      void queryClient.invalidateQueries({ queryKey: ['partner-clients'] });
      toast.show('Đã lưu biệt hiệu', 'Biệt hiệu chỉ bạn thấy.');
    },
    onError: (err) => toast.show('Không lưu được', errorMessage(err)),
  });

  const confirmReject = () => {
    if (!rejecting) return;
    const proof = rejecting;
    review.mutate({ logId: proof.id, kind: proof.kind, approve: false, amountMl: proof.amountMl, message: message.trim() || undefined });
    setRejecting(null);
    setMessage('');
  };

  const visibleClients = clients.filter(
    (c) => !term || `${displayName(c)} ${c.fullName}`.toLowerCase().includes(term.toLowerCase()),
  );

  const header = (
    <header className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-water-700 p-5 text-white shadow-sm">
      <p className="flex items-center gap-2 text-xs font-medium text-water-200">
        <ShieldCheck className="size-4" /> KÊNH PARTNER
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Bạn đang duyệt cho {clients.length} người</h1>
      </div>
      <p className="mt-1 text-sm text-slate-300">
        {selected
          ? 'Xem cốc, tiến độ hôm nay và duyệt phiếu minh chứng của người này.'
          : 'Chọn một người bên dưới để mở trang của họ.'}
      </p>
      <div className="mt-4 flex gap-2">
        <div className="rounded-xl bg-white/10 px-3 py-2">
          <p className="text-lg font-bold">{proofs.length}</p>
          <p className="text-[11px] text-slate-300">Phiếu chờ duyệt</p>
        </div>
        <div className="rounded-xl bg-white/10 px-3 py-2">
          <p className="text-lg font-bold">{clients.length}</p>
          <p className="text-[11px] text-slate-300">Người nhờ bạn</p>
        </div>
      </div>
      {proofs.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-300">
          <BellRing className="size-3.5 text-amber-300" />
          {PROOF_TABS.slice(1)
            .map(({ key, label }) => ({ label, n: proofs.filter((p) => (p.kind ?? 'water') === key).length }))
            .filter((x) => x.n > 0)
            .map((x) => (
              <span key={x.label} className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white">
                {x.label} {x.n}
              </span>
            ))}
        </p>
      )}
    </header>
  );

  // ---------- Bước 1: danh sách người được nhờ duyệt ----------
  if (!selected) {
    return (
      <div className="space-y-5">
        {header}

        {myPartner && (
          <section className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <Avatar url={myPartner.avatarUrl} name={myPartner.fullName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Người duyệt ảnh của tôi</p>
              <p className="truncate text-sm font-semibold text-slate-800">{myPartner.fullName}</p>
            </div>
            <ShieldCheck className="size-4 shrink-0 text-water-600" />
          </section>
        )}

        {!myPartner && pendingPartner && (
          <section className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-100">
            <Avatar url={pendingPartner.avatarUrl} name={pendingPartner.fullName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Đang chờ đồng ý</p>
              <p className="truncate text-sm font-semibold text-slate-800">{pendingPartner.nickname || pendingPartner.fullName}</p>
              <p className="text-xs text-slate-500">Người này cần đồng ý thì mới thành người duyệt ảnh của bạn.</p>
            </div>
          </section>
        )}

        {partnerRequests.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-100">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="size-4 text-amber-500" /> Lời mời duyệt ảnh ({partnerRequests.length})
            </h2>
            <ul className="space-y-2">
              {partnerRequests.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl bg-amber-50/60 p-3">
                  <Avatar url={r.avatarUrl} name={r.fullName} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{r.nickname || r.fullName}</span>
                    <span className="block text-xs text-slate-500">Nhờ bạn duyệt ảnh cốc nước</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => answerPartner.mutate({ id: r.id, accept: true })}
                    disabled={answerPartner.isPending}
                    className="rounded-lg bg-water-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
                  >
                    Đồng ý
                  </button>
                  <button
                    type="button"
                    onClick={() => answerPartner.mutate({ id: r.id, accept: false })}
                    disabled={answerPartner.isPending}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-white disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {clients.length === 0 && (
          <section className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <Users className="size-10 text-slate-300" />
            <p className="font-medium text-slate-700">Chưa ai chọn bạn làm partner</p>
            <p className="text-sm text-slate-500">
              Khi họ chọn bạn ở trang cá nhân, tên họ sẽ hiện ở đây.
            </p>
          </section>
        )}

        {clients.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users className="size-4 text-water-600" /> Người nhờ bạn duyệt
            </h2>

            {clients.length > 4 && (
              <label className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <Search className="size-4 text-slate-400" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Tìm người"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
            )}

            <ul className="space-y-2">
              {visibleClients.map((c) => {
                const pct = percentOf(c);
                const pending = pendingCountOf(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setKindFilter('water');
                        lastTotal.current = null;
                      }}
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-water-50"
                    >
                      <Avatar url={c.avatarUrl} name={displayName(c)} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-slate-800">{displayName(c)}</span>
                          {pending > 0 && (
                            <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
                              {pending}
                            </span>
                          )}
                        </span>
                        {c.nickname && (
                          <span className="block truncate text-[11px] text-slate-400">{c.fullName}</span>
                        )}
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-slate-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const activeTab = visibleTabs.find((x) => x.key === kindFilter) ?? visibleTabs[1];
  const ActiveIcon = activeTab.icon;
  const activeNeed = needOf(kindFilter);

  // ---------- Bước 2: "nhà" của người đang chọn ----------
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm"
        >
          <ArrowLeft className="size-4" /> Danh sách
        </button>
        <span className="text-sm text-slate-500">Đang xem</span>
        <span className="truncate text-sm font-semibold text-water-700">{displayName(selected)}</span>
      </div>

      {header}

      {/* Thanh danh mục: đổi nhu cầu để xem tiến độ + duyệt phiếu của nhu cầu đó */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => scrollNeeds(-1)}
          aria-label="Nhu cầu trước"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div
          ref={needStrip}
          className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto px-0.5 py-0.5"
        >
          {visibleTabs.slice(1).map(({ key, label, icon: Icon }) => {
            const n = kindCount(key);
            const active = kindFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  setKindFilter(key);
                  e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
                }}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-water-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
                {n > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold ${
                      active ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => scrollNeeds(1)}
          aria-label="Nhu cầu sau"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0 space-y-3">
          {/* Nước: cốc + tiến độ theo ca (các nhu cầu khác dùng thẻ tiến độ bên dưới) */}
          {kindFilter === 'water' && (
          <>
          <section ref={cupBox} className="relative min-w-0 rounded-2xl bg-white p-4 shadow-sm">
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between">
              <CupAvatarFx
                action="pour"
                avatarUrl={selected.avatarUrl}
                name={displayName(selected)}
                side="left"
                signal={pourFx.key}
                amount={pourFx.ml}
                anchorRef={pourAnchor}
                color={liquidColor}
              />
              <CupAvatarFx
                action="hit"
                avatarUrl={user?.avatarUrl}
                name="Bạn"
                side="right"
                signal={spillFx.key}
                amount={spillFx.ml}
                color={liquidColor}
              />
            </div>

            <WaterCup3D
              percent={Math.max(0, dailyPercent)}
              textureUrl={cupUrl}
              spill={spillFx.ml}
              spillKey={spillFx.key}
              pourIn={pourFx.ml}
              pourKey={pourFx.key}
              pourOrigin={pourOrigin}
              preCut={isPreCut}
            />

            <div className="mt-2 text-center">
              <div className="flex items-baseline justify-center gap-0.5">
                <span
                  className="bg-clip-text text-4xl font-extrabold tracking-tight text-transparent tabular-nums"
                  style={{ backgroundImage: `linear-gradient(135deg, ${shade(accent(liquidColor), 28)}, ${shade(accent(liquidColor), -26)})` }}
                >
                  {dailyPercent}
                </span>
                <span
                  className="bg-clip-text text-xl font-bold text-transparent"
                  style={{ backgroundImage: `linear-gradient(135deg, ${shade(accent(liquidColor), 18)}, ${shade(accent(liquidColor), -16)})` }}
                >
                  %
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                <span className="text-sm font-semibold text-slate-800">{dailyMl}</span>
                <span className="text-slate-300"> / </span>
                {selected.targetMl} ml
              </p>
              <div className="mx-auto mt-2 w-full max-w-[230px]">
                <WaterBar percent={dailyPercent} height="h-1.5" color={liquidColor} showFlames={false} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 text-xs font-medium text-orange-600 ring-1 ring-orange-100">
                  <Flame className="size-3.5" /> Chuỗi {clientToday?.streakCount ?? 0} ngày
                </span>
                {!!clientToday?.pendingMl && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                    <Clock className="size-3.5" /> {clientToday.pendingMl} ml chờ duyệt
                  </span>
                )}
                {!!clientToday?.deductedMl && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-100">
                    <TrendingDown className="size-3.5" /> −{clientToday.deductedMl} ml hôm nay
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setRenaming({ id: selected.id, value: selected.nickname ?? '' })}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
              >
                <Pencil className="size-3" />
                {selected.nickname ? 'Đổi biệt hiệu' : 'Đặt biệt hiệu'}
              </button>
              <button
                type="button"
                onClick={() => setNudgeOpen(true)}
                disabled={!selected}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-water-700 hover:bg-water-50 disabled:opacity-50"
                aria-label={`Nhắc ${displayName(selected)}`}
                title="Nhắc nhở"
              >
                <BellRing className="size-3" /> Nhắc nhở
              </button>
            </div>
          </section>

          {/* Tiến độ theo ca */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Tiến độ theo ca</h2>
            <div className="space-y-3">
              {(clientToday?.periods ?? []).map((p) => (
                <div key={p.period}>
                  <div className="mb-1 text-xs text-slate-500">
                    <span className="block">{periodLabels[p.period]}</span>
                    <span className="block tabular-nums">
                      {p.drankMl} / {p.targetMl} ml
                    </span>
                  </div>
                  <WaterBar percent={p.percent} height="h-1.5" color={liquidColor} />
                </div>
              ))}
              {!clientToday && <DearlyLoader size="sm" />}
            </div>
          </section>
          </>
          )}

          {kindFilter !== 'water' && (
            <section className="relative min-w-0 rounded-2xl bg-white p-4 pt-16 shadow-sm">
              <HabitObjectAvatars
                pour={needFx.pour}
                spill={needFx.spill}
                color={liquidColor}
                left={{ avatarUrl: selected?.avatarUrl, name: displayName(selected) }}
                right={{ avatarUrl: user?.avatarUrl, name: 'Bạn' }}
              />
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ActiveIcon className="size-4 text-water-600" /> {activeTab.label} hôm nay
              </h2>
              <div className="flex h-44 items-center justify-center">
                <HabitAvatar3D
                  imageUrl={activeNeed?.imageUrl}
                  cutoutUrl={activeNeed?.cutoutUrl}
                  hit={(activeNeed?.percent ?? 0) >= 100}
                  percent={activeNeed?.percent ?? 0}
                  signal={needFx.pour + (activeNeed?.done ?? 0)}
                  spill={needFx.spill}
                  kind={kindFilter}
                  sleeping={Boolean(activeNeed?.sleeping)}
                  fallback={ActiveIcon}
                  plain
                  className={activeNeed?.imageUrl ? 'size-full' : 'size-24'}
                />
              </div>

              <div className="text-center">
                <div className="mt-3 flex items-baseline justify-center gap-0.5">
                  <span
                    className="bg-clip-text text-4xl font-extrabold tracking-tight text-transparent tabular-nums"
                    style={{ backgroundImage: `linear-gradient(135deg, ${shade(accent(liquidColor), 28)}, ${shade(accent(liquidColor), -26)})` }}
                  >
                    {activeNeed?.percent ?? 0}
                  </span>
                  <span className="bg-clip-text text-xl font-bold text-transparent"
                    style={{ backgroundImage: `linear-gradient(135deg, ${shade(accent(liquidColor), 18)}, ${shade(accent(liquidColor), -16)})` }}
                  >
                    %
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  <span className="text-sm font-semibold text-slate-800">{needText(activeNeed)}</span>
                  {kindFilter === 'weight' && <span className="text-slate-400"> · mục tiêu</span>}
                </p>
                <div className="mx-auto mt-2 w-full max-w-[230px]">
                  <WaterBar percent={activeNeed?.percent ?? 0} height="h-1.5" color={liquidColor} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {!!activeNeed?.pendingCount && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                      <Clock className="size-3.5" /> {activeNeed.pendingCount} phiếu chờ duyệt
                    </span>
                  )}
                  {(activeNeed?.percent ?? 0) >= 100 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                      <Check className="size-3.5" /> Đủ mục tiêu
                    </span>
                  )}
                  {!activeNeed?.pendingCount && !needsLoading && (
                    <span className="text-[11px] text-slate-400">Không có phiếu nào chờ duyệt</span>
                  )}
                </div>
                {needsLoading && <DearlySkeleton rows={2} className="mt-2" />}
              </div>
            </section>
          )}
        </div>

        {/* Duyệt / từ chối phiếu minh chứng — chia trang cho dễ thao tác */}
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-600">
              <ImageIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-slate-800">Duyệt phiếu · {activeTab.label}</h2>
              <p className="truncate text-[11px] text-slate-500">{displayName(selected)} · duyệt để cộng vào chỉ tiêu</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
              {filteredProofs.length} chờ
            </span>
          </div>

          {/* Phân trang: 4 phiếu mỗi trang, đặt trên danh sách để không bị nút chat che */}
          {filteredProofs.length > PROOF_PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                {safePage * PROOF_PAGE_SIZE + 1}–{Math.min(filteredProofs.length, (safePage + 1) * PROOF_PAGE_SIZE)} / {filteredProofs.length} phiếu
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setProofPage(safePage - 1)}
                  disabled={safePage === 0}
                  aria-label="Trang trước"
                  className="flex size-7 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 transition disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setProofPage(i)}
                    aria-label={`Trang ${i + 1}`}
                    className={`size-7 rounded-lg text-[11px] font-bold transition ${
                      i === safePage ? 'bg-water-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setProofPage(safePage + 1)}
                  disabled={safePage >= pageCount - 1}
                  aria-label="Trang sau"
                  className="flex size-7 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 transition disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {proofsLoading && <DearlySkeleton rows={2} className="mt-3" />}

          {!proofsLoading && filteredProofs.length === 0 && (
            <div className="mt-3 flex flex-col items-center gap-1 rounded-2xl bg-slate-50 py-6 text-center">
              <Inbox className="size-8 text-slate-300" />
              <p className="text-xs font-medium text-slate-500">Không có phiếu nào chờ duyệt</p>
              <p className="text-[11px] text-slate-400">Phiếu của nhu cầu khác vẫn ở các tab bên trên.</p>
            </div>
          )}

          <ul className="mt-3 space-y-2.5">
            {pageProofs.map((p) => {
              const photo = mediaUrl(p.imageUrl);
              const liveTotal = Math.max(0, (clientToday?.totalDrankMl ?? 0) - 0);
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:ring-water-200"
                >
                  <div className="flex gap-3 p-3">
                    {photo ? (
                      <a href={photo} target="_blank" rel="noreferrer" className="group relative shrink-0">
                        <img
                          src={photo}
                          alt={p.note ?? 'Ảnh minh chứng'}
                          className="size-[72px] rounded-xl object-cover ring-1 ring-slate-200 transition group-hover:brightness-95"
                        />
                        <span className="absolute inset-x-1 bottom-1 rounded-md bg-slate-900/55 py-0.5 text-center text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                          Xem ảnh
                        </span>
                      </a>
                    ) : (
                      <div className="flex size-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-100 text-slate-400">
                        <ImageIcon className="size-5" />
                        <span className="text-[9px] font-medium">Không ảnh</span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{proofText(p)}</p>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                          {timeLabel(p.logTime)}
                        </span>
                      </div>
                      {p.kind === 'sleep' && !!p.value && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Đã ngủ {Math.floor(p.value / 60)}h{String(p.value % 60).padStart(2, '0')}
                        </p>
                      )}
                      {p.kind === 'water' && (
                        <p className="mt-0.5 text-[11px] text-slate-500">Cốc hiện tại: {liveTotal} ml</p>
                      )}
                      {p.note && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{p.note}</p>}
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Chờ duyệt
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 p-2.5">
                    <button
                      onClick={() => {
                        setMessage('');
                        setApproving(p);
                      }}
                      disabled={review.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition active:scale-[0.99] disabled:opacity-50"
                    >
                      <Check className="size-4" /> Duyệt
                    </button>
                    <button
                      onClick={() => {
                        setMessage('');
                        setRejecting(p);
                      }}
                      disabled={review.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
                    >
                      <X className="size-4" /> Từ chối
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

        </section>
      </div>

      {/* Dialog đặt biệt hiệu */}
      {nudgeOpen && selected && (
        <NudgeSheet
          name={displayName(selected)}
          sending={nudge.isPending}
          onClose={() => setNudgeOpen(false)}
          onSend={({ kind, message }) => nudge.mutate({ userId: selected.id, kind, message })}
        />
      )}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Biệt hiệu</h3>
            <p className="mb-3 text-xs text-slate-500">
              Chỉ bạn thấy biệt hiệu này. Để trống để dùng lại tên thật.
            </p>
            <input
              value={renaming.value}
              onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
              maxLength={30}
              placeholder={selected.fullName}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setRenaming(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600"
              >
                Huỷ
              </button>
              <button
                onClick={() => rename.mutate({ id: renaming.id, value: renaming.value })}
                disabled={rename.isPending}
                className="flex-1 rounded-xl bg-water-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog từ chối phiếu */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Từ chối phiếu này?</h3>
            <p className="mb-3 text-sm text-slate-600">
              {proofText(rejecting)} — phiếu sẽ không được tính.
              tiến trình.
            </p>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Lời nhắn cho khách (không bắt buộc)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Để trống sẽ dùng câu mặc định: Ảnh … ml không được duyệt nên không tính vào tiến trình."
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setRejecting(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600"
              >
                Huỷ
              </button>
              <button
                onClick={confirmReject}
                disabled={review.isPending}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog duyệt phiếu (kèm lời nhắn) */}
      {approving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-slate-900">Duyệt phiếu này?</h3>
            <p className="mb-3 text-sm text-slate-600">
              {proofText(approving)} — sẽ được tính vào chỉ tiêu.
            </p>

            <label className="mb-1 block text-xs font-medium text-slate-600">
              Lời nhắn cho khách (không bắt buộc)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Để trống sẽ dùng câu mặc định: … ml đã được cộng vào tiến trình của bạn."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setApproving(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600"
              >
                Huỷ
              </button>
              <button
                onClick={() => {
                  const proof = approving;
                  review.mutate({
                    logId: proof.id,
                    kind: proof.kind,
                    approve: true,
                    amountMl: proof.amountMl,
                    message: message.trim() || undefined,
                  });
                  setApproving(null);
                  setMessage('');
                }}
                disabled={review.isPending}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
