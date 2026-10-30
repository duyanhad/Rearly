import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SETTING_TABS } from '../settingsTabs';

/** Thanh chọn nhu cầu + nút trước/sau để "lật trang" cài đặt. */
export function SettingsTabs({ active }) {
  const index = Math.max(0, SETTING_TABS.findIndex((t) => t.key === active));
  const prev = SETTING_TABS[(index - 1 + SETTING_TABS.length) % SETTING_TABS.length];
  const next = SETTING_TABS[(index + 1) % SETTING_TABS.length];

  // Thanh danh mục: cuộn ngang được và tự đưa tab đang chọn vào giữa (trước đây bị cắt trên mobile).
  const stripRef = useRef(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [index]);

  return (
    <div className="mb-4 flex items-center gap-2">
      <Link
        to={prev.to}
        aria-label={`Cài đặt ${prev.label}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-water-700"
      >
        <ChevronLeft className="size-4" />
      </Link>

      <div
        ref={stripRef}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto scroll-smooth px-0.5 py-0.5"
      >
        {SETTING_TABS.map(({ key, label, icon: Icon, to }) => (
          <Link
            key={key}
            to={to}
            data-active={key === active}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              key === active
                ? 'bg-water-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
      </div>

      <Link
        to={next.to}
        aria-label={`Cài đặt ${next.label}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-water-700"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

export default SettingsTabs;
