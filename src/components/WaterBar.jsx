/**
 * Thanh tiến độ kiểu "nước": dải gradient, vệt sáng chạy qua, bọt nổi lên và mặt nước gợn
 * ở đầu thanh. `color` = màu nước lấy từ ảnh cốc để đồng bộ giao diện.
 */
import { accent, shade } from '../utils/color';
import { FlameIcon } from './FlameIcon';

export function WaterBar({ percent = 0, height = 'h-2', color, showFlames = true }) {
  const raw = Number(percent) || 0;
  const p = Math.max(0, Math.min(100, raw));
  const over = raw > 100;
  // Càng vượt nhiều → càng nhiều ngọn lửa tỏa ra ở cuối thanh (tối đa 4), cỡ lửa giữ nguyên.
  const flameSize = height === 'h-1.5' ? 20 : 22;
  const flames = over && showFlames ? 1 + Math.min(3, Math.floor((raw - 100) / 60)) : 0;
  // Chiều cao thanh để đặt cụm lửa ngay trên mặt thanh, không chiếm thêm chỗ.
  const barH = height === 'h-1.5' ? 6 : 8;

  return (
    <div className="relative">
      <div className={`water-track relative ${height} overflow-visible rounded-full`}>
        {/* Vượt chỉ tiêu: quầng lửa ấm phía sau thanh */}
        {over && <span className="water-ember" aria-hidden="true" />}

        <div className={`relative ${height} overflow-hidden rounded-full`}>
          <div
            className="water-fill relative h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${p}%`,
              background: color
                ? `linear-gradient(90deg, ${shade(accent(color), 30)} 0%, ${accent(color)} 45%, ${shade(accent(color), -22)} 100%)`
                : undefined,
              boxShadow: color ? `0 0 10px ${shade(accent(color), 12)}88` : undefined,
            }}
          >
            {/* Bọt nước nổi bên trong cột nước */}
            <span className="water-bar-bubble left-[18%]" />
            <span className="water-bar-bubble left-[46%]" style={{ animationDelay: '0.7s' }} />
            <span className="water-bar-bubble left-[72%]" style={{ animationDelay: '1.3s' }} />
            {/* Gợn sáng ở mặt nước (đầu phải của cột nước) */}
            {p > 3 && p < 99.5 && <span className="water-meniscus" />}
          </div>
        </div>
      </div>

      {/* Cụm lửa nằm TRÊN đầu thanh, bám đúng mép phải: vượt càng nhiều → càng nhiều ngọn tỏa ra */}
      {flames > 0 && (
        <span
          className="pointer-events-none absolute right-0 flex items-end justify-end"
          style={{ bottom: barH }}
        >
          {Array.from({ length: flames }).map((_, i) => (
            <span
              key={i}
              style={{
                transform: `rotate(${((i - (flames - 1) / 2) * 18).toFixed(1)}deg)`,
                transformOrigin: '50% 100%',
                marginLeft: i === 0 ? 0 : -7,
                marginBottom: 2,
              }}
            >
              <FlameIcon size={flameSize} delay={i * 0.16} />
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export default WaterBar;