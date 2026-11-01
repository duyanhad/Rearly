import api, { mediaUrl } from './apiClient';

/** Lời nhắn thoại hẹn giờ gửi cho partner/bạn bè. */
export const voiceNoteService = {
  create: (form, onUploadProgress) =>
    api.post('/api/voice-notes', form, {
      onUploadProgress: (event) => {
        const total = event.total || 0;
        if (!total || !onUploadProgress) return;
        onUploadProgress(Math.round((event.loaded / total) * 100));
      },
    }),
  incoming: () => api.get('/api/voice-notes/incoming'),
  listen: (id) => api.post(`/api/voice-notes/${id}/listen`),
  cancel: (id) => api.delete(`/api/voice-notes/${id}`),
  sent: () => api.get('/api/voice-notes'),
  audioUrl: (url) => mediaUrl(url),
};

export default voiceNoteService;
