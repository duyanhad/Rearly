import api, { mediaUrl } from './apiClient';

/**
 * Video ngắn gửi kèm nhắc nhở. Người dùng đọc danh sách video đang bật để xem trước,
 * admin tải lên / bật-tắt / xoá theo từng nhu cầu.
 */
export const nudgeVideoService = {
  list: () => api.get('/api/nudge-videos'),
  adminList: () => api.get('/api/admin/nudge-videos'),
  upload: ({ kind, label, file }) => {
    const form = new FormData();
    form.append('kind', kind);
    form.append('label', label ?? '');
    form.append('file', file);
    return api.post('/api/admin/nudge-videos', form);
  },
  toggle: (id) => api.post(`/api/admin/nudge-videos/${id}/toggle`),
  remove: (id) => api.delete(`/api/admin/nudge-videos/${id}`),
  url: (path) => mediaUrl(path),
};

export default nudgeVideoService;
