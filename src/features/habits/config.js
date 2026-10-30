import { BookOpen, Pill, Scale, Soup } from 'lucide-react';

/** Cấu hình hiển thị cho 3 nhu cầu ghi nhận theo lần. */
export const HABIT_KINDS = {
  medicine: {
    key: 'medicine',
    label: 'Uống thuốc',
    icon: Pill,
    unit: 'lần',
    hint: 'Uống thuốc đúng giờ mỗi ngày',
    notePlaceholder: 'Ví dụ: thuốc huyết áp, sau ăn',
  },
  meal: {
    key: 'meal',
    label: 'Bữa ăn',
    icon: Soup,
    unit: 'bữa',
    hint: 'Đủ bữa, đủ chất',
    notePlaceholder: 'Ví dụ: cơm gà, salad, ăn nhẹ',
  },
  study: {
    key: 'study',
    label: 'Học tập',
    icon: BookOpen,
    unit: 'phiên',
    hint: 'Mỗi ngày một chút, đều hơn là nhiều',
    notePlaceholder: 'Ví dụ: tiếng Anh 30 phút, đọc 20 trang',
  },
  weight: {
    key: 'weight',
    label: 'Cân nặng',
    icon: Scale,
    unit: 'kg',
    hint: 'Theo dõi cân nặng mỗi ngày',
    notePlaceholder: 'Ví dụ: cân buổi sáng sau khi thức dậy',
    isWeight: true,
  },
};

export const HABIT_KIND_LIST = Object.values(HABIT_KINDS);
