import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { NeedWizard } from '../../habits/components/NeedWizard';

/**
 * Nút mở "Thiết lập nhanh" — hỏi từng câu một cho đúng nhu cầu rồi lưu.
 * Đặt ở mọi trang cài đặt nhu cầu để người dùng không phải tự đoán các ô chi tiết.
 */
export function QuickSetupButton({ kind, label, row }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-water-50 to-white p-4 ring-1 ring-water-100">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-water-600 text-white">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Chưa biết cấu hình {label}?</p>
          <p className="text-xs text-slate-500">Trả lời vài câu hỏi, app tự đặt giờ và mục tiêu giúp bạn.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl bg-water-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-water-700"
        >
          Thiết lập nhanh
        </button>
      </section>

      {open && <NeedWizard kind={kind} row={row} onClose={() => setOpen(false)} />}
    </>
  );
}

export default QuickSetupButton;
