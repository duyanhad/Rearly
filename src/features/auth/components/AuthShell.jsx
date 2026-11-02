import { useState } from 'react';
import { Droplet, Eye, EyeOff, Moon, Pill, Soup } from 'lucide-react';
import { m } from 'framer-motion';
import { DearlyMark } from '../../../components/DearlyLogo';

// Hiệu ứng vào trang: mờ dần + nhích lên, các em nhỏ lần lượt hiện (stagger).
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};
function Bubbles() {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 -top-16 size-64 rounded-full bg-water-200/50 blur-3xl animate-shimmer" />
      <div className="absolute -right-10 top-24 size-72 rounded-full bg-water-300/30 blur-3xl animate-shimmer" />
      <div className="absolute bottom-0 left-1/3 size-56 rounded-full bg-[#f0d9cf]/60 blur-3xl animate-shimmer" />
      {[{
      left: '12%',
      bottom: '8%',
      size: 10,
      delay: '0s'
    }, {
      left: '28%',
      bottom: '2%',
      size: 6,
      delay: '1.4s'
    }, {
      left: '62%',
      bottom: '6%',
      size: 8,
      delay: '2.6s'
    }, {
      left: '80%',
      bottom: '12%',
      size: 5,
      delay: '3.8s'
    }].map(b => <span key={b.left} className="absolute rounded-full bg-white/70 ring-1 ring-white/80" style={{
      left: b.left,
      bottom: b.bottom,
      width: b.size,
      height: b.size,
      animation: `rise 7s ${b.delay} ease-in infinite`
    }} />)}
    </div>;
}
export function Field({
  icon,
  label,
  children
}) {
  return <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </span>
    </label>;
}
export const inputClass = 'w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-11 pr-3 text-sm outline-none transition focus:border-water-400 focus:bg-white focus:ring-4 focus:ring-water-100';
export function PasswordInput({
  value,
  onChange,
  placeholder,
  minLength
}) {
  const [visible, setVisible] = useState(false);
  return <>
      <input type={visible ? 'text' : 'password'} required minLength={minLength} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={`${inputClass} pr-11`} />
      <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100">
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </>;
}
export function AuthShell({
  children,
  footer
}) {
  // Dearly không chỉ theo dõi nước: mỗi nhu cầu có kỷ nguyên + điểm riêng.
  const areas = [{
    icon: Droplet,
    label: 'Nước',
    sub: 'Ly 3D theo tiến độ'
  }, {
    icon: Pill,
    label: 'Thuốc',
    sub: 'Nhắc đúng giờ'
  }, {
    icon: Soup,
    label: 'Bữa ăn',
    sub: 'Đủ bữa, đủ chất'
  }, {
    icon: Moon,
    label: 'Giấc ngủ',
    sub: 'Ngủ đủ, dậy đúng'
  }];
  const today = [{
    label: 'Nước',
    text: '1.200 / 2.000 ml',
    percent: 60
  }, {
    label: 'Thuốc',
    text: '2 / 3 lần',
    percent: 66
  }, {
    label: 'Bữa ăn',
    text: '2 / 3 bữa',
    percent: 66
  }, {
    label: 'Giấc ngủ',
    text: '7g 20p / 8g',
    percent: 88
  }];
  return <div className="relative min-h-full overflow-hidden bg-gradient-to-br from-cream-100 via-white to-[#f6e7e2]">
      <Bubbles />

      <div className="relative mx-auto grid min-h-full max-w-5xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <section className="hidden lg:block">
          <m.div variants={listVariants} initial="hidden" animate="show">
          <m.div variants={itemVariants} className="flex items-center gap-2 text-water-700">
            <DearlyMark className="size-9" />
            <span className="font-brand text-2xl font-bold tracking-tight">Dearly</span>
          </m.div>
          <m.p variants={itemVariants} className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-water-500">
            A little note, a lot of love.
          </m.p>
          <m.h1 variants={itemVariants} className="font-brand mt-7 text-4xl font-bold leading-[1.15] text-slate-900">
            Nhắc bạn từng điều nhỏ,
            <br />
            <span className="bg-gradient-to-r from-water-700 to-[#c98883] bg-clip-text text-transparent">
              để sống khoẻ mỗi ngày.
            </span>
          </m.h1>
          <ul className="mt-6 grid max-w-sm grid-cols-2 gap-2">
            {areas.map(({
            icon: Icon,
            label,
            sub
          }) => <m.li
                key={label}
                variants={itemVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="rounded-2xl bg-white/80 p-3 ring-1 ring-water-100 transition-shadow hover:shadow-md hover:shadow-water-500/10"
              >
                <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-600 ring-1 ring-water-100">
                  <Icon className="size-4" />
                </span>
                <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-[11px] text-slate-500">{sub}</p>
              </m.li>)}
          </ul>

          <m.div variants={itemVariants} className="mt-6 max-w-sm rounded-2xl bg-white/75 p-3 shadow-sm ring-1 ring-water-200/60 backdrop-blur">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-water-500">Hôm nay của bạn</p>
              <p className="font-brand text-sm font-bold text-water-700">Dearly</p>
            </div>
            <div className="space-y-2">
              {today.map(({
              label,
              text,
              percent
            }, i) => <div key={label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-600">{label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-water-100">
                    {/* Thanh tiến độ chạy từ 0 → % thật, lần lượt từng dòng */}
                    <m.span
                      className="block h-full rounded-full bg-gradient-to-r from-water-600 to-[#c98883]"
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.9, delay: 0.45 + i * 0.12, ease: 'easeOut' }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-[10px] tabular-nums text-slate-500">{text}</span>
                </div>)}
            </div>
          </m.div>
          </m.div>
        </section>

        <section className="w-full">
          <m.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.08 }}
            className="mx-auto w-full max-w-md rounded-3xl bg-white/85 p-6 shadow-xl shadow-water-500/10 ring-1 ring-white/70 backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <DearlyMark className="size-14 drop-shadow-md" />
              <p className="font-brand mt-3 text-xl font-bold text-slate-900">Dearly</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-water-500">
                A little note, a lot of love.
              </p>
            </div>

            {children}
            <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
          </m.div>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 text-center text-xs text-slate-400"
          >
            Dearly · Care · Connect · Well-being
          </m.p>
        </section>
      </div>
    </div>;
}
export function SubmitButton({
  busy,
  children
}) {
  return <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-water-700 to-[#c07a72] py-3 text-sm font-semibold text-white shadow-lg shadow-water-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60">
      {busy ? 'Đang xử lý...' : children}
    </button>;
}
