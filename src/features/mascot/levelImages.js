import { LEVELS_PER_ERA, MAX_LEVEL, tierFromLevel } from './tiers';

const AVAILABLE_ERAS = new Set([1, 2]);

/**
 * Ảnh linh vật theo cấp: /mascots/era{kỷ nguyên}/{cấp trong kỷ nguyên}.webp
 * Kỷ nguyên 1 có 5 ảnh cắt từ bộ người dùng gửi; kỷ nguyên 2-3 tạm dùng ảnh era1.
 */
export const levelSprite = (level = 1) => {
  const lv = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  const era = tierFromLevel(lv);
  const step = ((lv - 1) % LEVELS_PER_ERA) + 1;
  const dir = AVAILABLE_ERAS.has(era) ? era : 1;
  return `/mascots/era${dir}/${step}.webp`;
};
