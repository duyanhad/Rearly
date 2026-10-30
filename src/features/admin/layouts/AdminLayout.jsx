import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { GalleryVerticalEnd, LayoutDashboard, LogOut, Megaphone, ScrollText, Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider';
import { DearlyMark } from '../../../components/DearlyLogo';
const nav = [{
  to: '/admin',
  label: 'Tổng quan',
  icon: LayoutDashboard,
  end: true
}, {
  to: '/admin/users',
  label: 'Người dùng',
  icon: Users
}, {
  to: '/admin/broadcast',
  label: 'Broadcast',
  icon: Megaphone
}, {
  to: '/admin/logs',
  label: 'System log',
  icon: ScrollText
}, {
  to: '/admin/eras',
  label: 'Kỷ nguyên',
  icon: GalleryVerticalEnd
}];

/** Admin lives in its own shell: dark sidebar, no user navigation, no 3D. */
export function AdminLayout() {
  const {
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  return <div className="min-h-full bg-cream-100 md:flex">
      <aside className="md:flex md:w-64 md:shrink-0 md:flex-col md:bg-water-800 md:text-cream-50">
        <div className="flex items-center gap-2 bg-water-800 px-4 py-3 text-cream-50 md:px-5 md:py-5">
          <DearlyMark className="size-7 shrink-0" tone="cream" />
          <div className="min-w-0">
            <p className="font-brand text-base font-bold tracking-tight">Dearly</p>
            <p className="text-[11px] text-water-200">Admin Portal</p>
          </div>
          <button onClick={() => {
          logout();
          navigate('/login');
        }} className="ml-auto rounded-lg p-2 text-water-200 hover:bg-water-700 md:hidden" aria-label="Đăng xuất">
            <LogOut className="size-5" />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto bg-water-800 px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-col md:overflow-visible md:px-3 md:pb-4">
          {nav.map(({
          to,
          label,
          icon: Icon,
          end
        }) => <NavLink key={to} to={to} end={end} className={({
          isActive
        }) => `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-cream-200 text-water-800 shadow-sm' : 'text-cream-100/80 hover:bg-water-700 hover:text-white'}`}>
              <Icon className="size-4" />
              {label}
            </NavLink>)}
        </nav>

        <div className="hidden border-t border-water-700/60 p-3 md:block">
          <p className="px-2 text-xs uppercase tracking-wide text-water-200/70">Đang đăng nhập</p>
          <p className="truncate px-2 py-1 text-sm">{user?.fullName}</p>
          <button onClick={() => {
          logout();
          navigate('/login');
        }} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-cream-100 hover:bg-water-700">
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>;
}