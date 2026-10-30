import api from './apiClient';

/** Hồ sơ, mục tiêu, ảnh đại diện, partner duyệt ảnh, tìm người dùng. */
export const userService = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: ({ fullName }) => api.put('/api/user/profile', { fullName }),
  uploadAvatar: (form) => api.put('/api/user/avatar', form),
  getStats: () => api.get('/api/user/stats'),
  updateTargets: (body) => api.put('/api/user/targets', body),
  updateSettings: (body) => api.put('/api/user/settings', body),
  updateCover: (form) => api.put('/api/user/cover', form),
  setPartner: (partnerId) => api.put('/api/user/partner', { partnerId }),
  search: (q) => api.get('/api/user/search', { params: { q } }),
};

export default userService;
