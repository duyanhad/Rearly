export const periodLabels = {
  Morning: 'Sáng',
  Afternoon: 'Trưa',
  Evening: 'Tối'
};
export const periodLabel = period => periodLabels[period] ?? period;
export const timeLabel = iso => new Date(iso).toLocaleTimeString('vi-VN', {
  hour: '2-digit',
  minute: '2-digit'
});