import api from './apiClient';

/** Giấc ngủ: gửi phiếu (kèm ảnh), đọc thống kê, partner duyệt. */
export const sleepService = {
  summary: () => api.get('/api/sleep'),
  month: ({ year, month }) => api.get('/api/sleep/month', { params: { year, month } }),
  start: (form) => api.post('/api/sleep/start', form),
  // FormData: photo? (ảnh minh chứng lúc dậy), note?
  stop: (id, form) => api.post(`/api/sleep/${id}/stop`, form),
  /** Chốt ngày: % và quỹ giấc ngủ bắt đầu lại từ 0 cho ngày mới. */
  closeDay: () => api.post('/api/sleep/close-day'),
  /** Partner chốt ngày giúp người mình theo dõi. */
  closeDayFor: (userId) => api.post(`/api/sleep/close-day/${userId}`),
  // FormData: bedTime, wakeTime, note, date?, photo?
  submit: (form) => api.post('/api/sleep', form),
  inbox: () => api.get('/api/sleep/inbox'),
  review: (id, { approve, reason }) => api.post(`/api/sleep/${id}/review`, { approve, reason }),
  /** Tắt nhắc "sắp tới giờ đi ngủ" cho hôm nay. */
  dismissReminder: () => api.post('/api/sleep/reminder/dismiss'),
};

export default sleepService;
