import api from './apiClient';

/** Ghi nhận theo lần cho uống thuốc / bữa ăn / học + partner duyệt. */
export const habitLogService = {
  today: (kind) => api.get(`/api/habits/${kind}/today`),
  // Lịch sử gần đây (cân nặng cần chuỗi số liệu)
  history: (kind, limit = 30) => api.get(`/api/habits/${kind}/history`, { params: { limit } }),
  // FormData: time, note, photo?, value? (value = gam, chỉ cho cân nặng)
  add: (kind, form) => api.post(`/api/habits/${kind}/logs`, form),
  remove: (id) => api.delete(`/api/habits/logs/${id}`),
  inbox: () => api.get('/api/habits/logs/inbox'),
  review: (id, { approve, reason }) => api.post(`/api/habits/logs/${id}/review`, { approve, reason }),
};

export default habitLogService;
