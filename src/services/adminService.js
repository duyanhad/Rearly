import api from './apiClient';

/** Quản trị: người dùng, khoá/mở, phân quyền, broadcast, system log, kỷ nguyên linh vật. */
export const adminService = {
  listUsers: (params) => api.get('/api/admin/users', { params }),
  setUserStatus: (id, isLocked) => api.put(`/api/admin/users/${id}/status`, { isLocked }),
  setUserRole: (id, role) => api.put(`/api/admin/users/${id}/role`, { role }),
  // Đặt lại mật khẩu: không truyền newPassword thì server sinh mật khẩu tạm và trả về 1 lần.
  resetPassword: (id, newPassword = null) =>
    api.put(`/api/admin/users/${id}/password`, { newPassword }),
  broadcast: ({ title, message }) => api.post('/api/admin/broadcast', { title, message }),
  listLogs: (params) => api.get('/api/admin/logs', { params }),

  listEras: () => api.get('/api/admin/eras'),
  createEra: (payload) => api.post('/api/admin/eras', payload),
  updateEra: (id, payload) => api.put(`/api/admin/eras/${id}`, payload),
  deleteEra: (id) => api.delete(`/api/admin/eras/${id}`),
  uploadEraLevelImage: (id, level, form) => api.post(`/api/admin/eras/${id}/levels/${level}/image`, form),
  // Đổi thứ tự bằng kéo thả: gửi mảng id theo thứ tự mới, server tự đánh lại Order 1..n.
  reorderEras: (ids) => api.put('/api/admin/eras/order', { ids }),

  listEraGroups: () => api.get('/api/admin/era-groups'),
  createEraGroup: (payload) => api.post('/api/admin/era-groups', payload),
  updateEraGroup: (id, payload) => api.put(`/api/admin/era-groups/${id}`, payload),
  deleteEraGroup: (id) => api.delete(`/api/admin/era-groups/${id}`),

  // Tiền tệ: tạo loại tiền mới, sửa, xoá; grant = tặng/trừ điểm cho 1 email (để thử luật phát điểm).
  listCurrencies: () => api.get('/api/admin/currencies'),
  createCurrency: (payload) => api.post('/api/admin/currencies', payload),
  updateCurrency: (id, payload) => api.put(`/api/admin/currencies/${id}`, payload),
  deleteCurrency: (id) => api.delete(`/api/admin/currencies/${id}`),
  grantCurrency: (id, payload) => api.post(`/api/admin/currencies/${id}/grant`, payload),
};

export default adminService;