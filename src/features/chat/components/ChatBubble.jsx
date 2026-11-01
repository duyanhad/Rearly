import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Maximize2, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatPanel, useChatUnread } from './ChatPanel';

const POS_KEY = 'drinkwater.chatBubblePos';

/**
 * Bong bóng chat nổi (kiểu chat head): kéo được, bấm để mở cửa sổ chat
 * ngay tại trang đang xem. Vị trí được nhớ lại.
 * shortcut: bong bóng chỉ tồn tại trong tab đang mở (web không có overlay hệ thống như app native).
 */
export function ChatBubble() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') ?? { right: 16, bottom: 96 };
    } catch {
      return { right: 16, bottom: 96 };
    }
  });
  const dragRef = useRef(null);
  const unread = useChatUnread();

  // iOS không thu nhỏ layout viewport khi mở bàn phím → đo vùng nhìn thấy thật
  // (visualViewport) để cửa sổ chat luôn vừa khung nhìn, ô nhập nổi trên bàn phím.
  const [vv, setVv] = useState(null);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onMq = () => setNarrow(mq.matches);
    // Safari iOS cũ chỉ có addListener (addEventListener bị thiếu → crash cả app).
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else mq.addListener(onMq);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else mq.removeListener(onMq);
    };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const v = window.visualViewport;
    if (!v) return undefined;
    const update = () => setVv({ top: Math.round(v.offsetTop), height: Math.round(v.height) });
    update();
    v.addEventListener('resize', update);
    v.addEventListener('scroll', update);
    return () => {
      v.removeEventListener('resize', update);
      v.removeEventListener('scroll', update);
    };
  }, [open]);
  // Kéo cửa sổ chat bằng thanh tiêu đề (giữ nguyên kích thước đang có).
  const panelRef = useRef(null);
  const panelDragRef = useRef(null);
  const [panelBox, setPanelBox] = useState(null); // { left, top, width, height }

  const sheetBox = narrow && vv && !panelBox
    ? { left: 8, right: 8, top: vv.top + 8, height: vv.height - 16 }
    : null;

  const onPanelDown = useCallback((event) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    panelDragRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPanelMove = useCallback((event) => {
    const drag = panelDragRef.current;
    if (!drag) return;
    setPanelBox({
      left: Math.min(Math.max(4, event.clientX - drag.dx), window.innerWidth - drag.width - 4),
      top: Math.min(Math.max(4, event.clientY - drag.dy), window.innerHeight - drag.height - 4),
      width: drag.width,
      height: drag.height,
    });
  }, []);

  const onPanelUp = useCallback(() => {
    panelDragRef.current = null;
  }, []);

  // Kéo bong bóng: di chuyển > 4px thì coi là kéo, không mở cửa sổ.
  // Trên điện thoại phải bắt pointer ở window (setPointerCapture hay bị mất khi ngón tay đi nhanh)
  // và bám mép gần nhất sau khi thả để lần sau bấm/kéo lại dễ.
  const BUBBLE_SIZE = 56;
  const EDGE = 12;

  const onPointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragRef.current = {
      start: { x: event.clientX, y: event.clientY, right: pos.right, bottom: pos.bottom },
      moved: false,
      last: pos,
      id: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [pos]);

  useEffect(() => {
    const move = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.start.x;
      const dy = event.clientY - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      const next = {
        right: Math.min(Math.max(EDGE, drag.start.right - dx), window.innerWidth - BUBBLE_SIZE - EDGE),
        bottom: Math.min(Math.max(EDGE, drag.start.bottom - dy), window.innerHeight - BUBBLE_SIZE - EDGE),
      };
      drag.last = next;
      setPos(next);
    };
    const up = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      if (!drag.moved) {
        setOpen((value) => !value);
        return;
      }
      // Bám mép trái/phải gần nhất (giữ nguyên độ cao) cho gọn và dễ bấm lại.
      const centerFromRight = drag.last.right + BUBBLE_SIZE / 2;
      const snapped = {
        right: centerFromRight < window.innerWidth / 2 ? EDGE : window.innerWidth - BUBBLE_SIZE - EDGE,
        bottom: drag.last.bottom,
      };
      setPos(snapped);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(snapped));
      } catch {
        /* bộ nhớ bị chặn thì thôi */
      }
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Đang ở trang chat đầy đủ thì không cần bong bóng.
  const hide = useMemo(() => location.pathname === '/chat', [location.pathname]);
  if (hide) return null;

  return (
    <>
      {open && (
        <>
          <button
            aria-label="Đóng chat"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] sm:hidden"
          />
          <section
            ref={panelRef}
            style={
              panelBox
                ? { left: panelBox.left, top: panelBox.top, width: panelBox.width, height: panelBox.height }
                : sheetBox
                  ? { left: sheetBox.left, right: sheetBox.right, top: sheetBox.top, height: sheetBox.height }
                  : undefined
            }
            className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 ${
              panelBox || sheetBox
                ? ''
                : 'inset-x-3 bottom-24 h-[70vh] sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[32rem] sm:w-[22rem]'
            }`}
            aria-label="Cửa sổ chat"
          >
            <header
              onPointerDown={onPanelDown}
              onPointerMove={onPanelMove}
              onPointerUp={onPanelUp}
              onPointerCancel={onPanelUp}
              className="flex cursor-move touch-none select-none items-center gap-2 border-b border-slate-100 bg-white px-3 py-2"
            >
              <MessageCircle className="size-4 text-water-600" />
              <span className="flex-1 text-sm font-semibold text-slate-800">Chat</span>
              <Link
                to="/chat"
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Mở trang chat đầy đủ"
              >
                <Maximize2 className="size-4" />
              </Link>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng chat"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1">
              <ChatPanel compact />
            </div>
          </section>
        </>
      )}

      {!open && (
        <button
          onPointerDown={onPointerDown}
          style={{ right: pos.right, bottom: pos.bottom }}
          aria-label="Mở chat (kéo để di chuyển)"
          className="fixed z-40 flex size-14 touch-none items-center justify-center rounded-full bg-gradient-to-br from-water-500 to-water-700 text-white shadow-lg shadow-water-600/40 transition active:scale-95"
        >
          <MessageCircle className="size-6" />
          {!!unread && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    </>
  );
}
