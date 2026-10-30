import { Component } from 'react';

/**
 * Chặn "trắng màn hình": lỗi React (hoặc lỗi tải lại sau deploy) hiện thông báo + nút tải lại.
 * Trường hợp hay gặp nhất: app đang mở bản cũ, mạng đổi bản mới → tải lại là xong.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App lỗi:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#fdf7f2] p-6 text-center">
        <p className="text-lg font-bold text-[#7d2836]">Có chút trục trặc</p>
        <p className="max-w-xs text-sm text-slate-600">
          Dearly vừa gặp lỗi khi mở trang này. Bấm tải lại để tiếp tục — dữ liệu của bạn vẫn an toàn.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 rounded-xl bg-[#8e2f3c] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }
}
