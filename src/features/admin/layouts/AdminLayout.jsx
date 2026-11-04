import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Ellipsis,
  Film,
  GalleryVerticalEnd,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider';
import { DearlyMark } from '../../../components/DearlyLogo';

/** Menu chia nhóm để sidebar không thành một danh sách dài khó quét. */
const groups = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
      { to: '/admin/users', label: 'Người dùng', icon: Users },
    ],
  },
  {
    title: 'Nội dung',
    items: [
      { to: '/admin/broadcast', label: 'Broadcast', icon: Megaphone },
      { to: '/admin/eras', label: 'Kỷ nguyên', icon: Sparkles },
      { to: '/admin/cups', label: 'Loại cốc', icon: GalleryVerticalEnd },
      { to: '/admin/nudge-videos', label: 'Video nhắc', icon: Film },
    ],
  },
  {
    title: 'Hệ thống',
    items: [{ to: '/admin/logs', label: 'System log', icon: ScrollText }],
  },
];

const allItems = groups.flatMap((g) => g.items);

const linkClass = (isActive) =>
  `group relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
    isActive
      ? 'bg-cream-100 text-water-800 shadow-sm'
      : 'text-cream-100/75 hover:bg-white/10 hover:text-white'
  }`;

const iconClass = (isActive) =>
  `grid size-7 shrink-0 place-items-center rounded-lg transition-colors ${
    isActive ? 'bg-water-700 text-cream-50' : 'bg-white/10 text-cream-100/80 group-hover:bg-white/20'
  }`;

/** Admin dùng khung riêng: sidebar tối, không có điều hướng người dùng, không 3D. */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-cream-100 md:flex">
      <aside className="md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:bg-gradient-to-b md:from-[#5c1a26] md:to-[#3a1119] md:text-cream-50">
        {/* Thương hiệu + đăng xuất nhanh (chỉ mobile) */}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#5c1a26] to-[#3a1119] px-4 py-3 text-cream-50 md:bg-none md:px-5 md:py-5">
          <DearlyMark className="size-8 shrink-0" tone="cream" />
          <div className="min-w-0 flex-1">
            <p className="font-brand text-base font-bold leading-tight tracking-tight">Dearly</p>
            <p className="text-[10px] uppercase tracking-wider text-water-200/80">Admin Portal</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="grid size-9 place-items-center rounded-xl bg-white/10 text-cream-100 transition hover:bg-white/20 md:hidden"
            aria-label="Đăng xuất"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        {/* Menu: mobile cuộn ngang, desktop chia nhóm dọc */}
        <nav className="flex gap-1 overflow-x-auto bg-[#3a1119] pl-2 pr-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-1 md:flex-col md:gap-4 md:overflow-y-auto md:bg-transparent md:px-3 md:pb-4 md:pt-1">
          {groups.map((group, index) => (
            <div key={group.title} className="md:contents">
              {index > 0 && (
                <span className="mx-1 hidden shrink-0 border-t border-white/10 md:block" aria-hidden="true" />
              )}
              <p className="hidden px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-water-200/60 md:block">
                {group.title}
              </p>
              <div className="flex gap-1 md:flex-col md:gap-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={({ isActive }) => linkClass(isActive)}>
                    {({ isActive }) => (
                      <>
                        <span className={iconClass(isActive)}>
                          <Icon className="size-4" />
                        </span>
                        <span className="whitespace-nowrap">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Chân sidebar: người đang đăng nhập */}
        <div className="hidden border-t border-white/10 p-3 md:block">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-water-500 to-water-700 text-[12px] font-bold text-white">
              {(user?.fullName ?? 'A').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-cream-50">{user?.fullName ?? 'Administrator'}</p>
              <p className="text-[10px] uppercase tracking-wide text-water-200/70">Quản trị viên</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="grid size-8 place-items-center rounded-lg text-cream-100/70 transition hover:bg-white/15 hover:text-white"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
