import api from './apiClient';

/** Bạn bè, theo dõi, biệt hiệu, bảng tin, nhắc nhở và duyệt ảnh minh chứng. */
export const socialService = {
  getFeed: () => api.get('/api/social/feed'),
  getFriends: () => api.get('/api/social/friends'),
  getFollowers: () => api.get('/api/social/followers'),
  getFollowing: () => api.get('/api/social/following'),
  getFollowRequests: () => api.get('/api/social/follow-requests'),
  respondFollowRequest: (id, accept) =>
    api.post(`/api/social/follow-requests/${id}/${accept ? 'accept' : 'reject'}`),
  follow: (id) => api.post(`/api/social/follow/${id}`),
  unfollow: (id) => api.delete(`/api/social/unfollow/${id}`),
  setNickname: (id, nickname) => api.put(`/api/social/nickname/${id}`, { nickname: nickname || null }),
  nudge: (id, payload) => api.post(`/api/social/nudge/${id}`, payload ?? {}),
  getPartnerClients: () => api.get('/api/social/partner/clients'),
  getMyPartner: () => api.get('/api/social/partner/me'),
  deduct: (userId, amountMl) =>
    api.post(`/api/social/partner/clients/${userId}/deduct`, { amountMl }),
  getClientToday: (userId) => api.get(`/api/social/partner/clients/${userId}/today`),
  getClientNeeds: (userId) => api.get(`/api/social/partner/clients/${userId}/needs`),
  getPendingProofs: () => api.get('/api/social/verify/pending'),
  reviewProof: (logId, approve, message) => api.post(`/api/social/verify/${logId}`, { approve, message }),
};

export default socialService;
