const PREFIX = 'drinkwater.lastAction';

/** Lưu hành động gần nhất để lần sau mở lại trang còn phát lại hiệu ứng. */
export function saveLastAction(scope, type, ml) {
  try {
    localStorage.setItem(`${PREFIX}.${scope}`, JSON.stringify({ type, ml, at: Date.now() }));
  } catch {
    // chế độ riêng tư / hết dung lượng: bỏ qua, chỉ mất hiệu ứng nhắc lại
  }
}

/** Đọc hành động gần nhất; chỉ dùng trong cùng ngày, không có thì trả null. */
export function readLastAction(scope) {
  try {
    const raw = localStorage.getItem(`${PREFIX}.${scope}`);
    if (!raw) return null;
    const action = JSON.parse(raw);
    if (action?.type !== 'pour' && action?.type !== 'spill') return null;
    if (!(action.ml > 0)) return null;
    if (new Date(action.at).toDateString() !== new Date().toDateString()) return null;
    return action;
  } catch {
    return null;
  }
}
