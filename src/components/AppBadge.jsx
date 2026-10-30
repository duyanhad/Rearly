import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';

/**
 * Số đỏ trên icon app (Badging API) = tin nhắn chưa đọc + thông báo chưa đọc.
 * iOS 16.4+ (PWA đã thêm vào MH chính) và Android/desktop Chromium đều hỗ trợ;
 * trình duyệt không hỗ trợ thì bỏ qua im lặng.
 */
export function AppBadge() {
  const { data: conversations = [] } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => (await chatService.conversations()).data,
    refetchInterval: 20_000,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationService.list()).data,
    staleTime: 20_000,
  });

  const total =
    conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0) +
    items.filter((n) => !n.isRead).length;

  useEffect(() => {
    // Một số bản WebKit trả undefined thay vì Promise → phải bọc, nếu không sẽ crash cả app.
    try {
      if (total > 0) {
        const result = navigator.setAppBadge?.(total);
        if (result && typeof result.catch === 'function') result.catch(() => undefined);
      } else {
        const result = navigator.clearAppBadge?.();
        if (result && typeof result.catch === 'function') result.catch(() => undefined);
      }
    } catch {
      // trình duyệt không hỗ trợ → bỏ qua
    }
  }, [total]);

  return null;
}
