/**
 * Tiến hoá linh vật theo KỶ NGUYÊN (thay cho 300 cấp).
 *
 * - 3 kỷ nguyên × 5 cấp = 15 cấp.
 * - Chi phí mỗi cấp trong kỷ nguyên tăng theo **luỹ thừa 5**: 5^0, 5^1, 5^2, 5^3, 5^4 (ngày).
 * - Mỗi kỷ nguyên có hệ số riêng (1×, 2×, 3×) để kỷ nguyên sau khó hơn hẳn.
 *
 * Cấp 1 = 1 ngày, cấp 5 = 625 ngày, cả kỷ nguyên 1 = 781 ngày tích luỹ.
 */

export const LEVELS_PER_ERA = 5;
export const ERA_COUNT = 3;
export const MAX_LEVEL = LEVELS_PER_ERA * ERA_COUNT;
/** @deprecated giữ để code cũ không vỡ; giờ mỗi kỷ nguyên là một "bậc". */
export const LEVELS_PER_TIER = LEVELS_PER_ERA;
export const TIER_COUNT = ERA_COUNT;
export const DAYS_PER_LEVEL = 1;

/** Hệ số độ khó từng kỷ nguyên (kỷ nguyên 2, 3 cần gấp 2, 3 lần số ngày). */
export const ERA_FACTOR = [1, 2, 3];

const POW5 = [1, 5, 25, 125, 625];

/** Số ngày tích luỹ cần để đạt một cấp (1..15). */
export function daysForLevel(level = 1) {
  const lv = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  const era = Math.ceil(lv / LEVELS_PER_ERA) - 1;
  const step = (lv - 1) % LEVELS_PER_ERA;
  return POW5[step] * ERA_FACTOR[era];
}

/** Tổng ngày tích luỹ để đạt cấp đó (cộng dồn các cấp trước). */
export function totalDaysForLevel(level = 1) {
  let sum = 0;
  const last = Math.min(MAX_LEVEL, Math.round(level));
  for (let lv = 1; lv <= last; lv += 1) sum += daysForLevel(lv);
  return sum;
}

/** Số ngày streak hiện có → cấp hiện tại (1..15). */
export function levelFromStreakDays(days = 0) {
  const d = Math.max(0, days);
  let level = 1;
  let acc = 0;
  for (let lv = 1; lv <= MAX_LEVEL; lv += 1) {
    acc += daysForLevel(lv);
    if (d >= acc) level = Math.min(MAX_LEVEL, lv + 1);
    else break;
  }
  return level;
}

/** Cấp → kỷ nguyên (1..3). */
export const tierFromLevel = (level = 1) =>
  Math.max(1, Math.min(ERA_COUNT, Math.ceil(Math.max(1, level) / LEVELS_PER_ERA)));

/** Cấp đầu tiên của kỷ nguyên. */
export const tierStartLevel = (tier) => (tier - 1) * LEVELS_PER_ERA + 1;

const pal = (body, deep, glow, accent) => ({ body, deep, glow, accent });

const ERA_INFO = [
  {
    key: 'era1',
    title: 'Kỷ nguyên Vũ khí Cận chiến',
    subtitle: 'Kiếm, giáo, khiên nước — sức mạnh thuần khiết',
    palette: pal('#7fd4ff', '#2b8fd6', '#bfeeff', '#ffe08a'),
    levels: [
      { name: 'Linh Hồn Nước', desc: 'Nhỏ bé nhưng đầy năng lượng!', artifact: 'Sức mạnh cơ bản' },
      { name: 'Kiếm Nước', desc: 'Vững vàng hơn, sẵn sàng chiến đấu!', artifact: 'Kiếm nước' },
      { name: 'Pháp Trượng Nước', desc: 'Tri thức và sức mạnh hòa quyện!', artifact: 'Pháp trượng' },
      { name: 'Chiến Binh Nước', desc: 'Bứt phá giới hạn, chinh phục thử thách!', artifact: 'Kiếm & Khiên Nước' },
      { name: 'Thần Nước', desc: 'Lan tỏa hy vọng, kiến tạo tương lai!', artifact: 'Thần khí Nước' },
    ],
  },
  {
    key: 'era2',
    title: 'Kỷ nguyên Phép thuật',
    subtitle: 'Trượng phép, sách ma pháp — sức mạnh của tri thức',
    palette: pal('#8cc8ff', '#2f5fc0', '#cfe4ff', '#a7f0ff'),
    levels: [
      { name: 'Tập Sự Pháp Sư', desc: 'Bắt đầu hành trình làm chủ sức mạnh nước!', artifact: 'Cây trượng nước cơ bản' },
      { name: 'Pháp Sư Học Việc', desc: 'Làm chủ những phép thuật cơ bản!', artifact: 'Trượng phép cấp 1 + Sách ma pháp' },
      { name: 'Pháp Sư Tinh Anh', desc: 'Kết nối với dòng chảy ma thuật cổ xưa!', artifact: 'Trượng phép cấp 2 + Sách ma thuật' },
      { name: 'Pháp Sư Đại Tài', desc: 'Điều khiển nguyên tố nước, áp đảo mọi thử thách!', artifact: 'Trượng phép cấp 3 + Quyển sách tri thức' },
      { name: 'Đại Pháp Sư', desc: 'Sức mạnh nước vô tận, kiến tạo thế giới tốt đẹp hơn!', artifact: 'Trượng Huyền Thoại + Sách Cổ Đại' },
    ],
  },
  {
    key: 'era3',
    title: 'Kỷ nguyên Thần thánh',
    subtitle: 'Chưa có bộ ảnh — tạm dùng hình kỷ nguyên 1',
    palette: pal('#bfeaff', '#4aa3e8', '#e9f9ff', '#ffd36e'),
    levels: [
      { name: 'Khởi Nguyên', desc: 'Nhỏ bé nhưng đầy năng lượng!', artifact: 'Sức mạnh cơ bản' },
      { name: 'Hồi Sinh', desc: 'Thêm sức mạnh, lan toả năng lượng!', artifact: 'Năng lượng nước' },
      { name: 'Toả Sáng', desc: 'Kết nối năng lượng, lan toả giá trị!', artifact: 'Vòng năng lượng' },
      { name: 'Thức Tỉnh', desc: 'Bản lĩnh lớn hơn, lan xa hơn!', artifact: 'Hào quang' },
      { name: 'Thần Thánh', desc: 'Vượt giới hạn, kiến tạo tương lai!', artifact: 'Thần khí tối thượng' },
    ],
  },
];

/** 15 cấp, mỗi phần tử giữ shape cũ (name/palette/scale/…) để các trang khác không phải sửa. */
export const TIERS = ERA_INFO.flatMap((era, eraIndex) =>
  era.levels.map((lv, step) => ({
    level: eraIndex * LEVELS_PER_ERA + step + 1,
    eraIndex: eraIndex + 1,
    eraKey: era.key,
    eraTitle: era.title,
    step: step + 1,
    name: lv.name,
    desc: lv.desc,
    artifact: lv.artifact,
    palette: era.palette,
    scale: 0.9 + 0.035 * (eraIndex * LEVELS_PER_ERA + step),
    accessories: [],
  })),
);

export const ERA_STEPS = ERA_INFO.map((era, i) => ({
  era: i + 1,
  key: era.key,
  title: era.title,
  subtitle: era.subtitle,
  startLevel: i * LEVELS_PER_ERA + 1,
  endLevel: (i + 1) * LEVELS_PER_ERA,
  // tổng ngày của cả kỷ nguyên = tổng các cấp bên trong
  days: POW5.reduce((s, v) => s + v * ERA_FACTOR[i], 0),
}));

/** Danh sách 15 cấp cho lưới chọn cấp. */
export const TIER_STEPS = TIERS.map((t) => ({
  tier: t.eraIndex,
  level: t.level,
  name: t.name,
  step: t.step,
}));

export const tierOf = (level) => TIERS[Math.max(0, Math.min(TIERS.length - 1, Math.round(level) - 1))];

export const eraOf = (level) => ERA_INFO[tierFromLevel(level) - 1];
