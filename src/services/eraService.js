import api from './apiClient';

/** Kỷ nguyên linh vật: xem, mở khoá, nâng cấp bằng "giọt" kiếm từ chuỗi ngày. */
export const eraService = {
  getCatalog: (group) => api.get('/api/eras', { params: group ? { group } : undefined }),
  unlock: (eraId) => api.post(`/api/eras/${eraId}/unlock`),
  upgrade: (eraId) => api.post(`/api/eras/${eraId}/upgrade`),
};

export default eraService;
