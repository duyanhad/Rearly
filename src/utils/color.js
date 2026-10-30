/** Làm sáng/tối một màu hex: amount > 0 sáng lên, < 0 tối đi (đơn vị %). */
export function shade(hex, amount) {
  const h = (hex ?? '#38bdf8').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex ?? '#38bdf8';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (v) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * (amount / 100) : v * (1 + amount / 100))));
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Màu nhấn cho giao diện từ màu nước của cốc: giữ đúng tông nhưng nâng độ bão hoà và
 * kẹp độ sáng để chữ/thanh tiến độ nổi rõ (màu cốc pastel sẽ bị xám nếu dùng trực tiếp).
 */
export function accent(hex) {
  const base = shade(hex, 0);
  const num = parseInt(base.replace('#', ''), 16);
  if (Number.isNaN(num)) return '#0ea5e9';
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s2 = Math.min(0.95, Math.max(0.55, s));
  const l2 = Math.min(0.52, Math.max(0.4, l));

  const c = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

export default shade;
