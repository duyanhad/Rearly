import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import { LayoutDashboard, CalendarDays, Users, Rss, Shield, ShieldCheck } from 'lucide-react';
import { socialService } from '../services/socialService';
import { useAuth } from '../context/AuthProvider';
import { Avatar } from '../components/Avatar';
import { NotificationBell } from '../features/social/components/NotificationBell';
import { BottomNav } from './BottomNav';
import { InstallHint } from '../components/InstallHint';
import { ChatBubble } from '../features/chat/components/ChatBubble';
import { AppBadge } from '../components/AppBadge';
import { PushPermissionPrompt } from '../components/PushPermissionPrompt';
import { DearlyMark } from '../components/DearlyLogo';
import { HabitAlarmOverlay } from '../features/settings/components/HabitAlarmOverlay';
import { SleepAlarmOverlay } from '../features/settings/components/SleepAlarmOverlay';
import { VoiceNoteOverlay } from '../features/voice/components/VoiceNoteOverlay';
const links = [{
  to: '/',
  label: 'Hôm nay',
  icon: LayoutDashboard
},  {
  to: '/calendar',
  label: 'Lịch',
  icon: CalendarDays
}, {
  to: '/friends',
  label: 'Bạn bè',
  icon: Users
}];
export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  // Cuộn xuống một chút thì topbar nổi lên (đổ bóng) cho tách khỏi nội dung.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const {
    data: clients = []
  } = useQuery({
    queryKey: ['partner-clients'],
    queryFn: async () => (await socialService.getPartnerClients()).data,
    staleTime: 60_000
  });
  const {
    data: proofs = []
  } = useQuery({
    queryKey: ['pending-proofs'],
    queryFn: async () => (await socialService.getPendingProofs()).data,
    staleTime: 10_000,
    refetchInterval: 15_000
  });
  // Số lời mời kết bạn đang chờ mình trả lời → hiện badge ở mục "Bạn bè".
  const {
    data: followRequests = []
  } = useQuery({
    queryKey: ['follow-requests'],
    queryFn: async () => (await socialService.getFollowRequests()).data,
    staleTime: 20_000
  });
  const isPartner = clients.length > 0 || proofs.length > 0;
  const badges = {
    '/partner': proofs.length,
    '/friends': followRequests.length
  };
  return <div className="flex min-h-full flex-col">
      <header
        className={`sticky top-0 z-30 bg-gradient-to-b from-white via-white to-cream-50/70 pt-[env(safe-area-inset-top)] backdrop-blur transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_6px_20px_-12px_rgba(87,23,34,0.35)]' : 'shadow-none'
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <Link to="/" className="group flex items-center gap-2 font-bold text-water-700">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-water-50 to-water-100 ring-1 ring-water-100 transition group-hover:from-water-100 group-hover:to-water-200">
              <DearlyMark className="size-6" />
            </span>
            <span className="font-brand text-lg tracking-tight">Dearly</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 md:flex">
            {links.map(({
            to,
            label,
            icon: Icon
          }) => {
              const active = location.pathname === to;
              return <Link key={to} to={to} className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${active ? 'text-water-700' : 'text-slate-600 hover:text-water-700'}`}>
                {/* Viên nền trượt theo mục đang chọn (giống thanh dưới) */}
                {active && <m.span layoutId="topnav-pill" className="absolute inset-0 -z-10 rounded-xl bg-water-50 ring-1 ring-water-100" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon className={`size-4 ${active ? 'text-water-600' : ''}`} />
                {label}
                {!!badges[to] && <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {badges[to] > 9 ? '9+' : badges[to]}
                  </span>}
              </Link>;
            })}
            {isPartner && <Link to="/partner" className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${location.pathname === '/partner' ? 'text-amber-700' : 'text-amber-600 hover:text-amber-700'}`}>
                {location.pathname === '/partner' && <m.span layoutId="topnav-pill" className="absolute inset-0 -z-10 rounded-xl bg-amber-50 ring-1 ring-amber-100" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <ShieldCheck className="size-4" />
                Partner
                {!!badges['/partner'] && <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {badges['/partner']}
                  </span>}
              </Link>}
            {user?.role === 'Admin' && <Link to="/admin" className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-medium whitespace-nowrap text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700">
                <Shield className="size-4" />
                Admin
              </Link>}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {isPartner && <Link to="/partner" aria-label="Kênh partner" className="relative rounded-xl p-2 text-amber-600 transition hover:scale-105 hover:bg-amber-50 md:hidden">
                <ShieldCheck className="size-5" />
                {!!badges['/partner'] && <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    {badges['/partner']}
                  </span>}
              </Link>}

            <NotificationBell />

            {user?.role === 'Admin' && <Link to="/admin" aria-label="Admin portal" className="rounded-xl p-2 text-amber-600 transition hover:bg-amber-50 md:hidden">
                <Shield className="size-5" />
              </Link>}

            <Link
              to="/profile"
              aria-label="Trang cá nhân"
              className="ml-0.5 rounded-full bg-gradient-to-br from-water-200 to-water-100 p-[2px] transition hover:from-water-300 hover:to-water-200"
            >
              <Avatar url={user?.avatarUrl} name={user?.fullName ?? '?'} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 md:py-6">
        {/* Đổi trang: trượt nhẹ lên + mờ dần (spring). Key theo pathname để không remount khi đổi ?view= */}
        <m.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.6 }}
        >
          <Outlet />
        </m.div>
      </main>

      <BottomNav />
      <ChatBubble />
      <AppBadge />
      <PushPermissionPrompt />
      <InstallHint />
      <SleepAlarmOverlay />
      <HabitAlarmOverlay />
      <VoiceNoteOverlay />
    </div>;
}