/**
 * Circular menu opening around the centre of its parent (the FAB).
 * The parent must be `relative` and the same size as the button.
 * `action.avatarUrl` (nếu có) sẽ hiển thị ảnh đại diện thay cho icon.
 */
const initials = (name) => {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export function RadialMenu({
  open,
  actions,
  radius = 118
}) {
  const spread = 110; // degrees, centred on top
  const start = 90 + spread / 2;
  const step = actions.length > 1 ? spread / (actions.length - 1) : 0;
  return <div className="pointer-events-none absolute inset-0" aria-hidden={!open}>
      {actions.map((action, index) => {
      const angle = (start - index * step) * Math.PI / 180;
      const x = Math.cos(angle) * radius;
      const y = -Math.sin(angle) * radius;
      const Icon = action.icon;
      return <button key={action.label} type="button" tabIndex={open ? 0 : -1} aria-label={action.label} onClick={() => {
        if (open) action.onClick();
      }} style={{
        transform: open ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)` : 'translate(-50%, -50%) scale(0.3)',
        transitionDelay: `${index * 40}ms`
      }} className={`absolute left-1/2 top-1/2 flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-out ${open ? 'pointer-events-auto opacity-100' : 'opacity-0'} ${action.tone === 'primary' ? 'bg-water-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
            {action.avatarUrl ? (
              <img
                src={action.avatarUrl}
                alt={action.avatarName ?? action.label}
                className={`size-full rounded-full object-cover ${action.tone === 'partner' ? 'ring-2 ring-amber-400' : ''}`}
              />
            ) : action.avatarName ? (
              // Chưa có ảnh đại diện → hiện chữ viết tắt thay vì ảnh lỗi.
              <span className={`text-xs font-semibold ${action.tone === 'partner' ? 'text-amber-700' : 'text-slate-600'}`}>
                {initials(action.avatarName)}
              </span>
            ) : (
              <Icon className="size-5" />
            )}
            <span className={`pointer-events-none absolute -top-5 left-1/2 max-w-[92px] -translate-x-1/2 truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm ring-1 ${action.tone === 'partner' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-white/95 text-slate-700 ring-slate-100'}`}>
              {action.label}
            </span>
          </button>;
    })}
    </div>;
}