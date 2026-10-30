import api from './apiClient';

/** Nhật ký uống nước: hôm nay, lịch tháng, chi tiết một ngày. */
export const waterService = {
  getToday: () => api.get('/api/water/today'),
  getCalendar: ({ year, month }) => api.get('/api/water/calendar', { params: { year, month } }),
  getDay: (date) => api.get(`/api/water/day/${date}`),
  addLog: (form) => api.post('/api/water/log', form),
};

export default waterService;
