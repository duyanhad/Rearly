import { useEffect, useRef, useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Megaphone, MinusCircle, ShieldCheck, Trophy, UserPlus } from 'lucide-react';

// Icon + màu theo loại thông báo để panel nhìn gọn và dễ phân biệt.
const TYPE_META = {
  Friend: { icon: UserPlus, tone: 'bg-sky-50 text-sky-600' },
  Partner: { icon: ShieldCheck, tone: 'bg-violet-50 text-violet-600' },
  Nudge: { icon: BellRing, tone: 'bg-amber-50 text-amber-600' },
  GoalAchieved: { icon: Trophy, tone: 'bg-emerald-50 text-emerald-600' },
  Deduct: { icon: MinusCircle, tone: 'bg-rose-50 text-rose-600' },
  Broadcast: { icon: Megaphone, tone: 'bg-slate-100 text-slate-600' }
};

/** Chỉ hiện vài thông báo mới nhất cho gọn. */
const VISIBLE_COUNT = 4;
import { mediaUrl } from '../../../services/apiClient';
import { notificationService } from '../../../services/notificationService';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

/**
 * Chuông thông báo dạng dropdown — không điều hướng sang trang khác.
 * Mobile: bảng trải gần hết chiều ngang dưới header. Desktop: panel 384px canh phải.
 */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(undefined);
  const buttonRef = useRef(null);

  // Neo panel ngay dưới chuông để không lệch theo mép màn hình.
  const toggle = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r && !open) {
      // Bề rộng panel co theo màn hình: điện thoại nhỏ gọn hơn, desktop tối đa 352px.
      const vw = window.innerWidth;
      const width = vw < 480 ? vw - 24 : vw < 768 ? 320 : 352;
      setAnchor({
        top: r.bottom + 8,
        left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)),
        width,
      });
    }
    setOpen((v) => !v);
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationService.list()).data,
    staleTime: 20_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: invalidate,
  });

  const unread = items.filter((n) => !n.isRead).length;

  // Đổi trang thì đóng panel.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="Thông báo"
        aria-expanded={open}
        className={`relative rounded-lg p-2 transition-colors hover:bg-slate-100 ${
          open ? 'bg-water-50 text-water-700' : 'text-slate-500'
        }`}
      >
        <Bell className="size-5" />
        {!!unread && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-slate-900/20 sm:bg-transparent"
            />

            <div
              role="dialog"
              aria-label="Thông báo"
              style={anchor}
              className="absolute flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_16px_48px_-12px_rgba(15,23,42,0.28)]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white/95 px-3.5 py-2.5 backdrop-blur sm:px-4 sm:py-3">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 sm:text-sm">
                  Thông báo
                  {!!unread && (
                    <span className="rounded-full bg-water-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => readAll.mutate()}
                  disabled={!unread || readAll.isPending}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-water-700 transition-colors hover:bg-water-50 disabled:opacity-40 sm:text-xs"
                >
                  <CheckCheck className="size-3.5" /> Đọc tất cả
                </button>
              </div>

              {isLoading && <div className="px-4 py-6"><DearlyLoader size="sm" /></div>}

              {!isLoading && items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 size-7 text-slate-200" />
                  <p className="text-xs text-slate-500">Chưa có thông báo nào.</p>
                </div>
              )}

              {!isLoading && items.length > 0 && (
                <>
                  <ul className="max-h-[56vh] divide-y divide-slate-100 overflow-y-auto overscroll-contain sm:max-h-[60vh]">
                    {items.slice(0, VISIBLE_COUNT).map((n) => {
                      const meta = TYPE_META[n.type] ?? { icon: Bell, tone: 'bg-slate-100 text-slate-500' };
                      const Icon = meta.icon;
                      const image = mediaUrl(n.imageUrl);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!n.isRead) markRead.mutate(n.id);
                              if (n.type === 'Friend' || n.type === 'Partner') {
                                setOpen(false);
                                navigate(n.type === 'Partner' ? '/partner' : '/friends');
                              }
                            }}
                            className={`group flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 sm:px-4 ${
                              n.isRead ? '' : 'bg-water-50/40'
                            }`}
                          >
                            <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${meta.tone}`}>
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start gap-2">
                                <span className={`min-w-0 flex-1 truncate text-[13px] ${n.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                                  {n.title}
                                </span>
                                {!n.isRead && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-water-600" />}
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                              <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                                {timeAgo(n.createdAt)}
                                {image && <span className="text-water-600">· ảnh</span>}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {items.length > VISIBLE_COUNT && (
                    <p className="border-t border-slate-100 px-3.5 py-2 text-center text-[11px] text-slate-400">
                      Còn {items.length - VISIBLE_COUNT} thông báo cũ hơn
                    </p>
                  )}
                </>
              )}
            </div>          </div>,
          document.body,
        )}
    </>
  );
}

export default NotificationBell;
