import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import { getToken } from '../services/apiClient';
import { useAuth } from '../context/AuthProvider';
import { disconnect, ensureStarted } from '../services/realtime';
import { subscribePush, showSystemNotification } from '../utils/notify';
import { playChime, vibrate } from '../utils/chime';

/**
 * Giữ kết nối SignalR khi đã đăng nhập và biến sự kiện server thành thông báo.
 * Mọi sự kiện đi theo thứ tự: hiện "Đang cập nhật…" → tải lại dữ liệu → toast + hiệu ứng,
 * nhờ vậy thông báo, con số và hiệu ứng cốc khớp nhau tại cùng một thời điểm.
 */
export function RealtimeBridge() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef(0);

  const showSync = useCallback((on) => {
    window.clearTimeout(syncTimer.current);
    if (on) setSyncing(true);
    // Giữ hiện tối thiểu 600ms để người dùng kịp thấy.
    else syncTimer.current = window.setTimeout(() => setSyncing(false), 600);
  }, []);

  // Tải lại dữ liệu xong mới thông báo + chạy hiệu ứng.
  const syncThen = useCallback(
    async (keys, action) => {
      showSync(true);
      try {
        await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      } catch {
        // lỗi mạng thì vẫn thông báo cho người dùng
      } finally {
        showSync(false);
      }
      action?.();
    },
    [queryClient, showSync],
  );

  // Đã đăng nhập + đã cho phép thông báo → đăng ký Web Push để nhắc cả khi app đóng.
  useEffect(() => {
    if (!user) return;
    void subscribePush();
  }, [user]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) {
      void disconnect();
      return;
    }
    const connection = ensureStarted(token);

    // Người khác nhắc uống nước (chuông): banner + rung + tiếng bíp.
    const onNudge = (payload) =>
      void syncThen(['notifications', 'pending-proofs', 'today'], () => {
        toast.show(payload.title ?? 'Nhắc uống nước', payload.message);
        vibrate('normal');
        playChime('normal');
        void showSystemNotification(payload.title ?? 'Nhắc uống nước', payload.message, 'normal');
      });

    const onBroadcast = (payload) =>
      void syncThen(['notifications'], () => toast.show(payload.title ?? 'Thông báo', payload.message));

    // Khách vừa thêm nước → cập nhật số liệu trước, rồi mới rót nước + thông báo.
    const onProof = (payload) =>
      void syncThen(['pending-proofs', 'partner-clients', 'partner-today'], () => {
        window.dispatchEvent(
          new CustomEvent('cup:pour', {
            detail: { amountMl: payload.amountMl, userId: payload.userId },
          }),
        );
        toast.show(payload.title ?? 'Phiếu mới', payload.message);
      });

    // Partner trừ nước → cập nhật số liệu trước, rồi cốc nghiêng đổ nước + thông báo.
    const onDeduct = (payload) =>
      void syncThen(['today', 'cups', 'notifications'], () => {
        window.dispatchEvent(
          new CustomEvent('cup:deduct', {
            detail: {
              amountMl: payload.amountMl,
              totalDrankMl: payload.totalDrankMl,
              partnerName: payload.partnerName,
            },
          }),
        );
        toast.show(payload.title ?? 'Bị trừ nước', payload.message);
      });

    // Tin nhắn mới: cập nhật hội thoại rồi báo.
    const onMessage = (payload) =>
      void syncThen(['chat-conversations', 'chat-thread'], () =>
        toast.show(payload.title ?? payload.fromName ?? 'Tin nhắn mới', payload.message ?? payload.body),
      );

    // Nhắc uống nước tự động: banner trong app + rung + âm báo + thông báo hệ thống.
    const onReminder = (payload) => {
      const style = payload.style ?? 'normal';
      toast.show(payload.title ?? 'Uống nước đi 💧', payload.message);
      playChime(style);
      vibrate(style);
      void showSystemNotification(payload.title ?? 'Uống nước đi 💧', payload.message, style);
    };

    connection.on('ReceiveNudge', onNudge);
    connection.on('ReceiveBroadcast', onBroadcast);
    connection.on('ReceiveProof', onProof);
    connection.on('ReceiveDeduct', onDeduct);
    connection.on('ReceiveReminder', onReminder);
    connection.on('ReceiveMessage', onMessage);
    return () => {
      window.clearTimeout(syncTimer.current);
      connection.off('ReceiveNudge', onNudge);
      connection.off('ReceiveBroadcast', onBroadcast);
      connection.off('ReceiveProof', onProof);
      connection.off('ReceiveDeduct', onDeduct);
      connection.off('ReceiveReminder', onReminder);
      connection.off('ReceiveMessage', onMessage);
    };
  }, [user, toast, queryClient, syncThen]);

  if (!syncing) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center">
      <span className="flex animate-sync-pop items-center gap-2 rounded-full bg-slate-900/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
        <Loader2 className="size-3.5 animate-spin" />
        Đang cập nhật…
      </span>
    </div>
  );
}
