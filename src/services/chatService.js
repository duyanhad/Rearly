import { api } from './apiClient';

export const chatService = {
  conversations: () => api.get('/api/chat/conversations'),
  thread: (userId) => api.get(`/api/chat/${userId}`),
  send: (userId, body) => api.post(`/api/chat/${userId}`, { body }),
  /** Gửi tin nhắn thoại: blob ghi âm từ MediaRecorder + thời lượng (ms). */
  sendVoice: (userId, blob, durationMs) => {
    const form = new FormData();
    form.append('audio', blob, `voice.${(blob.type.split('/')[1] ?? 'webm').split(';')[0]}`);
    form.append('durationMs', String(Math.round(durationMs)));
    return api.post(`/api/chat/${userId}/voice`, form);
  },
  markRead: (userId) => api.post(`/api/chat/${userId}/read`),
  deleteThread: (userId) => api.delete(`/api/chat/${userId}`),
  /** Gửi ảnh trong chat (File từ ô chọn ảnh). */
  sendImage: (userId, file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`/api/chat/${userId}/image`, form);
  },
  /** Thả / đổi / bỏ cảm xúc trên một tin nhắn. */
  react: (messageId, emoji) => api.post(`/api/chat/messages/${messageId}/react`, { emoji }),
  /** Sửa nội dung tin chữ của mình. */
  editMessage: (messageId, body) => api.put(`/api/chat/messages/${messageId}`, { body }),
  /** Thu hồi tin của mình (xoá nội dung, giữ dòng thông báo). */
  recallMessage: (messageId) => api.delete(`/api/chat/messages/${messageId}`),
};

export default chatService;
