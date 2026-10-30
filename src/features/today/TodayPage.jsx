import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Droplet, Gift, Moon, Pill, Scale, Soup } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardPage } from '../water/pages/DashboardPage';
import { SleepTodayPanel } from '../sleep/components/SleepTodayPanel';
import { HabitTodayPanel } from '../habits/components/HabitTodayPanel';
import { WeightTodayPanel } from '../weight/components/WeightTodayPanel';
import { rewardService } from '../../services/rewardService';

const REWARD_LABELS = { medicine: 'Thuốc', meal: 'Bữa ăn', study: 'Học tập', sleep: 'Giấc ngủ', weight: 'Cân nặng' };

const VIEWS = [
  { key: 'water', label: 'Nước', icon: Droplet, to: '/' },
  { key: 'sleep', label: 'Giấc ngủ', icon: Moon, to: '/?view=sleep' },
  { key: 'meal', label: 'Bữa ăn', icon: Soup, to: '/?view=meal' },
  { key: 'medicine', label: 'Thuốc', icon: Pill, to: '/?view=medicine' },
  { key: 'study', label: 'Học tập', icon: BookOpen, to: '/?view=study' },
  { key: 'weight', label: 'Cân nặng', icon: Scale, to: '/?view=weight' },
];

/**
 * Trang "Hôm nay" gộp 2 khung: Nước và Giấc ngủ, lật bằng 2 nút mũi tên hai bên
 * hoặc bấm trực tiếp vào nhãn. Trạng thái giữ trên URL (?view=sleep).
 */
export function TodayPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view');
  const found = VIEWS.findIndex((v) => v.key === view);
  const index = found >= 0 ? found : 0;
  // Thanh danh mục: cuộn ngang được (chuột/kéo) và tự đưa tab đang chọn vào giữa.
  const stripRef = useRef(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [index]);

  // Tiền thưởng đã nhận hôm nay (tự cập nhật khi đạt mục tiêu ở nhu cầu nào đó).
  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards-today'],
    queryFn: async () => (await rewardService.today()).data,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const go = (dir) => {
    const next = VIEWS[(index + dir + VIEWS.length) % VIEWS.length];
    setParams(next.key === 'water' ? {} : { view: next.key }, { replace: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(-1)}
          aria-label={`Khung trước: ${VIEWS[(index - 1 + VIEWS.length) % VIEWS.length].label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-water-700"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div
          ref={stripRef}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto scroll-smooth px-0.5 py-0.5"
        >
          {VIEWS.map(({ key, label, icon: Icon, to }) => (
            <Link
              key={key}
              to={to}
              data-active={key === VIEWS[index].key}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                key === VIEWS[index].key
                  ? 'bg-water-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => go(1)}
          aria-label={`Khung sau: ${VIEWS[(index + 1) % VIEWS.length].label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-water-700"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {VIEWS[index].key === 'water' && <DashboardPage />}
      {VIEWS[index].key === 'sleep' && <SleepTodayPanel />}
      {['meal', 'medicine', 'study'].includes(VIEWS[index].key) && <HabitTodayPanel kind={VIEWS[index].key} />}
      {VIEWS[index].key === 'weight' && <WeightTodayPanel />}

      {/* Tiền thưởng đạt mục tiêu hôm nay (mỗi nhu cầu chỉ thưởng một lần/ngày) */}
      {rewards.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <Gift className="size-3.5 text-amber-500" /> Thưởng hôm nay
          </span>
          {rewards.map((r) => (
            <span
              key={r.kind}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100"
            >
              {REWARD_LABELS[r.kind] ?? r.kind} · +{r.amount} {r.currencyName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default TodayPage;
