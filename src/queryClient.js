import { QueryClient } from '@tanstack/react-query';

/**
 * Cache dữ liệu dùng chung cho cả app.
 * Tách khỏi main.jsx để AuthProvider xoá sạch khi đăng xuất / đổi tài khoản
 * (tránh hiển thị dữ liệu của người dùng trước trên cùng thiết bị).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15000,
    },
  },
});

export default queryClient;
