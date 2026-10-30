import api from './apiClient';

/** Cài đặt nhắc cho uống thuốc / bữa ăn / giấc ngủ (một hàng mỗi nhu cầu). */
export const habitService = {
  list: () => api.get('/api/habits'),
  save: (kind, payload) => api.put(`/api/habits/${kind}`, payload),
  // Ảnh "vật thể" của nhu cầu: server tự tách nền (cutout) để làm hình chính.
  uploadImage: (kind, form, onUploadProgress) =>
    api.post(`/api/habits/${kind}/image`, form, onUploadProgress ? { onUploadProgress } : undefined),
  removeImage: (kind) => api.delete(`/api/habits/${kind}/image`),
};

export default habitService;
