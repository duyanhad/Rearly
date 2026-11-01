const MAX_SIDE = 1280;
const PALETTE_TOLERANCE = 95; // tổng chênh lệch RGB so với màu nền mẫu còn coi là "nền"
const SOFT_TOLERANCE = 30; // dưới ngưỡng này coi là nền hoàn toàn (viền mượt)
const AI_TIMEOUT_MS = 150_000;

/** Cạnh dài tối đa đưa vào model AI — lớn hơn sẽ ngốn RAM và làm Safari iOS crash tab. */
const AI_MAX_SIDE = 640;

function loadImage(url, retried = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Cache trình duyệt có thể giữ bản lỗi cũ → phá cache thử lại một lần.
      if (!retried && /^https?:/i.test(url)) {
        loadImage(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, true).then(resolve, reject);
        return;
      }
      reject(new Error('Không tải được ảnh cốc'));
    };
    img.src = url;
  });
}

const FALLBACK_LIQUID = '#38bdf8';

/**
 * Màu nền mẫu: gom mẫu ở vòng viền rồi chạy k-means (k=14) → mọi sắc thái của nền
 * (lá, hoa, tường, đồ vật) đều có đại diện, không bị lọc mất như cách đếm tần suất.
 */
function buildBorderPalette(px, w, h) {
  const ring = Math.max(1, Math.round(Math.min(w, h) * 0.02));
  const samples = [];
  const step = Math.max(1, Math.floor((w + h) / 900));
  for (let k = 0; k < ring; k++) {
    for (let x = 0; x < w; x += step) {
      samples.push(x, k, x, h - 1 - k);
    }
    for (let y = 0; y < h; y += step) {
      samples.push(k, y, w - 1 - k, y);
    }
  }

  const points = [];
  for (let s = 0; s < samples.length; s += 2) {
    const i = (samples[s + 1] * w + samples[s]) * 4;
    points.push([px[i], px[i + 1], px[i + 2]]);
  }
  if (points.length === 0) return [[255, 255, 255]];

  // Khởi tạo tâm cụm rải đều theo danh sách mẫu rồi lặp vài vòng k-means.
  const k = Math.min(14, points.length);
  let centers = [];
  for (let c = 0; c < k; c++) centers.push(points[Math.floor((c * points.length) / k)].slice());
  for (let iter = 0; iter < 6; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const [r, g, b] of points) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = (r - centers[c][0]) ** 2 + (g - centers[c][1]) ** 2 + (b - centers[c][2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const acc = sum[best];
      acc[0] += r;
      acc[1] += g;
      acc[2] += b;
      acc[3]++;
    }
    centers = centers.map((c, idx) =>
      sum[idx][3] ? [sum[idx][0] / sum[idx][3], sum[idx][1] / sum[idx][3], sum[idx][2] / sum[idx][3]] : c,
    );
  }
  return centers;
}

/** Bảng tra nhanh: khoảng cách (tổng 3 kênh) từ màu 5-bit tới màu nền gần nhất. */
function buildPaletteLut(palette) {
  const lut = new Uint8Array(32 * 32 * 32);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const R = (r << 3) + 4;
        const G = (g << 3) + 4;
        const B = (b << 3) + 4;
        let best = 765;
        for (const [pr, pg, pb] of palette) {
          const d = Math.abs(R - pr) + Math.abs(G - pg) + Math.abs(B - pb);
          if (d < best) best = d;
        }
        lut[(r << 10) | (g << 5) | b] = Math.min(255, best);
      }
    }
  }
  return lut;
}

/** Khoảng cách tới màu nền gần nhất cho từng pixel (dùng LUT 5-bit). */
function makeBgDist(px, lut) {
  return (p) =>
    lut[((px[p * 4] >> 3) << 10) | ((px[p * 4 + 1] >> 3) << 5) | (px[p * 4 + 2] >> 3)];
}

/**
 * Flood-fill từ viền: pixel nối liền với viền và gần một màu nền mẫu thì thành trong suốt,
 * mép mờ dần theo khoảng cách màu. Trả về số pixel đã xoá.
 */
function segmentBackground(px, w, h, lut, tolerance) {
  const distOf = makeBgDist(px, lut);
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (p) => {
    if (seen[p]) return;
    seen[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }

  let cleared = 0;
  while (head < tail) {
    const p = queue[head++];
    const i = p * 4;
    const d = distOf(p);
    if (d > tolerance) continue;

    const t = (d - SOFT_TOLERANCE) / (tolerance - SOFT_TOLERANCE);
    const alpha = t <= 0 ? 0 : Math.min(255, Math.round(t * 255));
    px[i + 3] = Math.min(px[i + 3], alpha);
    cleared++;
    if (alpha > 40) continue; // vùng đã đục dần thì không lan tiếp

    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }

  // Lượt 2: loang tiếp vào các mảng nền còn sót mà màu gần pixel nền bên cạnh
  // (vân lá, vệt mờ…). Vẫn chặn bằng khoảng cách tới màu nền mẫu nên không ăn vào cốc.
  const grown = new Uint8Array(w * h);
  let lh = 0;
  let lt = 0;
  const grow = new Int32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (px[p * 4 + 3] <= 40) {
      grown[p] = 1;
      grow[lt++] = p;
    }
  }
  while (lh < lt) {
    const p = grow[lh++];
    const i = p * 4;
    const x = p % w;
    const y = (p - x) / w;
    const trySpread = (q) => {
      if (grown[q]) return;
      const j = q * 4;
      const local = Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]);
      if (local > 48) return;
      if (distOf(q) > tolerance * 1.4) return;
      px[j + 3] = 0;
      grown[q] = 1;
      grow[lt++] = q;
      cleared++;
    };
    if (x > 0) trySpread(p - 1);
    if (x < w - 1) trySpread(p + 1);
    if (y > 0) trySpread(p - w);
    if (y < h - 1) trySpread(p + w);
  }

  return cleared;
}

/**
 * Dọn nền còn sót dính mép silhouette (đốm bokeh trắng, nhánh lá): chỉ xoá pixel đục
 * nằm sát vùng trong suốt VÀ giống màu nền (hoặc quá sáng, gần như không màu).
 */
function trimBackgroundBleed(px, w, h, lut, tolerance) {
  const isBg = (p) => {
    const i = p * 4;
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const light = (max + min) / 510;
    if (sat < 0.14 && light > 0.72) return true;
    const d = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
    return d <= tolerance * 0.55;
  };

  for (let pass = 0; pass < 10; pass++) {
    const clear = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (px[p * 4 + 3] <= 40) continue;
        const nearEmpty =
          px[(p - 1) * 4 + 3] <= 40 ||
          px[(p + 1) * 4 + 3] <= 40 ||
          px[(p - w) * 4 + 3] <= 40 ||
          px[(p + w) * 4 + 3] <= 40;
        if (!nearEmpty) continue;
        if (isBg(p)) clear.push(p);
      }
    }
    if (clear.length === 0) return;
    for (const p of clear) px[p * 4 + 3] = 0;
  }
}

/**
 * Lấp lại các mảng bị xoá oan nằm BÊN TRONG cốc (lỗ hổng, phụ kiện, dây ruy-băng…):
 * mảng trong suốt không chạm viền ảnh và đủ nhỏ thì khôi phục nguyên pixel gốc.
 */
function restoreEnclosedHoles(px, alphaBackup, w, h, lut, tolerance) {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const limit = Math.max(600, Math.round(w * h * 0.015));
  const bgDist = makeBgDist(px, lut);

  for (let start = 0; start < w * h; start++) {
    if (seen[start] || px[start * 4 + 3] > 40) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    const pixels = [];
    let touchesBorder = false;
    while (head < tail) {
      const p = queue[head++];
      pixels.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || seen[q] || px[q * 4 + 3] > 40) continue;
        seen[q] = 1;
        queue[tail++] = q;
      }
    }
    if (touchesBorder) continue;
    if (pixels.length > limit) continue;
    // Mảng có màu giống nền ⇒ đúng là nền bị cốc bao quanh: để trong suốt.
    // Mảng khác màu nền ⇒ phần cốc/phụ kiện bị xoá oan: khôi phục pixel gốc.
    let dist = 0;
    for (const p of pixels) dist += bgDist(p);
    if (dist / pixels.length < tolerance * 0.8) continue;
    for (const p of pixels) px[p * 4 + 3] = alphaBackup[p];
  }
}

/**
 * Vá các vết lõm nhỏ ở mép silhouette (nền bị xoá lấn vào cốc): pixel trong suốt mà
 * có ≥ 2 hàng xóm đục thì trả lại pixel gốc → mép liền mạch, không bị "gặm".
 */
function closeNicks(px, alphaBackup, w, h) {
  for (let pass = 0; pass < 2; pass++) {
    const fix = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (px[p * 4 + 3] > 40) continue;
        let opaque = 0;
        if (px[(p - 1) * 4 + 3] > 120) opaque++;
        if (px[(p + 1) * 4 + 3] > 120) opaque++;
        if (px[(p - w) * 4 + 3] > 120) opaque++;
        if (px[(p + w) * 4 + 3] > 120) opaque++;
        if (opaque >= 2) fix.push(p);
      }
    }
    if (fix.length === 0) return;
    for (const p of fix) px[p * 4 + 3] = alphaBackup[p];
  }
}

/**
 * Vá lỗ nhỏ nằm trong silhouette (model AI đôi khi khoét lỗ ở logo/phản chiếu):
 * mảng trong suốt không chạm viền và rất nhỏ → đục lại bằng màu gốc.
 */
function fillSmallHoles(px, w, h) {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const limit = Math.max(200, Math.round(w * h * 0.002));

  for (let start = 0; start < w * h; start++) {
    if (seen[start] || px[start * 4 + 3] > 40) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    const pixels = [];
    let touchesBorder = false;
    while (head < tail) {
      const p = queue[head++];
      pixels.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || seen[q] || px[q * 4 + 3] > 40) continue;
        seen[q] = 1;
        queue[tail++] = q;
      }
    }
    if (touchesBorder || pixels.length > limit) continue;
    for (const p of pixels) px[p * 4 + 3] = 255;
  }
}

/**
 * Giữ vật thể chính + phụ kiện đi kèm; loại nền lọt lại và mảng dính viền ảnh.
 * Quy tắc: bỏ khối chạm viền ảnh nhiều (lá cây, tường, nền), rồi giữ khối lớn nhất
 * cùng các khối đủ lớn (phụ kiện rời như nắp, ống hút, móc).
 */
function keepLargeBlobs(px, w, h, minRatio = 0.25) {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const blobs = [];

  for (let start = 0; start < w * h; start++) {
    if (seen[start] || px[start * 4 + 3] <= 24) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    let count = 0;
    let edge = 0;
    while (head < tail) {
      const p = queue[head++];
      count++;
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || seen[q] || px[q * 4 + 3] <= 24) continue;
        seen[q] = 1;
        queue[tail++] = q;
      }
    }
    blobs.push({ start, count, edge });
  }
  if (blobs.length === 0) return;

  const largest = Math.max(...blobs.map((b) => b.count));
  const minArea = Math.max(120, largest * minRatio);
  const keep = new Uint8Array(w * h);
  for (const blob of blobs) {
    if (blob.count < minArea) continue;
    // Mảng vừa lớn vừa bám viền ảnh = nền (lá cây, tường) chứ không phải vật thể.
    if (blob.edge > blob.count * 0.35) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = blob.start;
    keep[blob.start] = 1;
    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      const y = (p - x) / w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || keep[q] || px[q * 4 + 3] <= 24) continue;
        keep[q] = 1;
        queue[tail++] = q;
      }
    }
  }
  // Không còn khối nào hợp lệ (vật chiếm gần hết khung) → giữ nguyên, đừng xoá sạch.
  let kept = 0;
  for (let p = 0; p < w * h; p++) if (keep[p]) kept++;
  if (kept < largest * 0.5) return;

  for (let p = 0; p < w * h; p++) {
    if (!keep[p]) px[p * 4 + 3] = 0;
  }
}

/**
 * Dọn mask sau khi tách nền:
 * 1. Ép alpha về 0/255 (bỏ quầng mờ lửng lơ — nguồn chính của "nhiễu" quanh vật).
 * 2. Phép "mở" hình thái (xói 2 → phình 2): sợi/vệt nền mảnh biến mất, khối dày và
 *    phụ kiện (dây, quai, lá) vẫn còn — khác cách cắt theo hàng trước đây hay ăn mất phụ kiện.
 * 3. Làm mượt mép 1px để không bị răng cưa.
 */
function cleanMask(px, w, h) {
  const n = w * h;
  const solid = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const a = px[p * 4 + 3];
    px[p * 4 + 3] = a <= 70 ? 0 : a >= 190 ? 255 : Math.round(((a - 70) * 255) / 120);
    solid[p] = px[p * 4 + 3] > 127 ? 1 : 0;
  }

  const opened = maskMorph(maskMorph(solid, w, h, 2, false), w, h, 2, true);
  const bin = new Uint8Array(n);
  for (let p = 0; p < n; p++) bin[p] = opened[p] ? 255 : 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!opened[p]) {
        px[p * 4 + 3] = 0;
        continue;
      }
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += bin[yy * w + xx];
          count++;
        }
      }
      px[p * 4 + 3] = Math.round(sum / count);
    }
  }
}

/** Xói (grow=false) hoặc phình (grow=true) mask nhị phân, lặp `iterations` lần. */
function maskMorph(src, w, h, iterations, grow) {
  let cur = src;
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const left = x > 0 ? cur[p - 1] : 0;
        const right = x < w - 1 ? cur[p + 1] : 0;
        const up = y > 0 ? cur[p - w] : 0;
        const down = y < h - 1 ? cur[p + w] : 0;
        next[p] = grow
          ? (cur[p] || left || right || up || down ? 1 : 0)
          : cur[p] && left && right && up && down ? 1 : 0;
      }
    }
    cur = next;
  }
  return cur;
}

/**
 * Tự tìm chỗ nước sẽ tràn ra: dò từ trên xuống, lấy hàng đầu tiên đủ rộng (đã qua phần
 * nắp/cổ chai) rồi lấy mép phải của hàng đó → dùng cho mọi loại chai/cốc.
 * Trả về toạ độ chuẩn hoá 0..1 theo khung ảnh.
 */
function detectPourPoint(ctx, w, h) {
  const fallback = { x: 0.82, y: 0.14 };
  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return fallback;
  }
  const step = Math.max(1, Math.round(Math.max(w, h) / 220));
  const rows = [];
  let maxWidth = 0;
  for (let y = 0; y < h; y += step) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (left < 0) left = x;
        right = x;
      }
    }
    const width = left < 0 ? 0 : right - left;
    rows.push({ y, left, right, width });
    if (width > maxWidth) maxWidth = width;
  }
  if (maxWidth <= 0) return fallback;
  // Hàng đầu tiên rộng >= 55% bề ngang lớn nhất = vai/thân (bỏ qua nắp, cổ chai).
  const target = maxWidth * 0.55;
  const wide = rows.find((r) => r.width >= target && r.y > h * 0.02);
  if (!wide) return fallback;
  const y = Math.min(Math.max(wide.y, h * 0.04), h * 0.45);
  // Mép phải tại hàng đó, thụt vào 2% để dòng nước bám vào thành chứ không lơ lửng.
  return { x: Math.min(0.98, Math.max(0.5, (wide.right - w * 0.02) / w)), y: y / h };
}

/**
 * Nhận diện màu nước từ chính ảnh cốc: lấy vùng nửa dưới (nơi có nước),
 * bỏ pixel gần như trắng/xám/đen, rồi trung bình có trọng số theo độ bão hoà.
 */
function detectLiquidColor(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  let r2 = 0;
  let g2 = 0;
  let b2 = 0;
  let n2 = 0;

  for (let y = Math.floor(h * 0.35); y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue;
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      const sat = max === 0 ? 0 : (max - min) / max;
      const light = (max + min) / 510;
      r2 += pr;
      g2 += pg;
      b2 += pb;
      n2++;
      // Bỏ màu gần trắng/xám và màu quá tối (bóng, viền ly).
      if (sat < 0.17 || light > 0.92 || light < 0.08) continue;
      const wgt = sat * sat;
      r += pr * wgt;
      g += pg * wgt;
      b += pb * wgt;
      weight += wgt;
    }
  }

  const toHex = (rr, gg, bb) =>
    `#${[rr, gg, bb]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')}`;

  if (weight > 25) return toHex(r / weight, g / weight, b / weight);
  if (n2 > 100) {
    const avg = toHex(r2 / n2, g2 / n2, b2 / n2);
    // Màu trung bình quá xám thì dùng mặc định cho dễ nhìn.
    const mr = Math.round(r2 / n2);
    const mg = Math.round(g2 / n2);
    const mb = Math.round(b2 / n2);
    const sat = Math.max(mr, mg, mb) === 0 ? 0 : (Math.max(mr, mg, mb) - Math.min(mr, mg, mb)) / Math.max(mr, mg, mb);
    return sat < 0.12 ? FALLBACK_LIQUID : avg;
  }
  return FALLBACK_LIQUID;
}

let aiModule = null;

/**
 * Safari/iOS thiếu `convertToBlob()` (có trên OffscreenCanvas, KHÔNG có trên <canvas> thường).
 * Thư viện AI tạo canvas rồi gọi convertToBlob → lỗi "convertToBlob is not a function" → rơi về
 * thuật toán dự phòng (ảnh bị xé). Vá cho cả hai loại canvas bằng toBlob có sẵn.
 */
function polyfillConvertToBlob() {
  const fromToBlob = function convertToBlob(options) {
    return new Promise((resolve, reject) => {
      this.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob thất bại'))),
        options?.type ?? 'image/png',
        options?.quality,
      );
    });
  };

  if (typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.convertToBlob !== 'function') {
    HTMLCanvasElement.prototype.convertToBlob = fromToBlob;
  }

  if (typeof OffscreenCanvas !== 'undefined' && typeof OffscreenCanvas.prototype.convertToBlob !== 'function') {
    OffscreenCanvas.prototype.convertToBlob = function convertToBlobOffscreen(options) {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      canvas.getContext('2d').drawImage(this, 0, 0);
      return fromToBlob.call(canvas, options);
    };
  }
}

/**
 * Tách nền bằng model AI (ISNet) chạy trong trình duyệt — chuẩn nhất với nền phức tạp.
 * Model tải từ CDN ở lần dùng đầu (được cache lại), lỗi/offline → trả false để dùng
 * thuật toán heuristic.
 */
async function applyAiMask(url, px, w, h) {
  polyfillConvertToBlob();
  if (!aiModule) {
    aiModule = await import('@imgly/background-removal');
  }
  const remove = aiModule.removeBackground ?? aiModule.default;
  if (typeof remove !== 'function') return false;

  // Ảnh gốc có thể 3000×4000 → model ONNX hết RAM (tab Safari bị crash).
  // Chạy AI trên bản thu nhỏ rồi phóng mask về kích thước đích.
  const aiSide = Math.max(w, h);
  const aiScale = aiSide > AI_MAX_SIDE ? AI_MAX_SIDE / aiSide : 1;

  let input = url;
  let inputBlob = null;
  if (!/^(blob:|data:)/.test(url)) {
    const res = await fetch(url);
    if (!res.ok) return false;
    inputBlob = await res.blob();
    input = URL.createObjectURL(inputBlob);
  }

  let smallUrl = null;
  if (aiScale < 1) {
    try {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.round(w * aiScale));
      small.height = Math.max(1, Math.round(h * aiScale));
      small.getContext('2d').drawImage(await loadImage(input), 0, 0, small.width, small.height);
      smallUrl = URL.createObjectURL(await new Promise((resolve) => small.toBlob(resolve, 'image/png')));
      input = smallUrl;
    } catch {
      // không thu nhỏ được thì chạy ảnh gốc
    }
  }

  let run;
  try {
    run = remove(input, {
      // fp16: chất lượng gần bản fp32 (giữ đúng vật + phụ kiện, bỏ tay/nền) — quint8 hay lẫn nền.
      model: 'isnet_fp16',
      output: { format: 'image/png' },
      progress: () => {},
    });
  } finally {
    if (inputBlob) setTimeout(() => URL.revokeObjectURL(url), 30_000);
    if (smallUrl) setTimeout(() => URL.revokeObjectURL(smallUrl), 60_000);
    if (!/^(blob:|data:)/.test(url)) setTimeout(() => URL.revokeObjectURL(input), 60_000);
  }

  const blob = await Promise.race([
    run,
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), AI_TIMEOUT_MS)),
  ]);
  if (!blob || !blob.size) return false;

  const url2 = URL.createObjectURL(blob);
  try {
    const masked = await loadImage(url2);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(masked, 0, 0, w, h);
    const mask = ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    for (let p = 0; p < w * h; p++) {
      const a = mask[p * 4 + 3];
      if (a < 40) transparent++;
      px[p * 4 + 3] = Math.min(px[p * 4 + 3], a);
    }
    // Model "ăn" gần hết ảnh (nhận nhầm) → bỏ, quay về heuristic.
    return transparent / (w * h) < 0.95;
  } finally {
    URL.revokeObjectURL(url2);
  }
}

/**
 * Bù phần silhouette bị thiếu (tay/phụ kiện che mất một bên) để cốc **đối xứng**:
 * lấy trục dọc của cốc, hàng nào một bên hụt hơn ~28% so với bên kia thì lấy gương
 * bên đầy để lấp vào. Chỉ lấp khi phần thiếu nhỏ (≤ 45% nửa bề rộng) để không méo hình.
 */
function completeSymmetry(px, w, h) {
  const left = new Int32Array(h).fill(-1);
  const right = new Int32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 32) {
        if (left[y] < 0) left[y] = x;
        right[y] = x;
      }
    }
  }

  const centers = [];
  for (let y = 0; y < h; y++) {
    if (left[y] < 0) continue;
    if (right[y] - left[y] < w * 0.15) continue;
    centers.push((left[y] + right[y]) / 2);
  }
  if (centers.length < 8) return;
  centers.sort((a, b) => a - b);
  const axis = centers[centers.length >> 1];

  let filled = 0;
  for (let y = 0; y < h; y++) {
    if (left[y] < 0) continue;
    const lw = axis - left[y];
    const rw = right[y] - axis;
    if (lw < 3 && rw < 3) continue;

    const fillFrom = (srcMinX, srcMaxX, toMinX, toMaxX) => {
      for (let x = toMinX; x <= toMaxX; x++) {
        const src = Math.round(2 * axis - x);
        if (src < srcMinX || src > srcMaxX) continue;
        const si = (y * w + src) * 4;
        if (px[si + 3] <= 32) continue;
        const di = (y * w + x) * 4;
        px[di] = px[si];
        px[di + 1] = px[si + 1];
        px[di + 2] = px[si + 2];
        px[di + 3] = 255;
        filled++;
      }
    };

    if (rw < lw * 0.72 && lw - rw <= lw * 0.45) {
      // Bên phải hụt → lấy gương từ bên trái.
      fillFrom(left[y], Math.round(axis), right[y] + 1, Math.round(axis + lw));
    } else if (lw < rw * 0.72 && rw - lw <= rw * 0.45) {
      // Bên trái hụt → lấy gương từ bên phải.
      fillFrom(Math.round(axis), right[y], Math.round(axis - rw), left[y] - 1);
    }
  }
  return filled;
}

/** Lấy khung bao của pixel đục, crop lại; trả canvas mới (hoặc chính nó nếu rỗng). */
function cropToAlpha(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === w && ch === h) return canvas;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

/**
 * Làm thẳng cốc: ảnh chụp tay thường nghiêng → tính trục chính của silhouette (PCA trên
 * alpha) rồi xoay lại cho trục đó thẳng đứng, sau đó crop sát viền. Chỉ xoay khi lệch ≤ 35°
 * để tránh lật ngược ảnh.
 */
function uprightCanvas(canvas, symmetry = false) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const px = ctx.getImageData(0, 0, w, h).data;

  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 32) {
        n++;
        sx += x;
        sy += y;
      }
    }
  }
  if (n < w * h * 0.02) return { canvas, rotation: 0 };

  const mx = sx / n;
  const my = sy / n;
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] <= 32) continue;
      const dx = x - mx;
      const dy = y - my;
      cxx += dx * dx;
      cyy += dy * dy;
      cxy += dx * dy;
    }
  }

  // Góc của trục chính so với trục dọc (mod π): cốc cao nên trục chính là trục dọc của cốc.
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let r = norm(0.5 * Math.atan2(2 * cxy, cxx - cyy) - Math.PI / 2);
  if (Math.abs(r) > Math.PI / 2) r = norm(r + Math.PI);
  const rotation = (r * 180) / Math.PI;
  if (Math.abs(rotation) > 35) return { canvas, rotation: 0 };

  // r đã là radian (góc lệch của trục chính so với trục dọc) → xoay ngược dấu để cốc thẳng.
  const rad = -r;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  if (!octx) return { canvas, rotation: 0 };
  octx.translate(w / 2, h / 2);
  octx.rotate(rad);
  octx.drawImage(canvas, -w / 2, -h / 2);

  // Crop lại sát silhouette sau khi xoay.
  const data = octx.getImageData(0, 0, w, h);
  const d = data.data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return { canvas, rotation: 0 };

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = document.createElement('canvas');
  cropped.width = cw;
  cropped.height = ch;
  cropped.getContext('2d').drawImage(out, minX, minY, cw, ch, 0, 0, cw, ch);

  // Bù phần bị che mất để cốc cân đối hai bên (lấy gương từ bên còn đầy).
  // Chỉ dùng cho CỐC: với vật thể khác (gấu bông, hộp thuốc…) gương theo hàng sẽ tạo
  // ra các vệt ngang lơ lửng hai bên — đó chính là "nhiễu" thấy trên ảnh.
  if (symmetry) {
    const sctx = cropped.getContext('2d');
    const sImg = sctx.getImageData(0, 0, cw, ch);
    completeSymmetry(sImg.data, cw, ch);
    sctx.putImageData(sImg, 0, 0);
  }

  return { canvas: cropToAlpha(cropped), rotation };
}

/**
 * Tách nền ảnh cốc: ưu tiên model AI (ISNet), không dùng được thì fallback thuật toán
 * tại chỗ (palette nền + flood-fill + vá lỗ + giữ phụ kiện).
 */
const cache = new Map();

/** Tách nền chạy trong trình duyệt — cần thiết khi server không có rembg (bản cloud). */
const ENABLE_CLIENT_AI = true;

/** Tách nền ảnh cốc (có cache theo URL để không xử lý lại mỗi lần render). */
export function makeCutout(url, options) {
  const symmetry = options?.symmetry === true;
  const key = symmetry ? `sym:${url}` : url;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = computeCutout(url, symmetry).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, job);
  return job;
}

/**
 * Ảnh đã được server tách nền sẵn (PNG trong suốt) → chỉ cần đo tỉ lệ và màu nước,
 * không chạy lại model trên máy.
 */
export async function makePreCut(url) {
  const hit = cache.get(`pre:${url}`);
  if (hit) return hit;
  const job = (async () => {
    const img = await loadImage(url);
    const longest = Math.max(img.width, img.height);
    const scale = longest < 700 ? 2 : Math.min(1, MAX_SIDE / longest);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas không khả dụng');
    ctx.drawImage(img, 0, 0, w, h);
    // Ảnh chụp tay hay bị nghiêng → xoay cho cốc đứng thẳng rồi mới dựng billboard.
    const { canvas: straight, rotation } = uprightCanvas(canvas, true);
    return {
      dataUrl: straight.toDataURL('image/png'),
      aspect: straight.width / Math.max(1, straight.height),
      transparentRatio: 0.5,
      usedAi: true,
      rotation,
      liquidColor: detectLiquidColor(straight.getContext('2d'), straight.width, straight.height),
      pour: detectPourPoint(straight.getContext('2d'), straight.width, straight.height),
    };
  })().catch((error) => {
    cache.delete(`pre:${url}`);
    throw error;
  });
  cache.set(`pre:${url}`, job);
  return job;
}

async function computeCutout(url, symmetry = false) {
  const img = await loadImage(url);
  const longest = Math.max(img.width, img.height);
  // Ảnh nhỏ được phóng to trước khi tách nền để mép cốc mượt hơn trên màn hình mật độ cao.
  const scale = longest < 700 ? 2 : Math.min(1, MAX_SIDE / longest);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas không khả dụng');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // ---- 1) Model AI tách nền: MẶC ĐỊNH TẮT vì rất chậm (tải ~vài chục MB + chạy WASM).
  // Server đã tách nền sẵn (rembg) nên client chỉ cần thuật toán tại chỗ cho ảnh cũ.
  const usedAi = ENABLE_CLIENT_AI
    ? await applyAiMask(url, px, w, h).catch((error) => {
        console.warn('[cutout] AI tách nền lỗi, dùng thuật toán dự phòng:', error);
        return false;
      })
    : false;

  if (usedAi) {
    // Model đã cho alpha: vá lỗ nhỏ bên trong vật, dọn quầng mờ + sợi rác, bỏ đảo rác rời rạc.
    fillSmallHoles(px, w, h);
    cleanMask(px, w, h);
    keepLargeBlobs(px, w, h, 0.03);
  } else {
    // ---- 2) Không có model (offline/chặn CDN) → thuật toán heuristic tại chỗ ----
    const palette = buildBorderPalette(px, w, h);
    const lut = buildPaletteLut(palette);
    const alphaBackup = new Uint8ClampedArray(w * h);
    for (let p = 0; p < w * h; p++) alphaBackup[p] = px[p * 4 + 3];
    let cleared = segmentBackground(px, w, h, lut, PALETTE_TOLERANCE);
    // Nền gần như cùng màu cốc → có thể "ăn" mất cốc: khôi phục rồi thử lại ngưỡng chặt hơn.
    if (cleared > w * h * 0.85) {
      for (let p = 0; p < w * h; p++) px[p * 4 + 3] = alphaBackup[p];
      cleared = segmentBackground(px, w, h, lut, PALETTE_TOLERANCE * 0.45);
    }
    // Vá phần bị xoá oan (lỗ hổng trong cốc, phụ kiện, mép bị gặm) rồi lọc đảo nền.
    restoreEnclosedHoles(px, alphaBackup, w, h, lut, PALETTE_TOLERANCE);
    closeNicks(px, alphaBackup, w, h);
    keepLargeBlobs(px, w, h);
    trimBackgroundBleed(px, w, h, lut, PALETTE_TOLERANCE);
    cleanMask(px, w, h);
  }

  // Khử quầng sáng ở mép: kéo màu pixel viền về màu của pixel đục gần nhất.
  const solid = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) solid[p] = px[p * 4 + 3] > 200 ? 1 : 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const a = px[p * 4 + 3];
      if (a === 0 || a > 200) continue;
      let r2 = 0;
      let g2 = 0;
      let b2 = 0;
      let n2 = 0;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (!solid[q]) continue;
        r2 += px[q * 4];
        g2 += px[q * 4 + 1];
        b2 += px[q * 4 + 2];
        n2++;
      }
      if (!n2) continue;
      const k = a / 255;
      px[p * 4] = Math.round((r2 / n2) * (1 - k) + px[p * 4] * k);
      px[p * 4 + 1] = Math.round((g2 / n2) * (1 - k) + px[p * 4 + 1] * k);
      px[p * 4 + 2] = Math.round((b2 / n2) * (1 - k) + px[p * 4 + 2] * k);
    }
  }

  let transparent = 0;
  for (let p = 0; p < w * h; p++) if (px[p * 4 + 3] < 40) transparent++;
  const transparentRatio = transparent / (w * h);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspect: w / h,
      transparentRatio: 0,
      liquidColor: FALLBACK_LIQUID,
      pour: { x: 0.82, y: 0.14 },
    };
  }
  ctx.putImageData(image, 0, 0);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas không khả dụng');
  octx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  sharpen(octx, cw, ch);

  // Cốc chụp nghiêng → xoay cho thẳng đứng trước khi dựng billboard.
  const { canvas: straight, rotation } = uprightCanvas(out, symmetry);
  return {
    dataUrl: straight.toDataURL('image/png'),
    aspect: straight.width / Math.max(1, straight.height),
    transparentRatio,
    usedAi,
    rotation,
    liquidColor: detectLiquidColor(straight.getContext('2d'), straight.width, straight.height),
    pour: detectPourPoint(straight.getContext('2d'), straight.width, straight.height),
  };
}

/**
 * Unsharp mask nhẹ: ảnh nguồn nhỏ (điện thoại chụp ở mức thấp, ảnh tải sẵn) khi phóng to
 * bị mờ, bù lại tần số cao để cốc trông nét hơn. Bỏ qua pixel trong suốt.
 */
function sharpen(ctx, w, h) {
  const image = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(image.data);
  const dst = image.data;
  const amount = 0.55;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] < 12) continue;
      // chỉ làm nét pixel nằm trong khối, tránh tạo quầng quanh mép tách nền
      if (src[i - 4 + 3] < 12 || src[i + 4 + 3] < 12 || src[i - w * 4 + 3] < 12 || src[i + w * 4 + 3] < 12) continue;
      for (let c = 0; c < 3; c++) {
        const blur = (src[i - 4 + c] + src[i + 4 + c] + src[i - w * 4 + c] + src[i + w * 4 + c]) * 0.25;
        dst[i + c] = src[i + c] + (src[i + c] - blur) * amount;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Tách nền một File ảnh ngay trên máy người dùng, trả về File PNG trong suốt
 * (để gửi kèm lên server khi server không chạy được rembg). Lỗi thì trả null.
 */
export async function cutoutFileFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const result = await makeCutout(url);
    if (!result || result.transparentRatio <= 0.08) return null;
    const blob = await (await fetch(result.dataUrl)).blob();
    return new File([blob], 'cutout.png', { type: 'image/png' });
  } catch {
    return null;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}
