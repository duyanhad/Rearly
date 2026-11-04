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
        if (payload?.videoUrl) {
          // Nhắc kèm video: mở màn phát video thay vì chỉ hiện toast.
          window.dispatchEvent(new CustomEvent('dearly:nudge-video', { detail: payload }));
          vibrate('normal');
          return;
        }
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

    // Tin nhắn mới: ghép thẳng vào cache hội thoại đang mở (hiện ngay không chờ tải lại),
    // sau đó mới làm mới danh sách hội thoại + báo.
    const onMessage = (payload) => {
      const from = payload.fromUserId;
      if (from && payload.id) {
        queryClient.setQueryData(['chat-thread', from], (old = []) =>
          old.some((m) => m.id === payload.id)
            ? old
            : [
                ...old,
                {
                  id: payload.id,
                  mine: false,
                  body: payload.body ?? '',
                  createdAt: payload.createdAt,
                  readAt: null,
                  audioUrl: payload.audioUrl ?? null,
                  audioDurationMs: payload.audioDurationMs ?? null,
                  imageUrl: payload.imageUrl ?? null,
                  reactions: [],
                },
              ],
        );
      }
      void syncThen(['chat-conversations'], () => {
        const title = payload.title ?? payload.fromName ?? 'Tin nhắn mới';
        const body = payload.message ?? payload.body ?? '';
        toast.show(title, body);
        vibrate('normal');
        playChime('normal');
        void showSystemNotification(title, body, 'normal');
      });
    };

    // Nhắc uống nước tự động: banner trong app + rung + âm báo + thông báo hệ thống.
    const onReminder = (payload) => {
      const style = payload.style ?? 'normal';
      toast.show(payload.title ?? 'Uống nước đi 💧', payload.message);
      playChime(style);
      vibrate(style);
      void showSystemNotification(payload.title ?? 'Uống nước đi 💧', payload.message, style);
    };

    // Cảm xúc mới trên tin nhắn: chỉ cần làm mới hội thoại đang mở.
    const onReaction = () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-thread'] });
    };

    // Tin bị sửa / thu hồi từ máy kia: làm mới hội thoại đang mở.
    const onMessageUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-thread'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    };

    connection.on('ReceiveNudge', onNudge);
    connection.on('ReceiveBroadcast', onBroadcast);
    connection.on('ReceiveProof', onProof);
    connection.on('ReceiveDeduct', onDeduct);
    connection.on('ReceiveReminder', onReminder);

    // Báo thức thức dậy do server đẩy (app đóng vẫn nhận qua web push).
    const onSleepAlarm = (payload) => {
      vibrate('normal');
      playChime('demon');
      void showSystemNotification(payload?.title ?? '⏰ Báo thức Dearly', payload?.body ?? 'Dậy thôi!', 'normal', {
        force: true,
        tag: 'dearly-sleep-alarm',
      });
      window.dispatchEvent(new CustomEvent('dearly:sleep-alarm', { detail: payload }));
    };

    // Đã ngủ đủ số phút dự định: nhắc một lần, người dùng tự tắt.
    const onSleepFull = (payload) => {
      toast.show(payload?.title ?? '🌙 Đã ngủ đủ giấc', payload?.body ?? '');
      vibrate('gentle');
      void showSystemNotification(payload?.title ?? '🌙 Đã ngủ đủ giấc', payload?.body ?? '', 'normal', {
        tag: 'dearly-sleep-full',
      });
      window.dispatchEvent(new CustomEvent('dearly:sleep-full', { detail: payload }));
    };

    connection.on('ReceiveSleepAlarm', onSleepAlarm);
    connection.on('ReceiveSleepFull', onSleepFull);

    // Nhắc thuốc / bữa ăn / học tập / cân nặng theo giờ đã đặt.
    const onHabitReminder = (payload) => {
      const title = payload?.title ?? 'Nhắc nhở Dearly';
      const body = payload?.body ?? '';
      toast.show(title, body);
      playChime('normal');
      vibrate('normal');
      // force: vẫn hiện dù máy đã đăng ký Web Push.
      void showSystemNotification(title, body, 'normal', { force: true, tag: `dearly-habit-${payload?.kind ?? 'x'}` });
      void queryClient.invalidateQueries({ queryKey: ['habit-logs'] });
    };
    connection.on('ReceiveHabitReminder', onHabitReminder);

    // Nhiệm vụ partnership: thông báo mọi bước cho cả hai bên.
    const onDuty = (payload) => {
      const title = payload?.title ?? '📋 Nhiệm vụ';
      const body = payload?.body ?? '';
      toast.show(title, body);
      playChime('normal');
      vibrate('normal');
      void showSystemNotification(title, body, 'normal', { force: true, tag: 'dearly-duty' });
      void queryClient.invalidateQueries({ queryKey: ['duties'] });
    };
    connection.on('ReceiveDuty', onDuty);

    // Kêu lặp cho tới khi người nhận bấm "đã nhận nhiệm vụ".
    const onDutyRing = (payload) => {
      toast.show(payload?.title ?? '📋 Nhận nhiệm vụ đi!', payload?.body ?? '');
      playChime('normal');
      vibrate('normal');
      void showSystemNotification(payload?.title ?? '📋 Nhận nhiệm vụ đi!', payload?.body ?? '', 'normal', {
        force: true,
        tag: 'dearly-duty-ring',
      });
      void queryClient.invalidateQueries({ queryKey: ['duties'] });
      // Mở lại màn hình nhận nhiệm vụ (cùng kiểu màn nhận lời nhắn thoại).
      window.dispatchEvent(new CustomEvent('dearly:duty-ring', { detail: payload }));
    };
    connection.on('ReceiveDutyRing', onDutyRing);
    connection.on('ReceiveMessage', onMessage);
    connection.on('ReceiveReaction', onReaction);
    connection.on('ReceiveMessageUpdate', onMessageUpdate);
    return () => {
      window.clearTimeout(syncTimer.current);
      connection.off('ReceiveNudge', onNudge);
      connection.off('ReceiveBroadcast', onBroadcast);
      connection.off('ReceiveProof', onProof);
      connection.off('ReceiveDeduct', onDeduct);
      connection.off('ReceiveReminder', onReminder);
      connection.off('ReceiveSleepAlarm', onSleepAlarm);
      connection.off('ReceiveSleepFull', onSleepFull);
      connection.off('ReceiveHabitReminder', onHabitReminder);
      connection.off('ReceiveDuty', onDuty);
      connection.off('ReceiveDutyRing', onDutyRing);
      connection.off('ReceiveMessage', onMessage);
      connection.off('ReceiveReaction', onReaction);
      connection.off('ReceiveMessageUpdate', onMessageUpdate);
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
