import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellRing, MessageCircle, Send, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../../services/apiClient';
import { chatService } from '../../../services/chatService';
import { socialService } from '../../../services/socialService';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';

const timeLabel = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/** Tổng số tin chưa đọc — dùng cho badge ở bong bóng chat. */
export function useChatUnread() {
  const { data: conversations = [] } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => (await chatService.conversations()).data,
    refetchInterval: 15_000,
  });
  return conversations.reduce((sum, c) => sum + c.unread, 0);
}

/**
 * Nội dung chat (danh sách hội thoại + khung hội thoại).
 * Dùng cho cả trang /chat và cửa sổ bong bóng nổi (`compact`).
 */
export function ChatPanel({ compact = false }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => (await chatService.conversations()).data,
    refetchInterval: 15_000,
  });

  const active = useMemo(
    () => conversations.find((c) => c.userId === activeId) ?? null,
    [conversations, activeId],
  );

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-thread', activeId],
    queryFn: async () => (await chatService.thread(activeId)).data,
    enabled: !!activeId,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!activeId) return;
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [activeId, messages.length]);

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    void chatService.markRead(activeId).then(() => {
      if (alive) void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    });
    return () => {
      alive = false;
    };
  }, [activeId, queryClient]);

  const send = useMutation({
    mutationFn: async (body) => chatService.send(activeId, body),
    onSuccess: () => {
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: ['chat-thread', activeId] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: (err) => toast.show('Không gửi được', errorMessage(err)),
  });

  const submit = (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || send.isPending) return;
    send.mutate(body);
  };

  // Chuông trong hội thoại: nhắc người đang chat uống nước (thông báo realtime/push như nút ở trang Bạn bè).
  const nudge = useMutation({
    mutationFn: async (userId) => socialService.nudge(userId),
    onSuccess: () => toast.show('Đã gửi nhắc nhở', `${active?.name ?? 'Bạn ấy'} sẽ nhận thông báo uống nước ngay.`),
    onError: (err) => toast.show('Không gửi được', errorMessage(err)),
  });

  // Xoá hội thoại (cả hai phía) — quyền xoá dữ liệu của người dùng.
  const removeThread = useMutation({
    mutationFn: async (userId) => chatService.deleteThread(userId),
    onSuccess: () => {
      toast.show('Đã xoá hội thoại', 'Tin nhắn giữa hai người đã được xoá.');
      setActiveId(null);
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: (err) => toast.show('Không xoá được', errorMessage(err)),
  });

  if (isLoading) return <p className="p-4 text-sm text-slate-500">Đang tải...</p>;

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
        <MessageCircle className="size-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">Chưa có ai để chat</p>
        <p className="text-xs text-slate-500">Kết bạn trước rồi quay lại nhắn tin.</p>
        <Link to="/friends" className="mt-2 rounded-xl bg-water-600 px-3 py-2 text-xs font-semibold text-white">
          Tìm bạn bè
        </Link>
      </div>
    );
  }

  const list = (
    <ul className="flex-1 space-y-1.5 overflow-y-auto p-2">
      {conversations.map((c) => (
        <li key={c.userId}>
          <button
            onClick={() => setActiveId(c.userId)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition ${
              activeId === c.userId ? 'bg-water-50 ring-1 ring-water-200' : 'hover:bg-slate-50'
            }`}
          >
            <Avatar url={c.avatarUrl} name={c.name} size="md" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-800">{c.name}</span>
                <span className="shrink-0 text-[10px] text-slate-400">{timeLabel(c.lastAt)}</span>
              </span>
              <span className={`mt-0.5 block truncate text-xs ${c.unread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                {c.lastBody ? `${c.lastFromMe ? 'Bạn: ' : ''}${c.lastBody}` : 'Bắt đầu trò chuyện'}
              </span>
            </span>
            {!!c.unread && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{c.unread}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );

  const thread = (
    <>
      <header className="flex items-center gap-2 border-b border-slate-100 px-2 py-1.5">
        <button
          onClick={() => setActiveId(null)}
          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
          aria-label="Quay lại danh sách"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Avatar url={active?.avatarUrl} name={active?.name ?? '?'} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{active?.name}</span>
        <button
          onClick={() => active && nudge.mutate(active.userId)}
          disabled={nudge.isPending}
          className="rounded-lg p-1.5 text-water-700 transition hover:bg-water-50 disabled:opacity-50"
          aria-label={`Nhắc ${active?.name ?? 'bạn ấy'} uống nước`}
          title="Nhắc uống nước"
        >
          <BellRing className="size-4" />
        </button>
        <button
          onClick={() => removeThread.mutate(active?.userId)}
          disabled={removeThread.isPending}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          aria-label="Xoá hội thoại"
          title="Xoá hội thoại"
        >
          <Trash2 className="size-4" />
        </button>
      </header>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-2.5">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Chưa có tin nhắn. Chào một câu nhé!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-3 py-1.5 text-sm shadow-sm ${
                m.mine ? 'bg-water-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-100'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[10px] ${m.mine ? 'text-water-100' : 'text-slate-400'}`}>
                {timeLabel(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-slate-100 p-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder={`Nhắn cho ${active?.name}...`}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-2.5 py-2 text-base focus:border-water-400 focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || send.isPending}
          className="rounded-xl bg-water-600 p-2 text-white transition hover:bg-water-700 disabled:opacity-50"
          aria-label="Gửi tin nhắn"
        >
          <Send className="size-4" />
        </button>
      </form>
    </>
  );

  // Cửa sổ bong bóng: chỉ hiện một trong hai (danh sách ↔ hội thoại).
  if (compact) {
    return <div className="flex h-full flex-col">{active ? thread : list}</div>;
  }

  // Trang /chat: điện thoại hiện danh sách → hội thoại; máy tính 2 cột.
  return (
    <div className="grid gap-3 md:grid-cols-[18rem_1fr]">
      <div className={`flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 ${activeId ? 'hidden md:flex' : ''}`}>
        {list}
      </div>
      <section
        className={`flex min-h-[60vh] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 ${
          activeId ? '' : 'hidden md:flex'
        }`}
      >
        {active ? (
          thread
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
            <MessageCircle className="size-8 text-slate-300" />
            <p className="text-sm text-slate-600">Chọn một người để bắt đầu chat</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function ChatFriendsLink() {
  return (
    <Link
      to="/friends"
      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-water-300 hover:text-water-700"
    >
      <Users className="size-3.5" /> Bạn bè
    </Link>
  );
}
