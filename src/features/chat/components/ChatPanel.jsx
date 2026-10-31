import { useEffect, useMemo, useRef, useState } from 'react';
import { DearlyLoader } from '../../../components/DearlyLoader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BellRing, ImageIcon, MessageCircle, Search, Send, Smile, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage, mediaUrl } from '../../../services/apiClient';
import { chatService } from '../../../services/chatService';
import { socialService } from '../../../services/socialService';
import { Avatar } from '../../../components/Avatar';
import { useToast } from '../../../components/Toast';
import { VoiceRecorder, AudioBubble } from './VoiceRecorder';
import { NudgeSheet } from '../../social/components/NudgeSheet';
import { EmojiPicker } from './EmojiPicker';
import { ImageLightbox } from '../../../components/ImageLightbox';

const timeLabel = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const REACTIONS = ['❤️', '😆', '😮', '😢', '😡', '👍'];

function highlight(text, query) {
  if (!query || !text) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-amber-200 px-0.5 text-slate-900">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/** Một tin nhắn: chữ / ảnh / thoại + cảm xúc thả vào + thanh reaction (hover hoặc giữ lâu). */
function MessageRow({ m, query, onReact, onZoom }) {
  const [barOpen, setBarOpen] = useState(false);
  const barRef = useRef(null);
  // Bấm ra ngoài thanh cảm xúc thì đóng (không dùng lớp phủ chặn click cả trang).
  useEffect(() => {
    if (!barOpen) return undefined;
    const onDown = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setBarOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [barOpen]);
  return (
    <div className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
      <div className="group relative">
        {barOpen && (
          <div
            ref={barRef}
            className={`absolute -top-9 z-20 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 shadow-lg ring-1 ring-slate-200 ${
              m.mine ? 'right-0' : 'left-0'
            }`}
          >
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onReact(e);
                  setBarOpen(false);
                }}
                className="rounded-full p-0.5 text-base leading-none transition hover:scale-125"
                aria-label={`Thả ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setBarOpen(true);
          }}
          className={`relative max-w-[82vw] rounded-2xl px-3 py-1.5 text-sm shadow-sm sm:max-w-[420px] ${
            m.mine ? 'bg-water-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-100'
          } ${m.pending ? 'opacity-60' : ''}`}
        >
          {m.imageUrl ? (
            <button onClick={() => onZoom(m.imageUrl)} className="block" aria-label="Phóng to ảnh">
              <img
                src={mediaUrl(m.imageUrl)}
                alt="Ảnh trong chat"
                loading="lazy"
                decoding="async"
                className="max-h-56 rounded-xl object-cover"
              />
            </button>
          ) : m.audioUrl ? (
            <div className={m.mine ? 'text-white' : 'text-slate-700'}>
              <AudioBubble src={mediaUrl(m.audioUrl)} durationMs={m.audioDurationMs} tone={m.mine ? 'dark' : 'light'} />
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{highlight(m.body, query)}</p>
          )}
          <p className={`mt-0.5 text-[10px] ${m.mine ? 'text-water-100' : 'text-slate-400'}`}>{timeLabel(m.createdAt)}</p>
          {!barOpen && !m.pending && (
            <button
              onClick={() => setBarOpen(true)}
              className={`absolute -top-3 hidden size-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 group-hover:flex ${
                m.mine ? '-left-3' : '-right-3'
              }`}
              aria-label="Thả cảm xúc"
              title="Thả cảm xúc"
            >
              <Smile className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {!!m.reactions?.length && (
        <span className="z-10 -mt-1.5 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[12px] leading-none shadow ring-1 ring-slate-200">
          {m.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(r.emoji)}
              className={`rounded-full px-0.5 ${r.mine ? 'ring-1 ring-water-400' : ''}`}
              aria-label={`${r.emoji} ×${r.count}`}
              title={`${r.emoji} ×${r.count}`}
            >
              {r.emoji}
              {r.count > 1 ? <span className="ml-0.5 text-[10px] font-semibold text-slate-500">{r.count}</span> : null}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

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
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(null);
  const [pending, setPending] = useState([]);
  const imageRef = useRef(null);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

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
    // Cuộn xuống tin mới nhất sau khi bố cục đã xong (iOS hay đổi chiều cao khi bàn phím mở).
    const toBottom = () => {
      const box = scrollRef.current;
      if (box) box.scrollTop = box.scrollHeight;
    };
    toBottom();
    const raf = requestAnimationFrame(toBottom);
    const timer = window.setTimeout(toBottom, 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [activeId, messages.length]);

  // Bàn phím mở/đóng (iOS co giãn visualViewport) + input được focus → luôn bám tin cuối.
  // Cuộn nhiều mốc vì iOS chỉ cập nhật chiều cao sau vài khung hình.
  const stickToBottom = () => {
    const box = scrollRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    endRef.current?.scrollIntoView({ block: 'end' });
  };

  useEffect(() => {
    if (!activeId) return undefined;
    const v = window.visualViewport;
    const timers = [];
    const onViewport = () => {
      stickToBottom();
      [50, 150, 320, 600].forEach((ms) => timers.push(window.setTimeout(stickToBottom, ms)));
    };
    v?.addEventListener('resize', onViewport);
    v?.addEventListener('scroll', onViewport);
    window.addEventListener('focusin', onViewport);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      v?.removeEventListener('resize', onViewport);
      v?.removeEventListener('scroll', onViewport);
      window.removeEventListener('focusin', onViewport);
    };
  }, [activeId]);

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

  const sendVoice = useMutation({
    mutationFn: async ({ blob, durationMs }) => chatService.sendVoice(activeId, blob, durationMs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-thread', activeId] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: (err) => toast.show('Không gửi được ghi âm', errorMessage(err)),
  });

  const sendImage = useMutation({
    mutationFn: async (file) => chatService.sendImage(activeId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-thread', activeId] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: (err) => toast.show('Không gửi được ảnh', errorMessage(err)),
  });

  // Thả cảm xúc: cập nhật thẳng vào cache để chip hiện ngay, không chờ refetch.
  const react = useMutation({
    mutationFn: async ({ id, emoji }) => (await chatService.react(id, emoji)).data,
    onSuccess: (reactions, vars) => {
      queryClient.setQueryData(['chat-thread', activeId], (old = []) =>
        old.map((m) => (m.id === vars.id ? { ...m, reactions } : m)),
      );
    },
    onError: (err) => toast.show('Không thả được cảm xúc', errorMessage(err)),
  });

  const submit = (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || send.isPending) return;
    // Optimistic: tin hiện ngay lập tức, server xác nhận sau (gửi cảm giác tức thì).
    const tempId = `tmp-${Date.now()}`;
    setPending((p) => [...p, { id: tempId, mine: true, body, createdAt: new Date().toISOString(), pending: true }]);
    setDraft('');
    send.mutate(body, { onSettled: () => setPending((p) => p.filter((x) => x.id !== tempId)) });
  };

  // Chuông trong hội thoại: chọn loại nhắc (nước/bữa ăn/thuốc…) + lời nhắn, gửi realtime/push.
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const nudge = useMutation({
    mutationFn: async ({ userId, kind, message }) => socialService.nudge(userId, { kind, message }),
    onSuccess: () => {
      setNudgeOpen(false);
      toast.show('Đã gửi nhắc nhở', `${active?.name ?? 'Bạn ấy'} sẽ nhận thông báo ngay.`);
    },
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

  if (isLoading) return <DearlyLoader full />;

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

  const q = search.trim().toLowerCase();
  const all = [...messages, ...pending];
  const shown = q ? all.filter((m) => (m.body || '').toLowerCase().includes(q)) : all;

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
          onClick={() => {
            setSearchOpen((v) => !v);
            setSearch('');
          }}
          className={`rounded-lg p-1.5 transition hover:bg-slate-100 ${searchOpen ? 'text-water-700' : 'text-slate-400'}`}
          aria-label="Tìm tin nhắn"
          title="Tìm tin nhắn"
        >
          <Search className="size-4" />
        </button>
        <button
          onClick={() => setNudgeOpen(true)}
          disabled={!active}
          className="rounded-lg p-1.5 text-water-700 transition hover:bg-water-50 disabled:opacity-50"
          aria-label={`Nhắc ${active?.name ?? 'bạn ấy'}`}
          title="Nhắc nhở"
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
      {searchOpen && (
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
          <Search className="size-3.5 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong cuộc trò chuyện…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{q ? `${shown.length} kết quả` : ''}</span>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-2.5">
        {all.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Chưa có tin nhắn. Chào một câu nhé!</p>
        )}
        {q && shown.length === 0 && all.length > 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Không có tin nào khớp “{search}”.</p>
        )}
        {shown.map((m) => (
          <MessageRow
            key={m.id}
            m={m}
            query={q}
            onReact={(emoji) => typeof m.id === 'number' && react.mutate({ id: m.id, emoji })}
            onZoom={setZoom}
          />
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-slate-100 p-1.5">
        {!voiceBusy && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder={`Nhắn cho ${active?.name}...`}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-2.5 py-2 text-base focus:border-water-400 focus:outline-none sm:text-sm"
          />
        )}
        {!voiceBusy && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className={`rounded-xl border p-2 transition ${emojiOpen ? 'border-water-400 bg-water-50 text-water-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              aria-label="Chèn emoji"
              title="Emoji"
            >
              <Smile className="size-4" />
            </button>
            {emojiOpen && <EmojiPicker onPick={(e) => setDraft((d) => d + e)} onClose={() => setEmojiOpen(false)} />}
          </div>
        )}
        {!voiceBusy && (
          <>
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendImage.mutate(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={sendImage.isPending}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              aria-label="Gửi ảnh"
              title="Gửi ảnh"
            >
              <ImageIcon className="size-4" />
            </button>
          </>
        )}
        <span className={voiceBusy ? 'flex-1' : ''}>
          <VoiceRecorder
            disabled={!activeId || sendVoice.isPending}
            onBusyChange={setVoiceBusy}
            onSend={(blob, durationMs) => sendVoice.mutate({ blob, durationMs })}
          />
        </span>
        {!voiceBusy && (
          <button
            type="submit"
            disabled={!draft.trim() || send.isPending}
            className="rounded-xl bg-water-600 p-2 text-white transition hover:bg-water-700 disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            <Send className="size-4" />
          </button>
        )}
      </form>
      {nudgeOpen && active && (
        <NudgeSheet
          name={active.name}
          sending={nudge.isPending}
          onClose={() => setNudgeOpen(false)}
          onSend={({ kind, message }) => nudge.mutate({ userId: active.userId, kind, message })}
        />
      )}
      {zoom && <ImageLightbox src={mediaUrl(zoom)} alt="Ảnh trong chat" onClose={() => setZoom(null)} />}
    </>
  );

  // Cửa sổ bong bóng: chỉ hiện một trong hai (danh sách ↔ hội thoại).
  if (compact) {
    return <div className="flex h-full flex-col">{active ? thread : list}</div>;
  }

  // Trang /chat: điện thoại hiện danh sách → hội thoại; máy tính 2 cột.
  // Giới hạn chiều cao theo viewport để ô nhập luôn nằm trong màn hình (không bị BottomNav che).
  return (
    <div className="grid gap-3 md:grid-cols-[18rem_1fr]">
      <div className={`flex max-h-[calc(100dvh-13rem)] min-h-[24rem] flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 ${activeId ? 'hidden md:flex' : ''}`}>
        {list}
      </div>
      <section
        className={`flex max-h-[calc(100dvh-13rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 ${
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
