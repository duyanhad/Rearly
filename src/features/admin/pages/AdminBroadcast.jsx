import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { errorMessage } from '../../../services/apiClient';
import { adminService } from '../../../services/adminService';
import { useToast } from '../../../components/Toast';
export function AdminBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();
  const send = useMutation({
    mutationFn: async () => adminService.broadcast({ title, message }),
    onSuccess: () => {
      toast.show('Đã gửi broadcast', `${title} — ${message}`);
      setTitle('');
      setMessage('');
    },
    onError: err => setError(errorMessage(err))
  });
  return <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Broadcast</h1>
        <p className="text-sm text-slate-500">Gửi thông báo tới mọi tài khoản đang hoạt động.</p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-600">Tiêu đề</span>
          <input value={title} maxLength={100} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">Nội dung</span>
          <textarea value={message} maxLength={255} rows={4} onChange={e => setMessage(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>

        <p className="mb-3 text-xs text-slate-400">{message.length}/255 ký tự</p>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button onClick={() => {
        setError(null);
        send.mutate();
      }} disabled={send.isPending || !title.trim() || !message.trim()} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50">
          <Send className="size-4" />
          {send.isPending ? 'Đang gửi...' : 'Gửi broadcast'}
        </button>
      </section>
    </div>;
}