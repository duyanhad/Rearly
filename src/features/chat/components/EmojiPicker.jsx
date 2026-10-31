import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const RECENT_KEY = 'dearly.emoji.recent';

const GROUPS = [
  {
    label: 'Mặt cười',
    items: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍  😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝  🤭 🤫  🤨 😐 😑 😶 😏 😒 🙄 😬  😌 😔 😪 🤤 😴 😷 🤒  🤢  🥵 🥶 🥴 😵  🤠 🥳 🥸 😎 🤓  😕 😟  ☹️  😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈  💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖'.split(' '),
  },
  {
    label: 'Tim & tay',
    items: '❤️ 🧡 💛 💚 💙 💜 🖤  🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘  👈 👉 👆 👇 ☝️ 👋 🤚 🖐️ ✋ 🖖 👏  👐  🤝  ✊ 👊  🤜 '.split(' '),
  },
  {
    label: 'Người & vật',
    items: '🐶  🐭  🐰  🐻  🐨  🦁  🐷 🐸 🐵 🐔 🐧  🐤  🐝  🐌  🐢  🦖  🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓  ⛳  🥊 🎽 🛹  🎿  ⌚ ⏰ 🌂 ☂️ 🎈 🎉 🎊 🎁 🏆  🎧  🎵 🎶 🎹 🥁 🎬 🎮  🚕  🚌 ️ 🚓  🚒  ✈️  🚁  🚲 🏍️ 🌈 ☀️ 🌤️ ⛅ 🌧️ ⛈️ ❄️ 🔥 💧  ⭐  ✨ ⚡ ☄️ '.split(' '),
  },
  {
    label: 'Ăn uống',
    items: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓  🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑  🥬  🌶️ 🫑 🌽  🫒  🧅  🍠 🥐 🥯  🥖 🥨 🧀 🥚 🍳  🥞  🥓  🍟 🍕 🌭  🌮 🌯 🫔  🧆 🍝 🍜 🍲 🍛  🍱  🍤  🍚 🍘 🍥 🥠  🍡 🍧 🍨 🍦  🧁 🍰  🍮 🍭 🍬 🍫 🍿 🍩 🍪 ☕ 🍵  🧋  🍺 🍻 🥂  🥃  🍹  🍾 '.split(' '),
  },
];

const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').slice(0, 16);
  } catch {
    return [];
  }
};

/** Bảng chọn emoji kiểu Messenger: ô tìm kiếm, nhóm "đã dùng" và các nhóm emoji. */
export function EmojiPicker({ onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readRecent);

  const groups = useMemo(() => {
    const q = query.trim();
    if (!q) return GROUPS;
    // Tìm kiếm thô theo ký tự: gõ "tim" không khớp emoji nên chỉ lọc khi query là chính emoji.
    return GROUPS.map((g) => ({ ...g, items: g.items.filter((e) => e.includes(q)) })).filter((g) => g.items.length);
  }, [query]);

  const pick = (emoji) => {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 16);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    onPick(emoji);
  };

  return (
    <div className="absolute bottom-full right-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
        <Search className="size-3.5 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm emoji…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button type="button" onClick={onClose} className="rounded px-1 text-xs text-slate-400 hover:text-slate-600" aria-label="Đóng bảng emoji">
          ✕
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-2">
        {recent.length > 0 && !query && (
          <>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Đã dùng gần đây</p>
            <div className="mb-2 grid grid-cols-8 gap-0.5">
              {recent.map((e) => (
                <button type="button" key={e} onClick={() => pick(e)} className="rounded p-0.5 text-lg leading-none hover:bg-slate-100" aria-label={`Emoji ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {g.items.map((e) => (
                <button type="button" key={e} onClick={() => pick(e)} className="rounded p-0.5 text-lg leading-none hover:bg-slate-100" aria-label={`Emoji ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Không có emoji nào khớp.</p>}
      </div>
    </div>
  );
}

export default EmojiPicker;
