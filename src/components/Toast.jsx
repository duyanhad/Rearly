import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BellRing, X } from 'lucide-react';

const ToastContext = createContext(null);

/** Thông báo nhỏ, gọn, nằm sát thanh trên cùng để không che cốc 3D và hiệu ứng. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((title, body) => {
    const id = Date.now() + Math.random();
    // Giữ tối đa 3 thông báo để không rối màn hình.
    setToasts((list) => [...list.slice(-2), { id, title, body }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-12 z-[70] flex flex-col items-end gap-1.5 px-2 sm:top-[52px] sm:px-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-sync-pop pointer-events-auto flex w-fit max-w-[min(17rem,calc(100vw-1rem))] items-start gap-1.5 rounded-2xl border border-water-100 bg-white/95 py-1.5 pl-2.5 pr-1.5 shadow-md backdrop-blur"
          >
            <BellRing className="mt-0.5 size-3.5 shrink-0 text-water-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight text-slate-800">{toast.title}</p>
              {toast.body && (
                <p className="truncate text-[11px] leading-tight text-slate-500">{toast.body}</p>
              )}
            </div>
            <button
              onClick={() => setToasts((list) => list.filter((t) => t.id !== toast.id))}
              className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="Đóng thông báo"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong ToastProvider');
  return ctx;
}
