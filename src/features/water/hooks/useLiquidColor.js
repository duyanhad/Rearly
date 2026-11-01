import { useEffect, useState } from 'react';
import { makeCutout, makePreCut } from '../../../utils/cutout';

export const DEFAULT_LIQUID = '#38bdf8';

/**
 * Màu nước nhận diện từ chính ảnh cốc (cache trong cutout nên gọi nhiều nơi vẫn rẻ).
 * `preCut = true` khi server đã tách nền sẵn → chỉ đọc màu từ PNG đó, không chạy model AI.
 * Không có ảnh (ly thuỷ tinh) thì dùng màu mặc định.
 */
export function useLiquidColor(textureUrl, preCut = false) {
  const [color, setColor] = useState(DEFAULT_LIQUID);

  useEffect(() => {
    if (!textureUrl) {
      setColor(DEFAULT_LIQUID);
      return;
    }
    let alive = true;
    const job = preCut ? makePreCut(textureUrl) : makeCutout(textureUrl, { symmetry: true, singleObject: true });
    job
      .then((cut) => {
        if (alive && cut?.liquidColor) setColor(cut.liquidColor);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [textureUrl, preCut]);

  return color;
}

export default useLiquidColor;
