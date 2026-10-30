import { mediaUrl } from '../services/apiClient';
const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl'
};
function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const last = parts[parts.length - 1];
  const first = parts[0];
  return (parts.length > 1 ? first[0] + last[0] : first.slice(0, 2)).toUpperCase();
}

/** Avatar tròn: ảnh nếu có, không thì chữ cái đầu trên nền gradient. */
export function Avatar({
  url,
  name,
  size = 'md',
  className = ''
}) {
  const src = mediaUrl(url ?? null);
  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`} />;
  }
  return <span aria-label={name} className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-water-500 to-teal-500 font-semibold text-white ring-2 ring-white ${className}`}>
      {initials(name)}
    </span>;
}