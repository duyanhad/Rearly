/**
 * Ngọn lửa dạng vector (viền cam đỏ + lõi vàng) dùng cho thanh nước khi vượt chỉ tiêu.
 * `animated` bật nhịp "cháy" (nhấp nháy + rung nhẹ).
 */
export function FlameIcon({ size = 18, animated = true, delay = 0, className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`${animated ? 'flame-burn' : ''} ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
      aria-hidden="true"
    >
      {/* Ngọn chính */}
      <path
        fill="#f4511e"
        d="M34.5 2.5c1 11.5 8.5 15.5 13 23.5 4.6 8.2 2.4 20.6-6.2 26.6 1.4-4.6.4-8.8-2.2-11.6-1.6 5.6-6.6 8.6-12 7.4-6.8-1.5-10.6-8.4-8.2-15.1 1.7-4.8 6.4-7.4 9.1-12.6 2.9-5.6 4.5-11.3 6.5-18.2z"
      />
      {/* Hai lưỡi lửa hai bên */}
      <path
        fill="#ef6c00"
        d="M16.8 34.6c-3.4 5-5.4 9.2-5.4 13.7 0 6.5 4.3 11.6 10.4 13.1-2.6-5-3.2-10-2.4-16.6.4-3.6 1-7.1-.1-10.5-1 .4-1.8.7-2.5.3z"
      />
      <path
        fill="#ef6c00"
        d="M51.8 37c2.4 4.2 3.4 7.8 3.4 11.6 0 5.6-3.4 10.2-8.2 12.4 1.8-4.6 2-9.4 1-14.6-.5-2.8-1.3-5.6-.4-8.4 1.7-.2 3-.4 4.2-1z"
      />
      {/* Lõi vàng */}
      <path
        fill="#fdd835"
        d="M34.5 26.5c1.8 8 6.6 11 8.3 16.4 1.6 5-1.4 10.4-6.6 11.6-5.4 1.2-10.4-2.6-10.4-8 0-4.4 3-7.2 5.6-10.8 1.7-2.6 2.5-5.6 3.1-9.2z"
      />
      {/* Vệt sáng trong lõi */}
      <path fill="#fff59d" d="M33.6 38.6c1 3.6 3 5.4 3.4 8 .3 2.2-.9 4.2-3 4.6-2.2.4-4-1.2-4-3.4 0-2 1.6-3.4 2.6-5.4.6-1.2.8-2.4 1-3.8z" />
    </svg>
  );
}

export default FlameIcon;
