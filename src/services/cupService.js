import api from './apiClient';

/** Cốc của người dùng: danh sách, ảnh cốc, cốc mặc định. */
export const cupService = {
  list: () => api.get('/api/cups'),
  create: ({ name, volumeMl }) => api.post('/api/cups', { name, volumeMl }),
  // onUploadProgress: callback nhận % byte đã gửi (để hiện vòng loading nước).
  uploadImage: (id, form, onUploadProgress) =>
    api.put(`/api/cups/${id}/image`, form, onUploadProgress ? { onUploadProgress } : undefined),
  removeImage: (id) => api.delete(`/api/cups/${id}/image`),
  setDefault: (id) => api.put(`/api/cups/${id}/default`),
  // Nhận cốc mẫu từ catalog admin thành cốc của mình (kèm đặt mặc định).
  adopt: (id) => api.post(`/api/cups/${id}/adopt`),
};

export default cupService;
