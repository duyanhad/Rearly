import api from './apiClient';

/** Trung tâm thông báo. */
export const notificationService = {
  // beforeId: lấy tiếp thông báo cũ hơn (0 = mới nhất)
  list: (take = 50, beforeId = 0) => api.get('/api/notifications', { params: { take, beforeId } }),
  markRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put('/api/notifications/read-all'),
  reply: (id, message) => api.post(`/api/notifications/${id}/reply`, { message }),
};

export default notificationService;
