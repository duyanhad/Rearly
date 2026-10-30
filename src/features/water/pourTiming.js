/**
 * Thời gian rót nước (giây) tỉ lệ với số ml vừa uống:
 * 250 ml ≈ 1.8s, 500 ml ≈ 2.4s, 1000 ml ≈ 3.7s (chặn trong 1.15–4s).
 */
export function pourSeconds(ml) {
  return Math.min(4, Math.max(1.15, 1.15 + Math.max(0, Number(ml) || 0) / 400));
}
