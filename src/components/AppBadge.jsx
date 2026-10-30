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
    const badge = navigator.setAppBadge?.bind(navigator);
    const clear = navigator.clearAppBadge?.bind(navigator);
    if (!badge) return;
    if (total > 0) void badge(total).catch(() => undefined);
    else if (clear) void clear().catch(() => undefined);
  }, [total]);

  return null;
}
