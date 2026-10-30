import { BookOpen, Droplet, Moon, Pill, Scale, Soup } from 'lucide-react';

/** Bốn nhóm cài đặt — dùng chung thanh chuyển trang cho cả 4 trang. */
export const SETTING_TABS = [
  { key: 'water', label: 'Nước', icon: Droplet, to: '/settings' },
  { key: 'medicine', label: 'Thuốc', icon: Pill, to: '/settings/medicine' },
  { key: 'meal', label: 'Bữa ăn', icon: Soup, to: '/settings/meal' },
  { key: 'sleep', label: 'Giấc ngủ', icon: Moon, to: '/settings/sleep' },
  { key: 'study', label: 'Học tập', icon: BookOpen, to: '/settings/study' },
  { key: 'weight', label: 'Cân nặng', icon: Scale, to: '/settings/weight' },
];
