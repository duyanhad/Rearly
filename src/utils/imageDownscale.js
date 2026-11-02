/**
 * Thu nhỏ ảnh ngay trên máy trước khi upload (giữ tỉ lệ, KHÔNG phóng to).
 * Ảnh đại diện 238 KB cho một vòng tròn 40px là quá nặng → giảm còn ~20-40 KB,
 * giúp trang Bạn bè/Partner tải nhanh hơn hẳn mà mắt thường không phân biệt được.
 * Lỗi/không hỗ trợ → trả lại file gốc để không bao giờ chặn việc upload.
 */
export async function downscaleImage(file, maxSide = 512, quality = 0.85) {
  if (!file || !file.type?.startsWith('image/')) return file;
  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (!longest || longest <= maxSide) {
      closeBitmap(bitmap);
      return file;
    }

    const scale = maxSide / longest;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    closeBitmap(bitmap);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;

    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function loadBitmap(file) {
  if (window.createImageBitmap) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function closeBitmap(bitmap) {
  if (typeof bitmap?.close === 'function') bitmap.close();
}

export default downscaleImage;
