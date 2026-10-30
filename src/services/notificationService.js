import api from './apiClient';

/** Trung tâm thông báo. */
export const notificationService = {
  list: () => api.get('/api/notifications'),
  markRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put('/api/notifications/read-all'),
};

export default notificationService;
