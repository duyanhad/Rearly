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
  /**
   * Giao nhiều nhiệm vụ một lần. Mỗi việc có giờ + nội dung riêng; tệp của việc thứ i
   * đặt tên `files_i` để server biết gắn vào việc nào.
   * @param {Array<{title,note,startsAtUtc,dueAtUtc,remindBeforeMin,text,voiceDurationMs,files}>} items
   */
  createMany: (items) => {
    const form = new FormData();
    form.append(
      'items',
      JSON.stringify(
        items.map(({ title, note, startsAtUtc, dueAtUtc, remindBeforeMin, text, voiceDurationMs }) => ({
          title,
          note: note ?? '',
          startsAtUtc: new Date(startsAtUtc).toISOString(),
          dueAtUtc: new Date(dueAtUtc).toISOString(),
          remindBeforeMin: remindBeforeMin ?? 10,
          text: text || null,
          voiceDurationMs: voiceDurationMs || null,
        })),
      ),
    );
    items.forEach((item, index) => {
      (item.files ?? []).forEach((file) => form.append(`files_${index}`, file));
    });
    return api.post('/api/duties/batch', form);
  },
  /** Người nhận trả lời cả lô: nhận một số việc, từ chối số còn lại (lý do dùng chung). */
  respond: (accepts, declines, reason) =>
    api.post('/api/duties/respond', { accepts, declines, reason: reason ?? '' }),
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
