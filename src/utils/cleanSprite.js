/**
 * Làm sạch ảnh linh vật trước khi tải lên (chạy ngay trên máy admin):
 *  - cắt sát nhân vật (bỏ viền trắng thừa),
 *  - xoá nền gần-trắng nối với mép ảnh → trong suốt,
 *  - bỏ dải nhãn/chữ ở đáy (badge "CẤP x", tên cấp, mô tả),
 *  - bỏ badge "CẤP 1"/"LV.3" kể cả khi nó dính vào hiệu ứng.
 * Không cần server xử lý ảnh, không thêm thư viện.
 */

const MAX_SIDE = 512;
const WHITE_S = 34; // độ bão hoà tối đa để coi là "trắng"
const WHITE_V = 228; // độ sáng tối thiểu

function loadBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

function toCanvas(img) {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { ctx, w, h };
}

/** Xoá nền trắng nối với mép bằng loang (flood fill) theo ngăn xếp. */
function removeWhiteBackground(data, w, h) {
  const isWhite = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : ((max - min) / max) * 255;
    return sat < WHITE_S && max > WHITE_V;
  };

  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    seen[p] = 1;
    if (!isWhite(p * 4)) return;
    stack.push(p);
  };

  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    data[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // lấp lỗ kín nhỏ bên trong thân (highlight trắng) — chỉ lỗ nhỏ để không phá chi tiết
  fillHoles(data, w, h, 0.01);
}

/** Lấp các vùng trong suốt bị bao kín (nhỏ hơn maxFrac diện tích ảnh) thành đục. */
function fillHoles(data, w, h, maxFrac) {
  const solid = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) solid[p] = data[p * 4 + 3] > 90 ? 1 : 0;

  const visited = new Uint8Array(w * h);
  const holes = [];
  for (let start = 0; start < w * h; start += 1) {
    if (solid[start] || visited[start]) continue;
    const group = [];
    const queue = [start];
    visited[start] = 1;
    let touchesEdge = false;
    while (queue.length) {
      const p = queue.pop();
      group.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true;
      const next = [p + 1, p - 1, p + w, p - w];
      for (const q of next) {
        if (q < 0 || q >= w * h || visited[q] || solid[q]) continue;
        visited[q] = 1;
        queue.push(q);
      }
    }
    if (!touchesEdge && group.length <= w * h * maxFrac) holes.push(...group);
  }
  for (const p of holes) data[p * 4 + 3] = 255;
}

/**
 * Xoá sâu quầng/sương trắng còn sót: loang từ mép ảnh vào, chỉ dừng ở nét viền đậm
 * (viền nhân vật). Phần "ngoài nhân vật" mà gần-trắng thì bỏ hẳn (alpha 0),
 * phần hơi trắng thì giảm dần — nên mảng trắng dính sau lưng linh vật biến mất
 * mà không đục lỗ highlight bên trong thân.
 */
function removeWhiteHaze(data, w, h) {
  const solid = new Uint8Array(w * h);
  const outline = new Uint8Array(w * h);
  const nearWhite = new Uint8Array(w * h);
  const weight = new Float32Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    const a = data[i + 3];
    if (a <= 40) continue;
    solid[p] = 1;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    const sat = mx - mn;
    if (sat > 60 || mx < 185) outline[p] = 1;
    if (mn > 200 && sat < 55) nearWhite[p] = 1;
    weight[p] =
      Math.min(1, Math.max(0, (mn - 185) / 40)) * Math.min(1, Math.max(0, (70 - sat) / 70));
  }

  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let p = 0; p < w * h; p += 1) {
    if (!solid[p] || outline[p]) continue;
    const x = p % w;
    const y = (p - x) / w;
    let touch = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    if (!touch) {
      for (let dy = -1; dy <= 1 && !touch; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!solid[(y + dy) * w + (x + dx)]) {
            touch = true;
            break;
          }
        }
      }
    }
    if (touch) {
      outside[p] = 1;
      stack.push(p);
    }
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const next = [p - 1, p + 1, p - w, p + w];
    for (let k = 0; k < 4; k += 1) {
      const q = next[k];
      if (q < 0 || q >= w * h) continue;
      if (k < 2 && Math.abs((q % w) - x) !== 1) continue; // chặn tràn dòng
      if (!solid[q] || outline[q] || outside[q]) continue;
      // chỉ loang tiếp nếu đang ở vùng sáng (tránh lan vào thân qua khe hở)
      if (nearWhite[q] || weight[q] > 0.25) {
        outside[q] = 1;
        stack.push(q);
      }
    }
  }

  for (let p = 0; p < w * h; p += 1) {
    if (!outside[p]) continue;
    const i = p * 4;
    if (nearWhite[p]) data[i + 3] = 0;
    else data[i + 3] = Math.round(data[i + 3] * (1 - 0.85 * weight[p]));
  }
}

/** Tổng diện tích tiền tố (integral image) để lọc hình thái nhanh. */
function buildIntegral(mask, w, h) {
  const W = w + 1;
  const integ = new Int32Array(W * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < w; x += 1) {
      rowSum += mask[y * w + x];
      integ[(y + 1) * W + (x + 1)] = integ[y * W + (x + 1)] + rowSum;
    }
  }
  return integ;
}

function boxSum(integ, w, x0, y0, bw, bh) {
  const W = w + 1;
  const x1 = x0 + bw;
  const y1 = y0 + bh;
  return integ[y1 * W + x1] - integ[y0 * W + x1] - integ[y1 * W + x0] + integ[y0 * W + x0];
}

/** Giãn (dilate) hoặc co (erode) nhị phân với phần tử cấu trúc chữ nhật. */
function morph(mask, w, h, kw, kh, mode) {
  const integ = buildIntegral(mask, w, h);
  const out = new Uint8Array(w * h);
  const rx = (kw - 1) >> 1;
  const ry = (kh - 1) >> 1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const x0 = Math.max(0, x - rx);
      const y0 = Math.max(0, y - ry);
      const x1 = Math.min(w, x - rx + kw);
      const y1 = Math.min(h, y - ry + kh);
      const count = boxSum(integ, w, x0, y0, x1 - x0, y1 - y0);
      out[y * w + x] =
        mode === 'dilate' ? (count > 0 ? 1 : 0) : count === (x1 - x0) * (y1 - y0) ? 1 : 0;
    }
  }
  return out;
}

/** Các thành phần liên thông 8 hướng, trả về hộp bao + diện tích. */
function components(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  const out = [];
  for (let s = 0; s < w * h; s += 1) {
    if (!mask[s] || seen[s]) continue;
    seen[s] = 1;
    stack.push(s);
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    let area = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      area += 1;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (seen[q] || !mask[q]) continue;
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    out.push({ x0, y0, x1, y1, area });
  }
  return out;
}

/**
 * Bỏ badge "CẤP 1" / "LV.3" ở đáy — khối bo tròn đặc, dẹt, nằm thấp.
 * Hai cách dò bù nhau: khối đặc dày (co 9×9 vẫn sống) và viền tối màu nối ngang
 * (giãn 21×3 để lấp chữ trắng bên trong), nhờ đó badge dính vào hiệu ứng vẫn bị bắt.
 */
function removeBadgePills(data, w, h) {
  const solid = new Uint8Array(w * h);
  const dark = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    const a = data[i + 3];
    if (a > 90) solid[p] = 1;
    if (a > 180) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      if (max < 190 && max - Math.min(r, g, b) > 35) dark[p] = 1;
    }
  }

  const thick = morph(solid, w, h, 9, 9, 'erode');
  const darkBar = morph(morph(dark, w, h, 21, 3, 'dilate'), w, h, 21, 3, 'erode');

  const boxes = [];
  for (const [mask, minW] of [
    [thick, 0.1],
    [darkBar, 0.12],
  ]) {
    for (const c of components(mask, w, h)) {
      const bw = c.x1 - c.x0 + 1;
      const bh = c.y1 - c.y0 + 1;
      if (c.y0 < h * 0.55) continue;
      if (bw < w * minW) continue;
      if (bh > h * 0.13) continue;
      if (bw / bh < 1.5) continue;
      boxes.push(c);
    }
  }

  const pad = 4;
  for (const b of boxes) {
    const x0 = Math.max(0, b.x0 - pad);
    const y0 = Math.max(0, b.y0 - pad);
    const x1 = Math.min(w - 1, b.x1 + pad);
    const y1 = Math.min(h - 1, b.y1 + pad);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) data[(y * w + x) * 4 + 3] = 0;
    }
  }
}

/**
 * Bỏ khối nhãn/chữ nằm tách rời dưới nhân vật.
 * Lặp: tìm dải trống (>= 3 dòng) thấp nhất, nếu phần phía dưới chỉ chiếm <= 45% pixel đục
 * thì cắt bỏ và lặp lại — nhờ vậy nhãn "CẤP x" + tên + mô tả bị bỏ hết, còn chân/tà áo thì không.
 */
function dropBottomLabel(data, w, h) {
  const computeRows = () => {
    const rows = new Array(h).fill(0);
    for (let y = 0; y < h; y += 1) {
      let n = 0;
      for (let x = 0; x < w; x += 1) if (data[(y * w + x) * 4 + 3] > 90) n += 1;
      rows[y] = n;
    }
    return rows;
  };

  for (let pass = 0; pass < 6; pass += 1) {
    const rows = computeRows(); // phải tính lại sau mỗi lần cắt
    const totalOf = (from, to) => {
      let sum = 0;
      for (let y = from; y < to; y += 1) sum += rows[y];
      return sum;
    };
    const total = totalOf(0, h);
    if (total === 0) return;

    // tìm dải trống thấp nhất mà phía dưới nó có nội dung
    let cut = -1;
    let y = h - 1;
    while (y >= 0 && rows[y] === 0) y -= 1;
    let gap = 0;
    let done = false;
    for (; y >= 0; y -= 1) {
      if (rows[y] === 0) {
        gap += 1;
        if (gap === 3) cut = y;
      } else {
        if (gap >= 3 && cut >= 0 && totalOf(cut, h) <= total * 0.45) {
          for (let yy = cut; yy < h; yy += 1) {
            for (let x = 0; x < w; x += 1) data[(yy * w + x) * 4 + 3] = 0;
          }
          done = true;
          break;
        }
        gap = 0;
        cut = -1;
      }
    }
    if (!done) return; // không còn khối rời nào đáng cắt
  }
}

/** Cắt sát vùng đục và trả về canvas vuông. */
function trimToSquare(canvas, ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > 60) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas;

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.round(Math.max(cw, ch) * 1.04);
  const out = document.createElement('canvas');
  out.width = side;
  out.height = side;
  const octx = out.getContext('2d');
  octx.drawImage(canvas, minX, minY, cw, ch, (side - cw) / 2, (side - ch) / 2, cw, ch);
  return out;
}

/**
 * @param {File} file ảnh admin chọn
 * @returns {Promise<File>} PNG đã tách nền, cắt sát, bỏ nhãn đáy
 */
export async function cleanSpriteFile(file) {
  const img = await loadBitmap(file);
  const { ctx, w, h } = toCanvas(img);
  const imageData = ctx.getImageData(0, 0, w, h);
  removeWhiteBackground(imageData.data, w, h);
  removeBadgePills(imageData.data, w, h);
  removeWhiteHaze(imageData.data, w, h);
  fillHoles(imageData.data, w, h, 0.012);
  dropBottomLabel(imageData.data, w, h);
  ctx.putImageData(imageData, 0, 0);

  const squared = trimToSquare(ctx.canvas, ctx, w, h);
  const blob = await new Promise((resolve) => squared.toBlob(resolve, 'image/png'));
  const name = file.name.replace(/\.[^.]+$/, '') + '.png';
  return new File([blob], name, { type: 'image/png' });
}

export default cleanSpriteFile;
