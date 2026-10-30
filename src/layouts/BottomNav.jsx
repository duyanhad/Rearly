import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Camera, Home, MessageCircle, Plus, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { RadialMenu } from './RadialMenu';
import { QuickReportSheet } from '../components/QuickReportSheet';
import { mediaUrl } from '../services/apiClient';
import { socialService } from '../services/socialService';
const tabs = [{
  to: '/',
  label: 'Hôm nay',
  icon: Home
}, {
  to: '/calendar',
  label: 'Lịch',
  icon: CalendarDays
}, {
  to: '/friends',
  label: 'Bạn bè',
  icon: Users
}, {
  to: '/settings',
  label: 'Cài đặt',
  icon: Settings
}];
export function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Người đang duyệt ảnh cho tôi — hiện ảnh + tên trong menu tròn.
  const { data: myPartner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000
  });

  // Số lời mời kết bạn đang chờ → chấm đỏ ở tab "Bạn bè".
  const { data: followRequests = [] } = useQuery({
    queryKey: ['follow-requests'],
    queryFn: async () => (await socialService.getFollowRequests()).data,
    staleTime: 20_000
  });
  const requestCount = followRequests.length;

  const actions = [{
    label: 'Báo cáo',
    icon: Camera,
    tone: 'primary',
    onClick: () => {
      setMenuOpen(false);
      setReportOpen(true);
    }
  }, {
    label: myPartner?.fullName ?? 'Partner',
    icon: ShieldCheck,
    tone: 'partner',
    avatarUrl: myPartner?.avatarUrl ? mediaUrl(myPartner.avatarUrl) : undefined,
    avatarName: myPartner?.fullName,
    onClick: () => {
      setMenuOpen(false);
      navigate('/partner');
    }
  }, {
    label: 'Chat',
    icon: MessageCircle,
    onClick: () => {
      setMenuOpen(false);
      navigate('/chat');
    }
  }];
  return <>
      {menuOpen && <button aria-label="Đóng menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[2px] md:hidden" />}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="relative mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {tabs.slice(0, 2).map(tab => <TabItem key={tab.to} {...tab} active={location.pathname === tab.to} />)}

          <div className="relative size-14">
            <RadialMenu open={menuOpen} actions={actions} radius={120} />
            <button onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Đóng menu nhanh' : 'Mở menu nhanh'} className={`absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-water-500 to-water-700 text-white shadow-lg shadow-water-500/40 transition-transform duration-300 ${menuOpen ? 'rotate-45' : ''}`}>
              {menuOpen ? <X className="size-6" /> : <Plus className="size-6" />}
            </button>
          </div>

          {tabs.slice(2).map(tab => <TabItem key={tab.to} {...tab} active={location.pathname === tab.to} badge={tab.to === '/friends' ? requestCount : 0} />)}
        </div>
      </nav>

      {reportOpen && <QuickReportSheet onClose={() => setReportOpen(false)} />}
    </>;
}
function TabItem({
  to,
  label,
  icon: Icon,
  active,
  badge = 0
}) {
  return <Link to={to} className={`relative flex w-16 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium ${active ? 'text-water-700' : 'text-slate-500'}`}>
      <Icon className={`size-5 ${active ? 'fill-water-100' : ''}`} />
      {label}
      {!!badge && <span className="absolute -top-0.5 right-3 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge > 9 ? '9+' : badge}
        </span>}
    </Link>;
}