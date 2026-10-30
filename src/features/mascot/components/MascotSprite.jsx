import { levelSprite } from '../levelImages';

/**
 * Linh vật dạng ảnh cho một cấp cụ thể.
 * Mặc định chạy chuyển động 3D "sống": lơ lửng + xoay phối cảnh + nghiêng người.
 * `motion`: live (mặc định) | none — tắt để chụp ảnh tĩnh.
 * `magic`: hiện vòng phép xoay phía sau (các bậc cao).
 */
export function MascotSprite({
  level,
  tier,
  src,
  evolving = false,
  motion = 'live',
  magic = false,
  className = '',
  flash = true,
}) {
  // Ảnh đã có phụ kiện vươn rộng; phóng quá tay sẽ bị khung cắt mất vương miện.
  const scale = Math.min(tier?.scale ?? 1, 1.12);
  const anim = evolving ? 'animate-mascot-evolve' : motion === 'live' ? 'mascot-3d' : '';

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {flash && evolving && (
        <span className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-white animate-mascot-flash" />
      )}
      {magic && <span className="mascot-magic" aria-hidden="true" />}
      <span className="mascot-backdrop" aria-hidden="true" />
      <span className="mascot-ground" aria-hidden="true" />
      <div
        key={level}
        className="relative z-[1] flex h-full items-center justify-center transition-transform duration-700 ease-out"
        // nhân với scale thì ảnh phóng to vẫn nằm gọn trong khung, không đè lên phần chữ bên dưới
        style={{ transform: `scale(${scale})`, height: `calc(100% / ${scale})`, maxHeight: `calc(100% / ${scale})` }}
      >
        <img
          src={src ?? levelSprite(level)}
          alt={`Linh vật cấp ${level}`}
          draggable={false}
          className={`h-full w-auto max-h-full select-none object-contain ${anim}`}
        />
      </div>
    </div>
  );
}

export default MascotSprite;
