import api from './apiClient';

/** Xác thực: đăng nhập / đăng ký / hồ sơ của chính mình. */
export const authService = {
  login: ({ email, password }) => api.post('/api/auth/login', { email, password }),
  register: ({ email, password, fullName }) =>
    api.post('/api/auth/register', { email, password, fullName }),
  getProfile: () => api.get('/api/user/profile'),
  // Đổi mật khẩu: cần email + mật khẩu hiện tại; server đổi SecurityStamp → mọi token cũ hết hiệu lực.
  changePassword: ({ email, currentPassword, newPassword }) =>
    api.post('/api/auth/change-password', { email, currentPassword, newPassword }),
  // Đổi SecurityStamp ở server → mọi token đã phát (kể cả trên máy khác) hết hiệu lực.
  logout: () => api.post('/api/auth/logout'),
};

export default authService;
