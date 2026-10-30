import api from './apiClient';

/** Tiền thưởng theo ngày khi đạt mục tiêu từng nhu cầu. */
export const rewardService = {
  today: () => api.get('/api/rewards/today'),
  claim: (kind) => api.post(`/api/rewards/${kind}/claim`),
};

export default rewardService;
