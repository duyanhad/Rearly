import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useToast } from './Toast';
import { askNotificationPermission, subscribePush, notificationState } from '../utils/notify';

const DISMISS_KEY = 'dearly.push.dismissed';

/**
 * iOS chỉ cho xin quyền thông báo trong một thao tác bấm thật, nên phải có nút này:
 * bật quyền + đăng ký Web Push để tin nhắn/nhắc nhở/phiếu duyệt tới cả khi đã tắt app.
 */
export function PushPermissionPrompt() {
  const { user } = useAuth();
  const toast = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    setVisible(notificationState() === 'default' && !dismissed);
  }, [user]);

  if (!visible) return null;

  const enable = async () => {
    const result = await askNotificationPermission();
    if (result === 'granted') {
      const ok = await subscribePush();
      toast.show(
        'Đã bật thông báo',
        ok ? 'Tin nhắn và nhắc nhở sẽ tới cả khi tắt app.' : 'Thiết bị sẽ hiện thông báo khi app đang mở.',
      );
    } else {
      toast.show('Chưa bật được thông báo', 'Vào cài đặt trang web để cấp quyền thông báo nhé.');
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200 sm:bottom-6">
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-700">
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Bật thông báo cho Dearly?</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Nhận tin nhắn, nhắc uống nước và phiếu chờ duyệt cả khi đã tắt app (kèm chấm đỏ trên icon).
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={enable}
              className="rounded-xl bg-water-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-water-700"
            >
              Bật thông báo
            </button>
            <button
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, '1');
                setVisible(false);
              }}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Để sau
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
          className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
          aria-label="Đóng"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default PushPermissionPrompt;
