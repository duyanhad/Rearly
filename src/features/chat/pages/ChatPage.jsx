import { ChatFriendsLink, ChatPanel } from '../components/ChatPanel';

export function ChatPage() {
  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Chat</h1>
          <p className="text-xs text-slate-500">Nhắn tin với bạn bè của bạn</p>
        </div>
        <ChatFriendsLink />
      </header>
      <ChatPanel />
    </div>
  );
}
