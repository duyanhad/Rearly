import { useEffect, useRef, useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Megaphone, MessageCircle, Mic, MinusCircle, Send, ShieldCheck, Trophy, UserPlus, X } from 'lucide-react';

// Icon + màu theo loại thông báo để panel nhìn gọn và dễ phân biệt.
const TYPE_META = {
  Friend: { icon: UserPlus, tone: 'bg-sky-50 text-sky-600' },
  Partner: { icon: ShieldCheck, tone: 'bg-violet-50 text-violet-600' },
  Nudge: { icon: BellRing, tone: 'bg-amber-50 text-amber-600' },
  GoalAchieved: { icon: Trophy, tone: 'bg-emerald-50 text-emerald-600' },
  Deduct: { icon: MinusCircle, tone: 'bg-rose-50 text-rose-600' },
  Broadcast: { icon: Megaphone, tone: 'bg-slate-100 text-slate-600' },
  Proof: { icon: CheckCheck, tone: 'bg-amber-50 text-amber-600' },
  Reply: { icon: MessageCircle, tone: 'bg-water-50 text-water-700' },
  VoiceNote: { icon: Mic, tone: 'bg-amber-50 text-amber-600' }
};

/** Số thông báo tải mỗi lần (bấm "xem thêm" để tải tiếp). */
const PAGE_SIZE = 20;
import { mediaUrl } from '../../../services/apiClient';
import { notificationService } from '../../../services/notificationService';
import { useToast } from '../../../components/Toast';

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
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(undefined);
  const buttonRef = useRef(null);
  // Số thông báo đang tải; bấm "xem thêm" để lấy tiếp thông báo cũ hơn.
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Thông báo đang được trả lời (popup).
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState('');

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
    queryKey: ['notifications', limit],
    queryFn: async () => (await notificationService.list(limit)).data,
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
  const sendReply = useMutation({
    mutationFn: ({ id, message }) => notificationService.reply(id, message),
    onSuccess: () => {
      toast.show('Đã gửi trả lời', 'Partner sẽ nhận thông báo ngay.');
      setReplying(null);
      setReplyText('');
      invalidate();
    },
    onError: () => toast.show('Không gửi được', 'Thử lại giúp mình nhé.'),
  });

  /** Mở popup trả lời cho thông báo có người gửi (vd. ảnh đã được duyệt). */
  const openReply = (n) => {
    if (!n.senderId) return;
    if (!n.isRead) markRead.mutate(n.id);
    setReplyText('');
    setReplying(n);
  };

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
                    {items.map((n) => {
                      const meta = TYPE_META[n.type] ?? { icon: Bell, tone: 'bg-slate-100 text-slate-500' };
                      const Icon = meta.icon;
                      const image = mediaUrl(n.imageUrl);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!n.isRead) markRead.mutate(n.id);
                              const canReply =
                                (n.type === 'GoalAchieved' || n.type === 'Reply') &&
                                n.senderId &&
                                (n.replyRound ?? 0) < 2;
                              if (canReply) {
                                // Kết quả duyệt ảnh / phản hồi (tối đa 2 vòng) → mở popup trả lời.
                                openReply(n);
                              } else if (n.type === 'Proof') {
                                setOpen(false);
                                navigate('/partner');
                              } else if (n.type === 'Reply') {
                                setOpen(false);
                                navigate('/chat');
                              } else if (n.type === 'Friend' || n.type === 'Partner') {
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
                                {(n.type === 'GoalAchieved' || n.type === 'Reply') &&
                                  n.senderId &&
                                  ((n.replyRound ?? 0) < 2 ? (
                                    <span className="text-water-700">· Trả lời</span>
                                  ) : (
                                    <span className="text-slate-400">· hết lượt trả lời</span>
                                  ))}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {items.length >= limit && (
                    <button
                      type="button"
                      onClick={() => setLimit((v) => v + PAGE_SIZE)}
                      className="w-full border-t border-slate-100 px-3.5 py-2 text-center text-[11px] font-medium text-water-700 transition-colors hover:bg-water-50"
                    >
                      Xem thêm thông báo cũ hơn
                    </button>
                  )}
                </>
              )}
            </div>          </div>,
          document.body,
        )}

      {/* Popup trả lời thông báo (vd. phản hồi ảnh đã duyệt) */}
      {replying && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Trả lời thông báo"
          onClick={() => setReplying(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start gap-2">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-water-50 text-water-700">
                <MessageCircle className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Trả lời partner</p>
                <p className="line-clamp-2 text-xs text-slate-500">{replying.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplying(null)}
                aria-label="Đóng"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <textarea
              autoFocus
              rows={3}
              maxLength={300}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Ví dụ: cảm ơn bạn đã duyệt, mình uống thêm nhé!"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Cảm ơn bạn nhé!', 'Mình uống thêm ngay', 'Bạn duyệt giúp mình với'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReplyText(t)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplying(null)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => sendReply.mutate({ id: replying.id, message: replyText.trim() })}
                disabled={!replyText.trim() || sendReply.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-water-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-water-700 disabled:opacity-50"
              >
                <Send className="size-3.5" /> {sendReply.isPending ? 'Đang gửi...' : 'Gửi trả lời'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default NotificationBell;
