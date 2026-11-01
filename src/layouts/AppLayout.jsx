import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router-dom';
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
import { SleepAlarmOverlay } from '../features/settings/components/SleepAlarmOverlay';
const links = [{
  to: '/',
  label: 'Hôm nay',
  icon: LayoutDashboard
}, {
  to: '/feed',
  label: 'Bảng tin',
  icon: Rss 
}, {
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
      <header className="sticky top-0 z-30 border-b border-water-100 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2 font-bold text-water-700">
            <DearlyMark className="size-7" />
            <span className="font-brand text-lg tracking-tight">Dearly</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 md:flex">
            {links.map(({
            to,
            label,
            icon: Icon
          }) => <Link key={to} to={to} className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium whitespace-nowrap ${location.pathname === to ? 'bg-water-50 text-water-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="size-4" />
                {label}
                {!!badges[to] && <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {badges[to] > 9 ? '9+' : badges[to]}
                  </span>}
              </Link>)}
            {isPartner && <Link to="/partner" className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium whitespace-nowrap ${location.pathname === '/partner' ? 'bg-amber-50 text-amber-700' : 'text-amber-600 hover:bg-amber-50'}`}>
                <ShieldCheck className="size-4" />
                Partner
                {!!badges['/partner'] && <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {badges['/partner']}
                  </span>}
              </Link>}
            {user?.role === 'Admin' && <Link to="/admin" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium whitespace-nowrap text-amber-600 hover:bg-amber-50">
                <Shield className="size-4" />
                Admin
              </Link>}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {isPartner && <Link to="/partner" aria-label="Kênh partner" className="relative rounded-lg p-2 text-amber-600 hover:bg-amber-50 md:hidden">
                <ShieldCheck className="size-5" />
                {!!badges['/partner'] && <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    {badges['/partner']}
                  </span>}
              </Link>}

            <NotificationBell />

            {user?.role === 'Admin' && <Link to="/admin" aria-label="Admin portal" className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 md:hidden">
                <Shield className="size-5" />
              </Link>}

            <Link to="/profile" aria-label="Trang cá nhân" className="rounded-full p-0.5 hover:ring-2 hover:ring-water-200">
              <Avatar url={user?.avatarUrl} name={user?.fullName ?? '?'} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 md:py-6">
        <Outlet />
      </main>

      <BottomNav />
      <ChatBubble />
      <AppBadge />
      <PushPermissionPrompt />
      <InstallHint />
      <SleepAlarmOverlay />
    </div>;
}