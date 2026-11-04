import api, { mediaUrl } from './apiClient';

/**
 * Nhiệm vụ partner giao nhau. Tệp đính kèm gửi dạng multipart: `files` (ảnh hoặc ghi âm),
 * kèm `text` là tin nhắn chữ. Người dùng có thể chọn nhiều loại cùng lúc.
 */
export const dutyService = {
  list: (box = 'mine') => api.get('/api/duties', { params: { box } }),
  detail: (id) => api.get(`/api/duties/${id}`),

  create: ({ title, note, startsAtUtc, remindBeforeMin, dueAtUtc, text, files, voiceDurationMs }) => {
    const form = new FormData();
    form.append('title', title);
    form.append('note', note ?? '');
    form.append('startsAtUtc', new Date(startsAtUtc).toISOString());
    form.append('remindBeforeMin', String(remindBeforeMin ?? 10));
    form.append('dueAtUtc', new Date(dueAtUtc).toISOString());
    if (text) form.append('text', text);
    if (voiceDurationMs) form.append('voiceDurationMs', String(voiceDurationMs));
    (files ?? []).forEach((file) => form.append('files', file));
    return api.post('/api/duties', form);
  },

  update: (id, payload) => api.put(`/api/duties/${id}`, payload),
  /** Giao nhiều nhiệm vụ một lần: dùng chung giờ bắt đầu / nhắc trước / hạn và nội dung kèm. */
  createMany: ({ titles, note, startsAtUtc, remindBeforeMin, dueAtUtc, text, files, voiceDurationMs }) => {
    const form = new FormData();
    (titles ?? []).forEach((t) => form.append('titles', t));
    form.append('note', note ?? '');
    form.append('startsAtUtc', new Date(startsAtUtc).toISOString());
    form.append('remindBeforeMin', String(remindBeforeMin ?? 10));
    form.append('dueAtUtc', new Date(dueAtUtc).toISOString());
    if (text) form.append('text', text);
    if (voiceDurationMs) form.append('voiceDurationMs', String(voiceDurationMs));
    (files ?? []).forEach((file) => form.append('files', file));
    return api.post('/api/duties/batch', form);
  },
  remove: (id) => api.delete(`/api/duties/${id}`),
  /** Người nhận bấm "đã nhận nhiệm vụ" → thôi kêu lặp. */
  accept: (id) => api.post(`/api/duties/${id}/accept`),
  /** Người nhận từ chối nhiệm vụ (kèm lý do không bắt buộc). */
  decline: (id, note) => api.post(`/api/duties/${id}/decline`, { note: note ?? '' }),
  /** Thu hồi báo cáo vừa gửi để sửa lại (người giao thôi thấy bản đó). */
  withdraw: (id) => api.post(`/api/duties/${id}/withdraw`),

  report: ({ id, note, text, files, voiceDurationMs }) => {
    const form = new FormData();
    if (note) form.append('note', note);
    if (text) form.append('text', text);
    if (voiceDurationMs) form.append('voiceDurationMs', String(voiceDurationMs));
    (files ?? []).forEach((file) => form.append('files', file));
    return api.post(`/api/duties/${id}/report`, form);
  },

  review: (id, { approve, note }) => api.post(`/api/duties/${id}/review`, { approve, note: note ?? '' }),
  mediaUrl: (url) => mediaUrl(url),
};

export default dutyService;
