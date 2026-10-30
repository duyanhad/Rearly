import { api } from './apiClient';

export const chatService = {
  conversations: () => api.get('/api/chat/conversations'),
  thread: (userId) => api.get(`/api/chat/${userId}`),
  send: (userId, body) => api.post(`/api/chat/${userId}`, { body }),
  markRead: (userId) => api.post(`/api/chat/${userId}/read`),
  deleteThread: (userId) => api.delete(`/api/chat/${userId}`),
};

export default chatService;
