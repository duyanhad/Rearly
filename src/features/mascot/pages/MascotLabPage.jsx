import { useMemo, useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lock, Sparkles, Trophy } from 'lucide-react';
import { CurrencyIcon } from '../components/CurrencyIcon';
import { eraService } from '../../../services/eraService';
import { MascotSprite } from '../components/MascotSprite';

/**
 * Kỷ nguyên linh vật (dữ liệu từ API, admin tự thêm/sửa).
 * Người dùng kiếm "giọt" bằng chuỗi ngày uống đủ chỉ tiêu rồi mua mở kỷ nguyên / nâng cấp.
 */
export function MascotLabPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pick, setPick] = useState(null); // { eraId, level }
  const [notice, setNotice] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['eras'],
    queryFn: async () => (await eraService.getCatalog()).data,
    staleTime: 30_000,
  });

  const eras = useMemo(() => data?.eras ?? [], [data]);
  const currencies = useMemo(() => data?.currencies ?? [], [data]);
  const defaultCurrency = currencies.find((c) => c.isDefault) ?? currencies[0];

  // Mỗi nhóm = một "bộ giao diện"; kỷ nguyên chưa xếp nhóm gom thành bộ "Chưa nhóm".
  const setList = useMemo(() => {
    const map = new Map();
    eras.forEach((e) => {
      const key = e.groupSlug ?? '';
      if (!map.has(key)) map.set(key, { key, name: e.groupName ?? 'Chưa nhóm', color: e.groupColor ?? null });
    });
    return [...map.values()];
  }, [eras]);

  // Cấp nên xem trước: cấp cao nhất đã mở, không có thì kỷ nguyên đầu
  const best = useMemo(() => {
    let found = null;
    eras.forEach((era) => {
      if (era.unlockedLevel > 0 && (!found || era.unlockedLevel > found.level)) {
        found = { eraId: era.id, level: era.unlockedLevel };
      }
    });
    return found ?? (eras[0] ? { eraId: eras[0].id, level: 1 } : null);
  }, [eras]);

  // Bộ đang xem: mặc định là bộ chứa kỷ nguyên nổi bật, sau đó do người dùng bấm mũi tên.
  const [setIndex, setSetIndex] = useState(null);
  const activeIndex =
    setList.length === 0
      ? -1
      : setIndex !== null && setIndex < setList.length
        ? setIndex
        : Math.max(
            0,
            setList.findIndex((s) => s.key === (eras.find((e) => e.id === best?.eraId)?.groupSlug ?? '')),
          );
  const activeSet = setList[activeIndex];
  const shownEras = useMemo(
    () => (activeSet ? eras.filter((e) => (e.groupSlug ?? '') === activeSet.key) : eras),
    [eras, activeSet],
  );

  // Chuyển bộ: hero nhảy theo kỷ nguyên tốt nhất của bộ đó.
  const goSet = (dir) => {
    if (setList.length < 2) return;
    const next = (activeIndex + dir + setList.length) % setList.length;
    setSetIndex(next);
    const pool = eras.filter((e) => (e.groupSlug ?? '') === setList[next].key);
    const target = pool.find((e) => e.unlockedLevel > 0) ?? pool[0];
    setPick(target ? { eraId: target.id, level: Math.max(1, target.unlockedLevel || 1) } : null);
  };

  const active = pick ?? best;
  const current = eras.find((e) => e.id === active?.eraId) ?? eras[0];
  const level = current?.levels.find((l) => l.level === (active?.level ?? 1)) ?? current?.levels[0];
  // Tiền để mua kỷ nguyên đang xem (theo nhóm); nhóm chưa gán tiền thì dùng tiền mặc định.
  const payWith = current?.currency ?? defaultCurrency;
  // Bên nào ra bên đó: tiền của bộ đang xem hiện trước, các tiền khác chỉ hiện khi còn điểm.
  const coinsShown = useMemo(() => {
    const rest = currencies.filter((c) => c.id !== payWith?.id && c.amount > 0);
    return payWith ? [payWith, ...rest] : rest;
  }, [currencies, payWith]);

  const act = useMutation({
    mutationFn: ({ kind, eraId }) => (kind === 'unlock' ? eraService.unlock(eraId) : eraService.upgrade(eraId)),
    onSuccess: async (res, vars) => {
      setNotice(
        vars.kind === 'unlock'
          ? `Đã mở kỷ nguyên! Bạn còn ${res.data.coins}.`
          : `Nâng cấp thành công: ${res.data.name} · còn ${res.data.coins}.`,
      );
      setPick({ eraId: vars.eraId, level: res.data.unlockedLevel });
      await qc.invalidateQueries({ queryKey: ['eras'] });
    },
    onError: (err) => {
      setNotice(err?.response?.data?.title ?? 'Không thực hiện được, thử lại sau.');
    },
  });

  const canUnlock = Boolean(current && !current.unlocked);
  const canUpgrade = Boolean(current && current.unlocked && current.unlockedLevel < current.levels.length);
  const nextPrice = canUnlock
    ? current.unlockPrice
    : canUpgrade
      ? current.levels.find((l) => l.level === current.unlockedLevel + 1)?.price ?? 0
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Linh vật giọt nước</h1>
          <p className="text-xs text-slate-500">Mua kỷ nguyên &amp; nâng cấp bằng giọt kiếm từ chuỗi ngày</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {coinsShown.map((c, i) => (
            <span
              key={c.id}
              title={c.name}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-bold ring-1 ${
                i === 0
                  ? 'shadow-sm ring-2'
                  : 'bg-white text-slate-500 ring-slate-200 opacity-80'
              }`}
              style={
                i === 0
                  ? { color: c.color, background: `${c.color}1a`, borderColor: `${c.color}66`, boxShadow: `0 0 0 1px ${c.color}33` }
                  : undefined
              }
            >
              <CurrencyIcon iconKey={c.iconKey} className="size-4" />
              {c.amount}
            </span>
          ))}
        </div>
      </div>

      {isLoading && <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><DearlyLoader label="Đang tải kỷ nguyên…" /></div>}
      {isError && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Không tải được dữ liệu kỷ nguyên. Kiểm tra API rồi thử lại.
        </p>
      )}

      {current && level && (
        <div className="relative">
          {setList.length > 1 && (
            <>
              <button
                onClick={() => goSet(-1)}
                aria-label="Bộ trước"
                className="absolute -left-3 top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:bg-white hover:text-water-700 sm:-left-5"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={() => goSet(1)}
                aria-label="Bộ sau"
                className="absolute -right-3 top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:bg-white hover:text-water-700 sm:-right-5"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <section
            className="relative overflow-hidden rounded-3xl p-4 shadow-sm ring-1 ring-white/40"
            style={{
              background: `radial-gradient(120% 110% at 50% 0%, ${current.bgFrom} 0%, ${current.bgTo} 100%)`,
            }}
          >
          {current.groupName && (
            <span className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-700 backdrop-blur">
              <span
                className="size-2 rounded-full"
                style={{ background: current.groupColor || current.bgTo }}
              />
              {current.groupName}
            </span>
          )}
          <MascotSprite
            level={level.level}
            src={level.imageUrl}
            tier={{ scale: 1 }}
            flash={false}
            className="mx-auto h-52 sm:h-64"
          />
          <div className="relative z-20 mt-1 text-center text-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {current.groupName ? `${current.groupName} · ` : ''}
              {current.title} · Cấp {level.level}/{current.levels.length}
            </p>
            <h2 className="text-xl font-extrabold">{level.name}</h2>
            <p className="mt-0.5 text-xs text-slate-700">{level.description}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-600">{level.artifact}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-amber-700">
              <CurrencyIcon iconKey={payWith?.iconKey ?? 'droplet'} className="size-3.5" />
              {level.unlocked ? 'Đã mở' : `${level.price} ${payWith?.name.toLowerCase() ?? 'giọt'}`}
            </p>
          </div>
          </section>
        </div>
      )}

      {current && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => act.mutate({ kind: 'unlock', eraId: current.id })}
            disabled={!canUnlock || (payWith?.amount ?? 0) < nextPrice || act.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-water-600 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Lock className="size-4" />
            {canUnlock ? `Mở kỷ nguyên · ${current.unlockPrice} ${payWith?.name.toLowerCase() ?? 'giọt'}` : 'Đã mở kỷ nguyên'}
          </button>
          <button
            onClick={() => act.mutate({ kind: 'upgrade', eraId: current.id })}
            disabled={!canUpgrade || (payWith?.amount ?? 0) < nextPrice || act.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Sparkles className="size-4" />
            {canUpgrade ? `Nâng cấp · ${nextPrice} ${payWith?.name.toLowerCase() ?? 'giọt'}` : 'Cấp cao nhất'}
          </button>
        </div>
      )}

      {notice && <p className="rounded-xl bg-water-50 px-3 py-2 text-xs font-medium text-water-800">{notice}</p>}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Kỷ nguyên ({shownEras.length})</h2>
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Trophy className="size-3.5" /> +{current?.groupAwardBase ?? data?.rewardBase ?? 10}{' '}
            {payWith?.name.toLowerCase() ?? 'giọt'}/lần, +{current?.groupAwardPerStreakDay ?? data?.rewardPerStreakDay ?? 3}
            /ngày chuỗi
          </span>
        </div>

        <div className="space-y-4">
          {shownEras.map((era) => (
            <div key={era.id}>
              <button
                onClick={() => setPick({ eraId: era.id, level: Math.max(1, era.unlockedLevel || 1) })}
                className="mb-1.5 flex w-full items-baseline gap-2 text-left"
              >
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: era.bgTo }}
                >
                  #{era.order}
                </span>
                <span className="text-xs font-semibold text-slate-800">{era.title}</span>
                {!era.unlocked && (
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    <Lock className="size-3" /> {era.unlockPrice} {era.currency?.name.toLowerCase() ?? 'giọt'}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-slate-500">
                  {era.unlocked ? `Cấp ${era.unlockedLevel}/${era.levels.length}` : era.subtitle}
                </span>
              </button>
              <div className="grid grid-cols-5 gap-1.5">
                {era.levels.map((l) => {
                  const isActive = current?.id === era.id && level?.level === l.level;
                  return (
                    <button
                      key={l.level}
                      onClick={() => setPick({ eraId: era.id, level: l.level })}
                      className={`rounded-xl p-1.5 text-center ring-1 transition ${
                        isActive ? 'ring-2 ring-water-500' : 'ring-slate-100'
                      } ${l.unlocked ? '' : 'opacity-55'}`}
                      style={{ background: `linear-gradient(160deg, ${era.bgFrom}, ${era.bgTo})` }}
                    >
                      <span className="relative mx-auto mb-1 flex h-10 w-10 items-center justify-center">
                        {l.imageUrl ? (
                          <img src={l.imageUrl} alt="" loading="lazy" className="h-10 w-10 object-contain" />
                        ) : (
                          <CurrencyIcon iconKey="droplet" className="size-6 text-slate-400" />
                        )}
                        {!l.unlocked && <Lock className="absolute size-3 text-slate-600" />}
                      </span>
                      <span className="block text-[10px] font-bold text-slate-800">Cấp {l.level}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-700">
                        {l.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {shownEras.length === 0 && !isLoading && (
          <p className="text-sm text-slate-500">
            {eras.length === 0 ? 'Admin chưa tạo kỷ nguyên nào.' : 'Nhóm này chưa có kỷ nguyên.'}
          </p>
        )}
      </section>
    </div>
  );
}

export default MascotLabPage;
