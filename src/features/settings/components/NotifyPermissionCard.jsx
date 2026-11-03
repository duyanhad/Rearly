import { useEffect, useState } from 'react';
import { BellRing, Share, Smartphone } from 'lucide-react';
import { askNotificationPermission, isPushActive, notificationState, subscribePush } from '../../../utils/notify';

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

const isIos = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * Bật thông báo để nhắc đúng giờ trên web/PWA (nước, thuốc, bữa ăn, học, cân nặng, giấc ngủ).
 *
 * iPhone chỉ nhận được thông báo khi app đã "Thêm vào MH chính" và quyền được cấp trong một lần
 * bấm của người dùng — nên phải có nút bấm thật, không thể xin quyền tự động.
 */
export function NotifyPermissionCard({ className = '' }) {
  const [state, setState] = useState(() => notificationState());
  const [push, setPush] = useState(() => isPushActive());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    // Chỉ iPhone mới bắt buộc cài vào MH chính; trình duyệt khác nhận push ngay trong tab.
    setNeedsInstall(isIos() && !isStandalone());
  }, []);

  const enable = async () => {
    setBusy(true);
    setNote('');
    try {
      const result = await askNotificationPermission();
      setState(result);
      if (result !== 'granted') {
        setNote(result === 'denied' ? 'Bạn đã từ chối quyền. Mở Cài đặt trình duyệt để bật lại.' : 'Chưa cấp quyền thông báo.');
        return;
      }
      const ok = await subscribePush();
      setPush(ok);
      setNote(ok ? '' : 'Chưa kết nối được máy chủ thông báo, thử lại sau.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'unsupported') return null;

  if (needsInstall) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 ${className}`}>
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-800">
          <Smartphone className="size-3.5" /> Trên iPhone: thêm vào MH chính trước
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-snug text-amber-700">
          Mở Safari → nút <Share className="inline size-3" /> Chia sẻ → “Thêm vào MH chính”, rồi mở Dearly từ
          icon ngoài màn hình để bật nhắc nhở.
        </p>
      </div>
    );
  }

  const ready = state === 'granted' && push;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border p-2.5 ${
        ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
      } ${className}`}
    >
      <BellRing className={`size-4 shrink-0 ${ready ? 'text-emerald-600' : 'text-slate-400'}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-semibold ${ready ? 'text-emerald-800' : 'text-slate-700'}`}>
          {ready ? 'Nhắc nhở kêu cả khi app đóng' : 'Bật thông báo để nhắc đúng giờ'}
        </p>
        <p className="text-[10px] leading-snug text-slate-500">
          {ready
            ? 'Máy này đã nhận được thông báo. Máy khác thì bật riêng trên máy đó.'
            : note || 'Không bật thì chỉ hiện thông báo khi bạn đang mở app.'}
        </p>
      </div>
      {!ready && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="shrink-0 rounded-lg bg-water-700 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Đang bật…' : state === 'denied' ? 'Thử lại' : 'Bật'}
        </button>
      )}
    </div>
  );
}

export default NotifyPermissionCard;
