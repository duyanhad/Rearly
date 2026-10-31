import { useState } from 'react';
import { BellRing, Send, X } from 'lucide-react';

// Chọn nhắc nhu cầu nào (kèm lời nhắn) — dùng chung cho chat và trang Bạn/Partner.
const KINDS = [
  { id: 'water', label: 'Nước', emoji: '💧' },
  { id: 'meal', label: 'Bữa ăn', emoji: '🍚' },
  { id: 'medicine', label: 'Thuốc', emoji: '💊' },
  { id: 'study', label: 'Học tập', emoji: '📚' },
  { id: 'sleep', label: 'Giấc ngủ', emoji: '😴' },
  { id: 'weight', label: 'Cân nặng', emoji: '⚖️' },
];

export function NudgeSheet({ name, onClose, onSend, sending }) {
  const [kind, setKind] = useState('water');
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-water-50 text-water-700">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Nhắc {name ?? 'bạn ấy'}</h2>
            <p className="text-[11px] text-slate-500">Chọn nhắc điều gì và thêm lời nhắn (không bắt buộc)</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-xl border px-1 py-2 text-center transition ${
                  active ? 'border-water-500 bg-water-50 ring-1 ring-water-200' : 'border-slate-200 hover:border-water-300'
                }`}
              >
                <span className="block text-base leading-none">{k.emoji}</span>
                <span className="mt-1 block text-[11px] font-semibold text-slate-700">{k.label}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-2 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lời nhắn</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            placeholder="Ví dụ: nhớ uống 2 cốc trước 10h nhé"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 focus:border-water-400 focus:bg-white focus:outline-none"
          />
        </label>

        <button
          onClick={() => onSend?.({ kind, message: message.trim() })}
          disabled={sending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-water-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-water-700 disabled:opacity-60"
        >
          <Send className="size-4" /> {sending ? 'Đang gửi…' : 'Gửi nhắc nhở'}
        </button>
      </div>
    </div>
  );
}

export default NudgeSheet;
